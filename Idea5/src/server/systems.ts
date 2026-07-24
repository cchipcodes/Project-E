import * as J from "jamango";
import * as game from "../game";
import {
    AvatarOverrideTrait,
    ChainTrait,
    CheckpointTrait,
    CollectableAreaTrait,
    CollectableTrait,
    DEFAULT_TIME_LEADERBOARD,
    DeathOnCollideTrait,
    DialogueNPCTrait,
    DisappearingPlatformTrait,
    DisplayNotificationTrait,
    EnableBySignalTrait,
    GravityAreaTrait,
    LeaderboardTrait,
    LeaderboardSettingsTrait,
    MovingPlatformTrait,
    NPCLookAtNearestPlayerTrait,
    PlayerCheckpointTrait,
    PlayerCollectablesTrait,
    PlayerPermissionsTrait,
    PlayerTimerTrait,
    PlayerTrait,
    ProjectileSpawnerTrait,
    SignalSendOnCollisionTrait,
    SpawnTrait,
    TimerFinishTrait,
    TimerStartTrait,
    VelocityImpulseTrait,
    ZombieTrait,
    EnemyTrait,
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
    lerpVec3,
    normalizeVec3,
    scaleVec3,
    setEntityHidden,
    yawQuatFromDirection,
} from "../shared/utils";

type MovingPlatformState = {
    origin: J.Vec3;
    quaternion: J.Quat;
    startTime: number;
};

type DisappearingState = {
    mode: "visible" | "armed" | "hidden";
    at: number;
    position: J.Vec3;
    quaternion: J.Quat;
};

type RespawnRequest = {
    at: number;
};

type ProjectileState = {
    removeAt: number;
};

type TraitData<T extends { _traitDataType: unknown }> = T["_traitDataType"];

const leaderboardHandles = new Map<string, J.LeaderboardId>();
const movingPlatforms = new Map<J.EntityId, MovingPlatformState>();
const disappearingPlatforms = new Map<J.EntityId, DisappearingState>();
const pendingRespawns = new Map<J.EntityId, RespawnRequest>();
const hiddenCollectables = new Map<J.EntityId, number>();
// Total collectable value per group, captured at game start. Used by the
// Collectable Gate's "require all" so collected (and removed) items still count.
const collectableGroupTotals = new Map<string, number>();
const activeProjectiles = new Map<J.EntityId, ProjectileState>();
const nextProjectileAt = new Map<J.EntityId, number>();
const nextZombiePathAt = new Map<J.EntityId, number>();
const nextLookAtAt = new Map<J.EntityId, number>();
const deathGraceUntil = new Map<J.EntityId, number>();
// Entities currently standing on each "While colliding" pad, so a Hold gate
// stays on until the last one leaves (pressure pad).
const padOccupants = new Map<J.EntityId, Set<J.EntityId>>();
const lastZombieAttackAt = new Map<string, number>();
const zombieAvatarApplied = new Set<J.EntityId>();
const avatarOverrideApplied = new Set<J.EntityId>();
const MIN_DEATH_RESPAWN_SECONDS = 1.1;
const DEATH_RESPAWN_GRACE_SECONDS = 0.75;
export let serverTime = 0;

