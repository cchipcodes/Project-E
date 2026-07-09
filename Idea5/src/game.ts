import * as J from "jamango";
import * as traits from "./traits/index"

//Server Functions
export function spawnEnemy(interval: number) {
    let lastSpawnTime = 0;

    J.onGameTick((_, time) => {
        if (time - lastSpawnTime > interval) {
            const newEnemyPawn = J.spawnCharacter(J.assets.avatars.Pawn.id);
            J.setTrait(newEnemyPawn, traits.ZombieTrait)
            lastSpawnTime = time;
        };
    });
};

//Client Functions