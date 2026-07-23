import * as J from "jamango";

const S = J.schema;

const colorString = (label: string, defaultValue: string) =>
    S.string({ label, defaultValue, control: "input" });

const signalString = (label = "Signal") =>
    S.string({ label, defaultValue: "", control: "input" });

const audioAsset = (label: string) =>
    S.asset({ label, assetTypes: ["audio"], optional: true });

const animationAsset = (label: string, optional = true) =>
    S.asset({ label, assetTypes: ["animation"], optional });

const propAsset = (label: string, optional = true) =>
    S.asset({ label, assetTypes: ["prop"], optional });

const runtimeNumber = (label: string, defaultValue = 0) =>
    S.number({ label, defaultValue, hidden: true });

export const PlayerTrait = J.defineTrait(
    "player",
    S.object({
        score: S.number({ label: "Score", defaultValue: 0, hidden: true }),
        health: S.number({ label: "Health", defaultValue: 0, hidden: true}),
    }),
    {
        name: "Player",
        icon: "👤",
        description: "Runtime player marker used by built-in traits.",
        color: "#4f9df8",
    },
);

export const PlayerPermissionsTrait = J.defineTrait(
    "playerPermissions",
    S.object({
        canInteract: S.boolean({ label: "Can interact", defaultValue: true }),
        canFly: S.boolean({ label: "Can fly", defaultValue: false }),
        canForceRespawn: S.boolean({
            label: "Can force respawn",
            defaultValue: true,
        }),
        canUseIndividualBlocks: S.boolean({
            label: "Can use individual blocks",
            defaultValue: true,
        }),
    }),
    {
        name: "Player Permissions",
        icon: "🛡️",
        description: "Sets default player permissions when players join.",
        color: "#6895ff",
    },
);

export const SpawnTrait = J.defineTrait(
    "spawn",
    S.object({
        enabled: S.boolean({ label: "Enabled", defaultValue: true }),
        priority: S.number({
            label: "Priority",
            defaultValue: 0,
            precision: "integer",
        }),
        offset: S.vec3({
            label: "Spawn offset",
            defaultValue: [0, 2, 0],
            control: "vector",
        }),
        rotation: S.vec3({
            label: "Spawn rotation degrees",
            defaultValue: [0, 0, 0],
            control: "vector",
        }),
    }),
    {
        name: "Spawn",
        icon: "📍",
        description: "Spawns players at this prop or area.",
        color: "#30c48d",
    },
);

export const CheckpointTrait = J.defineTrait(
    "checkpoint",
    S.object({
        enabled: S.boolean({ label: "Enabled", defaultValue: true }),
        priority: S.number({
            label: "Priority",
            defaultValue: 0,
            precision: "integer",
        }),
        offset: S.vec3({
            label: "Respawn offset",
            defaultValue: [0, 2, 0],
            control: "vector",
        }),
        rotation: S.vec3({
            label: "Respawn rotation degrees",
            defaultValue: [0, 0, 0],
            control: "vector",
        }),
        sound: audioAsset("Checkpoint sound"),
        signal: signalString("Signal to send"),
    }),
    {
        name: "Checkpoint",
        icon: "🚩",
        description: "Updates a player's respawn point when they touch it.",
        color: "#43d97b",
    },
);

export const PlayerCheckpointTrait = J.defineTrait(
    "playerCheckpoint",
    S.object({
        checkpointId: runtimeNumber("Checkpoint id", -1),
        spawnId: runtimeNumber("Spawn id", -1),
    }),
);

export const DeathOnCollideTrait = J.defineTrait(
    "deathOnCollide",
    S.object({
        enabled: S.boolean({ label: "Enabled", defaultValue: true }),
        respawnDelaySeconds: S.number({
            label: "Respawn delay",
            defaultValue: 0,
            min: 0,
            max: 10,
        }),
        resetTimer: S.boolean({ label: "Reset timer", defaultValue: false }),
        resetCollectables: S.boolean({
            label: "Reset collectables",
            defaultValue: false,
        }),
        sound: audioAsset("Death sound"),
        signal: signalString("Signal to send"),
    }),
    {
        name: "Death On Collide",
        icon: "💀",
        description: "Respawns players who touch this object.",
        color: "#ff5d5d",
    },
);