export function initServerSystems() {
    if (!J.net.isHost) return;

    J.onGameStart((_worldOptions) => {
        const players = J.getAllPlayers();
        defineConfiguredLeaderboards();
        initializeSignalGates();
        initializeMovingPlatforms(0);
        initializeCollectables();
        for (const playerId of players) {
            initializePlayer(playerId);
        }
        runGameStartChains(0);
    });

    J.onPlayerJoin((playerId) => {
        initializePlayer(playerId);
    });

    J.onPlayerLeave((playerId) => {
        pendingRespawns.delete(playerId);
        deathGraceUntil.delete(playerId);
        releasePadOccupant(playerId, serverTime);
    });

    J.onEntityCollisionStart(
        { source: [CheckpointTrait], target: [PlayerTrait] },
        (sourceId, playerId) => {
            handleCheckpoint(sourceId, playerId, serverTime);
        },
    );

    J.onEntityCollisionStart(
        { source: [DeathOnCollideTrait], target: [PlayerTrait] },
        (sourceId, playerId) => {
            handleDeathCollision(sourceId, playerId, serverTime);
        },
    );

    J.onEntityCollisionPersisted(
        { source: [DeathOnCollideTrait], target: [PlayerTrait] },
        (sourceId, playerId) => {
            handleDeathCollision(sourceId, playerId, serverTime);
        },
    );

    J.onEntityCollisionStart(
        { source: [TimerStartTrait], target: [PlayerTrait] },
        (sourceId, playerId) => {
            handleTimerStart(sourceId, playerId, serverTime);
        },
    );

    J.onEntityCollisionStart(
        { source: [TimerFinishTrait], target: [PlayerTrait] },
        (sourceId, playerId) => {
            handleTimerFinish(sourceId, playerId, serverTime);
        },
    );

    J.onEntityCollisionStart(
        { source: [CollectableTrait], target: [PlayerTrait] },
        (sourceId, playerId) => {
            handleCollectable(sourceId, playerId, serverTime);
        },
    );

    J.onEntityCollisionStart(
        { source: [CollectableAreaTrait], target: [PlayerTrait] },
        (sourceId, playerId) => {
            handleCollectableGate(sourceId, playerId, serverTime);
        },
    );

    J.onEntityCollisionStart(
        { source: [VelocityImpulseTrait] },
        (sourceId, targetId) => {
            handleVelocityImpulse(sourceId, targetId);
        },
    );

    J.onEntityCollisionStart(
        { source: [GravityAreaTrait] },
        (sourceId, targetId) => {
            handleGravityAreaStart(sourceId, targetId);
        },
    );

    J.onEntityCollisionEnd(
        { source: [GravityAreaTrait] },
        (sourceId, targetId) => {
            handleGravityAreaEnd(sourceId, targetId);
        },
    );

    J.onEntityCollisionStart(
        { source: [SignalSendOnCollisionTrait] },
        (sourceId, targetId) => {
            handleSignalCollision(sourceId, targetId, "start", serverTime);
        },
    );

    J.onEntityCollisionEnd(
        { source: [SignalSendOnCollisionTrait] },
        (sourceId, targetId) => {
            handleSignalCollision(sourceId, targetId, "end", serverTime);
        },
    );

    J.onEntityCollisionStart(
        { source: [DisappearingPlatformTrait], target: [PlayerTrait] },
        (sourceId) => {
            armDisappearingPlatform(sourceId, serverTime);
        },
    );

    J.onEntityCollisionStart(
        { source: [ZombieTrait], target: [PlayerTrait] },
        (sourceId, playerId) => {
            handleZombieTouch(sourceId, playerId, serverTime);
        },
    );

    J.onEntityCollisionStart(
        { source: [AvatarOverrideTrait], target: [PlayerTrait] },
        (sourceId, playerId) => {
            handleAvatarOverrideCollision(sourceId, playerId);
        },
    );

    J.onEntityCollisionStart(
        { source: [DisplayNotificationTrait], target: [PlayerTrait] },
        (sourceId, playerId) => {
            handleNotificationCollision(sourceId, playerId);
        },
    );

    J.onInteractWithEntity(
        { target: [DialogueNPCTrait] },
        (entityId, triggeredBy) => {
            handleDialogueInteract(entityId, triggeredBy);
        },
    );

    J.onInteractWithEntity(
        { target: [DisplayNotificationTrait] },
        (entityId, triggeredBy) => {
            handleNotificationInteract(entityId, triggeredBy);
        },
    );

    J.onInteractWithEntity(
        { target: [ChainTrait] },
        (entityId, triggeredBy) => {
            runChain(entityId, "interact", triggeredBy, serverTime);
        },
    );

    J.onEntityCollisionStart(
        { source: [ChainTrait] },
        (sourceId, targetId) => {
            runChain(sourceId, "collision", targetId, serverTime);
        },
    );

    J.onGameTick((_deltaTime, time) => {
        serverTime = time;
        tickRespawns(time);
        tickMovingPlatforms(time);
        tickDisappearingPlatforms(time);
        tickCollectableRespawns(time);
        tickProjectileSpawners(time);
        tickProjectiles(time);
        tickZombiePathing(time);
        tickNPCLookAt(time);
        tickAvatarAppearance();
    });
}

function initializePlayer(playerId: J.EntityId) {
    if (!J.getTrait(playerId, PlayerTrait)) {
        J.setTrait(playerId, PlayerTrait, { score: 0, health: 100 });
    }

    if (!J.getTrait(playerId, PlayerCollectablesTrait)) {
        J.setTrait(playerId, PlayerCollectablesTrait, {
            groupId: "default",
            score: 0,
            collectedKeys: [],
        });
    }

    if (!J.getTrait(playerId, PlayerTimerTrait)) {
        J.setTrait(playerId, PlayerTimerTrait, {
            timerId: "main",
            running: false,
            showHUD: false,
            startTime: 0,
            elapsedSeconds: 0,
            bestSeconds: 0,
        });
    }

    const spawn = findSpawn();
    const checkpoint = J.getTrait(playerId, PlayerCheckpointTrait);
    J.setTrait(playerId, PlayerCheckpointTrait, {
        checkpointId: checkpoint?.checkpointId ?? -1,
        spawnId: spawn?.entityId ?? -1,
    });

    applyDefaultPermissions(playerId);

    if (spawn) {
        respawnPlayer(playerId);
    }
}

function applyDefaultPermissions(playerId: J.EntityId) {
    const first = J.getAllWithTraits([PlayerPermissionsTrait])[0];
    if (!first) return;

    const permissions = first[1];
    J.setPlayerPermissions(playerId, {
        canInteract: permissions.canInteract,
        canFly: permissions.canFly,
        canForceRespawn: permissions.canForceRespawn,
        canUseIndividualBlocks: permissions.canUseIndividualBlocks,
    });
}

function findSpawn() {
    const spawns = J.getAllWithTraits([SpawnTrait])
        .filter(([, trait]) => trait.enabled)
        .sort((a, b) => b[1].priority - a[1].priority);

    const first = spawns[0];
    if (!first) return undefined;

    return { entityId: first[0], trait: first[1] };
}

