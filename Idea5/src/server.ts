import * as J from "jamango";
import "./traits";
import { setInitialMovementSettings } from "./config";
import { initServerSystems } from "./server/systems";
import { initVehicleSystem } from "./shared/vehicle";
import * as game from "./game";

if (J.net.isHost) {
  initServerSystems();
  initVehicleSystem();

  J.onPlayerJoin((playerId) => {
    setInitialMovementSettings(playerId);
  });
  //game.spawnEnemy(5);
  //game.useCard("blank", 5, 10);
};