export const EnableBySignalTrait = J.defineTrait(
    "enableBySignal",
    S.object({
        signal: signalString(),
        startsEnabled: S.boolean({
            label: "Starts enabled",
            defaultValue: true,
        }),
        mode: S.string({
            label: "Mode",
            defaultValue: "toggle",
            control: "select",
            options: [
                { label: "Toggle", value: "toggle" },
                { label: "Enable", value: "enable" },
                { label: "Disable", value: "disable" },
                { label: "Hold while colliding", value: "hold" },
            ],
        }),
        active: S.boolean({
            label: "Runtime active",
            defaultValue: true,
            hidden: true,
        }),
    }),
    {
        name: "Enable By Signal",
        icon: "⚡",
        description: "Gates another trait or object until a signal toggles it.",
        color: "#f6c15d",
    },
);

// Synced flag driven by setEntityHidden(), applied to visibility in tickVisibility().
export const VisibilityTrait = J.defineTrait(
    "visibility",
    S.object({
        visible: S.boolean({ label: "Visible", defaultValue: true, hidden: true }),
    }),
);

export const SignalSendOnCollisionTrait = J.defineTrait(
    "signalSendOnCollision",
    S.object({
        enabled: S.boolean({ label: "Enabled", defaultValue: true }),
        signal: signalString(),
        target: S.string({
            label: "Collides with",
            defaultValue: "player",
            control: "select",
            options: [
                { label: "Player", value: "player" },
                { label: "Any entity", value: "any" },
            ],
        }),
        sendOn: S.string({
            label: "Send on",
            defaultValue: "start",
            control: "select",
            options: [
                { label: "Start", value: "start" },
                { label: "End", value: "end" },
                { label: "While colliding", value: "both" },
            ],
        }),
    }),
    {
        name: "Send Signal On Collision",
        icon: "📡",
        description: "Sends a named signal when a collision starts or ends.",
        color: "#f2bb54",
    },
);

export const BobbingTrait = J.defineTrait(
    "bobbing",
    S.object({
        enabled: S.boolean({ label: "Enabled", defaultValue: true }),
        axis: S.vec3({
            label: "Axis",
            defaultValue: [0, 1, 0],
            control: "direction",
        }),
        amplitude: S.number({
            label: "Amplitude",
            defaultValue: 0.35,
            min: 0,
            max: 20,
        }),
        speed: S.number({ label: "Speed", defaultValue: 1.2, min: 0 }),
        phase: S.number({ label: "Phase", defaultValue: 0 }),
    }),
    {
        name: "Bobbing",
        icon: "〰️",
        description: "Adds lightweight looping motion to props.",
        color: "#4eb7ff",
    },
);

export const SpinningTrait = J.defineTrait(
    "spinning",
    S.object({
        enabled: S.boolean({ label: "Enabled", defaultValue: true }),
        axis: S.vec3({
            label: "Axis",
            defaultValue: [0, 1, 0],
            control: "direction",
        }),
        speedDegreesPerSecond: S.number({
            label: "Speed",
            defaultValue: 90,
        }),
    }),
    {
        name: "Spinning",
        icon: "🌀",
        description: "Rotates a prop at a steady speed.",
        color: "#5fb8ff",
    },
);

export const MovingPlatformTrait = J.defineTrait(
    "movingPlatform",
    S.object({
        enabled: S.boolean({ label: "Enabled", defaultValue: true }),
        offset: S.vec3({
            label: "Offset",
            defaultValue: [0, 0, 8],
            control: "vector",
        }),
        durationSeconds: S.number({
            label: "Travel time",
            defaultValue: 3,
            min: 0.1,
        }),
        waitSeconds: S.number({ label: "Wait time", defaultValue: 0, min: 0 }),
        pingPong: S.boolean({ label: "Ping pong", defaultValue: true }),
        startAtEnd: S.boolean({ label: "Start at end", defaultValue: false }),
    }),
    {
        name: "Moving Platform",
        icon: "↔️",
        description: "Moves a prop between two points using kinematic motion.",
        color: "#73c7ff",
    },
);

export const DisappearingPlatformTrait = J.defineTrait(
    "disappearingPlatform",
    S.object({
        enabled: S.boolean({ label: "Enabled", defaultValue: true }),
        disappearAfterSeconds: S.number({
            label: "Disappear after",
            defaultValue: 0.35,
            min: 0,
        }),
        respawnAfterSeconds: S.number({
            label: "Respawn after",
            defaultValue: 2,
            min: 0,
        }),
        sound: audioAsset("Disappear sound"),
    }),
    {
        name: "Disappearing Platform",
        icon: "👻",
        description: "Hides and disables a platform shortly after contact.",
        color: "#8aa5ff",
    },
);

export const VelocityImpulseTrait = J.defineTrait(
    "velocityImpulse",
    S.object({
        enabled: S.boolean({ label: "Enabled", defaultValue: true }),
        velocity: S.vec3({
            label: "Velocity",
            defaultValue: [0, 18, 0],
            control: "vector",
        }),
        additive: S.boolean({ label: "Add to velocity", defaultValue: false }),
        predictable: S.boolean({ label: "Predictable", defaultValue: true }),
        sound: audioAsset("Impulse sound"),
    }),
    {
        name: "Velocity Impulse",
        icon: "🚀",
        description: "Launches players or entities on contact.",
        color: "#ffe066",
    },
);

