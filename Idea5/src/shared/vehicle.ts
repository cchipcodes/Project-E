import * as J from "jamango";
import { vec3, type Vec3, type Quat, quat, mat4 } from "jamango";
import { debugDrawLine, debugDrawSphere } from "./debug";

const DEBUG = false;

const S = J.schema;

const VehicleWheelSchema = S.object({
    id: S.string(),
    chassisConnectionPoint: S.vec3({ defaultValue: [0, 0, 0] }),
    prop: S.asset({ assetTypes: ["prop"] }),
    radius: S.number({ defaultValue: 1 }),
    steer: S.boolean(),
    powered: S.boolean(),
});

const VehicleSchema = S.object({
    accelerateEngineForce: S.number({ defaultValue: 500000 }),
    reverseEngineForce: S.number({ defaultValue: 300000 }),
    brakeForce: S.number({ defaultValue: 10000 }),
    steering: S.number({ defaultValue: 0.7 }),
    wheels: S.list(VehicleWheelSchema),
});

export const VehicleTrait = J.defineTrait("vehicle", VehicleSchema, {
    name: "Vehicle",
    icon: "🚗",
    description: "Makes a prop a drivable vehicle.",
    color: "#FFA500",
});

export const PlayerVehicleMountTrait = J.defineTrait(
    "playerVehicleMount",
    J.schema.object({ vehicle: J.schema.number() }),
);

export const RequestVehicleMountCommand = J.net.defineCommand<{
    vehicle: J.EntityId;
}>("req-vehicle-mount");

export const VehicleMountCommand = J.net.defineCommand<{
    player: J.EntityId;
    vehicle: J.EntityId;
}>("vehicle-mount");

export const RequestVehicleDismountCommand = J.net.defineCommand<{
    vehicle: J.EntityId;
}>("req-vehicle-dismount");

export const VehicleDismountCommand = J.net.defineCommand<{
    player: J.EntityId;
    vehicle: J.EntityId;
}>("vehicle-dismount");

const serV3 = (v: Vec3): Vec3 => {
    // * 1000 to convert to mm for better precision
    return [
        Math.round(v[0] * 1000),
        Math.round(v[1] * 1000),
        Math.round(v[2] * 1000),
    ];
};

const desV3 = (v: [number, number, number]): Vec3 => {
    return [v[0] / 1000, v[1] / 1000, v[2] / 1000];
};

const serQuat = (v: Quat): Quat => {
    // * 10000 to convert to better precision
    return [
        Math.round(v[0] * 10000),
        Math.round(v[1] * 10000),
        Math.round(v[2] * 10000),
        Math.round(v[3] * 10000),
    ];
};

const desQuat = (v: [number, number, number, number]): Quat => {
    return [v[0] / 10000, v[1] / 10000, v[2] / 10000, v[3] / 10000];
};

const serVehicleMovement = (
    vehicle: number,
    position: Vec3,
    quaternion: Quat,
    velocity: Vec3,
    angularVelocity: Vec3,
) => {
    return [
        vehicle,
        serV3(position),
        serQuat(quaternion),
        serV3(velocity),
        serV3(angularVelocity),
    ] as const;
};

type SerializedVehicleMovement = ReturnType<typeof serVehicleMovement>;

const desVehicleMovement = (data: SerializedVehicleMovement) => {
    return {
        vehicle: data[0],
        chassisPosition: desV3(data[1]),
        chassisQuaternion: desQuat(data[2]),
        chassisVelocity: desV3(data[3]),
        chassisAngularVelocity: desV3(data[4]),
    };
};

export const ClientVehicleUpdateCommand =
    J.net.defineCommand<SerializedVehicleMovement>("client-vehicle-update");

export const ServerVehicleUpdateCommand =
    J.net.defineCommand<SerializedVehicleMovement>("server-vehicle-update");

export type Wheel = {
    prop: string;

    radius: number;

    steer: boolean;
    powered: boolean;

    directionLocal: J.Vec3;
    axleLocal: J.Vec3;

    suspensionStiffness: number;
    suspensionRestLength: number;
    maxSuspensionForce: number;
    maxSuspensionTravel: number;

    sideFrictionStiffness: number;
    frictionSlip: number;
    dampingRelaxation: number;
    dampingCompression: number;

    rollInfluence: number;

    forwardAcceleration: number;
    sideAcceleration: number;

    chassisConnectionPointLocal: J.Vec3;
};

export type WheelState = {
    position: Vec3;
    quat: Quat;

    directionWorld: Vec3;

    grounded: boolean;
    groundNormal: Vec3;
    groundPosition: Vec3;
    groundEntityId: J.EntityId | undefined;

    suspensionLength: number;
    suspensionForce: number;
    suspensionRelativeVelocity: number;
    clippedInvContactDotSuspension: number;

    sideImpulse: number;
    forwardImpulse: number;

    rotation: number;
    deltaRotation: number;

    input: {
        engineForce: number;
        brakeForce: number;
        steering: number;
    };

    axleWorld: Vec3;

    slipInfo: number;
    skidInfo: number;

    sliding: boolean;
};

export type VehicleState = {
    chassisEntityId: J.EntityId;
    serverChassisEntityId: J.EntityId;
    localChassisEntityId: J.EntityId | undefined;

    wheels: Wheel[];

    wheelStates: WheelState[];

    wheelClientProps: J.EntityId[];

    drivingCharacter: J.EntityId | undefined;
    sliding: boolean;
};

export const initVehicle = (chassisEntityId: number): VehicleState => {
    J.updatePropPhysicsProperties(chassisEntityId, {
        mass: 100,
    });

    const vehicleTrait = J.getTrait(chassisEntityId, VehicleTrait)!;

    const wheelCommon: Omit<
        Wheel,
        "prop" | "chassisConnectionPointLocal" | "steer" | "powered"
    > = {
        radius: 1,

        directionLocal: [0, -1, 0],
        axleLocal: [1, 0, 0],

        suspensionStiffness: 40000,
        suspensionRestLength: 1,
        maxSuspensionForce: 1000000,
        maxSuspensionTravel: 0.5,

        sideFrictionStiffness: 200,
        frictionSlip: 1.2,

        // dampingRelaxation: 2300,
        // dampingCompression: 4400,
        dampingRelaxation: 4000,
        dampingCompression: 8000,

        rollInfluence: 0.01,

        forwardAcceleration: 1,
        sideAcceleration: 1,
    };

    const wheels: Wheel[] = [];

    for (const wheelDef of vehicleTrait.wheels) {
        const wheel: Wheel = {
            ...wheelCommon,
            chassisConnectionPointLocal: wheelDef.chassisConnectionPoint,
            prop: wheelDef.prop,
            radius: wheelDef.radius,
            steer: wheelDef.steer,
            powered: wheelDef.powered,
        };
        wheels.push(wheel);
    }

    const wheelStates = wheels.map(
        (): WheelState => ({
            position: vec3.create(),
            quat: quat.create(),

            directionWorld: vec3.create(),

            grounded: false,
            groundNormal: vec3.create(),
            groundPosition: vec3.create(),
            groundEntityId: undefined,

            suspensionLength: 0,
            suspensionForce: 0,
            suspensionRelativeVelocity: 0,
            clippedInvContactDotSuspension: 0,

            sideImpulse: 0,
            forwardImpulse: 0,

            rotation: 0,
            deltaRotation: 0,

            input: {
                engineForce: 0,
                brakeForce: 0,
                steering: 0,
            },

            axleWorld: vec3.create(),

            slipInfo: 0,
            skidInfo: 0,

            sliding: false,
        }),
    );

    return {
        chassisEntityId,
        serverChassisEntityId: chassisEntityId,
        localChassisEntityId: undefined,

        drivingCharacter: undefined,
        sliding: false,
        wheels,
        wheelClientProps: [],
        wheelStates,
    };
};

