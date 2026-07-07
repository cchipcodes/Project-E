import * as J from "jamango";
import {
    BGMPlaylistTrait,
    BobbingTrait,
    ChainTrait,
    CounterHUDTrait,
    DialogueNPCTrait,
    DisplayNotificationTrait,
    EnableBySignalTrait,
    HeldItemTrait,
    LeaderboardTrait,
    NPCAnimationLoopTrait,
    NPCNameTrait,
    PlayAnimationOnSignalTrait,
    PlaySoundOnCollisionTrait,
    PlayerTrait,
    PlayerCollectablesTrait,
    PlayerTimerTrait,
    SpinningTrait,
    VisibilityTrait,
} from "../traits";
import {
    ApplyVelocityImpulseCommand,
    BuiltInSignalCommand,
    OpenDialogueCommand,
    PlayLocalSoundCommand,
    PlaySpatialSoundCommand,
    RespawnPlayerCommand,
    ShowNotificationCommand,
} from "../shared/commands";
import {
    addVec3,
    distanceSquared,
    eulerDegreesToQuat,
    formatScore,
    nonEmpty,
    quatForward,
    secondsToClock,
    yawQuatFromDirection,
} from "../shared/utils";
import {
    createHUDPanel,
    createText,
    ensureHUDRoot,
    positionClass,
    setDisplay,
    setText,
    hideWorldInteractPrompt,
    showWorldInteractPrompt,
    showToast,
    tickToast,
} from "./hud-kit";

type CounterState = {
    panel: HTMLDivElement;
    label: HTMLDivElement;
    value: HTMLDivElement;
    lastPosition?: string;
};

type LeaderboardRowState = {
    place: HTMLDivElement;
    name: HTMLDivElement;
    score: HTMLDivElement;
};

type LeaderboardState = {
    panel: HTMLDivElement;
    title: HTMLDivElement;
    rows: LeaderboardRowState[];
    nextRefreshAt: number;
    fetching: boolean;
    key: string;
};

type Text3DState = {
    entityId: J.EntityId;
    lastText: string;
};

type DialogueDOM = {
    backdrop: HTMLDivElement;
    title: HTMLDivElement;
    line: HTMLDivElement;
    hint: HTMLDivElement;
};

type DialogueState = {
    npcId: J.EntityId;
    title: string;
    lines: string[];
    index: number;
    fullLine: string;
    visibleCount: number;
    openedAt: number;
    animation?: string;
    animationMode: "once" | "loop" | "hold";
};

type BGMState = {
    key: string;
    soundId: number | undefined;
};

type AttachmentState = {
    meshKey: string;
    tpHandle: number;
    fpHandle: number;
    animation: string;
};

const counters = new Map<J.EntityId, CounterState>();
const leaderboards = new Map<J.EntityId, LeaderboardState>();
const worldLeaderboards = new Map<J.EntityId, Text3DState>();
const leaderboardHandles = new Map<string, J.LeaderboardId>();
const nameplateCache = new Map<J.EntityId, string>();
const animationLoopCache = new Map<J.EntityId, string>();
const attachmentCache = new Map<J.EntityId, AttachmentState>();
const bgmStates = new Map<J.EntityId, BGMState>();
const lastAliveState = new Map<J.EntityId, boolean | undefined>();
const deathAnimationPlaying = new Set<J.EntityId>();
const visibilityCache = new Map<J.EntityId, boolean>();

let timerPanel: CounterState | undefined;
let timerNextUpdateAt = 0;
let dialogueDOM: DialogueDOM | undefined;
let dialogue: DialogueState | undefined;
let dialogueReopenNpc: J.EntityId | undefined;
let dialogueReopenBlockedUntil = 0;
let clientTime = 0;

const DEATH_ANIMATION = "locomotion_default_death";
// Live timer shows hundredths but is throttled to a few DOM writes per second.
const TIMER_UPDATE_INTERVAL = 1 / 5;
// After closing a dialogue, ignore reopen requests for the same NPC briefly, so
// the same tap that closes it on mobile (close = interact) doesn't reopen it.
const DIALOGUE_REOPEN_COOLDOWN = 0.5;