export const GravityAreaTrait = J.defineTrait(
    "gravityArea",
    S.object({
        enabled: S.boolean({ label: "Enabled", defaultValue: true }),
        gravityFactor: S.number({
            label: "Gravity factor",
            defaultValue: 0.25,
            min: -4,
            max: 4,
        }),
        target: S.string({
            label: "Target",
            defaultValue: "player",
            control: "select",
            options: [
                { label: "Player", value: "player" },
                { label: "Any entity", value: "any" },
            ],
        }),
    }),
    {
        name: "Gravity Area",
        icon: "🌙",
        description: "Changes gravity for players or entities inside an area.",
        color: "#75d9b3",
    },
);

export const TimerStartTrait = J.defineTrait(
    "timerStart",
    S.object({
        enabled: S.boolean({ label: "Enabled", defaultValue: true }),
        timerId: S.string({ label: "Timer id", defaultValue: "main" }),
        resetCollectables: S.boolean({
            label: "Reset collectables",
            defaultValue: false,
        }),
        showHUD: S.boolean({ label: "Show HUD", defaultValue: true }),
        signal: signalString("Signal to send"),
    }),
    {
        name: "Timer Start",
        icon: "⏱️",
        description: "Starts a player timer when touched.",
        color: "#39d0a4",
    },
);

export const TimerFinishTrait = J.defineTrait(
    "timerFinish",
    S.object({
        enabled: S.boolean({ label: "Enabled", defaultValue: true }),
        timerId: S.string({ label: "Timer id", defaultValue: "main" }),
        leaderboardId: S.string({
            label: "Leaderboard id",
            defaultValue: "template_best_times_v1",
        }),
        updateLeaderboard: S.boolean({
            label: "Update leaderboard",
            defaultValue: true,
        }),
        stopTimer: S.boolean({ label: "Stop timer", defaultValue: true }),
        requireRunningTimer: S.boolean({
            label: "Require running timer",
            defaultValue: true,
        }),
        signal: signalString("Signal to send"),
        sound: audioAsset("Finish sound"),
    }),
    {
        name: "Timer Finish",
        icon: "🏁",
        description: "Stops a timer and can submit the result to a leaderboard.",
        color: "#ffd166",
    },
);

export const PlayerTimerTrait = J.defineTrait(
    "playerTimer",
    S.object({
        timerId: S.string({ label: "Timer id", defaultValue: "main", hidden: true }),
        running: S.boolean({ label: "Running", defaultValue: false, hidden: true }),
        showHUD: S.boolean({ label: "Show HUD", defaultValue: false, hidden: true }),
        startTime: runtimeNumber("Start time"),
        elapsedSeconds: runtimeNumber("Elapsed seconds"),
        bestSeconds: runtimeNumber("Best seconds", 0),
    }),
);

export const LeaderboardSettingsTrait = J.defineTrait(
    "leaderboardSettings",
    S.object({
        leaderboardId: S.string({
            label: "Leaderboard id",
            defaultValue: "template_best_times_v1",
        }),
        mode: S.string({
            label: "Mode",
            defaultValue: "low",
            control: "select",
            options: [
                { label: "Lowest score wins", value: "low" },
                { label: "Highest score wins", value: "high" },
            ],
        }),
    }),
    {
        name: "Leaderboard Settings",
        icon: "🏆",
        description: "Defines a server leaderboard for score or time traits.",
        color: "#f6c358",
    },
);

export const LeaderboardTrait = J.defineTrait(
    "leaderboard",
    S.object({
        enabled: S.boolean({ label: "Enabled", defaultValue: true }),
        leaderboardId: S.string({
            label: "Leaderboard id",
            defaultValue: "template_best_times_v1",
        }),
        title: S.string({ label: "Title", defaultValue: "Best Times" }),
        mode: S.string({
            label: "Mode",
            defaultValue: "low",
            control: "select",
            options: [
                { label: "Lowest score wins", value: "low" },
                { label: "Highest score wins", value: "high" },
            ],
        }),
        display: S.string({
            label: "Display",
            defaultValue: "hud",
            control: "select",
            options: [
                { label: "HUD", value: "hud" },
                { label: "World label", value: "world" },
                { label: "Both", value: "both" },
            ],
        }),
        format: S.string({
            label: "Format",
            defaultValue: "time",
            control: "select",
            options: [
                { label: "Time", value: "time" },
                { label: "Number", value: "number" },
            ],
        }),
        maxRows: S.number({
            label: "Rows",
            defaultValue: 5,
            min: 1,
            max: 10,
            precision: "integer",
        }),
        refreshSeconds: S.number({
            label: "Refresh every",
            defaultValue: 5,
            min: 1,
        }),
    }),
    {
        name: "Leaderboard",
        icon: "🏆",
        description: "Shows current leaderboard data without per-frame DOM rebuilds.",
        color: "#ffd166",
    },
);

