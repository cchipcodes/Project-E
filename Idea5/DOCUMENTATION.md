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

### `AvatarOverrideTrait`
- ID: `avatarOverride`
- Authority: shared data, applied on the client for appearance and animation overrides
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

### `BGMPlaylistTrait`
- ID: `bgmPlaylist`
- Authority: client
- Description: Plays background music on clients.
- Fields:
  - `enabled`: boolean, default `true`
  - `tracks`: list of audio assets
  - `shuffle`: boolean, default `false`
  - `volume`: number, default `0.7`
  - `fadeInSeconds`: number, default `0.5`
  - `loopSingleTrack`: boolean, default `false`

### `BobbingTrait`
- ID: `bobbing`
- Authority: client
- Description: Adds lightweight looping motion to props.
- Fields:
  - `enabled`: boolean, default `true`
  - `axis`: vec3 direction, default `[0, 1, 0]`
  - `amplitude`: number, default `0.35`
  - `speed`: number, default `1.2`
  - `phase`: number, default `0`

### `ChainTrait`
- ID: `chain`
- Authority: server
- Description: Triggers actions from collision, interact, game start, or signal.
- Fields:
  - `enabled`: boolean, default `true`
  - `trigger`: `gameStart`, `interact`, `collision`, or `signal`
  - `inputSignal`: string signal name
  - `action`: `emitSignal` or `removeSelf`
  - `outputSignal`: string signal name

### `CheckpointTrait`
- ID: `checkpoint`
- Authority: server
- Description: Updates a player's respawn point when they touch it.
- Fields:
  - `enabled`: boolean, default `true`
  - `priority`: integer number, default `0`
  - `offset`: vec3, default `[0, 2, 0]`
  - `rotation`: vec3, default `[0, 0, 0]`
  - `sound`: optional audio asset
  - `signal`: string signal name

### `CollectableAreaTrait`
- ID: `collectableArea`
- Authority: server
- Description: Sends a signal when a player has enough collectables.
- Fields:
  - `enabled`: boolean, default `true`
  - `groupId`: string, default `default`
  - `requireAll`: boolean, default `true`
  - `minimumScore`: integer number, default `0`
  - `unlockSignal`: string signal name
  - `sound`: optional audio asset

### `CollectableTrait`
- ID: `collectable`
- Authority: server
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

### `CounterHUDTrait`
- ID: `counterHUD`
- Authority: client
- Description: Cached HUD counter for score, collectables, or timer data.
- Fields:
  - `enabled`: boolean, default `true`
  - `label`: string, default `Score`
  - `source`: `collectables`, `playerScore`, or `timer`
  - `groupId`: string, default `default`
  - `position`: HUD position string
  - `format`: `number` or `time`

### `DeathOnCollideTrait`
- ID: `deathOnCollide`
- Authority: server
- Description: Respawns players who touch this object.
- Fields:
  - `enabled`: boolean, default `true`
  - `respawnDelaySeconds`: number, default `0`
  - `resetTimer`: boolean, default `false`
  - `resetCollectables`: boolean, default `false`
  - `sound`: optional audio asset
  - `signal`: string signal name

### `DialogueNPCTrait`
- ID: `dialogueNPC`
- Authority: server + client UI
- Description: Interactable dialogue NPC behavior.
- Fields:
  - `enabled`: boolean, default `true`
  - `title`: string, default `NPC`
  - `lines`: list of strings
  - `range`: number, default `6`
  - `animation`: optional animation asset
  - `animationMode`: `once`, `loop`, or `hold`
  - `sound`: optional audio asset

### `DisappearingPlatformTrait`
- ID: `disappearingPlatform`
- Authority: server
- Description: Hides and disables a platform shortly after contact.
- Fields:
  - `enabled`: boolean, default `true`
  - `disappearAfterSeconds`: number, default `0.35`
  - `respawnAfterSeconds`: number, default `2`
  - `sound`: optional audio asset

### `DisplayNotificationTrait`
- ID: `displayNotification`
- Authority: server + client display
- Description: Shows a cached notification toast.
- Fields:
  - `enabled`: boolean, default `true`
  - `message`: string
  - `durationSeconds`: number, default `2.5`
  - `trigger`: `collision`, `interact`, or `gameStart`
  - `sound`: optional audio asset

### `EnableBySignalTrait`
- ID: `enableBySignal`
- Authority: server
- Description: Gates another trait or object until a signal toggles it.
- Fields:
  - `signal`: string
  - `startsEnabled`: boolean, default `true`
  - `mode`: select of `toggle`, `enable`, `disable`, `hold`
  - `active`: hidden boolean, runtime active state

### `EnemyDamageTrait`
- ID: `enemyDamage`
- Authority: shared data payload, consumed by server damage logic
- Description: Stores damage data used by combat interactions.
- Fields:
  - `damage`: number, default `10`

### `GravityAreaTrait`
- ID: `gravityArea`
- Authority: server
- Description: Changes gravity for players or entities inside an area.
- Fields:
  - `enabled`: boolean, default `true`
  - `gravityFactor`: number, default `0.25`
  - `target`: `player` or `any`