export function initClientSystems() {
    if (!J.net.isClient) return;

    J.onGameStart(() => {
        ensureHUDRoot();
        initGameStartNotifications(0);
    });

    J.net.listen(ShowNotificationCommand, (data) => {
        showToast(data.message, data.durationSeconds, clientTime);
        if (data.sound) J.playSound(data.sound);
    });

    J.net.listen(PlayLocalSoundCommand, (data) => {
        J.playSound(data.sound, { volume: data.volume ?? 1 });
    });

    J.net.listen(PlaySpatialSoundCommand, (data) => {
        const volume = data.volume ?? 1;
        if (data.entityId !== undefined && data.entityId !== null) {
            J.playSoundAtEntity(data.sound, data.entityId, { volume });
        } else if (data.position) {
            J.playSoundAtPosition(data.sound, data.position, { volume });
        } else {
            J.playSound(data.sound, { volume });
        }
    });

    J.net.listen(RespawnPlayerCommand, (data) => {
        const localPlayer = J.getLocalPlayer();
        if (data.playerId !== localPlayer) return;

        J.setEntityPosition(localPlayer, data.position, false);
        if (data.quaternion) {
            const lookTarget = addVec3(data.position, quatForward(data.quaternion));
            J.entityLookAt(localPlayer, lookTarget);
        }
    });

    J.net.listen(ApplyVelocityImpulseCommand, (data) => {
        applyVelocityImpulse(data.targetId, data.velocity, data.additive);
    });

    J.net.listen(BuiltInSignalCommand, (data) => {
        onClientSignal(data.signal);
    });

    J.net.listen(OpenDialogueCommand, (data) => {
        openDialogue(data, clientTime);
    });

    // The primary action (left click on desktop, the on-screen action button on
    // mobile) both opens dialogue when aiming at an NPC and advances an open one.
    // Enter/Space/Escape are reserved by the engine (chat, jump, pointer-unlock)
    // and never reach onControlPress, so they can't be used here.
    J.onCharacterUse({ character: [PlayerTrait] }, (playerId, primary) => {
        if (!primary || playerId !== J.getLocalPlayer()) return;
        if (dialogue) advanceDialogue();
        else openLookedAtDialogue();
    });

    J.onPlayerLeave((playerId) => {
        lastAliveState.delete(playerId);
        deathAnimationPlaying.delete(playerId);
    });

    J.onGameRender(() => {
        tickInteractPrompt();
    });

    J.onEntityCollisionStart(
        { source: [PlaySoundOnCollisionTrait] },
        (sourceId, targetId) => {
            maybePlayCollisionSound(sourceId, targetId);
        },
    );

    J.onGameTick((deltaTime, time) => {
        clientTime = time;
        tickToast(time);
        tickTimerHUD(time);
        tickCounterHUD(time);
        tickLeaderboards(time);
        tickNameplates();
        tickBobbingAndSpinning(time);
        tickNPCAnimations();
        tickDialogue(deltaTime, time);
        tickHeldItems();
        tickBGM();
        tickDeathAnimations();
        tickVisibility();
    });
}

function tickDeathAnimations() {
    for (const [playerId] of J.getAllWithTraits([PlayerTrait])) {
        const alive = J.getCharacterAlive(playerId);
        if (alive === undefined) continue;

        const last = lastAliveState.get(playerId);
        if (last === alive) continue;

        if (alive === false && !deathAnimationPlaying.has(playerId)) {
            J.characterPlayAnimation(playerId, DEATH_ANIMATION, {
                mode: "hold",
                speed: 0.8,
            });
            deathAnimationPlaying.add(playerId);
        } else if (alive === true && deathAnimationPlaying.has(playerId)) {
            J.characterStopAnimation(playerId, DEATH_ANIMATION, { fadeOut: 0.2 });
            deathAnimationPlaying.delete(playerId);
        }

        lastAliveState.set(playerId, alive);
    }
}

