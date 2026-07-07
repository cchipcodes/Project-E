import * as J from "jamango";
import { ensureHUDRoot, setDisplay } from "./hud-kit";
import {
    PlayerVehicleMountTrait,
    VehicleDismountCommand,
    VehicleMountCommand,
    VehicleTrait,
} from "../shared/vehicle";

type VehicleHintState = "none" | "enter" | "exit";

let enterHint: HTMLDivElement | undefined;
let exitHint: HTMLDivElement | undefined;
let currentState: VehicleHintState = "none";

export function initVehicleUI() {
    if (!J.net.isClient) return;

    J.onGameStart(() => {
        const root = ensureHUDRoot();
        if (!root) return;

        enterHint = document.createElement("div");
        enterHint.className = "jt-vehicle-hint";
        enterHint.textContent = "Right Click to Enter Vehicle";
        enterHint.style.display = "none";
        root.appendChild(enterHint);

        exitHint = document.createElement("div");
        exitHint.className = "jt-vehicle-hint";
        exitHint.textContent = "Press Shift to Exit Vehicle";
        exitHint.style.display = "none";
        root.appendChild(exitHint);
    });

    J.net.listen(VehicleMountCommand, (data) => {
        if (data.player !== J.getLocalPlayer()) return;
        setHintState("exit");
    });

    J.net.listen(VehicleDismountCommand, (data) => {
        if (data.player !== J.getLocalPlayer()) return;
        setHintState("none");
    });

    J.onGameTick(() => {
        if (!enterHint || !exitHint) return;

        const localPlayer = J.getLocalPlayer();
        if (localPlayer === undefined || localPlayer === null) return;

        if (J.getTrait(localPlayer, PlayerVehicleMountTrait)) {
            setHintState("exit");
            return;
        }

        const viewRay = J.getCharacterViewRay(localPlayer);
        const hitEntityId = viewRay?.hitEntityId;
        if (hitEntityId === undefined || hitEntityId === null) {
            setHintState("none");
            return;
        }

        setHintState(J.getTrait(hitEntityId, VehicleTrait) ? "enter" : "none");
    });
}

function setHintState(nextState: VehicleHintState) {
    if (currentState === nextState) return;
    currentState = nextState;

    setDisplay(enterHint, nextState === "enter");
    setDisplay(exitHint, nextState === "exit");
}
