import * as J from "jamango";
import "./traits";
import { setInitialMovementSettings } from "./config";
import { initServerSystems } from "./server/systems";
import { initVehicleSystem } from "./shared/vehicle";
import * as game from "./game";

if (J.net.isHost) {
  initServerSystems();
  initVehicleSystem();
  game.damageEnemy(10);

  J.onPlayerJoin((playerId) => {
    setInitialMovementSettings(playerId);
  });
  game.useCard("blank", 20, 20);
};