function applyVelocityImpulse(targetId: J.EntityId, velocity: J.Vec3, additive: boolean) {
    const isPlayer = Boolean(J.getTrait(targetId, PlayerTrait));
    if (isPlayer && targetId !== J.getLocalPlayer()) return;

    if (additive) {
        J.addEntityVelocity(targetId, velocity, false);
    } else {
        J.setEntityVelocity(targetId, velocity, false);
    }
}

function ensureCounterState(
    entityId: J.EntityId,
    position: string,
): CounterState | undefined {
    const existing = counters.get(entityId);
    if (existing) return existing;

    const panel = createHUDPanel(`jt-panel jt-counter ${positionClass(position)}`);
    if (!panel) return undefined;

    const label = createText(panel, "jt-label");
    const value = createText(panel, "jt-value");
    const state = { panel, label, value, lastPosition: position };
    counters.set(entityId, state);
    return state;
}

function tickCounterHUD(time: number) {
    const localPlayer = J.getLocalPlayer();
    if (localPlayer === undefined || localPlayer === null) return;

    const player = J.getTrait(localPlayer, PlayerCollectablesTrait);
    const playerTimer = J.getTrait(localPlayer, PlayerTimerTrait);

    for (const [entityId, trait] of J.getAllWithTraits([CounterHUDTrait])) {
        const state = ensureCounterState(entityId, trait.position);
        if (!state) continue;

        setDisplay(state.panel, trait.enabled);
        if (!trait.enabled) continue;

        if (state.lastPosition !== trait.position) {
            state.panel.className = `jt-panel jt-counter ${positionClass(trait.position)}`;
            state.lastPosition = trait.position;
        }
        setText(state.label, trait.label);

        let rawValue = 0;
        if (trait.source === "collectables" && player?.groupId === trait.groupId) {
            rawValue = player.score;
        } else if (trait.source === "timer" && playerTimer) {
            rawValue = playerTimer.running
                ? Math.max(0, time - playerTimer.startTime)
                : playerTimer.bestSeconds || playerTimer.elapsedSeconds;
        } else {
            rawValue = J.getTrait(localPlayer, PlayerTrait)?.score ?? 0;
        }

        setText(
            state.value,
            trait.format === "time" ? secondsToClock(rawValue) : `${rawValue}`,
        );
    }
}

function tickTimerHUD(time: number) {
    const localPlayer = J.getLocalPlayer();
    if (localPlayer === undefined || localPlayer === null) return;

    const timer = J.getTrait(localPlayer, PlayerTimerTrait);
    if (!timer?.showHUD) {
        if (timerPanel) setDisplay(timerPanel.panel, false);
        return;
    }

    if (!timerPanel) {
        const panel = createHUDPanel("jt-panel jt-timer");
        if (!panel) return;
        timerPanel = {
            panel,
            label: createText(panel, "jt-label", "Time"),
            value: createText(panel, "jt-value"),
        };
    }

    setDisplay(timerPanel.panel, true);

    // Throttle DOM writes while running; when stopped, always show the final value.
    if (timer.running && time < timerNextUpdateAt) return;
    timerNextUpdateAt = time + TIMER_UPDATE_INTERVAL;

    const elapsed = timer.running
        ? Math.max(0, time - timer.startTime)
        : timer.elapsedSeconds;
    setText(timerPanel.value, secondsToClock(elapsed));
}

function tickLeaderboards(time: number) {
    for (const [entityId, trait] of J.getAllWithTraits([LeaderboardTrait])) {
        const state = ensureLeaderboardState(entityId, trait.title, trait.maxRows, trait.display);
        if (!state) continue;

        const visible = trait.enabled && (trait.display === "hud" || trait.display === "both");
        setDisplay(state.panel, visible);
        setText(state.title, trait.title);

        const key = `${trait.leaderboardId}:${trait.mode}:${trait.format}:${trait.maxRows}`;
        if (state.key !== key) {
            state.key = key;
            state.nextRefreshAt = 0;
        }

        if (state.fetching || time < state.nextRefreshAt) continue;

        state.fetching = true;
        state.nextRefreshAt = time + Math.max(1, trait.refreshSeconds);

        const handle = getLeaderboardHandle(trait.leaderboardId, trait.mode);
        J.leaderboards
            .getTopScores(handle)
            .then((entries) => {
                updateLeaderboardRows(state, entries, trait.maxRows, trait.format);
                updateWorldLeaderboard(entityId, trait.title, entries, trait.maxRows, trait.format, trait.display);
            })
            .catch(() => {
                updateLeaderboardRows(state, [], trait.maxRows, trait.format);
            })
            .finally(() => {
                state.fetching = false;
            });
    }
}