export const CollectableTrait = J.defineTrait(
    "collectable",
    S.object({
        enabled: S.boolean({ label: "Enabled", defaultValue: true }),
        collectableId: S.string({ label: "Collectable id", defaultValue: "" }),
        groupId: S.string({ label: "Group id", defaultValue: "default" }),
        value: S.number({
            label: "Value",
            defaultValue: 1,
            precision: "integer",
        }),
        removeOnCollect: S.boolean({
            label: "Remove on collect",
            defaultValue: true,
        }),
        hideOnCollect: S.boolean({
            label: "Hide on collect",
            defaultValue: true,
        }),
        collectRadius: S.number({
            label: "Collect radius",
            defaultValue: 1.6,
            min: 0.1,
        }),
        respawnSeconds: S.number({
            label: "Respawn after",
            defaultValue: 0,
            min: 0,
        }),
        sound: audioAsset("Collect sound"),
        signal: signalString("Signal to send"),
    }),
    {
        name: "Collectable",
        icon: "💎",
        description: "Collectable item with server-side scoring.",
        color: "#ff8ec7",
    },
);

export const PlayerCollectablesTrait = J.defineTrait(
    "playerCollectables",
    S.object({
        groupId: S.string({ label: "Group id", defaultValue: "default", hidden: true }),
        score: runtimeNumber("Score"),
        collectedKeys: S.list(S.string({ label: "Key" }), {
            label: "Collected keys",
            hidden: true,
        }),
    }),
);

export const CollectableAreaTrait = J.defineTrait(
    "collectableArea",
    S.object({
        enabled: S.boolean({ label: "Enabled", defaultValue: true }),
        groupId: S.string({ label: "Group id", defaultValue: "default" }),
        requireAll: S.boolean({ label: "Require all", defaultValue: true }),
        minimumScore: S.number({
            label: "Minimum score",
            defaultValue: 0,
            precision: "integer",
        }),
        unlockSignal: signalString("Signal to send on unlock"),
        sound: audioAsset("Unlock sound"),
    }),
    {
        name: "Collectable Gate",
        icon: "🔓",
        description: "Sends a signal when a player has enough collectables.",
        color: "#f19ccc",
    },
);

export const CounterHUDTrait = J.defineTrait(
    "counterHUD",
    S.object({
        enabled: S.boolean({ label: "Enabled", defaultValue: true }),
        label: S.string({ label: "Label", defaultValue: "Score" }),
        source: S.string({
            label: "Source",
            defaultValue: "collectables",
            control: "select",
            options: [
                { label: "Collectables", value: "collectables" },
                { label: "Player score", value: "playerScore" },
                { label: "Timer", value: "timer" },
            ],
        }),
        groupId: S.string({ label: "Group id", defaultValue: "default" }),
        position: S.string({
            label: "Position",
            defaultValue: "left-middle",
            control: "select",
            options: [
                { label: "Left middle", value: "left-middle" },
                { label: "Left middle top", value: "left-middle-top" },
                { label: "Left middle bottom", value: "left-middle-bottom" },
                { label: "Top middle", value: "top-middle" },
                { label: "Bottom middle", value: "bottom-middle" },
            ],
        }),
        format: S.string({
            label: "Format",
            defaultValue: "number",
            control: "select",
            options: [
                { label: "Number", value: "number" },
                { label: "Time", value: "time" },
            ],
        }),
    }),
    {
        name: "Counter HUD",
        icon: "🔢",
        description: "Cached HUD counter for score, collectables, or timer data.",
        color: "#64d6ff",
    },
);

export const DisplayNotificationTrait = J.defineTrait(
    "displayNotification",
    S.object({
        enabled: S.boolean({ label: "Enabled", defaultValue: true }),
        message: S.string({
            label: "Message",
            defaultValue: "Nice!",
            control: "textarea",
        }),
        durationSeconds: S.number({
            label: "Duration",
            defaultValue: 2.5,
            min: 0.5,
            max: 12,
        }),
        trigger: S.string({
            label: "Trigger",
            defaultValue: "collision",
            control: "select",
            options: [
                { label: "Collision", value: "collision" },
                { label: "Interact", value: "interact" },
                { label: "Game start", value: "gameStart" },
            ],
        }),
        sound: audioAsset("Sound"),
    }),
    {
        name: "Display Notification",
        icon: "💬",
        description: "Shows a cached notification toast.",
        color: "#6fd7ff",
    },
);