function getPlacementTarget(
    entityId: J.EntityId,
    offset: J.Vec3,
    rotation: J.Vec3,
) {
    const position = J.getEntityPosition(entityId);
    if (!position) return undefined;

    return {
        position: addVec3(position, offset),
        quaternion: eulerDegreesToQuat(rotation),
    };
}

function handleCheckpoint(entityId: J.EntityId, playerId: J.EntityId, time: number) {
    const trait = J.getTrait(entityId, CheckpointTrait);
    if (!trait?.enabled || !isGateActive(entityId)) return;

    const current = J.getTrait(playerId, PlayerCheckpointTrait);
    if (current?.checkpointId === entityId) return;

    J.setTrait(playerId, PlayerCheckpointTrait, {
        checkpointId: entityId,
        spawnId: current?.spawnId ?? -1,
    });

    if (trait.sound) J.net.send(PlayLocalSoundCommand, { sound: trait.sound }, playerId);
    emitSignal(trait.signal, entityId, playerId, time);
}

// Kills a player with the death animation + delayed respawn.  
export function killPlayer(playerId: J.EntityId, time: number, respawnDelaySeconds = 0) {
    if (pendingRespawns.has(playerId)) return false;
    if (J.getCharacterAlive(playerId) === false) return false;
    if (time < (deathGraceUntil.get(playerId) ?? 0)) return false;

    const respawnAt = time + Math.max(MIN_DEATH_RESPAWN_SECONDS, respawnDelaySeconds);
    pendingRespawns.set(playerId, { at: respawnAt });
    J.setCharacterAlive(playerId, false);
    return true;
}

function handleDeathCollision(entityId: J.EntityId, playerId: J.EntityId, time: number) {
    const trait = J.getTrait(entityId, DeathOnCollideTrait);
    if (!trait?.enabled || !isGateActive(entityId)) return;
    if (!killPlayer(playerId, time, trait.respawnDelaySeconds)) return;

    if (trait.sound) J.net.send(PlayLocalSoundCommand, { sound: trait.sound }, playerId);
    if (trait.resetTimer) resetTimer(playerId);
    if (trait.resetCollectables) resetCollectables(playerId);

    emitSignal(trait.signal, entityId, playerId, time);
}

function tickRespawns(time: number) {
    for (const [playerId, request] of pendingRespawns) {
        if (time < request.at) continue;

        respawnPlayer(playerId);
        pendingRespawns.delete(playerId);
        deathGraceUntil.set(playerId, time + DEATH_RESPAWN_GRACE_SECONDS);
    }
}

function respawnPlayer(playerId: J.EntityId) {
    const checkpoint = J.getTrait(playerId, PlayerCheckpointTrait);
    const checkpointId = checkpoint?.checkpointId ?? -1;

    if (checkpointId >= 0) {
        const trait = J.getTrait(checkpointId, CheckpointTrait);
        if (trait?.enabled) {
            respawnPlayerAt(playerId, checkpointId, trait.offset, trait.rotation);
            return;
        }
    }

    const spawn = findSpawn();
    if (spawn) {
        respawnPlayerAt(
            playerId,
            spawn.entityId,
            spawn.trait.offset,
            spawn.trait.rotation,
        );
        return;
    }

    respawnPlayerAtWorldSpawn(playerId);
}

function respawnPlayerAt(
    playerId: J.EntityId,
    entityId: J.EntityId,
    offset: J.Vec3,
    rotation: J.Vec3,
) {
    const target = getPlacementTarget(entityId, offset, rotation);
    if (!target) {
        J.setCharacterAlive(playerId, true);
        J.removeTrait(playerId, PlayerTrait)
        J.setTrait(playerId, PlayerTrait, { score: 0, health: 100 });
        return;
    }

    J.net.send(
        RespawnPlayerCommand,
        {
            playerId,
            position: target.position,
            quaternion: target.quaternion,
        },
        playerId,
    );
    J.setCharacterAlive(playerId, true);
    J.removeTrait(playerId, PlayerTrait)
    J.setTrait(playerId, PlayerTrait, { score: 0, health: 100 });
}

function respawnPlayerAtWorldSpawn(playerId: J.EntityId) {
    const spawn = J.getWorldSpawn();

    J.net.send(
        RespawnPlayerCommand,
        {
            playerId,
            position: spawn.position,
        },
        playerId,
    );
    J.setCharacterAlive(playerId, true);
    J.removeTrait(playerId, PlayerTrait)
    J.setTrait(playerId, PlayerTrait, { score: 0, health: 100 });
}

function handleTimerStart(entityId: J.EntityId, playerId: J.EntityId, time: number) {
    const trait = J.getTrait(entityId, TimerStartTrait);
    if (!trait?.enabled || !isGateActive(entityId)) return;

    if (trait.resetCollectables) resetCollectables(playerId);
    J.setTrait(playerId, PlayerTimerTrait, {
        timerId: trait.timerId,
        running: true,
        showHUD: trait.showHUD,
        startTime: time,
        elapsedSeconds: 0,
        bestSeconds: J.getTrait(playerId, PlayerTimerTrait)?.bestSeconds ?? 0,
    });
    emitSignal(trait.signal, entityId, playerId, time);
}