function ensureLeaderboardState(
    entityId: J.EntityId,
    title: string,
    maxRows: number,
    display: string,
) {
    const existing = leaderboards.get(entityId);
    if (existing) return existing;

    const panel = createHUDPanel("jt-panel jt-leaderboard jt-pos-left-middle");
    if (!panel) return undefined;

    const titleElement = createText(panel, "jt-leaderboard-title", title);
    const rows: LeaderboardRowState[] = [];
    const rowCount = Math.max(1, Math.min(10, Math.floor(maxRows)));

    for (let i = 0; i < rowCount; i += 1) {
        const row = document.createElement("div");
        row.className = "jt-leaderboard-row";
        const place = createText(row, "jt-lb-place", `${i + 1}.`);
        const name = createText(row, "jt-lb-name", "-");
        const score = createText(row, "jt-lb-score", "-");
        panel.appendChild(row);
        rows.push({ place, name, score });
    }

    const state = {
        panel,
        title: titleElement,
        rows,
        nextRefreshAt: 0,
        fetching: false,
        key: "",
    };
    leaderboards.set(entityId, state);
    setDisplay(panel, display === "hud" || display === "both");
    return state;
}

function updateLeaderboardRows(
    state: LeaderboardState,
    entries: J.LeaderboardEntry[],
    maxRows: number,
    format: string,
) {
    const rowCount = Math.min(state.rows.length, Math.max(1, Math.floor(maxRows)));

    for (let i = 0; i < state.rows.length; i += 1) {
        const row = state.rows[i];
        const entry = entries[i];
        const visible = i < rowCount;

        setDisplay(row.place.parentElement ?? undefined, visible, "grid");
        if (!visible) continue;

        setText(row.place, `${i + 1}.`);
        setText(row.name, entry?.playerUsername ? entry.playerUsername : "-");
        setText(row.score, entry ? formatScore(entry.score, format) : "-");
    }
}

function updateWorldLeaderboard(
    entityId: J.EntityId,
    title: string,
    entries: J.LeaderboardEntry[],
    maxRows: number,
    format: string,
    display: string,
) {
    if (display !== "world" && display !== "both") return;

    const position = J.getEntityPosition(entityId);
    if (!position) return;

    let state = worldLeaderboards.get(entityId);
    if (!state) {
        const textId = J.spawnText3D(title, 0.6, 80, true, addVec3(position, [0, 2.2, 0]), [0, 0, 0]);
        state = { entityId: textId, lastText: "" };
        worldLeaderboards.set(entityId, state);
    }

    const rows = entries
        .slice(0, Math.max(1, Math.floor(maxRows)))
        .map((entry, index) => `${index + 1}. ${entry.playerUsername} ${formatScore(entry.score, format)}`);
    const text = rows.length > 0 ? `${title}\n${rows.join("\n")}` : `${title}\nNo entries yet`;

    if (state.lastText !== text) {
        state.lastText = text;
        J.updateText3D(state.entityId, text);
    }
}

function getLeaderboardHandle(id: string, mode: string) {
    const normalizedMode: "lowest" | "highest" =
        mode === "low" ? "lowest" : "highest";
    const key = `${id}:${normalizedMode}`;
    const existing = leaderboardHandles.get(key);
    if (existing) return existing;

    const handle = J.leaderboards.defineLeaderboard(id, { mode: normalizedMode });
    leaderboardHandles.set(key, handle);
    return handle;
}