### `HeldItemTrait`
- ID: `heldItem`
- Authority: shared data, client attachment consumer
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

### `LeaderboardSettingsTrait`
- ID: `leaderboardSettings`
- Authority: server
- Description: Defines a leaderboard and its mode.
- Fields:
  - `leaderboardId`: string, default `template_best_times_v1`
  - `mode`: `low` or `high`

### `LeaderboardTrait`
- ID: `leaderboard`
- Authority: client
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

### `MovingPlatformTrait`
- ID: `movingPlatform`
- Authority: server
- Description: Moves a prop between two points using kinematic motion.
- Fields:
  - `enabled`: boolean, default `true`
  - `offset`: vec3, default `[0, 0, 8]`
  - `durationSeconds`: number, default `3`
  - `waitSeconds`: number, default `0`
  - `pingPong`: boolean, default `true`
  - `startAtEnd`: boolean, default `false`

### `NPCAnimationLoopTrait`
- ID: `npcAnimationLoop`
- Authority: client
- Description: Plays an animation clip on a character.
- Fields:
  - `enabled`: boolean, default `true`
  - `animation`: optional animation asset
  - `mode`: `loop`, `once`, or `hold`
  - `speed`: number, default `1`
  - `fadeIn`: number, default `0.1`
  - `cancelOnMove`: boolean, default `false`

### `NPCNameTrait`
- ID: `npcName`
- Authority: client
- Description: Sets an NPC nameplate with cached updates.
- Fields:
  - `enabled`: boolean, default `true`
  - `text`: string, default `NPC`
  - `color`: vec3, default `[1, 1, 1]`
  - `visible`: boolean, default `true`

### `NPCLookAtNearestPlayerTrait`
- ID: `npcLookAtNearestPlayer`
- Authority: server
- Description: Makes NPCs look at the nearest player.
- Fields:
  - `enabled`: boolean, default `true`
  - `range`: number, default `16`
  - `updateSeconds`: number, default `0.25`
  - `headOnly`: boolean, default `false`

### `PlayAnimationOnSignalTrait`
- ID: `playAnimationOnSignal`
- Authority: client
- Description: Plays a character animation when a signal fires.
- Fields:
  - `enabled`: boolean, default `true`
  - `signal`: string
  - `animation`: optional animation asset
  - `mode`: `once`, `loop`, or `hold`
  - `speed`: number, default `1`
  - `fadeIn`: number, default `0.05`

### `PlaySoundOnCollisionTrait`
- ID: `playSoundOnCollision`
- Authority: client
- Description: Plays a sound when this entity is touched.
- Fields:
  - `enabled`: boolean, default `true`
  - `sound`: audio asset
  - `volume`: number, default `1`
  - `target`: `player` or `any`
  - `playAt`: `entity`, `world`, or `local`

### `PlayerCheckpointTrait`
- ID: `playerCheckpoint`
- Authority: server runtime state
- Description: Runtime checkpoint/spawn state for each player.
- Fields:
  - `checkpointId`: runtime number, default `-1`
  - `spawnId`: runtime number, default `-1`

### `PlayerCollectablesTrait`
- ID: `playerCollectables`
- Authority: server runtime state
- Description: Runtime collectable state for a player.
- Fields:
  - `groupId`: hidden string, default `default`
  - `score`: runtime number
  - `collectedKeys`: hidden list of strings

### `PlayerPermissionsTrait`
- ID: `playerPermissions`
- Authority: server
- Description: Sets default player permissions when players join.
- Fields:
  - `canInteract`: boolean, default `true`
  - `canFly`: boolean, default `false`
  - `canForceRespawn`: boolean, default `true`
  - `canUseIndividualBlocks`: boolean, default `true`

### `PlayerTimerTrait`
- ID: `playerTimer`
- Authority: server runtime state
- Description: Runtime timer state for a player.
- Fields:
  - `timerId`: hidden string, default `main`
  - `running`: hidden boolean, default `false`
  - `showHUD`: hidden boolean, default `false`
  - `startTime`: runtime number
  - `elapsedSeconds`: runtime number
  - `bestSeconds`: runtime number

### `PlayerTrait`
- ID: `player`
- Authority: shared runtime marker
- Description: Runtime player marker used by built-in traits.
- Fields:
  - `score`: hidden number, default `0`
  - `health`: hidden number, default `0`

### `ProjectileSpawnerTrait`
- ID: `projectileSpawner`
- Authority: server
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

### `SignalSendOnCollisionTrait`
- ID: `signalSendOnCollision`
- Authority: server
- Description: Sends a named signal when a collision starts, ends, or while colliding.
- Fields:
  - `enabled`: boolean, default `true`
  - `signal`: string
  - `target`: `player` or `any`
  - `sendOn`: `start`, `end`, or `both`

### `SpawnTrait`
- ID: `spawn`
- Authority: server
- Description: Spawns players at this prop or area.
- Fields:
  - `enabled`: boolean, default `true`
  - `priority`: integer number, default `0`
  - `offset`: vec3, default `[0, 2, 0]`
  - `rotation`: vec3, default `[0, 0, 0]`