function handleTimerFinish(entityId: J.EntityId, playerId: J.EntityId, time: number) {
    const trait = J.getTrait(entityId, TimerFinishTrait);
    if (!trait?.enabled || !isGateActive(entityId)) return;

    const timer = J.getTrait(playerId, PlayerTimerTrait);
    if (trait.requireRunningTimer && (!timer || !timer.running)) return;
    if (timer && timer.timerId !== trait.timerId) return;

    const elapsed = timer?.running
        ? Math.max(0, time - timer.startTime)
        : timer?.elapsedSeconds ?? 0;
    const previousBest = timer?.bestSeconds ?? 0;
    const bestSeconds = previousBest > 0 ? Math.min(previousBest, elapsed) : elapsed;

    J.setTrait(playerId, PlayerTimerTrait, {
        timerId: trait.timerId,
        running: trait.stopTimer ? false : Boolean(timer?.running),
        showHUD: timer?.showHUD ?? true,
        startTime: timer?.startTime ?? time,
        elapsedSeconds: elapsed,
        bestSeconds,
    });

    if (trait.sound) J.net.send(PlayLocalSoundCommand, { sound: trait.sound }, playerId);
    if (trait.updateLeaderboard) {
        submitLeaderboardScore(trait.leaderboardId || DEFAULT_TIME_LEADERBOARD, "low", playerId, elapsed);
    }

    emitSignal(trait.signal, entityId, playerId, time);
}

function resetTimer(playerId: J.EntityId) {
    const timer = J.getTrait(playerId, PlayerTimerTrait);
    J.setTrait(playerId, PlayerTimerTrait, {
        timerId: timer?.timerId ?? "main",
        running: false,
        showHUD: false,
        startTime: 0,
        elapsedSeconds: 0,
        bestSeconds: timer?.bestSeconds ?? 0,
    });
}

function handleCollectable(entityId: J.EntityId, playerId: J.EntityId, time: number) {
    const trait = J.getTrait(entityId, CollectableTrait);
    if (!trait?.enabled || !isGateActive(entityId)) return;

    const key = collectableKey(entityId, trait.collectableId);
    const data = J.getTrait(playerId, PlayerCollectablesTrait) ?? {
        groupId: trait.groupId,
        score: 0,
        collectedKeys: [],
    };

    if (data.collectedKeys.includes(key)) return;

    const collectedKeys = [...data.collectedKeys, key];
    J.setTrait(playerId, PlayerCollectablesTrait, {
        groupId: trait.groupId,
        score: data.score + trait.value,
        collectedKeys,
    });

    const player = J.getTrait(playerId, PlayerTrait);
    J.setTrait(playerId, PlayerTrait, {
        score: (player?.score ?? 0) + trait.value,
        health: (player?.health),
    });

    if (trait.sound) J.net.send(PlayLocalSoundCommand, { sound: trait.sound }, playerId);
    emitSignal(trait.signal, entityId, playerId, time);

    if (trait.hideOnCollect) {
        setEntityHidden(entityId, true);
    }

    if (trait.removeOnCollect && trait.respawnSeconds <= 0) {
        J.removeEntity(entityId);
    } else if (trait.respawnSeconds > 0) {
        hiddenCollectables.set(entityId, time + trait.respawnSeconds);
    }
}

function tickCollectableRespawns(time: number) {
    for (const [entityId, respawnAt] of hiddenCollectables) {
        if (time < respawnAt) continue;

        setEntityHidden(entityId, false);
        hiddenCollectables.delete(entityId);
    }
}

function initializeCollectables() {
    collectableGroupTotals.clear();
    for (const [entityId, trait] of J.getAllWithTraits([CollectableTrait])) {
        setEntityHidden(entityId, false);
        collectableGroupTotals.set(
            trait.groupId,
            (collectableGroupTotals.get(trait.groupId) ?? 0) + trait.value,
        );
    }
}

function collectableKey(entityId: J.EntityId, collectableId: string) {
    return collectableId || `${entityId}`;
}

function resetCollectables(playerId: J.EntityId) {
    const data = J.getTrait(playerId, PlayerCollectablesTrait);
    J.setTrait(playerId, PlayerCollectablesTrait, {
        groupId: data?.groupId ?? "default",
        score: 0,
        collectedKeys: [],
    });
}

function handleCollectableGate(entityId: J.EntityId, playerId: J.EntityId, time: number) {
    const trait = J.getTrait(entityId, CollectableAreaTrait);
    if (!trait?.enabled || !isGateActive(entityId)) return;

    const data = J.getTrait(playerId, PlayerCollectablesTrait);
    if (!data || data.groupId !== trait.groupId) return;

    const targetScore = trait.requireAll
        ? collectableGroupTotals.get(trait.groupId) ?? 0
        : trait.minimumScore;

    if (data.score < targetScore) return;

    if (trait.sound) J.net.send(PlayLocalSoundCommand, { sound: trait.sound }, playerId);
    emitSignal(trait.unlockSignal, entityId, playerId, time);
}