function tickNameplates() {
    for (const [entityId, trait] of J.getAllWithTraits([NPCNameTrait])) {
        const key = `${trait.enabled}:${trait.visible}:${trait.text}:${trait.color.join(",")}`;
        if (nameplateCache.get(entityId) === key) continue;

        nameplateCache.set(entityId, key);
        J.setCharacterNameplate(entityId, trait.enabled && trait.visible, trait.color, trait.text);
    }
}

function tickBobbingAndSpinning(time: number) {
    for (const [entityId, trait] of J.getAllWithTraits([BobbingTrait])) {
        if (!trait.enabled) continue;

        const amount = Math.sin(time * trait.speed + trait.phase) * trait.amplitude;
        J.setEntityVisualOffset(entityId, [
            trait.axis[0] * amount,
            trait.axis[1] * amount,
            trait.axis[2] * amount,
        ]);
    }

    for (const [entityId, trait] of J.getAllWithTraits([SpinningTrait])) {
        if (!trait.enabled) continue;
        const quat = yawQuatFromDirection([
            Math.sin((time * trait.speedDegreesPerSecond * Math.PI) / 180),
            0,
            Math.cos((time * trait.speedDegreesPerSecond * Math.PI) / 180),
        ]);
        J.setEntityVisualQuaternion(entityId, quat);
    }
}

function tickNPCAnimations() {
    for (const [entityId, trait] of J.getAllWithTraits([NPCAnimationLoopTrait])) {
        if (!trait.enabled || !trait.animation) continue;

        const key = `${trait.animation}:${trait.mode}:${trait.speed}:${trait.fadeIn}:${trait.cancelOnMove}`;
        if (animationLoopCache.get(entityId) === key) continue;

        animationLoopCache.set(entityId, key);
        J.characterPlayAnimation(entityId, trait.animation, {
            mode: toAnimationMode(trait.mode),
            speed: trait.speed,
            fadeIn: trait.fadeIn,
            cancelOnMove: trait.cancelOnMove,
        });
    }
}

function openDialogue(data: {
    npcId: J.EntityId;
    title: string;
    lines: string[];
    animation?: string;
    animationMode: "once" | "loop" | "hold";
    sound?: string;
}, time: number) {
    if (data.lines.length === 0) return;

    // Already mid-conversation with this NPC: don't restart from the first line
    // when interact re-fires (e.g. still looking at them).
    if (dialogue && dialogue.npcId === data.npcId) return;

    // Just closed this NPC's dialogue: ignore an immediate reopen (the closing
    // tap on mobile doubles as an interact).
    if (data.npcId === dialogueReopenNpc && time < dialogueReopenBlockedUntil) return;

    if (data.sound) J.playSound(data.sound);

    dialogue = {
        npcId: data.npcId,
        title: data.title,
        lines: data.lines,
        index: 0,
        fullLine: data.lines[0],
        visibleCount: 0,
        openedAt: time,
        animation: data.animation,
        animationMode: data.animationMode,
    };

    if (data.animation) {
        J.characterPlayAnimation(data.npcId, data.animation, {
            mode: data.animationMode,
            fadeIn: 0.08,
        });
    }

    renderDialogue();
}

function ensureDialogueDOM() {
    const root = ensureHUDRoot();
    if (!root) return undefined;

    if (dialogueDOM && dialogueDOM.backdrop.isConnected) return dialogueDOM;

    const backdrop = document.createElement("div");
    backdrop.className = "jt-dialogue-backdrop";
    const panel = document.createElement("div");
    panel.className = "jt-dialogue-panel";
    // Tapping the panel advances. Reliable cross-platform path on mobile,
    // where the primary action button doesn't fire onCharacterUse without an item.
    panel.addEventListener("click", () => advanceDialogue());
    const title = createText(panel, "jt-dialogue-title");
    const line = createText(panel, "jt-dialogue-line");
    const hint = createText(panel, "jt-dialogue-hint", "Tap or click to continue.");

    backdrop.appendChild(panel);
    root.appendChild(backdrop);
    dialogueDOM = { backdrop, title, line, hint };
    return dialogueDOM;
}

