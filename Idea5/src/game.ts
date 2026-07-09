import * as J from "jamango";
import * as traits from "./traits/index"

//Server Functions
export function spawnEnemy(interval: number) {
    let lastSpawnTime = 0;

    J.onGameTick((_, time) => {
        if (time - lastSpawnTime > interval) {
            const newEnemyPawn = J.spawnCharacter(J.assets.avatars.Pawn.id);
            J.setTrait(newEnemyPawn, traits.ZombieTrait, {
                enabled: true,
                applyZombieAppearance: false,  
                preserveHeadAndLegs: true,
                skinColorPrimary: "#a6b97f",
                skinColorSecondary: "#8a975c",
                mouthId: "Mouth_Horror.png",
                idleAnimation: "Idle",
                runAnimation: "Run",
                detectRange: 28,
                attackRange: 2.4,
                maxHealth: 10,
                health: 10,
                damageCooldownSeconds: 1,
                killOnTouch: true,
                repathSeconds: 0.45,
                searchSize: 48,
            });
            lastSpawnTime = time;
        };
    });
};

//Client Functions