function handleVelocityImpulse(sourceId: J.EntityId, targetId: J.EntityId) {
    const trait = J.getTrait(sourceId, VelocityImpulseTrait);
    if (!trait?.enabled || !isGateActive(sourceId)) return;

    J.net.sendToAll(ApplyVelocityImpulseCommand, {
        targetId,
        velocity: trait.velocity,
        additive: trait.additive,
    });

    if (trait.sound) {
        J.net.sendToAll(PlaySpatialSoundCommand, {
            sound: trait.sound,
            entityId: sourceId,
        });
    }
}

function handleGravityAreaStart(sourceId: J.EntityId, targetId: J.EntityId) {
    const trait = J.getTrait(sourceId, GravityAreaTrait);
    if (!trait?.enabled || !isGateActive(sourceId)) return;
    if (trait.target === "player" && !isPlayer(targetId)) return;

    J.setEntityGravityFactor(targetId, trait.gravityFactor);
}

function handleGravityAreaEnd(sourceId: J.EntityId, targetId: J.EntityId) {
    const trait = J.getTrait(sourceId, GravityAreaTrait);
    if (!trait?.enabled) return;
    if (trait.target === "player" && !isPlayer(targetId)) return;

    J.setEntityGravityFactor(targetId, 1);
}

function handleSignalCollision(
    sourceId: J.EntityId,
    targetId: J.EntityId,
    sendOn: string,
    time: number,
) {
    const trait = J.getTrait(sourceId, SignalSendOnCollisionTrait);
    if (!trait?.enabled || !isGateActive(sourceId)) return;
    if (trait.target === "player" && !isPlayer(targetId)) return;

    // Pressure pad: emit held=true when the first occupant arrives and
    // held=false when the last one leaves, so a Hold gate follows occupancy.
    if (trait.sendOn === "both") {
        const occupants = padOccupants.get(sourceId) ?? new Set<J.EntityId>();
        padOccupants.set(sourceId, occupants);
        if (sendOn === "start") {
            const wasEmpty = occupants.size === 0;
            occupants.add(targetId);
            if (wasEmpty) emitSignal(trait.signal, sourceId, targetId, time, true);
        } else {
            occupants.delete(targetId);
            if (occupants.size === 0) emitSignal(trait.signal, sourceId, targetId, time, false);
        }
        return;
    }

    if (trait.sendOn !== sendOn) return;
    emitSignal(trait.signal, sourceId, targetId, time);
}

// Drops a leaving entity from any pad it occupied, releasing the pad if it was
// the last occupant (a disconnect never fires collisionEnd).
function releasePadOccupant(entityId: J.EntityId, time: number) {
    for (const [padId, occupants] of padOccupants) {
        if (!occupants.delete(entityId) || occupants.size > 0) continue;
        const trait = J.getTrait(padId, SignalSendOnCollisionTrait);
        if (trait?.enabled && trait.sendOn === "both") {
            emitSignal(trait.signal, padId, entityId, time, false);
        }
    }
}

