import * as J from "jamango";
import { PlayerTrait, BlankCardTrait } from "../traits";

export function cardLogic() {
    const blankCard = J.getPropAsset(J.getAllWithTraits([BlankCardTrait]).findIndex[0])
};
