# Idea5 Project Documentation

This document describes exported traits, functions, types, and commands in the Idea5 Jamango project.

## Table of Contents

- [Traits](#traits)
- [Commands](#commands)
- [Types](#types)
- [Client functions](#client-functions)
- [Server functions](#server-functions)
- [Shared functions](#shared-functions)
- [Vehicle system](#vehicle-system)

---

## Traits

Each trait is defined in `src/traits/index.ts` using `J.defineTrait`.

### `PlayerTrait`
- ID: `player`
- Description: Runtime player marker used by built-in traits.
- Fields:
  - `score`: hidden number, default `0`

### `PlayerPermissionsTrait`
- ID: `playerPermissions`
- Description: Sets default player permissions when players join.
- Fields:
  - `canInteract`: boolean, default `true`
  - `canFly`: boolean, default `false`
  - `canForceRespawn`: boolean, default `true`
  - `canUseIndividualBlocks`: boolean, default `true`

### `SpawnTrait`
- ID: `spawn`
- Description: Spawns players at this prop or area.
- Fields:
  - `enabled`: boolean, default `true`
  - `priority`: integer number, default `0`
  - `offset`: vec3, default `[0, 2, 0]`
  - `rotation`: vec3, default `[0, 0, 0]`

### `CheckpointTrait`
- ID: `checkpoint`
- Description: Updates a player's respawn point when they touch it.
- Fields:
  - `enabled`: boolean, default `true`
  - `priority`: integer number, default `0`
  - `offset`: vec3, default `[0, 2, 0]`
  - `rotation`: vec3, default `[0, 0, 0]`
  - `sound`: optional audio asset
  - `signal`: string signal name

### `PlayerCheckpointTrait`
- ID: `playerCheckpoint`
- Description: Runtime checkpoint/spawn state for each player.
- Fields:
  - `checkpointId`: runtime number, default `-1`
  - `spawnId`: runtime number, default `-1`

### `DeathOnCollideTrait`
- ID: `deathOnCollide`
- Description: Respawns players who touch this object.
- Fields:
  - `enabled`: boolean, default `true`
  - `respawnDelaySeconds`: number, default `0`
  - `resetTimer`: boolean, default `false`
  - `resetCollectables`: boolean, default `false`
  - `sound`: optional audio asset
  - `signal`: string signal name

### `EnableBySignalTrait`
- ID: `enableBySignal`
- Description: Gates another trait or object until a signal toggles it.
- Fields:
  - `signal`: string
  - `startsEnabled`: boolean, default `true`
  - `mode`: select of `toggle`, `enable`, `disable`, `hold`
  - `active`: hidden boolean, runtime active state

### `VisibilityTrait`
- ID: `visibility`
- Description: Client-visible sync flag used by visibility logic.
- Fields:
  - `visible`: hidden boolean, default `true`

### `SignalSendOnCollisionTrait`
- ID: `signalSendOnCollision`
- Description: Sends a named signal when a collision starts, ends, or while colliding.
- Fields:
  - `enabled`: boolean, default `true`
  - `signal`: string
  - `target`: `player` or `any`
  - `sendOn`: `start`, `end`, or `both`

### `BobbingTrait`
- ID: `bobbing`
- Description: Adds lightweight looping motion to props.
- Fields:
  - `enabled`: boolean, default `true`
  - `axis`: vec3 direction, default `[0, 1, 0]`
  - `amplitude`: number, default `0.35`
  - `speed`: number, default `1.2`
  - `phase`: number, default `0`

### `SpinningTrait`
- ID: `spinning`
- Description: Rotates a prop at a steady speed.
- Fields:
  - `enabled`: boolean, default `true`
  - `axis`: vec3 direction, default `[0, 1, 0]`
  - `speedDegreesPerSecond`: number, default `90`

### `MovingPlatformTrait`
- ID: `movingPlatform`
- Description: Moves a prop between two points using kinematic motion.
- Fields:
  - `enabled`: boolean, default `true`
  - `offset`: vec3, default `[0, 0, 8]`
  - `durationSeconds`: number, default `3`
  - `waitSeconds`: number, default `0`
  - `pingPong`: boolean, default `true`
  - `startAtEnd`: boolean, default `false`

### `DisappearingPlatformTrait`
- ID: `disappearingPlatform`
- Description: Hides and disables a platform shortly after contact.
- Fields:
  - `enabled`: boolean, default `true`
  - `disappearAfterSeconds`: number, default `0.35`
  - `respawnAfterSeconds`: number, default `2`
  - `sound`: optional audio asset

### `VelocityImpulseTrait`
- ID: `velocityImpulse`
- Description: Launches players or entities on contact.
- Fields:
  - `enabled`: boolean, default `true`
  - `velocity`: vec3, default `[0, 18, 0]`
  - `additive`: boolean, default `false`
  - `predictable`: boolean, default `true`
  - `sound`: optional audio asset

### `GravityAreaTrait`
- ID: `gravityArea`
- Description: Changes gravity for players or entities inside an area.
- Fields:
  - `enabled`: boolean, default `true`
  - `gravityFactor`: number, default `0.25`
  - `target`: `player` or `any`

### `TimerStartTrait`
- ID: `timerStart`
- Description: Starts a player timer when touched.
- Fields:
  - `enabled`: boolean, default `true`
  - `timerId`: string, default `main`
  - `resetCollectables`: boolean, default `false`
  - `showHUD`: boolean, default `true`
  - `signal`: string signal name

### `TimerFinishTrait`
- ID: `timerFinish`
- Description: Stops a timer and can submit the result to a leaderboard.
- Fields:
  - `enabled`: boolean, default `true`
  - `timerId`: string, default `main`
  - `leaderboardId`: string, default `template_best_times_v1`
  - `updateLeaderboard`: boolean, default `true`
  - `stopTimer`: boolean, default `true`
  - `requireRunningTimer`: boolean, default `true`
  - `signal`: string signal name
  - `sound`: optional audio asset

### `PlayerTimerTrait`
- ID: `playerTimer`
- Description: Runtime timer state for a player.
- Fields:
  - `timerId`: hidden string, default `main`
  - `running`: hidden boolean, default `false`
  - `showHUD`: hidden boolean, default `false`
  - `startTime`: runtime number
  - `elapsedSeconds`: runtime number
  - `bestSeconds`: runtime number

### `LeaderboardSettingsTrait`
- ID: `leaderboardSettings`
- Description: Defines a leaderboard and its mode.
- Fields:
  - `leaderboardId`: string, default `template_best_times_v1`
  - `mode`: `low` or `high`

### `LeaderboardTrait`
- ID: `leaderboard`
- Description: Displays leaderboard data in HUD, world, or both.
- Fields:
  - `enabled`: boolean, default `true`
  - `leaderboardId`: string, default `template_best_times_v1`
  - `title`: string, default `Best Times`
  - `mode`: `low` or `high`
  - `display`: `hud`, `world`, or `both`
  - `format`: `time` or `number`
  - `maxRows`: integer, default `5`
  - `refreshSeconds`: number, default `5`

### `CollectableTrait`
- ID: `collectable`
- Description: Collectable item with server-side scoring.
- Fields:
  - `enabled`: boolean, default `true`
  - `collectableId`: string
  - `groupId`: string, default `default`
  - `value`: integer number, default `1`
  - `removeOnCollect`: boolean, default `true`
  - `hideOnCollect`: boolean, default `true`
  - `collectRadius`: number, default `1.6`
  - `respawnSeconds`: number, default `0`
  - `sound`: optional audio asset
  - `signal`: string signal name

### `PlayerCollectablesTrait`
- ID: `playerCollectables`
- Description: Runtime collectable state for a player.
- Fields:
  - `groupId`: hidden string, default `default`
  - `score`: runtime number
  - `collectedKeys`: hidden list of strings

### `CollectableAreaTrait`
- ID: `collectableArea`
- Description: Sends a signal when a player has enough collectables.
- Fields:
  - `enabled`: boolean, default `true`
  - `groupId`: string, default `default`
  - `requireAll`: boolean, default `true`
  - `minimumScore`: integer number, default `0`
  - `unlockSignal`: string signal name
  - `sound`: optional audio asset

### `CounterHUDTrait`
- ID: `counterHUD`
- Description: Cached HUD counter for score, collectables, or timer data.
- Fields:
  - `enabled`: boolean, default `true`
  - `label`: string, default `Score`
  - `source`: `collectables`, `playerScore`, or `timer`
  - `groupId`: string, default `default`
  - `position`: HUD position string
  - `format`: `number` or `time`

### `DisplayNotificationTrait`
- ID: `displayNotification`
- Description: Shows a cached notification toast.
- Fields:
  - `enabled`: boolean, default `true`
  - `message`: string
  - `durationSeconds`: number, default `2.5`
  - `trigger`: `collision`, `interact`, or `gameStart`
  - `sound`: optional audio asset

### `PlaySoundOnCollisionTrait`
- ID: `playSoundOnCollision`
- Description: Plays a sound when this entity is touched.
- Fields:
  - `enabled`: boolean, default `true`
  - `sound`: audio asset
  - `volume`: number, default `1`
  - `target`: `player` or `any`
  - `playAt`: `entity`, `world`, or `local`

### `BGMPlaylistTrait`
- ID: `bgmPlaylist`
- Description: Plays background music on clients.
- Fields:
  - `enabled`: boolean, default `true`
  - `tracks`: list of audio assets
  - `shuffle`: boolean, default `false`
  - `volume`: number, default `0.7`
  - `fadeInSeconds`: number, default `0.5`
  - `loopSingleTrack`: boolean, default `false`

### `NPCNameTrait`
- ID: `npcName`
- Description: Sets an NPC nameplate with cached updates.
- Fields:
  - `enabled`: boolean, default `true`
  - `text`: string, default `NPC`
  - `color`: vec3, default `[1, 1, 1]`
  - `visible`: boolean, default `true`

### `DialogueNPCTrait`
- ID: `dialogueNPC`
- Description: Interactable dialogue NPC behavior.
- Fields:
  - `enabled`: boolean, default `true`
  - `title`: string, default `NPC`
  - `lines`: list of strings
  - `range`: number, default `6`
  - `animation`: optional animation asset
  - `animationMode`: `once`, `loop`, or `hold`
  - `sound`: optional audio asset

### `NPCAnimationLoopTrait`
- ID: `npcAnimationLoop`
- Description: Plays an animation clip on a character.
- Fields:
  - `enabled`: boolean, default `true`
  - `animation`: optional animation asset
  - `mode`: `loop`, `once`, or `hold`
  - `speed`: number, default `1`
  - `fadeIn`: number, default `0.1`
  - `cancelOnMove`: boolean, default `false`

### `NPCLookAtNearestPlayerTrait`
- ID: `npcLookAtNearestPlayer`
- Description: Makes NPCs look at the nearest player.
- Fields:
  - `enabled`: boolean, default `true`
  - `range`: number, default `16`
  - `updateSeconds`: number, default `0.25`
  - `headOnly`: boolean, default `false`

### `ZombieTrait`
- ID: `zombie`
- Description: NPC chaser with pathfinding and attack behavior.
- Fields:
  - `enabled`: boolean, default `true`
  - `applyZombieAppearance`: boolean, default `true`
  - `preserveHeadAndLegs`: boolean, default `true`
  - `skinColorPrimary`: string color
  - `skinColorSecondary`: string color
  - `mouthId`: string
  - `idleAnimation`: optional animation asset
  - `runAnimation`: optional animation asset
  - `detectRange`: number, default `28`
  - `attackRange`: number, default `2.4`
  - `damageCooldownSeconds`: number, default `1`
  - `killOnTouch`: boolean, default `true`
  - `repathSeconds`: number, default `0.45`
  - `searchSize`: number, default `48`

### `AvatarOverrideTrait`
- ID: `avatarOverride`
- Description: Overrides avatar appearance and animation.
- Fields:
  - `enabled`: boolean, default `true`
  - `applyTo`: `self` or `collidingPlayer`
  - `skinColorPrimary`: color string
  - `skinColorSecondary`: color string
  - `mouthId`: string
  - `idleAnimation`: optional animation asset
  - `runAnimation`: optional animation asset
  - component fields for head, chest, waist, arms, hands, legs, feet
  - `revertSignal`: string signal name

### `HeldItemTrait`
- ID: `heldItem`
- Description: Holds an item or prop in a character slot.
- Fields:
  - `enabled`: boolean, default `true`
  - `source`: union of item or prop
  - `slot`: `handRight`, `handLeft`, `head`, `chest`, or `waist`
  - `holdPose`: string animation id
  - `firstPerson`: boolean, default `true`
  - `position`: vec3
  - `rotation`: vec3
  - `scale`: number, default `1.3`
  - `fpPosition`: vec3
  - `fpRotation`: vec3
  - `fpScale`: number, default `1`

### `PlayAnimationOnSignalTrait`
- ID: `playAnimationOnSignal`
- Description: Plays a character animation when a signal fires.
- Fields:
  - `enabled`: boolean, default `true`
  - `signal`: string
  - `animation`: optional animation asset
  - `mode`: `once`, `loop`, or `hold`
  - `speed`: number, default `1`
  - `fadeIn`: number, default `0.05`

### `ProjectileSpawnerTrait`
- ID: `projectileSpawner`
- Description: Spawns moving projectiles on a cadence.
- Fields:
  - `enabled`: boolean, default `true`
  - `projectile`: prop asset
  - `killOnHit`: boolean, default `false`
  - `direction`: vec3
  - `speed`: number, default `24`
  - `fireEverySeconds`: number, default `1.5`
  - `lifetimeSeconds`: number, default `5`
  - `scale`: number, default `1`
  - `startDelaySeconds`: number, default `0`
  - `sound`: optional audio asset
  - `projectileTraits`: trait picker for spawned projectile traits

### `ChainTrait`
- ID: `chain`
- Description: Triggers actions from collision, interact, game start, or signal.
- Fields:
  - `enabled`: boolean, default `true`
  - `trigger`: `gameStart`, `interact`, `collision`, or `signal`
  - `inputSignal`: string signal name
  - `action`: `emitSignal` or `removeSelf`
  - `outputSignal`: string signal name

### `DEFAULT_TIME_LEADERBOARD`
- Value: `template_best_times_v1`
- Description: Default leaderboard id for timer finishes.

---

## Commands

Defined in `src/shared/commands.ts`.

### `ShowNotificationCommand`
- Payload: `{ message: string; durationSeconds: number; sound?: string }`
- Description: Sends a toast notification to clients.

### `PlayLocalSoundCommand`
- Payload: `{ sound: string; volume?: number }`
- Description: Plays a local sound on the receiving client.

### `BuiltInSignalCommand`
- Payload: `{ signal: string; sourceId: J.EntityId; triggeredBy?: J.EntityId; time: number }`
- Description: Broadcasts an internal signal event to all clients.

### `OpenDialogueCommand`
- Payload: `{ npcId: J.EntityId; title: string; lines: string[]; animation?: string; animationMode: "once" | "loop" | "hold"; sound?: string }`
- Description: Opens NPC dialogue UI for a client.

### `PlaySpatialSoundCommand`
- Payload: `{ sound: string; entityId?: J.EntityId; position?: J.Vec3; volume?: number }`
- Description: Plays sound at an entity or world position on clients.

### `RespawnPlayerCommand`
- Payload: `{ playerId: J.EntityId; position: J.Vec3; quaternion?: J.Quat }`
- Description: Teleports a player to a respawn position.

### `ApplyVelocityImpulseCommand`
- Payload: `{ targetId: J.EntityId; velocity: J.Vec3; additive: boolean }`
- Description: Applies velocity to an entity.

---

## Types

### `Wheel`
Defined in `src/shared/vehicle.ts`.
- `prop`: string
- `radius`: number
- `steer`: boolean
- `powered`: boolean
- `directionLocal`: J.Vec3
- `axleLocal`: J.Vec3
- suspension and friction settings
- `forwardAcceleration`: number
- `sideAcceleration`: number
- `chassisConnectionPointLocal`: J.Vec3

### `WheelState`
Defined in `src/shared/vehicle.ts`.
- `position`: Vec3
- `quat`: Quat
- `directionWorld`: Vec3
- `grounded`: boolean
- `groundNormal`: Vec3
- `groundPosition`: Vec3
- `groundEntityId`: J.EntityId | undefined
- suspension, impulse, slip, rotation, and input fields
- `axleWorld`: Vec3
- `slipInfo`: number
- `skidInfo`: number
- `sliding`: boolean

### `VehicleState`
Defined in `src/shared/vehicle.ts`.
- `chassisEntityId`: J.EntityId
- `serverChassisEntityId`: J.EntityId
- `localChassisEntityId`: J.EntityId | undefined
- `wheels`: Wheel[]
- `wheelStates`: WheelState[]
- `wheelClientProps`: J.EntityId[]
- `drivingCharacter`: J.EntityId | undefined
- `sliding`: boolean

### Client-only state types
Defined in `src/client/systems.ts`.
- `CounterState`
- `LeaderboardRowState`
- `LeaderboardState`
- `Text3DState`
- `DialogueDOM`
- `DialogueState`
- `BGMState`
- `AttachmentState`

### Server-only state types
Defined in `src/server/systems.ts`.
- `MovingPlatformState`
- `DisappearingState`
- `RespawnRequest`
- `ProjectileState`
- `TraitData<T>`

---

## Client functions

### `ensureHUDRoot()`
- File: `src/client/hud-kit.ts`
- Description: Ensures the HUD root DOM element exists and injects required styles.
- Returns: `HTMLDivElement | undefined`

### `createHUDPanel(className: string)`
- Description: Creates a HUD panel element under the HUD root.
- Returns: `HTMLDivElement | undefined`

### `createText(parent, className, value = "")`
- Description: Creates a text div inside a HUD panel.
- Returns: `HTMLDivElement`

### `setText(element, value)`
- Description: Updates text content when changed.

### `setDisplay(element, visible, display = "block")`
- Description: Shows or hides a HUD element.

### `showToast(message, durationSeconds, time)`
- Description: Displays a toast notification element.

### `tickToast(time)`
- Description: Hides the toast when its time expires.

### `showWorldInteractPrompt(worldPosition, text, yOffset = 0)`
- Description: Shows a world-space interaction hint near the given position.

### `hideWorldInteractPrompt()`
- Description: Hides the interaction prompt.

### `positionClass(position)`
- Description: Converts a HUD position string into a CSS class.

### `initClientSystems()`
- File: `src/client/systems.ts`
- Description: Sets up client-side game behavior, including HUD rendering, dialogue, sound, animation, and visibility.

### `initVehicleUI()`
- File: `src/client/vehicle-ui.ts`
- Description: Creates vehicle enter/exit hints and updates them based on player gaze and mount state.

---

## Server functions

### `setInitialMovementSettings(playerId)`
- File: `src/config.ts`
- Description: Sets default movement properties for a player.

### `initServerSystems()`
- File: `src/server/systems.ts`
- Description: Initializes server-side game systems: spawning, checkpoints, hazards, collectables, timers, signals, platforms, projectiles, zombies, dialogue, notifications, and more.

---

## Shared functions

### `setEntityHidden(entityId, hidden)`
- File: `src/shared/utils.ts`
- Description: Disables physics and syncs a visibility trait for hidden entities.

### `clamp(value, min, max)`
- Description: Clamps a number between min and max.

### `distanceSquared(a, b)`
- Description: Returns squared distance between two vectors.

### `addVec3(a, b)`
- Description: Returns vector addition.

### `scaleVec3(v, scalar)`
- Description: Scales a vector.

### `lerpVec3(a, b, t)`
- Description: Interpolates between two vectors.

### `normalizeVec3(v)`
- Description: Normalizes a vector.

### `multiplyQuat(a, b)`
- Description: Multiplies two quaternions.

### `eulerDegreesToQuat(rotation)`
- Description: Converts Euler degrees to a quaternion.

### `quatForward(q)`
- Description: Computes the forward direction from a quaternion.

### `yawQuatFromDirection(direction)`
- Description: Computes a yaw-only quaternion from a direction vector.

### `secondsToClock(seconds)`
- Description: Formats seconds as `M:SS.hh`.

### `formatScore(score, format)`
- Description: Formats a numeric score as time or number.

### `nonEmpty(value)`
- Description: Type guard for non-empty strings.

### `stableString(value)`
- Description: Converts undefined to empty string.

---

## Vehicle system

### `VehicleTrait`
- File: `src/shared/vehicle.ts`
- Description: Defines a vehicle trait for drivable props.
- Trait fields: engine force, brake force, steering, and wheel definitions.

### `PlayerVehicleMountTrait`
- Description: Runtime state to mark a mounted player.

### `RequestVehicleMountCommand`, `VehicleMountCommand`, `RequestVehicleDismountCommand`, `VehicleDismountCommand`
- Description: Vehicle mount/dismount request and acknowledgment commands.

### `ClientVehicleUpdateCommand`, `ServerVehicleUpdateCommand`
- Description: Serialized vehicle movement sync commands.

### `Wheel`
- Description: Vehicle wheel configuration.

### `WheelState`
- Description: Per-wheel runtime physics state.

### `VehicleState`
- Description: Full vehicle runtime state.

### `initVehicle(chassisEntityId)`
- Description: Initializes a new vehicle state and chassis physics.
- Returns: `VehicleState`

### `updateVehicle(state, applyForces, dt)`
- Description: Updates vehicle physics each frame.

### `initVehicleSystem()`
- Description: Installs the vehicle update loop and network sync.

---

## Notes

- The server code contains the actual gameplay implementations for traits.
- The client code handles presentation, UI, and local visuals.
- Traits that are purely runtime state are `PlayerCheckpointTrait`, `PlayerTimerTrait`, `PlayerCollectablesTrait`, and `VisibilityTrait`.

---

*Generated from the current project source files.*