export const PlaySoundOnCollisionTrait = J.defineTrait(
    "playSoundOnCollision",
    S.object({
        enabled: S.boolean({ label: "Enabled", defaultValue: true }),
        sound: audioAsset("Sound"),
        volume: S.number({
            label: "Volume",
            defaultValue: 1,
            min: 0,
            max: 2,
        }),
        target: S.string({
            label: "Target",
            defaultValue: "player",
            control: "select",
            options: [
                { label: "Player", value: "player" },
                { label: "Any entity", value: "any" },
            ],
        }),
        playAt: S.string({
            label: "Play at",
            defaultValue: "entity",
            control: "select",
            options: [
                { label: "Entity", value: "entity" },
                { label: "World", value: "world" },
                { label: "Local", value: "local" },
            ],
        }),
    }),
    {
        name: "Play Sound On Collision",
        icon: "🔊",
        description: "Plays a sound when this entity is touched.",
        color: "#ffc65b",
    },
);

export const BGMPlaylistTrait = J.defineTrait(
    "bgmPlaylist",
    S.object({
        enabled: S.boolean({ label: "Enabled", defaultValue: true }),
        tracks: S.list(audioAsset("Track"), { label: "Tracks" }),
        shuffle: S.boolean({ label: "Shuffle", defaultValue: false }),
        volume: S.number({
            label: "Volume",
            defaultValue: 0.7,
            min: 0,
            max: 1,
        }),
        fadeInSeconds: S.number({ label: "Fade in", defaultValue: 0.5, min: 0 }),
        loopSingleTrack: S.boolean({
            label: "Loop single track",
            defaultValue: false,
        }),
    }),
    {
        name: "BGM Playlist",
        icon: "🎵",
        description: "Plays background music on clients without per-frame DOM work.",
        color: "#b4a3ff",
    },
);

export const NPCNameTrait = J.defineTrait(
    "npcName",
    S.object({
        enabled: S.boolean({ label: "Enabled", defaultValue: true }),
        text: S.string({ label: "Name", defaultValue: "NPC" }),
        color: S.vec3({
            label: "Name color",
            defaultValue: [1, 1, 1],
            control: "vector",
        }),
        visible: S.boolean({ label: "Visible", defaultValue: true }),
    }),
    {
        name: "NPC Name",
        icon: "🏷️",
        description: "Sets an NPC nameplate with cached updates.",
        color: "#a3d7ff",
    },
);

export const DialogueNPCTrait = J.defineTrait(
    "dialogueNPC",
    S.object({
        enabled: S.boolean({ label: "Enabled", defaultValue: true }),
        title: S.string({ label: "Title", defaultValue: "NPC" }),
        lines: S.list(S.string({ label: "Line", control: "textarea" }), {
            label: "Dialogue lines",
        }),
        range: S.number({ label: "Interact range", defaultValue: 6, min: 1 }),
        animation: animationAsset("Talk animation"),
        animationMode: S.string({
            label: "Animation mode",
            defaultValue: "once",
            control: "select",
            options: [
                { label: "Once", value: "once" },
                { label: "Loop", value: "loop" },
                { label: "Hold", value: "hold" },
            ],
        }),
        sound: audioAsset("Open sound"),
    }),
    {
        name: "Dialogue NPC",
        icon: "💭",
        description: "Interactable dialogue using Jamango controls, not raw DOM key listeners.",
        color: "#b9d3ff",
    },
);

export const NPCAnimationLoopTrait = J.defineTrait(
    "npcAnimationLoop",
    S.object({
        enabled: S.boolean({ label: "Enabled", defaultValue: true }),
        animation: animationAsset("Animation", false),
        mode: S.string({
            label: "Mode",
            defaultValue: "loop",
            control: "select",
            options: [
                { label: "Loop", value: "loop" },
                { label: "Once", value: "once" },
                { label: "Hold", value: "hold" },
            ],
        }),
        speed: S.number({ label: "Speed", defaultValue: 1, min: 0 }),
        fadeIn: S.number({ label: "Fade in", defaultValue: 0.1, min: 0 }),
        cancelOnMove: S.boolean({
            label: "Cancel on move",
            defaultValue: false,
        }),
    }),
    {
        name: "NPC Animation Loop",
        icon: "▶️",
        description: "Plays authored animation clips with the new animation API.",
        color: "#c7b6ff",
    },
);