function tickDialogue(deltaTime: number, time: number) {
    if (!dialogue) return;

    const dom = ensureDialogueDOM();
    if (!dom) return;

    const nextCount = Math.min(
        dialogue.fullLine.length,
        dialogue.visibleCount + Math.max(1, Math.ceil(deltaTime * 42)),
    );

    if (nextCount !== dialogue.visibleCount) {
        dialogue.visibleCount = nextCount;
        setText(dom.line, dialogue.fullLine.slice(0, dialogue.visibleCount));
    }

    dialogue.openedAt = dialogue.openedAt || time;
}

function renderDialogue() {
    const dom = ensureDialogueDOM();
    if (!dom) return;

    if (!dialogue) {
        setDisplay(dom.backdrop, false, "flex");
        return;
    }

    setDisplay(dom.backdrop, true, "flex");
    setText(dom.title, dialogue.title);
    setText(dom.line, dialogue.fullLine.slice(0, dialogue.visibleCount));
    setDisplay(dom.hint, true);
}

function tickInteractPrompt() {
    if (dialogue) {
        hideWorldInteractPrompt();
        return;
    }

    const localPlayer = J.getLocalPlayer();
    if (localPlayer === undefined || localPlayer === null) {
        hideWorldInteractPrompt();
        return;
    }

    const viewRay = J.getCharacterViewRay(localPlayer);
    const targetId = viewRay?.hitEntityId;
    if (targetId === undefined || targetId === null) {
        hideWorldInteractPrompt();
        return;
    }

    const targetPosition = J.getEntityPosition(targetId);
    if (!targetPosition) {
        hideWorldInteractPrompt();
        return;
    }

    const dialogueTrait = J.getTrait(targetId, DialogueNPCTrait);
    if (dialogueTrait?.enabled && isClientGateActive(targetId)) {
        const playerPosition = J.getEntityPosition(localPlayer);
        if (
            playerPosition &&
            distanceSquared(playerPosition, targetPosition) <=
                dialogueTrait.range * dialogueTrait.range
        ) {
            showWorldInteractPrompt(
                targetPosition,
                `💭\n${promptTitle(dialogueTrait.title, "Talk")}\n[F] to Talk`,
                2.4,
            );
            return;
        }
    }

    const notificationTrait = J.getTrait(targetId, DisplayNotificationTrait);
    if (notificationTrait?.enabled && notificationTrait.trigger === "interact") {
        showWorldInteractPrompt(targetPosition, "💬\nNotification\n[F] to Read", 1.8);
        return;
    }

    const chainTrait = J.getTrait(targetId, ChainTrait);
    if (chainTrait?.enabled && chainTrait.trigger === "interact") {
        showWorldInteractPrompt(targetPosition, "🔗\nInteract\n[F] to Use", 1.8);
        return;
    }

    hideWorldInteractPrompt();
}

function promptTitle(value: string, fallback: string) {
    const firstLine = value.split(/\r?\n/)[0]?.trim();
    return firstLine || fallback;
}

function isClientGateActive(entityId: J.EntityId) {
    const gate = J.getTrait(entityId, EnableBySignalTrait);
    return !gate || gate.active;
}

// Apply the server-synced VisibilityTrait flag to client-only visibility.
function tickVisibility() {
    for (const [entityId, trait] of J.getAllWithTraits([VisibilityTrait])) {
        const last = visibilityCache.get(entityId);
        if (last === trait.visible) continue;

        visibilityCache.set(entityId, trait.visible);
        J.setEntityVisible(entityId, trait.visible);
    }
}

function advanceDialogue() {
    if (!dialogue) return;

    if (dialogue.visibleCount < dialogue.fullLine.length) {
        dialogue.visibleCount = dialogue.fullLine.length;
        renderDialogue();
        return;
    }

    const nextIndex = dialogue.index + 1;
    if (nextIndex >= dialogue.lines.length) {
        closeDialogue();
        return;
    }

    dialogue.index = nextIndex;
    dialogue.fullLine = dialogue.lines[nextIndex];
    dialogue.visibleCount = 0;
    renderDialogue();
}

