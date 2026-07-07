import * as J from "jamango";
import { PlayerTrait, BlankCardTrait } from "../traits";

export function cardLogic() {
    const blankCard = J.getPropAsset(J.getAllWithTraits([BlankCardTrait]).findIndex[0]);
    const plr = J.getLocalPlayer();
    const plrTrait = J.getTrait(plr, PlayerTrait);
    J.onGameRender(() => {
        const card = J.spawnProp(blankCard);
        J.setEntityPosition(card, J.getEntityPosition(plr))
    })
};
