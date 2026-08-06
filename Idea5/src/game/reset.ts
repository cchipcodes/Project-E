import * as J from "jamango";
import { gameClientTasks, gameServerTasks } from "./game";
import { initServerSystems } from "../server/systems";

export const command = J.net.defineCommand<{}>("game-restart-command");

export function clientResetHandler() {
    J.net.listen(command, (data, playerId) => {
        J.showWorldPortal("EC5DD");
    });
};