export const NPCLookAtNearestPlayerTrait = J.defineTrait(
    "npcLookAtNearestPlayer",
    S.object({
        enabled: S.boolean({ label: "Enabled", defaultValue: true }),
        range: S.number({ label: "Range", defaultValue: 16, min: 1 }),
        updateSeconds: S.number({
            label: "Update every",
            defaultValue: 0.25,
            min: 0.05,
        }),
        headOnly: S.boolean({ label: "Head only", defaultValue: false }),
    }),
    {
        name: "NPC Look At Nearest Player",
        icon: "👀",
        description: "Throttled NPC look-at logic.",
        color: "#98d5ff",
    },
);

export const ZombieTrait = J.defineTrait(
    "zombie",
    S.object({
        enabled: S.boolean({ label: "Enabled", defaultValue: true }),
        applyZombieAppearance: S.boolean({
            label: "Apply zombie appearance",
            defaultValue: true,
        }),
        preserveHeadAndLegs: S.boolean({
            label: "Preserve head and legs",
            defaultValue: true,
        }),
        skinColorPrimary: colorString("Skin primary", "#a6b97f"),
        skinColorSecondary: colorString("Skin secondary", "#8a975c"),
        mouthId: S.string({
            label: "Mouth",
            defaultValue: "Mouth_Horror.png",
        }),
        idleAnimation: animationAsset("Zombie idle"),
        runAnimation: animationAsset("Zombie run"),
        detectRange: S.number({ label: "Detect range", defaultValue: 28, min: 1 }),
        attackRange: S.number({ label: "Attack range", defaultValue: 2.4, min: 0.5 }),
        maxHealth: S.number({ label: "Max Health", defaultValue: 10}),
        health: S.number({ label: "Health", defaultValue: 10, hidden: true}),
        damageCooldownSeconds: S.number({
            label: "Attack cooldown",
            defaultValue: 1,
            min: 0,
        }),
        killOnTouch: S.boolean({ label: "Kill on touch", defaultValue: true }),
        repathSeconds: S.number({
            label: "Repath every",
            defaultValue: 0.45,
            min: 0.1,
        }),
        searchSize: S.number({
            label: "Path search size",
            defaultValue: 48,
            min: 8,
            max: 128,
        }),
    }),
    {
        name: "Zombie",
        icon: "🧟",
        description: "NPC chaser that can apply zombie avatar parts and locomotion.",
        color: "#91b870",
    },
);

export const AvatarOverrideTrait = J.defineTrait(
    "avatarOverride",
    S.object({
        enabled: S.boolean({ label: "Enabled", defaultValue: true }),
        applyTo: S.string({
            label: "Apply to",
            defaultValue: "self",
            control: "select",
            options: [
                { label: "This character", value: "self" },
                { label: "Colliding player", value: "collidingPlayer" },
            ],
        }),
        skinColorPrimary: colorString("Skin primary", ""),
        skinColorSecondary: colorString("Skin secondary", ""),
        mouthId: S.string({ label: "Mouth", defaultValue: "" }),
        idleAnimation: animationAsset("Idle animation"),
        runAnimation: animationAsset("Run animation"),
        headComponent: S.string({ label: "Head component", defaultValue: "" }),
        chestComponent: S.string({ label: "Chest component", defaultValue: "" }),
        waistComponent: S.string({ label: "Waist component", defaultValue: "" }),
        armLeftComponent: S.string({ label: "Left arm component", defaultValue: "" }),
        armRightComponent: S.string({ label: "Right arm component", defaultValue: "" }),
        handLeftComponent: S.string({ label: "Left hand component", defaultValue: "" }),
        handRightComponent: S.string({ label: "Right hand component", defaultValue: "" }),
        legLeftComponent: S.string({ label: "Left leg component", defaultValue: "" }),
        legRightComponent: S.string({ label: "Right leg component", defaultValue: "" }),
        footLeftComponent: S.string({ label: "Left foot component", defaultValue: "" }),
        footRightComponent: S.string({ label: "Right foot component", defaultValue: "" }),
        revertSignal: signalString("Revert signal"),
    }),
    {
        name: "Avatar Override",
        icon: "👕",
        description: "Partially overrides avatar colors, face, animation, or components.",
        color: "#a9c47c",
    },
);

