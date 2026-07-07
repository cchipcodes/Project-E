import * as J from "jamango";

export const ShowNotificationCommand = J.net.defineCommand<{
    message: string;
    durationSeconds: number;
    sound?: string;
}>("template-show-notification");

export const PlayLocalSoundCommand = J.net.defineCommand<{
    sound: string;
    volume?: number;
}>("template-play-local-sound");

export const BuiltInSignalCommand = J.net.defineCommand<{
    signal: string;
    sourceId: J.EntityId;
    triggeredBy?: J.EntityId;
    time: number;
}>("template-built-in-signal");

export const OpenDialogueCommand = J.net.defineCommand<{
    npcId: J.EntityId;
    title: string;
    lines: string[];
    animation?: string;
    animationMode: "once" | "loop" | "hold";
    sound?: string;
}>("template-open-dialogue");

// Spatial sound broadcast: playSound* are client-only, so server systems that
// want everyone to hear a world sound must route it through this command.
export const PlaySpatialSoundCommand = J.net.defineCommand<{
    sound: string;
    entityId?: J.EntityId;
    position?: J.Vec3;
    volume?: number;
}>("template-play-spatial-sound");

export const RespawnPlayerCommand = J.net.defineCommand<{
    playerId: J.EntityId;
    position: J.Vec3;
    quaternion?: J.Quat;
}>("template-respawn-player");

export const ApplyVelocityImpulseCommand = J.net.defineCommand<{
    targetId: J.EntityId;
    velocity: J.Vec3;
    additive: boolean;
}>("template-apply-velocity-impulse");