function defineConfiguredLeaderboards() {
    getLeaderboardHandle(DEFAULT_TIME_LEADERBOARD, "low");

    for (const [, trait] of J.getAllWithTraits([LeaderboardSettingsTrait])) {
        getLeaderboardHandle(trait.leaderboardId, trait.mode);
    }

    for (const [, trait] of J.getAllWithTraits([LeaderboardTrait])) {
        getLeaderboardHandle(trait.leaderboardId, trait.mode);
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

function submitLeaderboardScore(
    id: string,
    mode: string,
    playerId: J.EntityId,
    score: number,
) {
    const handle = getLeaderboardHandle(id, mode);
    J.leaderboards.getPlayerScore(handle, playerId).then((entry) => {
        const shouldSubmit =
            !entry ||
            (mode === "low" ? score < entry.score : score > entry.score);
        if (!shouldSubmit) return;

        J.leaderboards.setPlayerScore(handle, playerId, score);
    });
}

function initializeSignalGates() {
    for (const [entityId, trait] of J.getAllWithTraits([EnableBySignalTrait])) {
        J.setTrait(entityId, EnableBySignalTrait, {
            ...trait,
            active: trait.startsEnabled,
        });
        setEntityHidden(entityId, !trait.startsEnabled);
    }
}

function isGateActive(entityId: J.EntityId) {
    const gate = J.getTrait(entityId, EnableBySignalTrait);
    return !gate || gate.active;
}

function emitSignal(
    signal: string,
    sourceId: J.EntityId,
    triggeredBy: J.EntityId | undefined,
    time: number,
    held?: boolean,
) {
    if (!signal) return;

    for (const [entityId, gate] of J.getAllWithTraits([EnableBySignalTrait])) {
        if (gate.signal !== signal) continue;

        const active =
            gate.mode === "enable"
                ? true
                : gate.mode === "disable"
                  ? false
                  : gate.mode === "hold"
                    ? held ?? gate.active
                    : !gate.active;

        J.setTrait(entityId, EnableBySignalTrait, { ...gate, active });
        setEntityHidden(entityId, !active);
    }

    for (const [entityId, trait] of J.getAllWithTraits([ChainTrait])) {
        if (trait.trigger === "signal" && trait.inputSignal === signal) {
            runChain(entityId, "signal", triggeredBy, time);
        }
    }

    J.net.sendToAll(BuiltInSignalCommand, { signal, sourceId, triggeredBy, time });
}

function runGameStartChains(time: number) {
    for (const [entityId, trait] of J.getAllWithTraits([ChainTrait])) {
        if (trait.trigger !== "gameStart") continue;
        runChain(entityId, "gameStart", undefined, time);
    }
}

function runChain(
    entityId: J.EntityId,
    trigger: string,
    triggeredBy: J.EntityId | undefined,
    time: number,
) {
    const trait = J.getTrait(entityId, ChainTrait);
    if (!trait?.enabled || trait.trigger !== trigger) return;

    if (trait.action === "emitSignal") {
        emitSignal(trait.outputSignal, entityId, triggeredBy, time);
        return;
    }

    if (trait.action === "removeSelf") {
        J.removeEntity(entityId);
    }
}

function initializeMovingPlatforms(time: number) {
    for (const [entityId] of J.getAllWithTraits([MovingPlatformTrait])) {
        const position = J.getEntityPosition(entityId);
        const quaternion = J.getEntityQuaternion(entityId);
        if (!position || !quaternion) continue;

        movingPlatforms.set(entityId, { origin: position, quaternion, startTime: time });
        J.updatePropPhysicsProperties(entityId, {
            motionType: J.MOTION_TYPE_KINEMATIC,
            gravityFactor: 0,
        });
    }
}

function tickMovingPlatforms(time: number) {
    for (const [entityId, trait] of J.getAllWithTraits([MovingPlatformTrait])) {
        if (!trait.enabled || !isGateActive(entityId)) continue;

        let state = movingPlatforms.get(entityId);
        if (!state) {
            const origin = J.getEntityPosition(entityId);
            const quaternion = J.getEntityQuaternion(entityId);
            if (!origin || !quaternion) continue;
            state = { origin, quaternion, startTime: time };
            movingPlatforms.set(entityId, state);
        }

        const duration = Math.max(0.1, trait.durationSeconds);
        const wait = Math.max(0, trait.waitSeconds);
        const cycle = duration + wait;
        const elapsed = (time - state.startTime) % (trait.pingPong ? cycle * 2 : cycle);
        const reverse = trait.pingPong && elapsed > cycle;
        const cycleTime = reverse ? elapsed - cycle : elapsed;
        const travelTime = Math.min(duration, cycleTime);
        const normalized = travelTime / duration;
        const t = reverse ? 1 - normalized : normalized;
        const start = trait.startAtEnd ? addVec3(state.origin, trait.offset) : state.origin;
        const end = trait.startAtEnd ? state.origin : addVec3(state.origin, trait.offset);

        J.moveKinematicEntity(entityId, lerpVec3(start, end, t), state.quaternion);
    }
}

function armDisappearingPlatform(entityId: J.EntityId, time: number) {
    const trait = J.getTrait(entityId, DisappearingPlatformTrait);
    if (!trait?.enabled || !isGateActive(entityId)) return;

    const existing = disappearingPlatforms.get(entityId);
    if (existing?.mode === "armed" || existing?.mode === "hidden") return;

    const position = J.getEntityPosition(entityId);
    const quaternion = J.getEntityQuaternion(entityId);
    if (!position || !quaternion) return;

    disappearingPlatforms.set(entityId, {
        mode: "armed",
        at: time + trait.disappearAfterSeconds,
        position,
        quaternion,
    });
}

function tickDisappearingPlatforms(time: number) {
    for (const [entityId, state] of disappearingPlatforms) {
        const trait = J.getTrait(entityId, DisappearingPlatformTrait);
        if (!trait) {
            disappearingPlatforms.delete(entityId);
            continue;
        }

        if (state.mode === "armed" && time >= state.at) {
            setEntityHidden(entityId, true);
            if (trait.sound) {
                J.net.sendToAll(PlaySpatialSoundCommand, {
                    sound: trait.sound,
                    entityId,
                });
            }

            disappearingPlatforms.set(entityId, {
                ...state,
                mode: "hidden",
                at: time + trait.respawnAfterSeconds,
            });
            continue;
        }

        if (state.mode === "hidden" && time >= state.at) {
            J.setEntityPosition(entityId, state.position, false);
            J.setEntityQuaternion(entityId, state.quaternion);
            setEntityHidden(entityId, false);
            disappearingPlatforms.delete(entityId);
        }
    }
}

// Applies the spawner's "Projectile traits" collection (a map of trait id to
// trait data from the editor picker) onto a freshly spawned projectile, so the
// existing client and server trait systems drive its behaviour.
function applyProjectileTraits(
    entityId: J.EntityId,
    collection: Record<string, unknown> | undefined,
) {
    if (!collection) return;

    const setAnyTrait = J.setTrait as (
        target: J.EntityId,
        traitId: string,
        value: unknown,
    ) => void;

    for (const [traitId, value] of Object.entries(collection)) {
        if (value && typeof value === "object") setAnyTrait(entityId, traitId, value);
    }
}

function tickProjectileSpawners(time: number) {
    for (const [entityId, trait] of J.getAllWithTraits([ProjectileSpawnerTrait])) {
        if (!trait.enabled || !isGateActive(entityId) || !trait.projectile) continue;

        const nextAt = nextProjectileAt.get(entityId);
        if (nextAt === undefined) {
            nextProjectileAt.set(entityId, time + trait.startDelaySeconds);
            continue;
        }
        if (time < nextAt) continue;
        let position: J.Vec3
        let direction: J.Vec3;
        if (J.getTrait(entityId, PlayerTrait) || J.getTrait(entityId, EnemyTrait).type == "Rook") {
           position = addVec3(J.getEntityPosition(entityId), ([0,1.5,0] as J.Vec3));
        } else {
            position = J.getEntityPosition(entityId);
        };

        if (!position) continue;

        const lookAt = J.getCharacterViewRay(entityId).direction;
        const vel = trait.direction
        if (J.getTrait(entityId, PlayerTrait) || J.getTrait(entityId, EnemyTrait).type == "Rook") {
            direction = normalizeVec3(lookAt);
        } else {
            direction = normalizeVec3(vel);
        };
        const projectile = J.spawnProp(trait.projectile);
        J.setEntityPosition(projectile, addVec3(position, scaleVec3(direction, 1.2)), false);
        J.setEntityQuaternion(projectile, yawQuatFromDirection(normalizeVec3(direction)));
        J.setEntityScale(projectile, trait.scale);
        J.updatePropPhysicsProperties(projectile, {
            motionType: J.MOTION_TYPE_DYNAMIC,
            gravityFactor: 0,
        });
        J.setEntityVelocity(projectile, scaleVec3(direction, trait.speed));
        activeProjectiles.set(projectile, { removeAt: time + trait.lifetimeSeconds });

        // Reuse the Death On Collide flow: tag the projectile so the existing
        // DeathOnCollideTrait collision handlers kill players it touches.
        if (trait.killOnHit) {
            J.setTrait(projectile, DeathOnCollideTrait, {
                enabled: true,
                respawnDelaySeconds: 0,
                resetTimer: false,
                resetCollectables: false,
                signal: "",
            });
        }

        applyProjectileTraits(projectile, trait.projectileTraits);

        if (trait.sound) {
            J.net.sendToAll(PlaySpatialSoundCommand, {
                sound: trait.sound,
                entityId,
            });
        }
        nextProjectileAt.set(entityId, time + trait.fireEverySeconds);
    }
}

function tickProjectiles(time: number) {
    for (const [entityId, state] of activeProjectiles) {
        if (time < state.removeAt) continue;

        J.removeEntity(entityId);
        activeProjectiles.delete(entityId);
    }
}

function tickZombiePathing(time: number) {
    const players = J.getAllPlayers();
    if (players.length === 0) return;

    for (const [entityId, trait] of J.getAllWithTraits([ZombieTrait])) {
        if (!trait.enabled || !isGateActive(entityId)) continue;

        const nextAt = nextZombiePathAt.get(entityId) ?? 0;
        if (time < nextAt) continue;
        nextZombiePathAt.set(entityId, time + trait.repathSeconds);

        const zombiePos = J.getEntityPosition(entityId);
        if (!zombiePos) continue;

        let closestPlayer: J.EntityId | undefined;
        let closestDistance = trait.detectRange * trait.detectRange;

        for (const playerId of players) {
            const playerPos = J.getEntityPosition(playerId);
            if (!playerPos) continue;

            const distance = distanceSquared(zombiePos, playerPos);
            if (distance > closestDistance) continue;

            closestDistance = distance;
            closestPlayer = playerId;
        }

        if (closestPlayer === undefined) {
            J.clearCharacterMoveTarget(entityId);
            continue;
        }

        const targetPos = J.getEntityPosition(closestPlayer);
        if (!targetPos) continue;

        if (closestDistance <= trait.attackRange * trait.attackRange) {
            handleZombieTouch(entityId, closestPlayer, time);
            continue;
        }

        const path = J.findPath(zombiePos, targetPos, trait.searchSize);
        J.setCharacterMoveTarget(entityId, path.success && path.path.length > 0 ? path.path : [targetPos]);
    }
}

function handleZombieTouch(entityId: J.EntityId, playerId: J.EntityId, time: number) {
    const trait = J.getTrait(entityId, ZombieTrait);
    if (!trait?.enabled || !trait.killOnTouch) return;

    const key = `${entityId}:${playerId}`;
    const lastAttack = lastZombieAttackAt.get(key) ?? -1000;
    if (time - lastAttack < trait.damageCooldownSeconds) return;

    lastZombieAttackAt.set(key, time);
    game.damagePlayer(10, playerId, time);
}

function tickNPCLookAt(time: number) {
    const players = J.getAllPlayers();
    if (players.length === 0) return;

    for (const [entityId, trait] of J.getAllWithTraits([NPCLookAtNearestPlayerTrait])) {
        if (!trait.enabled || !isGateActive(entityId)) continue;

        const nextAt = nextLookAtAt.get(entityId) ?? 0;
        if (time < nextAt) continue;
        nextLookAtAt.set(entityId, time + trait.updateSeconds);

        const npcPos = J.getEntityPosition(entityId);
        if (!npcPos) continue;

        let closestPosition: J.Vec3 | undefined;
        let closestDistance = trait.range * trait.range;

        for (const playerId of players) {
            const playerPos = J.getEntityPosition(playerId);
            if (!playerPos) continue;

            const distance = distanceSquared(npcPos, playerPos);
            if (distance > closestDistance) continue;

            closestDistance = distance;
            closestPosition = playerPos;
        }

        if (!closestPosition) continue;
        J.setCharacterLookAtTarget(entityId, closestPosition);
    }
}

function tickAvatarAppearance() {
    for (const [entityId, trait] of J.getAllWithTraits([ZombieTrait])) {
        if (!trait.enabled || !trait.applyZombieAppearance) continue;
        if (zombieAvatarApplied.has(entityId)) continue;

        const current = J.getCharacterAvatar(entityId);
        if (!current) continue;

        J.setCharacterAvatarByConfig(entityId, buildZombieAvatar(current, trait));
        zombieAvatarApplied.add(entityId);
    }

    for (const [entityId, trait] of J.getAllWithTraits([AvatarOverrideTrait])) {
        if (!trait.enabled || trait.applyTo !== "self") continue;
        if (avatarOverrideApplied.has(entityId)) continue;

        const current = J.getCharacterAvatar(entityId);
        if (!current) continue;

        J.setCharacterAvatarByConfig(entityId, buildOverrideAvatar(current, trait));
        avatarOverrideApplied.add(entityId);
    }
}

function handleAvatarOverrideCollision(sourceId: J.EntityId, playerId: J.EntityId) {
    const trait = J.getTrait(sourceId, AvatarOverrideTrait);
    if (!trait?.enabled || trait.applyTo !== "collidingPlayer") return;

    const current = J.getCharacterAvatar(playerId);
    if (!current) return;

    J.setCharacterAvatarByConfig(playerId, buildOverrideAvatar(current, trait));
}

function buildOverrideAvatar(
    base: J.CharacterAvatarConfig,
    trait: TraitData<typeof AvatarOverrideTrait>,
): J.CharacterAvatarConfig {
    const avatar = cloneAvatar(base);
    if (avatar.anim && trait.idleAnimation) {
        avatar.anim.idle = toAvatarAnimationId(trait.idleAnimation);
    }
    if (avatar.anim && trait.runAnimation) {
        avatar.anim.run = toAvatarAnimationId(trait.runAnimation);
    }
    return avatar;
}

function buildZombieAvatar(
    base: J.CharacterAvatarConfig,
    trait: TraitData<typeof ZombieTrait>,
): J.CharacterAvatarConfig {
    const avatar = cloneAvatar(base);

    if (avatar.anim) {
        avatar.anim.idle = toAvatarAnimationId(
            trait.idleAnimation ||
                J.assets.animations.locomotion_zombie_idle?.id ||
                avatar.anim.idle,
        );
        avatar.anim.run = toAvatarAnimationId(
            trait.runAnimation ||
                J.assets.animations.locomotion_zombie_run?.id ||
                avatar.anim.run,
        );
    }

    return avatar;
}

function cloneAvatar(config: J.CharacterAvatarConfig): J.CharacterAvatarConfig {
    return JSON.parse(JSON.stringify(config)) as J.CharacterAvatarConfig;
}

function handleNotificationCollision(sourceId: J.EntityId, playerId: J.EntityId) {
    const trait = J.getTrait(sourceId, DisplayNotificationTrait);
    if (!trait?.enabled || trait.trigger !== "collision") return;

    J.net.send(
        ShowNotificationCommand,
        {
            message: trait.message,
            durationSeconds: trait.durationSeconds,
            sound: trait.sound,
        },
        playerId,
    );
}

function handleNotificationInteract(entityId: J.EntityId, playerId: J.EntityId) {
    const trait = J.getTrait(entityId, DisplayNotificationTrait);
    if (!trait?.enabled || trait.trigger !== "interact") return;

    J.net.send(
        ShowNotificationCommand,
        {
            message: trait.message,
            durationSeconds: trait.durationSeconds,
            sound: trait.sound,
        },
        playerId,
    );
}

function handleDialogueInteract(entityId: J.EntityId, playerId: J.EntityId) {
    const trait = J.getTrait(entityId, DialogueNPCTrait);
    if (!trait?.enabled || !isGateActive(entityId)) return;

    const npcPosition = J.getEntityPosition(entityId);
    const playerPosition = J.getEntityPosition(playerId);
    if (!npcPosition || !playerPosition) return;
    if (distanceSquared(npcPosition, playerPosition) > trait.range * trait.range) return;

    J.net.send(
        OpenDialogueCommand,
        {
            npcId: entityId,
            title: trait.title,
            lines: trait.lines,
            animation: trait.animation,
            animationMode:
                trait.animationMode === "loop" || trait.animationMode === "hold"
                    ? trait.animationMode
                    : "once",
            sound: trait.sound,
        },
        playerId,
    );
}

function isPlayer(entityId: J.EntityId) {
    return Boolean(J.getTrait(entityId, PlayerTrait));
}

function toAvatarAnimationId(
    value: string | null | undefined,
): NonNullable<J.CharacterAvatarConfig["anim"]>["idle"] {
    return value as NonNullable<J.CharacterAvatarConfig["anim"]>["idle"];
}