// Curated set of built-in GLB item ids (value) with readable labels.
// Full registry is much larger; add more ids here as needed.
const HELD_ITEM_OPTIONS = [
    { label: "Pistol", value: "item_pistol" },
    { label: "Revolver", value: "item_revolver" },
    { label: "SMG", value: "item_smg" },
    { label: "Rifle", value: "item_rifle" },
    { label: "AK Rifle", value: "item_assaultRifleAK" },
    { label: "Tactical Rifle", value: "item_assaultRifleTact" },
    { label: "Pump Shotgun", value: "item_shotgunPump" },
    { label: "Double Barrel", value: "item_shotgunDoubleB" },
    { label: "Sniper (scope)", value: "item_sniperRifleScope" },
    { label: "Sniper (iron)", value: "item_sniperRifleIron" },
    { label: "Tommy Gun", value: "item_tommyGun" },
    { label: "Hand Cannon", value: "item_handCannon" },
    { label: "Bazooka", value: "item_bazooka" },
    { label: "Grappling Hook", value: "item_grapplingHookGun" },
    { label: "Alien Blaster", value: "item_alienBlaster" },
    { label: "Sword", value: "item_sword" },
    { label: "Axe", value: "item_axe" },
    { label: "Battle Axe", value: "item_battleaxe" },
    { label: "Dagger", value: "item_dagger" },
    { label: "Mace", value: "item_mace" },
    { label: "Spiked Mace", value: "item_spikedMace" },
    { label: "Spear", value: "item_spear" },
    { label: "Trident", value: "item_trident" },
    { label: "Scythe", value: "item_scythe" },
    { label: "Hammer", value: "item_hammer" },
    { label: "Pickaxe", value: "item_pickaxe" },
    { label: "Baseball Bat", value: "item_baseballBat" },
    { label: "Bone", value: "item_bone" },
    { label: "Bow", value: "item_bow" },
    { label: "Staff", value: "item_staff" },
    { label: "Wand", value: "item_wand" },
    { label: "Lightning Bolt", value: "item_lightningBolt" },
    { label: "Small Shield", value: "item_smallShield" },
    { label: "Medium Shield", value: "item_medShield" },
    { label: "Tower Shield", value: "item_towerShield" },
    { label: "Drill", value: "item_drill" },
    { label: "Paint Brush", value: "item_paintBrush" },
    { label: "Bucket", value: "item_bucket" },
    { label: "Football", value: "item_football" },
    { label: "Flag", value: "item_flag" },
];

// Hold poses are `_over` clips: they pose the arms while locomotion keeps running.
const HOLD_POSE_OPTIONS = [
    { label: "None", value: "" },
    { label: "Tool", value: "items_tools_idle_over" },
    { label: "Melee (one-handed)", value: "items_melee_idle_over" },
    { label: "Pistol (one-handed gun)", value: "items_oneHanded_idle_over" },
    { label: "Rifle (two-handed gun)", value: "items_fightTwoHanded_idle_over" },
    { label: "Shield", value: "items_shield_idle_over" },
];

const SLOT_OPTIONS = [
    { label: "Right hand", value: "handRight" },
    { label: "Left hand", value: "handLeft" },
    { label: "Head", value: "head" },
    { label: "Chest", value: "chest" },
    { label: "Waist", value: "waist" },
];

export const HeldItemTrait = J.defineTrait(
    "heldItem",
    S.object({
        enabled: S.boolean({ label: "Enabled", defaultValue: true }),
        // Discriminated union: the editor shows only the selected variant's
        // field (item picker for "item", prop asset for "prop").
        source: S.union("type", [
            S.object({
                type: S.literal("item", { label: "Item" }),
                item: S.string({
                    label: "Item",
                    defaultValue: "item_smg",
                    control: "select",
                    options: HELD_ITEM_OPTIONS,
                }),
            }),
            S.object({
                type: S.literal("prop", { label: "Prop" }),
                prop: propAsset("Prop"),
            }),
        ]),
        slot: S.string({
            label: "Slot",
            defaultValue: "handRight",
            control: "select",
            options: SLOT_OPTIONS,
        }),
        holdPose: S.string({
            label: "Hold pose",
            defaultValue: "items_oneHanded_idle_over",
            control: "select",
            options: HOLD_POSE_OPTIONS,
        }),
        firstPerson: S.boolean({ label: "Show in first person", defaultValue: true }),
        // Third-person transform (what everyone sees).
        position: S.vec3({ label: "Position", defaultValue: [0, 0, 0], control: "vector" }),
        rotation: S.vec3({ label: "Rotation degrees", defaultValue: [0, 0, 0], control: "vector" }),
        scale: S.number({ label: "Scale", defaultValue: 1.3, min: 0.01 }),
        // First-person transform (camera-relative, only the local holder sees it).
        fpPosition: S.vec3({ label: "FP position", defaultValue: [0.5, -0.7, -0.7], control: "vector" }),
        fpRotation: S.vec3({ label: "FP rotation degrees", defaultValue: [0, 0, 0], control: "vector" }),
        fpScale: S.number({ label: "FP scale", defaultValue: 1, min: 0.01 }),
    }),
    {
        name: "Held Item",
        icon: "⚔️",
        description: "Holds a synced item/prop in a character's hand, with first- and third-person views.",
        color: "#ffb36b",
    },
);

