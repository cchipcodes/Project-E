import * as J from "jamango";
import "./traits";
import { setInitialMovementSettings } from "./config";
import { initServerSystems } from "./server/systems";
import { initVehicleSystem } from "./shared/vehicle";
import { HeldItemTrait } from "./traits";

if (J.net.isHost) {
  initServerSystems();
  initVehicleSystem();

  J.onPlayerJoin((playerId) => {
    setInitialMovementSettings(playerId);
  });
}
