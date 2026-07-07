import * as J from "jamango";

export function setInitialMovementSettings(playerId: J.EntityId) {
    J.setCharacterMovementProperties(playerId, {
        walkSpeed: 6,
        sprintSpeedMultiplier: 1.5,
        jumpVelocity: 14,
        canJump: true,
        canSprint: true,
        canCrouch: true,
    });
}
