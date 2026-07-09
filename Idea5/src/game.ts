import * as J from "jamango";

//Server Functions
export function spawnEnemy(interval: number) {
    let lastSpawnTime = 0;

    J.onGameTick((_, time) => {
        if (time - lastSpawnTime > interval) {
            J.spawnCharacter(J.assets.avatars.Pawn.id);
            lastSpawnTime = time;
        };
    });
};

//Client Functions