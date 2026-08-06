import * as J from "jamango";
import "./traits";
import { setInitialMovementSettings } from "./config";
import { initServerSystems } from "./server/systems";
import { initVehicleSystem } from "./shared/vehicle";
import * as game from "./game/game";

if (J.net.isHost) {
  J.onGameStart(() => {
    game.gameServerTasks();
    initServerSystems();
    initVehicleSystem();
  });
  J.onPlayerJoin((playerId) => {
    setInitialMovementSettings(playerId);
  });
};