function closeDialogue() {
    if (dialogue?.animation && dialogue.animationMode === "loop") {
        J.characterStopAnimation(dialogue.npcId, dialogue.animation, { fadeOut: 0.1 });
    }
    if (dialogue) {
        dialogueReopenNpc = dialogue.npcId;
        dialogueReopenBlockedUntil = clientTime + DIALOGUE_REOPEN_COOLDOWN;
    }
    dialogue = undefined;
    renderDialogue();
}

// Opens dialogue with the NPC the player is aiming at, reading the synced
// DialogueNPCTrait directly. Lets the primary action open dialogue on mobile
// (and desktop click), since the engine interact (F) is keyboard-only.
function openLookedAtDialogue() {
    const localPlayer = J.getLocalPlayer();
    if (localPlayer === undefined || localPlayer === null) return;

    const targetId = J.getCharacterViewRay(localPlayer)?.hitEntityId;
    if (targetId === undefined || targetId === null) return;

    const trait = J.getTrait(targetId, DialogueNPCTrait);
    if (!trait?.enabled || !isClientGateActive(targetId)) return;
    if (trait.lines.length === 0) return;

    const npcPosition = J.getEntityPosition(targetId);
    const playerPosition = J.getEntityPosition(localPlayer);
    if (!npcPosition || !playerPosition) return;
    if (distanceSquared(playerPosition, npcPosition) > trait.range * trait.range) return;

    openDialogue(
        {
            npcId: targetId,
            title: trait.title,
            lines: trait.lines,
            animation: trait.animation,
            animationMode:
                trait.animationMode === "loop" || trait.animationMode === "hold"
                    ? trait.animationMode
                    : "once",
            sound: trait.sound,
        },
        clientTime,
    );
}

function maybePlayCollisionSound(sourceId: J.EntityId, targetId: J.EntityId) {
    const trait = J.getTrait(sourceId, PlaySoundOnCollisionTrait);
    if (!trait?.enabled || !trait.sound) return;

    const localPlayer = J.getLocalPlayer();
    const localOnly = localPlayer === targetId || trait.target === "any";
    if (!localOnly) return;

    if (trait.playAt === "entity") {
        J.playSoundAtEntity(trait.sound, sourceId, { volume: trait.volume });
    } else if (trait.playAt === "world") {
        const position = J.getEntityPosition(sourceId);
        if (position) J.playSoundAtPosition(trait.sound, position, { volume: trait.volume });
    } else {
        J.playSound(trait.sound, { volume: trait.volume });
    }
}

function initGameStartNotifications(time: number) {
    for (const [entityId, trait] of J.getAllWithTraits([DisplayNotificationTrait])) {
        if (!trait.enabled || trait.trigger !== "gameStart") continue;
        showToast(trait.message, trait.durationSeconds, time);
        if (trait.sound) J.playSound(trait.sound);
        break;
    }
}