const _updateVehicle_wheelOffset = vec3.create();
const _updateVehicle_suspensionRayDirection = vec3.create();
const _updateVehicle_suspensionRayEnd = vec3.create();
const _updateVehicle_suspensionImpulse = vec3.create();
const _updateVehicle_steeringQuat = quat.create();
const _updateVehicle_combinedQuat = quat.create();
const _updateVehicle_upLocal = vec3.create();
const _updateVehicle_forwardImpulse = vec3.create();
const _updateVehicle_relPos = vec3.create();
const _updateVehicle_relPosLocal = vec3.create();
const _updateVehicle_quatInv = quat.create();
const _updateVehicle_rollInfluenceAdjustedWorldPos = vec3.create();
const _updateVehicle_sideImp = vec3.create();
const _updateVehicle_rotationWheelOffset = vec3.create();
const _updateVehicle_chassisConnectionPointWorld = vec3.create();
const _updateVehicle_fwd = vec3.create();
const _updateVehicle_hitNormalScaled = vec3.create();

const _computeImpulseDenominator_r0 = vec3.create();
const _computeImpulseDenominator_c0 = vec3.create();
const _computeImpulseDenominator_vec = vec3.create();
const _computeImpulseDenominator_m = vec3.create();

const _resolveSingleBilateralConstraint_vel1 = vec3.create();
const _resolveSingleBilateralConstraint_vel2 = vec3.create();
const _resolveSingleBilateralConstraint_vel = vec3.create();

const _calcRollingFriction_vel1 = vec3.create();
const _calcRollingFriction_vel2 = vec3.create();
const _calcRollingFriction_vel = vec3.create();

const _updateFriction_surfNormalWS_scaled_proj = vec3.create();
const _updateFriction_axle = vec3.create();
const _updateFriction_forwardWS = vec3.create();

const _onGameRender_cameraOffsetTarget = vec3.create();
const _onGameRender_cameraLookAtTarget = vec3.create();
const _onGameRender_chassisRotation = quat.create();
const _onGameRender_chassisTranslation = vec3.create();
const _onGameRender_newCameraPosition = vec3.create();
const _onGameRender_forward = vec3.create();
const _onGameRender_right = vec3.create();
const _onGameRender_actualUp = vec3.create();
const _onGameRender_rotationMatrix = mat4.create();
const _onGameRender_cameraRotation = quat.create();
const _onGameRender_wheelOffsetRender = vec3.create();
const _onGameRender_wheelBasePos = vec3.create();
const _onGameRender_steeringUpLocal = vec3.create();
const _onGameRender_steeringQuatRender = quat.create();
const _onGameRender_combinedRenderQuat = quat.create();
const _onGameRender_dirWorldRender = vec3.create();
const _onGameRender_axleWorldRender = vec3.create();
const _onGameRender_wheelPosition = vec3.create();
const _onGameRender_rollingQuat = quat.create();
const _onGameRender_finalQuat = quat.create();

function computeImpulseDenominator(
    entityId: J.EntityId,
    pos: Vec3,
    normal: Vec3,
): number {
    const r0 = _computeImpulseDenominator_r0;
    const c0 = _computeImpulseDenominator_c0;
    const vecTemp = _computeImpulseDenominator_vec;
    const m = _computeImpulseDenominator_m;

    const inverseInertia = J.getEntityInverseInertia(entityId)!;
    const bodyPosition = J.getEntityPosition(entityId)!;
    const mass = J.getEntityMass(entityId)!;
    const invMass = 1 / mass;

    // r0 = pos - bodyPosition
    vec3.subtract(r0, pos, bodyPosition);

    // c0 = r0 × normal
    vec3.cross(c0, r0, normal);

    // m = inverseInertia * c0 (treating Mat4 as Mat3 for upper-left 3x3)
    // We need to multiply the 3x3 part of the 4x4 matrix
    const m11 = inverseInertia[0],
        m12 = inverseInertia[4],
        m13 = inverseInertia[8];
    const m21 = inverseInertia[1],
        m22 = inverseInertia[5],
        m23 = inverseInertia[9];
    const m31 = inverseInertia[2],
        m32 = inverseInertia[6],
        m33 = inverseInertia[10];

    m[0] = m11 * c0[0] + m12 * c0[1] + m13 * c0[2];
    m[1] = m21 * c0[0] + m22 * c0[1] + m23 * c0[2];
    m[2] = m31 * c0[0] + m32 * c0[1] + m33 * c0[2];

    // vec = m × r0
    vec3.cross(vecTemp, m, r0);

    // return invMass + normal · vec
    return invMass + vec3.dot(normal, vecTemp);
}

function resolveSingleBilateralConstraint(
    entity1: J.EntityId,
    pos1: Vec3,
    entity2: J.EntityId,
    pos2: Vec3,
    normal: Vec3,
): number {
    const normalLenSqr = vec3.squaredLength(normal);
    if (normalLenSqr > 1.1) {
        return 0; // no impulse
    }

    const vel1 = _resolveSingleBilateralConstraint_vel1;
    const vel2 = _resolveSingleBilateralConstraint_vel2;
    const vel = _resolveSingleBilateralConstraint_vel;

    // get velocities at contact points
    vec3.copy(vel1, J.getEntityVelocityAtPoint(entity1, pos1)!);

    // handle static ground (entity2 = -1 means static)
    if (entity2 === -1) {
        vec3.set(vel2, 0, 0, 0);
    } else {
        const entity2VelocityAtPoint = J.getEntityVelocityAtPoint(
            entity2,
            pos2,
        );

        if (!entity2VelocityAtPoint) {
            vec3.set(vel2, 0, 0, 0);
        } else {
            vec3.copy(vel2, entity2VelocityAtPoint);
        }
    }

    // relative velocity
    vec3.subtract(vel, vel1, vel2);

    const rel_vel = vec3.dot(normal, vel);

    const contactDamping = 0.2;

    const mass1 = J.getEntityMass(entity1)!;
    const body1InvMass = 1 / mass1;

    // static ground has infinite mass (zero inverse mass)
    const body2InvMass = entity2 === -1 ? 0 : 1 / J.getEntityMass(entity2)!;

    const massTerm = 1 / (body1InvMass + body2InvMass);
    const impulse = -contactDamping * rel_vel * massTerm;

    return impulse;
}

function calcRollingFriction(
    entity0: J.EntityId,
    entity1: J.EntityId,
    frictionPosWorld: Vec3,
    frictionDirectionWorld: Vec3,
    maxImpulse: number,
): number {
    const contactPosWorld = frictionPosWorld;

    const vel1 = _calcRollingFriction_vel1;
    const vel2 = _calcRollingFriction_vel2;
    const vel = _calcRollingFriction_vel;

    // get velocities at contact point
    vec3.copy(vel1, J.getEntityVelocityAtPoint(entity0, contactPosWorld)!);

    // handle static ground (entity1 = -1 means static)
    if (entity1 === -1) {
        vec3.set(vel2, 0, 0, 0);
    } else {
        vec3.copy(vel2, J.getEntityVelocityAtPoint(entity1, contactPosWorld)!);
    }

    vec3.subtract(vel, vel1, vel2);

    // relative velocity along friction direction
    const vrel = vec3.dot(frictionDirectionWorld, vel);

    // calculate effective mass in friction direction for both bodies
    const denom0 = computeImpulseDenominator(
        entity0,
        frictionPosWorld,
        frictionDirectionWorld,
    );

    // for static ground, use a very small denominator contribution (effectively infinite mass)
    const denom1 =
        entity1 === -1
            ? 0
            : computeImpulseDenominator(
                  entity1,
                  frictionPosWorld,
                  frictionDirectionWorld,
              );

    const relaxation = 1;
    const jacDiagABInv = relaxation / (denom0 + denom1);

    // calculate impulse that moves us to zero relative velocity
    let j1 = -vrel * jacDiagABInv;

    // clamp to max impulse
    if (maxImpulse < j1) {
        j1 = maxImpulse;
    }
    if (j1 < -maxImpulse) {
        j1 = -maxImpulse;
    }

    return j1;
}

