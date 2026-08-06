import * as J from "jamango";
import "./traits";
import { initClientSystems } from "./client/systems";
import { initVehicleUI } from "./client/vehicle-ui";
import { initVehicleSystem } from "./shared/vehicle";
import * as game from "./game/game"
import { clientResetHandler } from "./game/reset";

if (J.net.isClient) {
    clientResetHandler();
    J.onGameStart(() => {
        game.gameClientTasks();
        initClientSystems();
        initVehicleSystem();
        initVehicleUI();
    });
}