// Held items are synced via the trait itself: every client reads the trait and
// attaches the mesh locally, so everyone sees the third-person item. The local
// holder also gets a first-person attachment (camera-relative, only it sees that).
function tickHeldItems() {
    const localPlayer = J.getLocalPlayer();
    const active = new Set<J.EntityId>();

    for (const [entityId, trait] of J.getAllWithTraits([HeldItemTrait])) {
        if (!trait.enabled) continue;

        const source = trait.source;
        const isProp = source.type === "prop";
        const itemId = source.type === "prop" ? source.prop : source.item;
        if (!nonEmpty(itemId)) continue;

        const wantFirstPerson = trait.firstPerson && entityId === localPlayer;
        const meshKey = [
            source.type,
            itemId,
            trait.slot,
            trait.position.join(","),
            trait.rotation.join(","),
            trait.scale,
            wantFirstPerson ? trait.fpPosition.join(",") : "no-fp",
            trait.fpRotation.join(","),
            trait.fpScale,
        ].join("|");

        const existing = attachmentCache.get(entityId);
        const meshUnchanged = existing?.meshKey === meshKey;
        const poseUnchanged = existing?.animation === trait.holdPose;
        if (meshUnchanged && poseUnchanged) {
            active.add(entityId);
            continue;
        }

        if (!meshUnchanged) {
            if (existing) detachHeldItem(entityId, existing);

            const slot = trait.slot as J.CharacterSlotId;
            const rotation = eulerDegreesToQuat(trait.rotation);
            const tpHandle = isProp
                ? J.addCharacterMeshAttachmentProp(entityId, itemId, slot, trait.position, rotation, trait.scale)
                : J.addCharacterMeshAttachmentGlb(entityId, { id: itemId }, slot, trait.position, rotation, trait.scale);

            // -1 = attach failed (asset not loaded yet); don't cache, retry next tick.
            if (tpHandle < 0) continue;

            let fpHandle = -1;
            if (wantFirstPerson) {
                const fpRotation = eulerDegreesToQuat(trait.fpRotation);
                fpHandle = isProp
                    ? J.addFirstPersonMeshAttachmentProp(entityId, itemId, trait.fpPosition, fpRotation, trait.fpScale)
                    : J.addFirstPersonMeshAttachmentGlb(entityId, { id: itemId }, trait.fpPosition, fpRotation, trait.fpScale);
            }

            attachmentCache.set(entityId, {
                meshKey,
                tpHandle,
                fpHandle,
                animation: existing?.animation ?? "",
            });
        }

        // Update the hold pose only when it actually changes, so swapping items
        // (mesh rebuild) doesn't restart the looping arm pose.
        if (!poseUnchanged) {
            const state = attachmentCache.get(entityId);
            if (state) {
                if (state.animation) J.characterStopAnimation(entityId, state.animation, { fadeOut: 0.1 });
                if (trait.holdPose) J.characterPlayAnimation(entityId, trait.holdPose, { mode: "loop", fadeIn: 0.1 });
                state.animation = trait.holdPose;
            }
        }

        active.add(entityId);
    }

    for (const [entityId, state] of attachmentCache) {
        if (active.has(entityId)) continue;
        detachHeldItem(entityId, state);
        if (state.animation) J.characterStopAnimation(entityId, state.animation, { fadeOut: 0.1 });
        attachmentCache.delete(entityId);
    }
}

function detachHeldItem(entityId: J.EntityId, state: AttachmentState) {
    J.removeCharacterMeshAttachment(entityId, state.tpHandle);
    if (state.fpHandle >= 0) J.removeFirstPersonMeshAttachment(entityId, state.fpHandle);
}

function tickBGM() {
    for (const [entityId, trait] of J.getAllWithTraits([BGMPlaylistTrait])) {
        const tracks = (trait.tracks ?? []).filter(nonEmpty);
        const existing = bgmStates.get(entityId);

        if (!trait.enabled || tracks.length === 0) {
            if (existing?.soundId !== undefined) J.stopSound(existing.soundId);
            bgmStates.delete(entityId);
            continue;
        }

        const key = `${tracks.join("|")}:${trait.volume}:${trait.fadeInSeconds}:${trait.loopSingleTrack}`;
        if (existing?.key === key) continue;

        if (existing?.soundId !== undefined) J.stopSound(existing.soundId);

        const index = trait.shuffle && tracks.length > 1
            ? Math.floor(Math.random() * tracks.length)
            : 0;
        const soundId = J.playSound(tracks[index], {
            volume: trait.volume,
            fadeInDuration: trait.fadeInSeconds,
            loop: true,
        });
        bgmStates.set(entityId, { key, soundId });
    }
}

function onClientSignal(signal: string) {
    for (const [entityId, trait] of J.getAllWithTraits([PlayAnimationOnSignalTrait])) {
        if (!trait.enabled || trait.signal !== signal || !trait.animation) continue;
        J.characterPlayAnimation(entityId, trait.animation, {
            mode: toAnimationMode(trait.mode),
            speed: trait.speed,
            fadeIn: trait.fadeIn,
        });
    }
}

function toAnimationMode(mode: string): J.AnimationPlaybackMode {
    if (mode === "loop" || mode === "hold") return mode;
    return "once";
}