export const updateVehicle = (
    state: VehicleState,
    applyForces: boolean,
    dt: number,
) => {
    const { wheels, wheelStates } = state;

    J.activateEntityBody(state.chassisEntityId);

    if (DEBUG) {
        const chassisPosition = J.getEntityPosition(state.chassisEntityId)!;
        const chassisQuaternion = J.getEntityQuaternion(state.chassisEntityId)!;

        // debug arrow for angular velocity
        const angularVelocity = J.getEntityAngularVelocity(
            state.chassisEntityId,
        );
        if (angularVelocity && vec3.length(angularVelocity) > 0.001) {
            const angVelArrowStart = vec3.create();
            vec3.copy(angVelArrowStart, chassisPosition);
            angVelArrowStart[1] += 4; // 4 units above chassis

            const angVelArrowEnd = vec3.create();
            vec3.scaleAndAdd(
                angVelArrowEnd,
                angVelArrowStart,
                angularVelocity,
                2,
            ); // scale for visibility
            debugDrawLine(angVelArrowStart, angVelArrowEnd, "purple");

            // arrowhead for angular velocity
            const angVelDirection = vec3.normalize(
                vec3.create(),
                angularVelocity,
            );
            const angVelUp = vec3.fromValues(0, 1, 0);
            const angVelRight = vec3.create();
            vec3.cross(angVelRight, angVelDirection, angVelUp);
            vec3.normalize(angVelRight, angVelRight);

            const angVelArrowheadLength = 0.5;
            const angVelLeftEnd = vec3.create();
            vec3.scaleAndAdd(
                angVelLeftEnd,
                angVelArrowEnd,
                angVelRight,
                -angVelArrowheadLength,
            );
            debugDrawLine(angVelArrowEnd, angVelLeftEnd, "purple");

            const angVelRightEnd = vec3.create();
            vec3.scaleAndAdd(
                angVelRightEnd,
                angVelArrowEnd,
                angVelRight,
                angVelArrowheadLength,
            );
            debugDrawLine(angVelArrowEnd, angVelRightEnd, "purple");
        }

        // debug arrow for velocity
        const velocity = J.getEntityVelocity(state.chassisEntityId);
        if (velocity && vec3.length(velocity) > 0.001) {
            const velocityArrowStart = vec3.create();
            vec3.copy(velocityArrowStart, chassisPosition);
            velocityArrowStart[1] += 3; // 3 units above chassis

            const velocityArrowEnd = vec3.create();
            vec3.scaleAndAdd(velocityArrowEnd, velocityArrowStart, velocity, 1); // scale for visibility
            debugDrawLine(velocityArrowStart, velocityArrowEnd, "red");

            // arrowhead for velocity
            const velDirection = vec3.normalize(vec3.create(), velocity);
            const velUp = vec3.fromValues(0, 1, 0);
            const velRight = vec3.create();
            vec3.cross(velRight, velDirection, velUp);
            vec3.normalize(velRight, velRight);

            const velArrowheadLength = 0.5;
            const velLeftEnd = vec3.create();
            vec3.scaleAndAdd(
                velLeftEnd,
                velocityArrowEnd,
                velRight,
                -velArrowheadLength,
            );
            debugDrawLine(velocityArrowEnd, velLeftEnd, "red");

            const velRightEnd = vec3.create();
            vec3.scaleAndAdd(
                velRightEnd,
                velocityArrowEnd,
                velRight,
                velArrowheadLength,
            );
            debugDrawLine(velocityArrowEnd, velRightEnd, "red");
        }

        // debug arrow for chassis direction
        const arrowStart = vec3.create();
        vec3.copy(arrowStart, chassisPosition);
        arrowStart[1] += 2; // 2 units above chassis

        // forward direction (Z+)
        const forward = vec3.fromValues(0, 0, 1);
        vec3.transformQuat(forward, forward, chassisQuaternion);
        vec3.normalize(forward, forward);

        // arrow end
        const arrowEnd = vec3.create();
        vec3.scaleAndAdd(arrowEnd, arrowStart, forward, 3); // 3 units long
        debugDrawLine(arrowStart, arrowEnd, "blue");

        // arrowhead: left and right lines
        const up = vec3.fromValues(0, 1, 0);
        vec3.transformQuat(up, up, chassisQuaternion);
        const right = vec3.create();
        vec3.cross(right, forward, up);
        vec3.normalize(right, right);

        // arrowhead size
        const arrowheadLength = 0.7;

        // left point
        const leftEnd = vec3.create();
        vec3.scaleAndAdd(leftEnd, arrowEnd, right, -arrowheadLength);
        debugDrawLine(arrowEnd, leftEnd, "blue");

        // right point
        const rightEnd = vec3.create();
        vec3.scaleAndAdd(rightEnd, arrowEnd, right, arrowheadLength);
        debugDrawLine(arrowEnd, rightEnd, "blue");
    }

    const chassisPosition = J.getEntityPosition(state.chassisEntityId)!;
    const chassisQuaternion = J.getEntityQuaternion(state.chassisEntityId)!;
    const chassisMass = J.getEntityMass(state.chassisEntityId)!;

    /* roll check */
    // ...

    /* wheels in voxels check */
    // ...

    /* update wheel transforms */
    for (let i = 0; i < wheels.length; i++) {
        const wheel = wheels[i];
        const wheelState = wheelStates[i];

        // update wheel position
        const wheelOffset = _updateVehicle_wheelOffset;
        vec3.transformQuat(
            wheelOffset,
            wheel.chassisConnectionPointLocal,
            chassisQuaternion,
        );
        vec3.add(wheelState.position, chassisPosition, wheelOffset);

        // update wheel direction and axle, taking steering into account
        // steering rotates the wheel around its local 'up' (inverted directionLocal)
        const steeringQuat = _updateVehicle_steeringQuat;
        const combinedQuat = _updateVehicle_combinedQuat;
        const upLocal = _updateVehicle_upLocal;
        vec3.copy(upLocal, wheel.directionLocal);
        vec3.scale(upLocal, upLocal, -1); // up for steering (inverted directionLocal)
        quat.setAxisAngle(steeringQuat, upLocal, wheelState.input.steering);

        // combined orientation = chassis rotation * steering rotation
        quat.multiply(combinedQuat, chassisQuaternion, steeringQuat);

        // update wheel direction and axle in world space using combined orientation
        vec3.transformQuat(
            wheelState.directionWorld,
            wheel.directionLocal,
            combinedQuat,
        );
        vec3.transformQuat(wheelState.axleWorld, wheel.axleLocal, combinedQuat);

        // update wheel quat for visuals/transform
        quat.copy(wheelState.quat, combinedQuat);

        if (DEBUG) {
            // draw small red circle at chassis connection point
            debugDrawSphere(wheelState.position, 0.2, "green");

            // draw wheel direction
            {
                const dirEnd = vec3.scaleAndAdd(
                    vec3.create(),
                    wheelState.position,
                    wheelState.directionWorld,
                    2,
                );
                debugDrawLine(wheelState.position, dirEnd, "yellow");
            }

            // draw wheel axle
            {
                const axleEnd = vec3.scaleAndAdd(
                    vec3.create(),
                    wheelState.position,
                    wheelState.axleWorld,
                    2,
                );
                debugDrawLine(wheelState.position, axleEnd, "cyan");
            }

            // draw wheel rotation axis
            {
                const rotationAxis = vec3.cross(
                    vec3.create(),
                    wheelState.directionWorld,
                    wheelState.axleWorld,
                );
                vec3.normalize(rotationAxis, rotationAxis);

                const rotEnd = vec3.scaleAndAdd(
                    vec3.create(),
                    wheelState.position,
                    rotationAxis,
                    2,
                );
                debugDrawLine(wheelState.position, rotEnd, "magenta");
            }
        }
    }

    /* update speedo */
    // ...

    /* update wheel suspension */
    for (let i = 0; i < wheels.length; i++) {
        const wheel = wheels[i];
        const wheelState = wheelStates[i];

        // raycast to simulate suspension
        const suspensionRayLength = wheel.radius + wheel.suspensionRestLength;
        const suspensionRayOrigin = wheelState.position;
        const suspensionRayDirection = vec3.set(
            _updateVehicle_suspensionRayDirection,
            0,
            -1,
            0,
        );

        const raycastResult = J.raycast(
            suspensionRayOrigin,
            suspensionRayDirection,
            suspensionRayLength,
            [state.chassisEntityId],
        );

        if (raycastResult.hit) {
            const hitPosition = raycastResult.hitPosition!;
            const hitNormal = raycastResult.hitNormal!;
            const hitEntityId = raycastResult.hitEntityId;

            wheelState.grounded = true;
            vec3.copy(wheelState.groundPosition, hitPosition);
            vec3.copy(wheelState.groundNormal, hitNormal);
            wheelState.groundEntityId = hitEntityId;

            const hitDistance = vec3.distance(
                suspensionRayOrigin,
                wheelState.groundPosition,
            );

            let suspensionLength = hitDistance - wheel.radius;

            const minSuspensionLength =
                wheel.suspensionRestLength - wheel.maxSuspensionTravel;
            const maxSuspensionLength =
                wheel.suspensionRestLength + wheel.maxSuspensionTravel;

            if (suspensionLength < minSuspensionLength) {
                suspensionLength = minSuspensionLength;
            } else if (suspensionLength > maxSuspensionLength) {
                suspensionLength = maxSuspensionLength;

                wheelState.grounded = false;
                vec3.set(wheelState.groundNormal, 0, 0, 0);
                vec3.set(wheelState.groundPosition, 0, 0, 0);
            }

            wheelState.suspensionLength = suspensionLength;

            const denominator = vec3.dot(hitNormal, suspensionRayDirection);

            const chassisVelocityAtContactPoint = J.getEntityVelocityAtPoint(
                state.chassisEntityId,
                wheelState.groundPosition,
            )!;

            const projVel = vec3.dot(
                wheelState.groundNormal,
                chassisVelocityAtContactPoint,
            );

            if (denominator >= -0.1) {
                wheelState.suspensionRelativeVelocity = 0;
                wheelState.clippedInvContactDotSuspension = 1 / 0.1;
            } else {
                const inv = -1 / denominator;
                wheelState.suspensionRelativeVelocity = projVel * inv;
                wheelState.clippedInvContactDotSuspension = inv;
            }

            if (DEBUG) {
                // draw hit suspension raycast
                debugDrawLine(suspensionRayOrigin, hitPosition, "green");

                // draw hit suspension point
                debugDrawSphere(hitPosition, 0.1, "green");

                // draw wheel at simulated position (accounting for suspension)
                const wheelSimPos = vec3.create();
                vec3.scaleAndAdd(
                    wheelSimPos,
                    wheelState.position,
                    wheelState.directionWorld,
                    wheelState.suspensionLength,
                );
                debugDrawSphere(wheelSimPos, wheel.radius, "red");
            }
        } else {
            if (DEBUG) {
                wheelState.suspensionLength = wheel.suspensionRestLength;
                wheelState.suspensionRelativeVelocity = 0;
                wheelState.clippedInvContactDotSuspension = 1;
                vec3.set(wheelState.groundNormal, 0, 1, 0);

                const suspensionRayEnd = vec3.scaleAndAdd(
                    _updateVehicle_suspensionRayEnd,
                    suspensionRayOrigin,
                    suspensionRayDirection,
                    suspensionRayLength,
                );

                // draw miss suspension raycast at ray end
                debugDrawLine(suspensionRayOrigin, suspensionRayEnd, "red");

                // draw wheel at simulated position (accounting for suspension)
                const wheelSimPos = vec3.create();
                vec3.scaleAndAdd(
                    wheelSimPos,
                    wheelState.position,
                    wheelState.directionWorld,
                    wheelState.suspensionLength,
                );
                debugDrawSphere(wheelSimPos, wheel.radius, "red");
            }

            wheelState.grounded = false;
            wheelState.suspensionLength = wheel.suspensionRestLength;
        }

        // calculate suspension force
        wheelState.suspensionForce = 0;

        if (wheelState.grounded) {
            // spring
            const suspensionRestLength = wheel.suspensionRestLength;
            const currentLength = wheelState.suspensionLength;
            const difference = suspensionRestLength - currentLength;

            let force =
                wheel.suspensionStiffness *
                difference *
                wheelState.clippedInvContactDotSuspension;

            // damper
            const suspensionDamping =
                wheelState.suspensionRelativeVelocity < 0
                    ? wheel.dampingCompression
                    : wheel.dampingRelaxation;

            force -= suspensionDamping * wheelState.suspensionRelativeVelocity;

            force *= chassisMass;

            if (force < 0) {
                force = 0;
            }

            wheelState.suspensionForce = force;
        }
    }

    /* apply wheel suspension forces */
    for (let i = 0; i < wheels.length; i++) {
        if (!applyForces) continue;

        const wheel = wheels[i];
        const wheelState = wheelStates[i];

        const impulse = _updateVehicle_suspensionImpulse;

        const suspensionForce = Math.min(
            wheelState.suspensionForce,
            wheel.maxSuspensionForce,
        );

        vec3.copy(impulse, wheelState.groundNormal);
        vec3.scale(impulse, impulse, suspensionForce * dt);

        J.addEntityImpulseAtPoint(
            state.chassisEntityId,
            impulse,
            wheelState.groundPosition,
        );

        // impulse debug arrow
        if (DEBUG) {
            const impulseEnd = vec3.scaleAndAdd(
                vec3.create(),
                wheelState.groundPosition,
                impulse,
                0.0005,
            );

            debugDrawLine(wheelState.groundPosition, impulseEnd, "blue");
        }
    }

    /* update friction - calculate side impulse */
    for (let i = 0; i < wheels.length; i++) {
        const wheel = wheels[i];
        const wheelState = wheelStates[i];

        wheelState.sideImpulse = 0;
        wheelState.forwardImpulse = 0;

        if (wheelState.grounded) {
            const surfNormalWS_scaled_proj =
                _updateFriction_surfNormalWS_scaled_proj;
            const axle = _updateFriction_axle;
            const forwardWS = _updateFriction_forwardWS;

            // get the world-space axle (lateral direction)
            vec3.copy(axle, wheelState.axleWorld);

            const surfNormalWS = wheelState.groundNormal;
            const proj = vec3.dot(axle, surfNormalWS);

            // project axle onto ground plane (remove component along normal)
            vec3.scale(surfNormalWS_scaled_proj, surfNormalWS, proj);
            vec3.subtract(axle, axle, surfNormalWS_scaled_proj);
            vec3.normalize(axle, axle);

            // forward direction = normal × axle (match Cannon: forward = surfNormal × axle)
            vec3.cross(forwardWS, surfNormalWS, axle);
            vec3.normalize(forwardWS, forwardWS);

            // calculate side impulse (lateral friction)
            wheelState.sideImpulse = resolveSingleBilateralConstraint(
                state.chassisEntityId,
                wheelState.groundPosition,
                wheelState.groundEntityId ?? (-1 as J.EntityId), // use -1 for static/terrain
                wheelState.groundPosition,
                axle,
            );
            wheelState.sideImpulse *= wheel.sideFrictionStiffness;

            // DEBUG: visualize the friction directions
            if (DEBUG) {
                // draw axle (lateral/side direction) in purple
                const axleEnd = vec3.scaleAndAdd(
                    vec3.create(),
                    wheelState.groundPosition,
                    axle,
                    1.5,
                );
                debugDrawLine(wheelState.groundPosition, axleEnd, "purple");

                // draw forward direction in orange
                const fwdEnd = vec3.scaleAndAdd(
                    vec3.create(),
                    wheelState.groundPosition,
                    forwardWS,
                    1.5,
                );
                debugDrawLine(wheelState.groundPosition, fwdEnd, "orange");

                // draw side impulse as arrow
                const sideImpulseVec = vec3.scale(
                    vec3.create(),
                    axle,
                    wheelState.sideImpulse * 0.01,
                );
                const sideImpulseEnd = vec3.add(
                    vec3.create(),
                    wheelState.groundPosition,
                    sideImpulseVec,
                );
                debugDrawLine(
                    wheelState.groundPosition,
                    sideImpulseEnd,
                    "pink",
                );
            }
        }
    }

    /* update friction - calculate forward impulse */
    const sideFactor = 1;
    const fwdFactor = 0.5;

    for (let i = 0; i < wheels.length; i++) {
        const wheel = wheels[i];
        const wheelState = wheelStates[i];

        let rollingFriction = 0;
        wheelState.slipInfo = 1;

        if (wheelState.grounded) {
            const defaultRollingFrictionImpulse = 0;

            const maxImpulse = wheelState.input.brakeForce
                ? wheelState.input.brakeForce
                : defaultRollingFrictionImpulse;

            // get forward direction (already calculated in phase 1, need to recalculate)
            const surfNormalWS_scaled_proj =
                _updateFriction_surfNormalWS_scaled_proj;
            const axle = _updateFriction_axle;
            const forwardWS = _updateFriction_forwardWS;

            vec3.copy(axle, wheelState.axleWorld);
            const surfNormalWS = wheelState.groundNormal;
            const proj = vec3.dot(axle, surfNormalWS);
            vec3.scale(surfNormalWS_scaled_proj, surfNormalWS, proj);
            vec3.subtract(axle, axle, surfNormalWS_scaled_proj);
            vec3.normalize(axle, axle);

            // forward direction = normal × axle (match Cannon)
            vec3.cross(forwardWS, surfNormalWS, axle);
            vec3.normalize(forwardWS, forwardWS);

            if (wheelState.input.brakeForce > 0) {
                // when braking, apply brake force directly as resistance
                // get velocity to determine direction of resistance
                const vel = J.getEntityVelocityAtPoint(
                    state.chassisEntityId,
                    wheelState.groundPosition,
                )!;
                const vrel = vec3.dot(forwardWS, vel);

                // only apply brake force if there's significant velocity
                // this prevents the brake from pushing the vehicle when stationary
                const velocityThreshold = 0.01;
                if (Math.abs(vrel) > velocityThreshold) {
                    // apply brake force opposing the velocity direction
                    rollingFriction = vrel > 0 ? -maxImpulse : maxImpulse;
                } else {
                    // vehicle is nearly stationary, don't apply brake force
                    rollingFriction = 0;
                }
            } else {
                // no braking - use normal rolling friction calculation
                rollingFriction = calcRollingFriction(
                    state.chassisEntityId,
                    wheelState.groundEntityId ?? (-1 as J.EntityId),
                    wheelState.groundPosition,
                    forwardWS,
                    maxImpulse,
                );
            }

            // add engine force AFTER rolling friction calculation (match Cannon.js line 469)
            rollingFriction += wheelState.input.engineForce * dt;

            // compute slip info (match Cannon.js line 472-473)
            // only calculate if rollingFriction is non-zero to avoid division by zero
            if (rollingFriction !== 0) {
                const factor = maxImpulse / rollingFriction;
                wheelState.slipInfo *= factor;
            }
        }

        // switch between active rolling (throttle), braking and non-active rolling friction (nthrottle/break)
        wheelState.forwardImpulse = 0;
        wheelState.skidInfo = 1;

        if (wheelState.grounded) {
            const maxImp = wheelState.suspensionForce * dt * wheel.frictionSlip;
            const maxImpSide = maxImp;
            const maxImpSquared = maxImp * maxImpSide;

            wheelState.forwardImpulse = rollingFriction;

            const x =
                (wheelState.forwardImpulse * fwdFactor) /
                wheel.forwardAcceleration;
            const y =
                (wheelState.sideImpulse * sideFactor) / wheel.sideAcceleration;

            const impulseSquared = x * x + y * y;

            wheelState.sliding = false;
            if (impulseSquared > maxImpSquared) {
                wheelState.sliding = true;

                const factor = maxImp / Math.sqrt(impulseSquared);
                wheelState.skidInfo *= factor;
            }

            // DEBUG: visualize forward impulse
            if (DEBUG) {
                const surfNormalWS_scaled_proj =
                    _updateFriction_surfNormalWS_scaled_proj;
                const axle = _updateFriction_axle;
                const forwardWS = _updateFriction_forwardWS;

                vec3.copy(axle, wheelState.axleWorld);
                const surfNormalWS = wheelState.groundNormal;
                const proj = vec3.dot(axle, surfNormalWS);
                vec3.scale(surfNormalWS_scaled_proj, surfNormalWS, proj);
                vec3.subtract(axle, axle, surfNormalWS_scaled_proj);
                vec3.normalize(axle, axle);

                // forward direction should match physics: normal × axle (match Cannon)
                vec3.cross(forwardWS, surfNormalWS, axle);
                vec3.normalize(forwardWS, forwardWS);

                // draw forward impulse as arrow
                const fwdImpulseVec = vec3.scale(
                    vec3.create(),
                    forwardWS,
                    wheelState.forwardImpulse * 0.01,
                );

                const fwdImpulseEnd = vec3.add(
                    vec3.create(),
                    wheelState.groundPosition,
                    fwdImpulseVec,
                );

                debugDrawLine(
                    wheelState.groundPosition,
                    fwdImpulseEnd,
                    "yellow",
                );
            }
        }
    }

    /* update friction - Phase 3: Apply sliding adjustment */
    // store vehicle-level sliding flag on state (match reference implementation)
    state.sliding = false;
    for (let i = 0; i < wheels.length; i++) {
        const wheelState = wheelStates[i];
        if (wheelState.sliding) {
            state.sliding = true;
            break;
        }
    }

    if (state.sliding) {
        for (let i = 0; i < wheels.length; i++) {
            const wheelState = wheelStates[i];

            if (wheelState.sideImpulse !== 0) {
                if (wheelState.skidInfo < 1) {
                    wheelState.forwardImpulse *= wheelState.skidInfo;
                    wheelState.sideImpulse *= wheelState.skidInfo;
                }
            }
        }
    }

    /* apply friction impulses */
    for (let i = 0; i < wheels.length; i++) {
        const wheel = wheels[i];
        const wheelState = wheelStates[i];

        if (!applyForces) continue;
        if (!wheelState.grounded) continue;

        // if (state.drivingCharacter === undefined) continue;

        // recalculate friction directions for applying impulses
        const surfNormalWS_scaled_proj =
            _updateFriction_surfNormalWS_scaled_proj;
        const axle = _updateFriction_axle;
        const forwardWS = _updateFriction_forwardWS;

        vec3.copy(axle, wheelState.axleWorld);
        const surfNormalWS = wheelState.groundNormal;
        const proj = vec3.dot(axle, surfNormalWS);
        vec3.scale(surfNormalWS_scaled_proj, surfNormalWS, proj);
        vec3.subtract(axle, axle, surfNormalWS_scaled_proj);
        vec3.normalize(axle, axle);

        // forward direction = normal × axle (match Cannon)
        vec3.cross(forwardWS, surfNormalWS, axle);
        vec3.normalize(forwardWS, forwardWS);

        const worldPos = wheelState.groundPosition;

        // apply forward impulse
        if (wheelState.forwardImpulse !== 0) {
            const impulse = _updateVehicle_forwardImpulse;
            vec3.scale(impulse, forwardWS, wheelState.forwardImpulse);

            J.addEntityImpulseAtPoint(state.chassisEntityId, impulse, worldPos);
            // console.log('Applied forward impulse:', impulse, wheelState.input.brakeForce, wheelState.input.engineForce);

            if (DEBUG) {
                // visualize applied forward impulse
                const impulseEnd = vec3.scaleAndAdd(
                    vec3.create(),
                    worldPos,
                    impulse,
                    0.1,
                );

                debugDrawLine(worldPos, impulseEnd, "lime");
            }
        }

        // apply side impulse
        if (wheelState.sideImpulse !== 0) {
            const chassisBody = state.chassisEntityId;

            // calculate relative position for roll influence
            const chassisPosition = J.getEntityPosition(chassisBody)!;
            const relPos = _updateVehicle_relPos;
            vec3.subtract(relPos, worldPos, chassisPosition);

            // get chassis quaternion to transform to local space
            const chassisQuat = J.getEntityQuaternion(chassisBody)!;

            // transform relPos to local space
            const relPosLocal = _updateVehicle_relPosLocal;
            const quatInv = _updateVehicle_quatInv;
            quat.conjugate(quatInv, chassisQuat);
            vec3.transformQuat(relPosLocal, relPos, quatInv);

            // apply roll influence (scale the up component)
            relPosLocal[1] *= wheel.rollInfluence;

            // transform back to world space
            const rollInfluenceAdjustedWorldPos =
                _updateVehicle_rollInfluenceAdjustedWorldPos;
            vec3.transformQuat(
                rollInfluenceAdjustedWorldPos,
                relPosLocal,
                chassisQuat,
            );
            vec3.add(
                rollInfluenceAdjustedWorldPos,
                rollInfluenceAdjustedWorldPos,
                chassisPosition,
            );

            const sideImp = _updateVehicle_sideImp;
            vec3.scale(sideImp, axle, wheelState.sideImpulse);

            J.addEntityImpulseAtPoint(
                chassisBody,
                sideImp,
                rollInfluenceAdjustedWorldPos,
            );

            if (DEBUG) {
                // visualize applied side impulse
                const impulseEnd = vec3.scaleAndAdd(
                    vec3.create(),
                    rollInfluenceAdjustedWorldPos,
                    sideImp,
                    0.1,
                );

                debugDrawLine(
                    rollInfluenceAdjustedWorldPos,
                    impulseEnd,
                    "cyan",
                );
            }
        }
    }

    /* update wheel rotation */
    for (let i = 0; i < wheels.length; i++) {
        const wheel = wheels[i];
        const wheelState = wheelStates[i];

        // get velocity at the chassis connection point (not the wheel position)
        const wheelOffset = _updateVehicle_rotationWheelOffset;
        vec3.transformQuat(
            wheelOffset,
            wheel.chassisConnectionPointLocal,
            chassisQuaternion,
        );
        const chassisConnectionPointWorld =
            _updateVehicle_chassisConnectionPointWorld;
        vec3.add(chassisConnectionPointWorld, chassisPosition, wheelOffset);

        const vel = J.getEntityVelocityAtPoint(
            state.chassisEntityId,
            chassisConnectionPointWorld,
        );

        if (!vel) continue;

        const m = 1; // for Y-up axis systems

        if (wheelState.grounded) {
            // get vehicle forward axis in world space (Z+ is forward for our vehicle)
            const fwd = _updateVehicle_fwd;
            vec3.set(fwd, 0, 0, 1);
            vec3.transformQuat(fwd, fwd, chassisQuaternion);

            // project forward direction onto ground plane
            const proj = vec3.dot(fwd, wheelState.groundNormal);
            const hitNormalScaled = _updateVehicle_hitNormalScaled;
            vec3.scale(hitNormalScaled, wheelState.groundNormal, proj);
            vec3.subtract(fwd, fwd, hitNormalScaled);

            // calculate forward velocity component
            const proj2 = vec3.dot(fwd, vel);

            // calculate rotation delta
            wheelState.deltaRotation = (m * proj2 * dt) / wheel.radius;
        }

        // simulate some wheel spin when sliding or in air
        if (
            (wheelState.sliding || !wheelState.grounded) &&
            wheelState.input.engineForce !== 0
        ) {
            const slidingRotationalSpeed = -30;
            wheelState.deltaRotation =
                (wheelState.input.engineForce > 0 ? 1 : -1) *
                slidingRotationalSpeed *
                dt;
        }

        // lock wheels when braking
        if (
            Math.abs(wheelState.input.brakeForce) >
            Math.abs(wheelState.input.engineForce)
        ) {
            wheelState.deltaRotation = 0;
        }

        // update rotation
        wheelState.rotation += wheelState.deltaRotation;
        wheelState.deltaRotation *= 0.99; // damping
    }
};

