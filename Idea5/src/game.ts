import * as J from "jamango";
import * as game from "./additionalFunctions";

//Server Functions
export function spawnEnemy() {
    game.wait(5)
    J.sendChatMessage("This event took place after 5 seconds", "#FFFF");
};

//Client Functions