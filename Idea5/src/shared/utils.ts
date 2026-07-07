import * as J from "jamango";
import { VisibilityTrait } from "../traits";

export function setEntityHidden(entityId: J.EntityId, hidden: boolean) {
    J.setEntityPhysicsEnabled(entityId, !hidden);
    // this has to be done as a trait because setEntityVisible is client only.
    J.setTrait(entityId, VisibilityTrait, { visible: !hidden });
}

export function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

export function distanceSquared(a: J.Vec3, b: J.Vec3) {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    const dz = a[2] - b[2];
    return dx * dx + dy * dy + dz * dz;
}

export function addVec3(a: J.Vec3, b: J.Vec3): J.Vec3 {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function scaleVec3(v: J.Vec3, scalar: number): J.Vec3 {
    return [v[0] * scalar, v[1] * scalar, v[2] * scalar];
}

export function lerpVec3(a: J.Vec3, b: J.Vec3, t: number): J.Vec3 {
    return [
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
    ];
}

export function normalizeVec3(v: J.Vec3): J.Vec3 {
    const length = Math.hypot(v[0], v[1], v[2]);
    if (length <= 0.0001) return [0, 0, 1];

    return [v[0] / length, v[1] / length, v[2] / length];
}

export function multiplyQuat(a: J.Quat, b: J.Quat): J.Quat {
    const ax = a[0];
    const ay = a[1];
    const az = a[2];
    const aw = a[3];
    const bx = b[0];
    const by = b[1];
    const bz = b[2];
    const bw = b[3];

    return [
        ax * bw + aw * bx + ay * bz - az * by,
        ay * bw + aw * by + az * bx - ax * bz,
        az * bw + aw * bz + ax * by - ay * bx,
        aw * bw - ax * bx - ay * by - az * bz,
    ];
}

export function eulerDegreesToQuat(rotation: J.Vec3): J.Quat {
    const x = (rotation[0] * Math.PI) / 180;
    const y = (rotation[1] * Math.PI) / 180;
    const z = (rotation[2] * Math.PI) / 180;

    const cx = Math.cos(x / 2);
    const sx = Math.sin(x / 2);
    const cy = Math.cos(y / 2);
    const sy = Math.sin(y / 2);
    const cz = Math.cos(z / 2);
    const sz = Math.sin(z / 2);

    return [
        sx * cy * cz - cx * sy * sz,
        cx * sy * cz + sx * cy * sz,
        cx * cy * sz - sx * sy * cz,
        cx * cy * cz + sx * sy * sz,
    ];
}

export function quatForward(q: J.Quat): J.Vec3 {
    const [x, y, z, w] = q;
    return [
        2 * (x * z + w * y),
        2 * (y * z - w * x),
        1 - 2 * (x * x + y * y),
    ];
}

export function yawQuatFromDirection(direction: J.Vec3): J.Quat {
    const normalized = normalizeVec3(direction);
    const yaw = Math.atan2(normalized[0], normalized[2]);
    return [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)];
}

export function secondsToClock(seconds: number) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00.00";

    const minutes = Math.floor(seconds / 60);
    const wholeSeconds = Math.floor(seconds % 60);
    const hundredths = Math.floor((seconds % 1) * 100);

    return `${minutes}:${wholeSeconds.toString().padStart(2, "0")}.${hundredths
        .toString()
        .padStart(2, "0")}`;
}

export function formatScore(score: number, format: string) {
    if (format === "time") return secondsToClock(score);
    return Math.round(score).toLocaleString();
}

export function nonEmpty(value: string | undefined | null): value is string {
    return typeof value === "string" && value.length > 0;
}

export function stableString(value: string | undefined) {
    return value ?? "";
}
