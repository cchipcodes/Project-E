import * as J from "jamango";
import "./traits";
import { setInitialMovementSettings } from "./config";
import { initServerSystems } from "./server/systems";
import { initVehicleSystem } from "./shared/vehicle";
import { spawnEnemy } from "./game";

if (J.net.isHost) {
  initServerSystems();
  initVehicleSystem();

  J.onPlayerJoin((playerId) => {
    setInitialMovementSettings(playerId);
  });
  J.onGameTick(() => {
    spawnEnemy();
  });
};
