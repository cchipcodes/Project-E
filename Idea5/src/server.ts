import * as J from "jamango";
import "./traits";
import { setInitialMovementSettings } from "./config";
import { initServerSystems } from "./server/systems";
import { initVehicleSystem } from "./shared/vehicle";

if (J.net.isHost) {
  initServerSystems();
  initVehicleSystem();

  J.onPlayerJoin((playerId) => {
    setInitialMovementSettings(playerId);
  });
}
