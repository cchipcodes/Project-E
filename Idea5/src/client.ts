import * as J from "jamango";
import "./traits";
import { initClientSystems } from "./client/systems";
import { initVehicleUI } from "./client/vehicle-ui";
import { initVehicleSystem } from "./shared/vehicle";
import { cardLogic } from "./game/abilities";

if (J.net.isClient) {
    initClientSystems();
    initVehicleSystem();
    initVehicleUI();
    cardLogic();
}