export const PlayAnimationOnSignalTrait = J.defineTrait(
    "playAnimationOnSignal",
    S.object({
        enabled: S.boolean({ label: "Enabled", defaultValue: true }),
        signal: signalString(),
        animation: animationAsset("Animation", false),
        mode: S.string({
            label: "Mode",
            defaultValue: "once",
            control: "select",
            options: [
                { label: "Once", value: "once" },
                { label: "Loop", value: "loop" },
                { label: "Hold", value: "hold" },
            ],
        }),
        speed: S.number({ label: "Speed", defaultValue: 1, min: 0 }),
        fadeIn: S.number({ label: "Fade in", defaultValue: 0.05, min: 0 }),
    }),
    {
        name: "Play Animation On Signal",
        icon: "✨",
        description: "Plays a character animation when a built-in signal fires.",
        color: "#c5a1ff",
    },
);

export const ProjectileSpawnerTrait = J.defineTrait(
    "projectileSpawner",
    S.object({
        enabled: S.boolean({ label: "Enabled", defaultValue: true }),
        projectile: propAsset("Projectile prop", false),
        killOnHit: S.boolean({ label: "Kill on hit", defaultValue: false }),
        direction: S.vec3({
            label: "Direction",
            defaultValue: [0, 0, 1],
            control: "direction",
        }),
        speed: S.number({ label: "Speed", defaultValue: 24, min: 0 }),
        fireEverySeconds: S.number({
            label: "Fire every",
            defaultValue: 1.5,
            min: 0.05,
        }),
        lifetimeSeconds: S.number({
            label: "Lifetime",
            defaultValue: 5,
            min: 0.1,
        }),
        scale: S.number({ label: "Scale", defaultValue: 1, min: 0.05 }),
        startDelaySeconds: S.number({
            label: "Start delay",
            defaultValue: 0,
            min: 0,
        }),
        sound: audioAsset("Fire sound"),
        // Traits added here are applied to every spawned projectile, so a
        // projectile can bob, spin, kill on touch, emit signals, and so on
        // through the existing trait systems.
        projectileTraits: S.traits({ label: "Projectile traits" }),
    }),
    {
        name: "Projectile Spawner",
        icon: "🎯",
        description: "Spawns moving prop projectiles on a fixed cadence.",
        color: "#ff9b73",
    },
);

export const EnemyTrait = J.defineTrait(
    "enemy",
    S.object({
        health: S.number({ label: "Health", defaultValue: 10 })
    }),
    {
        name: "Enemy",
        icon: "🔴",
        description: "Creates a player enemy",
        color: "#ff0000ff"
    }
);

export const EnemyDamageTrait = J.defineTrait(
    "enemyDamage",
    S.object({
        damage: S.number({ label: "Damage", defaultValue: 10 }),
    }),
    {
        name: "Enemy Damage",
        icon: "💔",
        description: "Damages an enemy",
        color: "#007b91"
    },
);

export const ChainTrait = J.defineTrait(
    "chain",
    S.object({
        enabled: S.boolean({ label: "Enabled", defaultValue: true }),
        trigger: S.string({
            label: "Trigger",
            defaultValue: "interact",
            control: "select",
            options: [
                { label: "Game start", value: "gameStart" },
                { label: "Interact", value: "interact" },
                { label: "Collision", value: "collision" },
                { label: "Signal", value: "signal" },
            ],
        }),
        inputSignal: signalString("Input signal"),
        action: S.string({
            label: "Action",
            defaultValue: "emitSignal",
            control: "select",
            options: [
                { label: "Emit signal", value: "emitSignal" },
                { label: "Remove self", value: "removeSelf" },
            ],
        }),
        outputSignal: signalString("Output signal"),
    }),
    {
        name: "Chain",
        icon: "🔗",
        description: "Beginner-friendly trigger/action glue for no-code worlds.",
        color: "#f7c66a",
    },
);

export const EnemyStealTrait = J.defineTrait(
    "enemySteal",
    S.object({
        damage: S.number({ label: "Damage", defaultValue: 10 }),
        player: S.entityId({ label: "Player Entity" }),
    }),
    {
        name: "Enemy Steal",
        icon: "🥷",
        description: "Steals health from enemy",
        color: "#ffff00"
    }
)

export const DEFAULT_TIME_LEADERBOARD = "template_best_times_v1";