export const initVehicleSystem = () => {
    const vehicleStates: Record<string, VehicleState> = {};

    J.onBeforePhysicsTick((dt) => {
        // init vehicles
        const vehicleEntities = J.getAllWithTraits([VehicleTrait]);
        for (const [id] of vehicleEntities) {
            if (!vehicleStates[id]) {
                vehicleStates[id] = initVehicle(id);
            }
        }

        for (const vehicle of Object.values(vehicleStates)) {
            const vehicleTrait = J.getTrait(
                vehicle.serverChassisEntityId,
                VehicleTrait,
            )!;

            // set vehicle inputs from player inputs
            if (vehicle.drivingCharacter === undefined) {
                // no driver
                for (const wheelState of vehicle.wheelStates) {
                    wheelState.input.engineForce = 0;
                    wheelState.input.brakeForce = 10000; // parking brake :)
                    wheelState.input.steering = 0;
                }
            } else {
                // map inputs to vehicle controls
                const driverInput = J.getCharacterInput(
                    vehicle.drivingCharacter,
                );

                if (driverInput) {
                    const nipple = driverInput.nipple;
                    const braking = driverInput.isJumping;
                    const accelerating = nipple.y > 0.1;
                    const reversing = nipple.y < -0.1;
                    const steering = nipple.x;

                    for (let i = 0; i < vehicle.wheelStates.length; i++) {
                        const wheel = vehicle.wheels[i];
                        const wheelState = vehicle.wheelStates[i];

                        let engineVal = 0;

                        if (accelerating) {
                            engineVal = -vehicleTrait.accelerateEngineForce;
                        } else if (reversing) {
                            engineVal = vehicleTrait.reverseEngineForce;
                        } else {
                            engineVal = 0;
                        }

                        if (wheel.powered) {
                            wheelState.input.engineForce = engineVal;
                        } else {
                            wheelState.input.engineForce = 0;
                        }

                        if (braking) {
                            wheelState.input.brakeForce =
                                vehicleTrait.brakeForce;
                        } else {
                            wheelState.input.brakeForce = 0;
                        }

                        if (wheel.steer) {
                            wheelState.input.steering =
                                -steering * vehicleTrait.steering;
                        } else {
                            wheelState.input.steering = 0;
                        }
                    }
                }
            }

            // update physics
            updateVehicle(vehicle, true, dt);

            // limit DOFs based on whether there's a driver
            if (vehicle.drivingCharacter !== undefined) {
                J.setEntityDegreesOfFreedom(
                    vehicle.chassisEntityId,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                );
            } else {
                J.setEntityDegreesOfFreedom(
                    vehicle.chassisEntityId,
                    false,
                    true,
                    false,
                    false,
                    false,
                    false,
                );
            }

            if (J.net.isClient) {
                if (vehicle.drivingCharacter === undefined) {
                    J.updatePropPhysicsProperties(vehicle.chassisEntityId, {
                        motionType: J.MOTION_TYPE_STATIC,
                    });
                } else {
                    J.updatePropPhysicsProperties(vehicle.chassisEntityId, {
                        motionType: J.MOTION_TYPE_DYNAMIC,
                    });
                }
            }
        }
    });

    J.onGameTick(() => {
        // make mounted characters follow vehicle movement
        for (const vehicle of Object.values(vehicleStates)) {
            if (vehicle.drivingCharacter === undefined) continue;

            J.setEntityPosition(
                vehicle.drivingCharacter,
                J.getEntityPosition(vehicle.chassisEntityId)!,
            );
        }

        if (J.net.isClient) {
            // send vehicle updates from client to server (if client is driving)
            const localPlayer = J.getLocalPlayer()!;
            const mount = J.getTrait(localPlayer, PlayerVehicleMountTrait);

            if (mount) {
                const vehicleState = vehicleStates[mount.vehicle];
                if (vehicleState) {
                    const chassisPosition = J.getEntityPosition(
                        vehicleState.chassisEntityId,
                    )!;
                    const chassisQuaternion = J.getEntityQuaternion(
                        vehicleState.chassisEntityId,
                    )!;
                    const chassisVelocity = J.getEntityVelocity(
                        vehicleState.chassisEntityId,
                    )!;
                    const chassisAngularVelocity = J.getEntityAngularVelocity(
                        vehicleState.chassisEntityId,
                    )!;

                    const serializedMovement = serVehicleMovement(
                        mount.vehicle,
                        chassisPosition,
                        chassisQuaternion,
                        chassisVelocity,
                        chassisAngularVelocity,
                    );

                    J.net.send(ClientVehicleUpdateCommand, serializedMovement);
                }
            }
        } else if (J.net.isHost) {
            const players = J.getAllPlayers();

            // send vehicle updates
            for (const vehicle of Object.values(vehicleStates)) {
                for (const player of players) {
                    if (vehicle.drivingCharacter === player) {
                        // skip sending vehicle state to the driver
                        continue;
                    }

                    const chassisPosition = J.getEntityPosition(
                        vehicle.chassisEntityId,
                    )!;
                    const chassisQuaternion = J.getEntityQuaternion(
                        vehicle.chassisEntityId,
                    )!;
                    const chassisVelocity = J.getEntityVelocity(
                        vehicle.chassisEntityId,
                    )!;
                    const chassisAngularVelocity = J.getEntityAngularVelocity(
                        vehicle.chassisEntityId,
                    )!;

                    const serializedMovement = serVehicleMovement(
                        vehicle.chassisEntityId,
                        chassisPosition,
                        chassisQuaternion,
                        chassisVelocity,
                        chassisAngularVelocity,
                    );

                    J.net.send(
                        ServerVehicleUpdateCommand,
                        serializedMovement,
                        player,
                    );
                }
            }
        }
    });

    let lastRenderTime = performance.now();

    J.onGameRender(() => {
        const now = performance.now();
        const renderDt = (now - lastRenderTime) / 1000;
        lastRenderTime = now;

        for (const vehicle of Object.values(vehicleStates)) {
            // create wheel props if we haven't already
            if (vehicle.wheels.length !== vehicle.wheelClientProps.length) {
                for (const wheel of vehicle.wheels) {
                    const wheelProp = J.spawnProp(wheel.prop);
                    J.setEntityPhysicsEnabled(wheelProp, false);

                    vehicle.wheelClientProps.push(wheelProp);
                }
            }

            // update vehicle wheels
            for (let i = 0; i < vehicle.wheels.length; i++) {
                const wheel = vehicle.wheels[i];
                const wheelState = vehicle.wheelStates[i];
                const wheelProp = vehicle.wheelClientProps[i];

                const position = J.getEntityInterpolatedPosition(
                    vehicle.chassisEntityId,
                )!;
                const quaternion = J.getEntityInterpolatedQuaternion(
                    vehicle.chassisEntityId,
                )!;

                // recompute wheel connection point in world space using interpolated chassis pose
                const wheelOffsetRender = _onGameRender_wheelOffsetRender;
                vec3.transformQuat(
                    wheelOffsetRender,
                    wheel.chassisConnectionPointLocal,
                    quaternion,
                );
                const wheelBasePos = _onGameRender_wheelBasePos;
                vec3.add(wheelBasePos, position, wheelOffsetRender);

                // recompute steering/axle/world directions using interpolated chassis orientation
                const steeringUpLocal = _onGameRender_steeringUpLocal;
                vec3.copy(steeringUpLocal, wheel.directionLocal);
                vec3.scale(steeringUpLocal, steeringUpLocal, -1);

                const steeringQuatRender = _onGameRender_steeringQuatRender;
                quat.setAxisAngle(
                    steeringQuatRender,
                    steeringUpLocal,
                    wheelState.input.steering,
                );

                const combinedRenderQuat = _onGameRender_combinedRenderQuat;
                quat.multiply(
                    combinedRenderQuat,
                    quaternion,
                    steeringQuatRender,
                );

                const dirWorldRender = _onGameRender_dirWorldRender;
                vec3.transformQuat(
                    dirWorldRender,
                    wheel.directionLocal,
                    combinedRenderQuat,
                );
                vec3.normalize(dirWorldRender, dirWorldRender);

                const axleWorldRender = _onGameRender_axleWorldRender;
                vec3.transformQuat(
                    axleWorldRender,
                    wheel.axleLocal,
                    combinedRenderQuat,
                );
                vec3.normalize(axleWorldRender, axleWorldRender);

                // calculate wheel position based on suspension (rendered)
                const wheelPosition = _onGameRender_wheelPosition;
                vec3.copy(wheelPosition, dirWorldRender);
                vec3.scale(
                    wheelPosition,
                    wheelPosition,
                    wheelState.suspensionLength,
                );
                vec3.add(wheelPosition, wheelPosition, wheelBasePos);

                // set position
                J.setEntityPosition(wheelProp, wheelPosition);

                const rollingQuat = _onGameRender_rollingQuat;
                quat.setAxisAngle(
                    rollingQuat,
                    wheel.axleLocal,
                    wheelState.rotation,
                );

                // combine: renderChassis * steering * rolling
                const finalQuat = _onGameRender_finalQuat;
                quat.multiply(finalQuat, quaternion, steeringQuatRender);
                quat.multiply(finalQuat, finalQuat, rollingQuat);
                quat.normalize(finalQuat, finalQuat);

                // set rotation
                J.setEntityQuaternion(wheelProp, finalQuat);
            }
        }

        // update camera
        const localPlayer = J.getLocalPlayer()!;
        const mount = J.getTrait(localPlayer, PlayerVehicleMountTrait);

        if (mount) {
            const vehicleState = vehicleStates[mount.vehicle];

            if (vehicleState) {
                const chassisPosition = J.getEntityInterpolatedPosition(
                    vehicleState.chassisEntityId,
                )!;
                const chassisQuaternion = J.getEntityInterpolatedQuaternion(
                    vehicleState.chassisEntityId,
                )!;

                // copy chassis rotation and translation
                quat.copy(_onGameRender_chassisRotation, chassisQuaternion);
                vec3.copy(_onGameRender_chassisTranslation, chassisPosition);

                // smooth camera follow factor (exponential smoothing)
                const t = 1.0 - Math.pow(0.01, renderDt);

                // calculate ideal camera offset (behind and above the vehicle)
                vec3.set(_onGameRender_cameraOffsetTarget, 0, 3, -10);
                vec3.transformQuat(
                    _onGameRender_cameraOffsetTarget,
                    _onGameRender_cameraOffsetTarget,
                    _onGameRender_chassisRotation,
                );
                vec3.add(
                    _onGameRender_cameraOffsetTarget,
                    _onGameRender_cameraOffsetTarget,
                    _onGameRender_chassisTranslation,
                );

                // prevent camera from going underground
                if (_onGameRender_cameraOffsetTarget[1] < 0) {
                    _onGameRender_cameraOffsetTarget[1] = 0.5;
                }

                // calculate ideal camera look-at point (slightly above chassis center)
                vec3.set(_onGameRender_cameraLookAtTarget, 0, 1, 0);
                vec3.transformQuat(
                    _onGameRender_cameraLookAtTarget,
                    _onGameRender_cameraLookAtTarget,
                    _onGameRender_chassisRotation,
                );
                vec3.add(
                    _onGameRender_cameraLookAtTarget,
                    _onGameRender_cameraLookAtTarget,
                    _onGameRender_chassisTranslation,
                );

                // get current camera state
                const currentCamera = J.getCamera()!;
                const currentCameraPosition = currentCamera.position;

                // smoothly interpolate camera position
                const newCameraPosition = _onGameRender_newCameraPosition;
                vec3.lerp(
                    newCameraPosition,
                    currentCameraPosition,
                    _onGameRender_cameraOffsetTarget,
                    t,
                );

                // calculate camera forward direction (from position to look-at)
                const forward = _onGameRender_forward;
                vec3.subtract(
                    forward,
                    _onGameRender_cameraLookAtTarget,
                    newCameraPosition,
                );
                vec3.normalize(forward, forward);

                // calculate right vector
                const up = vec3.fromValues(0, 1, 0);
                const right = _onGameRender_right;
                vec3.cross(right, forward, up);
                vec3.normalize(right, right);

                // recalculate up to be perpendicular
                const actualUp = _onGameRender_actualUp;
                vec3.cross(actualUp, right, forward);

                // create rotation matrix from basis vectors
                const rotationMatrix = _onGameRender_rotationMatrix;
                rotationMatrix[0] = right[0];
                rotationMatrix[1] = right[1];
                rotationMatrix[2] = right[2];
                rotationMatrix[4] = actualUp[0];
                rotationMatrix[5] = actualUp[1];
                rotationMatrix[6] = actualUp[2];
                rotationMatrix[8] = -forward[0];
                rotationMatrix[9] = -forward[1];
                rotationMatrix[10] = -forward[2];

                const cameraRotation = _onGameRender_cameraRotation;
                mat4.getRotation(cameraRotation, rotationMatrix);

                // set the free camera
                J.setCameraFree(newCameraPosition, cameraRotation);
            }
        }
    });

    // mount / dismount handling
    if (J.net.isHost) {
        const serverDoMount = (playerId: number, vehicleId: number) => {
            // vehicle exists?
            const vehicle = vehicleStates[vehicleId];
            if (!vehicle) return;

            // already occupied?
            if (vehicle.drivingCharacter !== undefined) return;

            // drive!
            vehicle.drivingCharacter = playerId!;

            // add mount trait
            J.setTrait(playerId, PlayerVehicleMountTrait, {
                vehicle: vehicleId,
            });

            // disable character physics
            J.setEntityPhysicsEnabled(playerId, false);

            // notify
            J.net.sendToAll(VehicleMountCommand, {
                player: playerId,
                vehicle: vehicleId,
            });
        };

        const serverDoDismount = (playerId: number, vehicleId: number) => {
            // vehicle exists?
            const vehicle = vehicleStates[vehicleId];
            if (!vehicle) return;

            // not the driver?
            if (vehicle.drivingCharacter !== playerId) return;

            // stop driving
            vehicle.drivingCharacter = undefined;

            // remove mount trait
            J.removeTrait(playerId, PlayerVehicleMountTrait);

            // enable character physics
            J.setEntityPhysicsEnabled(playerId, true);

            // notify
            J.net.sendToAll(VehicleDismountCommand, {
                player: playerId,
                vehicle: vehicleId,
            });
        };

        J.onPlayerLeave((playerId) => {
            const playerMount = J.getTrait(playerId, PlayerVehicleMountTrait);

            if (playerMount) {
                serverDoDismount(playerId, playerMount.vehicle);
            }
        });

        J.net.listen(RequestVehicleMountCommand, (data, playerId) => {
            if (playerId === undefined) return;

            serverDoMount(playerId, data.vehicle);
        });

        J.net.listen(RequestVehicleDismountCommand, (data, playerId) => {
            if (playerId === undefined) return;

            serverDoDismount(playerId, data.vehicle);
        });

        J.net.listen(ClientVehicleUpdateCommand, (data, playerId) => {
            if (playerId === undefined) return;

            const vehicleMovement = desVehicleMovement(data);

            const vehicle = vehicleStates[vehicleMovement.vehicle];
            if (!vehicle) return;

            // only accept updates from the driving character
            if (vehicle.drivingCharacter !== playerId) return;

            // update vehicle physics state
            J.setEntityPosition(
                vehicle.chassisEntityId,
                vehicleMovement.chassisPosition,
            );
            J.setEntityQuaternion(
                vehicle.chassisEntityId,
                vehicleMovement.chassisQuaternion,
            );
            J.setEntityVelocity(
                vehicle.chassisEntityId,
                vehicleMovement.chassisVelocity,
            );
            J.setEntityAngularVelocity(
                vehicle.chassisEntityId,
                vehicleMovement.chassisAngularVelocity,
            );
        });
    }

    if (J.net.isClient) {
        // authoritative vehicle updates from server
        J.net.listen(ServerVehicleUpdateCommand, (data) => {
            const vehicleMovement = desVehicleMovement(data);

            const vehicle = vehicleStates[vehicleMovement.vehicle];
            if (!vehicle) return;

            // don't update if we are the driver
            // (we don't send but defensive logic)
            const localPlayer = J.getLocalPlayer()!;
            if (vehicle.drivingCharacter === localPlayer) return;

            // update vehicle physics state
            J.setEntityPosition(
                vehicle.chassisEntityId,
                vehicleMovement.chassisPosition,
            );
            J.setEntityQuaternion(
                vehicle.chassisEntityId,
                vehicleMovement.chassisQuaternion,
            );
            J.setEntityVelocity(
                vehicle.chassisEntityId,
                vehicleMovement.chassisVelocity,
            );
            J.setEntityAngularVelocity(
                vehicle.chassisEntityId,
                vehicleMovement.chassisAngularVelocity,
            );
        });

        // authoritative mount/dismount updates
        J.net.listen(VehicleMountCommand, (data) => {
            const vehicle = vehicleStates[data.vehicle];
            if (!vehicle) return;

            vehicle.drivingCharacter = data.player;

            J.setTrait(data.player, PlayerVehicleMountTrait, {
                vehicle: data.vehicle,
            });

            // disable character physics
            J.setEntityPhysicsEnabled(data.player, false);

            // invisible character
            J.setEntityVisible(data.player, false);

            if (data.player === J.getLocalPlayer()) {
                // create our local chassis prop
                const propAsset = J.getPropAsset(data.vehicle)!;

                const localChassisProp = J.spawnProp(propAsset);

                J.setEntityPosition(
                    localChassisProp,
                    J.getEntityPosition(vehicle.serverChassisEntityId)!,
                );
                J.setEntityQuaternion(
                    localChassisProp,
                    J.getEntityQuaternion(vehicle.serverChassisEntityId)!,
                );
                J.setEntityVelocity(
                    localChassisProp,
                    J.getEntityVelocity(vehicle.serverChassisEntityId)!,
                );
                J.setEntityAngularVelocity(
                    localChassisProp,
                    J.getEntityAngularVelocity(vehicle.serverChassisEntityId)!,
                );
                J.updatePropPhysicsProperties(localChassisProp, {
                    ...J.getPropPhysicsProperties(
                        vehicle.serverChassisEntityId,
                    )!,
                    motionType: J.MOTION_TYPE_DYNAMIC,
                });

                // hide and disable physics on the authoritative chassis
                J.setEntityPhysicsEnabled(vehicle.serverChassisEntityId, false);
                J.setEntityVisible(vehicle.serverChassisEntityId, false);

                // set chassisEntityId to our local prop
                vehicle.chassisEntityId = localChassisProp;
                vehicle.localChassisEntityId = localChassisProp;
            }
        });

        J.net.listen(VehicleDismountCommand, (data) => {
            const vehicle = vehicleStates[data.vehicle];
            if (!vehicle) return;

            vehicle.drivingCharacter = undefined;

            J.removeTrait(data.player, PlayerVehicleMountTrait);

            // enable character physics
            J.setEntityPhysicsEnabled(data.player, true);

            // visible character
            J.setEntityVisible(data.player, true);

            if (data.player === J.getLocalPlayer()) {
                // reset camera
                J.setLocalPlayerCamera([
                    "thirdPerson",
                    "firstPerson",
                    "selfie",
                ]);

                // remove our local chassis prop
                if (vehicle.localChassisEntityId !== undefined) {
                    J.removeEntity(vehicle.localChassisEntityId);
                    vehicle.localChassisEntityId = undefined;
                }

                // restore authoritative chassis
                J.setEntityPhysicsEnabled(vehicle.serverChassisEntityId, true);
                J.setEntityVisible(vehicle.serverChassisEntityId, true);
                vehicle.chassisEntityId = vehicle.serverChassisEntityId;
            }

            // tp above vehicle
            const chassisPos = J.getEntityPosition(vehicle.chassisEntityId)!;
            const tpPos = vec3.clone(chassisPos);
            tpPos[1] += 4;
            J.setEntityPosition(data.player, tpPos);
        });

        // mount/dismount input handling
        J.onGameTick(() => {
            const localPlayer = J.getLocalPlayer()!;

            const input = J.getCharacterInput(localPlayer)!;

            if (input.isSecondaryDown) {
                // view ray
                const viewRay = J.getCharacterViewRay(localPlayer);

                if (!viewRay?.hitEntityId) return;

                const hitEntityId = viewRay.hitEntityId;

                const vehicleTrait = J.getTrait(hitEntityId, VehicleTrait);

                if (!vehicleTrait) return;

                if (!J.getTrait(localPlayer, PlayerVehicleMountTrait)) {
                    // mount
                    J.net.send(RequestVehicleMountCommand, {
                        vehicle: hitEntityId,
                    });

                    if (DEBUG) {
                        console.log(
                            "sent mount request, player:",
                            localPlayer,
                            "vehicle:",
                            hitEntityId,
                        );
                    }
                }
                return;
            }

            if (input.isCrouching) {
                const mount = J.getTrait(localPlayer, PlayerVehicleMountTrait);

                if (!mount) return;

                // dismount
                J.net.send(RequestVehicleDismountCommand, {
                    vehicle: mount.vehicle,
                });

                if (DEBUG) {
                    console.log(
                        "sent dismount request, player:",
                        localPlayer,
                        "vehicle:",
                        mount.vehicle,
                    );
                }
            }
        });
    }
};