### `SpinningTrait`
- ID: `spinning`
- Authority: client
- Description: Rotates a prop at a steady speed.
- Fields:
  - `enabled`: boolean, default `true`
  - `axis`: vec3 direction, default `[0, 1, 0]`
  - `speedDegreesPerSecond`: number, default `90`

### `TimerFinishTrait`
- ID: `timerFinish`
- Authority: server
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

### `TimerStartTrait`
- ID: `timerStart`
- Authority: server
- Description: Starts a player timer when touched.
- Fields:
  - `enabled`: boolean, default `true`
  - `timerId`: string, default `main`
  - `resetCollectables`: boolean, default `false`
  - `showHUD`: boolean, default `true`
  - `signal`: string signal name

### `VelocityImpulseTrait`
- ID: `velocityImpulse`
- Authority: server
- Description: Launches players or entities on contact.
- Fields:
  - `enabled`: boolean, default `true`
  - `velocity`: vec3, default `[0, 18, 0]`
  - `additive`: boolean, default `false`
  - `predictable`: boolean, default `true`
  - `sound`: optional audio asset

### `VisibilityTrait`
- ID: `visibility`
- Authority: shared runtime state
- Description: Client-visible sync flag used by visibility logic.
- Fields:
  - `visible`: hidden boolean, default `true`

### `ZombieTrait`
- ID: `zombie`
- Authority: server
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

### `createHUDPanel(className: string)`
- Authority: client
- Description: Creates a HUD panel element under the HUD root.
- Returns: `HTMLDivElement | undefined`

### `createText(parent, className, value = "")`
- Authority: client
- Description: Creates a text div inside a HUD panel.
- Returns: `HTMLDivElement`

### `ensureHUDRoot()`
- Authority: client
- File: `src/client/hud-kit.ts`
- Description: Ensures the HUD root DOM element exists and injects required styles.
- Returns: `HTMLDivElement | undefined`

### `hideWorldInteractPrompt()`
- Authority: client
- Description: Hides the interaction prompt.

### `initClientSystems()`
- Authority: client
- File: `src/client/systems.ts`
- Description: Sets up client-side game behavior, including HUD rendering, dialogue, sound, animation, and visibility.

### `initVehicleUI()`
- Authority: client
- File: `src/client/vehicle-ui.ts`
- Description: Creates vehicle enter/exit hints and updates them based on player gaze and mount state.

### `positionClass(position)`
- Authority: client
- Description: Converts a HUD position string into a CSS class.

### `setDisplay(element, visible, display = "block")`
- Authority: client
- Description: Shows or hides a HUD element.

### `setText(element, value)`
- Authority: client
- Description: Updates text content when changed.

### `showToast(message, durationSeconds, time)`
- Authority: client
- Description: Displays a toast notification element.

### `showWorldInteractPrompt(worldPosition, text, yOffset = 0)`
- Authority: client
- Description: Shows a world-space interaction hint near the given position.

### `tickToast(time)`
- Authority: client
- Description: Hides the toast when its time expires.

---

## Server functions

### `initServerSystems()`
- Authority: server
- File: `src/server/systems.ts`
- Description: Initializes server-side game systems: spawning, checkpoints, hazards, collectables, timers, signals, platforms, projectiles, zombies, dialogue, notifications, and more.

### `setInitialMovementSettings(playerId)`
- Authority: server
- File: `src/config.ts`
- Description: Sets default movement properties for a player.

---

## Shared functions

### `addVec3(a, b)`
- Authority: shared
- Description: Returns vector addition.

### `clamp(value, min, max)`
- Authority: shared
- Description: Clamps a number between min and max.

### `distanceSquared(a, b)`
- Authority: shared
- Description: Returns squared distance between two vectors.

### `eulerDegreesToQuat(rotation)`
- Authority: shared
- Description: Converts Euler degrees to a quaternion.

### `formatScore(score, format)`
- Authority: shared
- Description: Formats a numeric score as time or number.

### `lerpVec3(a, b, t)`
- Authority: shared
- Description: Interpolates between two vectors.

### `multiplyQuat(a, b)`
- Authority: shared
- Description: Multiplies two quaternions.

### `moveKinematicEntity(entityId, position, quaternion)`
- Authority: server
- Description: Moves a kinematic prop or entity to a new world-space position and quaternion.

### `normalizeVec3(v)`
- Authority: shared
- Description: Normalizes a vector.

### `nonEmpty(value)`
- Authority: shared
- Description: Type guard for non-empty strings.

### `quatForward(q)`
- Authority: shared
- Description: Computes the forward direction from a quaternion.

### `scaleVec3(v, scalar)`
- Authority: shared
- Description: Scales a vector.

### `secondsToClock(seconds)`
- Authority: shared
- Description: Formats seconds as `M:SS.hh`.

### `setEntityHidden(entityId, hidden)`
- Authority: shared
- File: `src/shared/utils.ts`
- Description: Disables physics and syncs a visibility trait for hidden entities.

### `stableString(value)`
- Authority: shared
- Description: Converts undefined to empty string.

### `yawQuatFromDirection(direction)`
- Authority: shared
- Description: Computes a yaw-only quaternion from a direction vector.

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
