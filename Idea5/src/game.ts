import * as J from "jamango";
import * as traits from "./traits/index"
// Constants and Variables

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
            J.setTrait(newEnemyPawn, traits.EnemyTrait);
            lastSpawnTime = time;
        };
    });
};

export function killEnemy() {
    J.onEntityCollisionStart({source: [traits.SpinningTrait], target: [traits.EnemyTrait]}, (_, enemy) => {
        J.removeEntity(enemy);
    });
};

export function useCard(type: string, duration: number, cooldown: number) {
    J.onPlayerJoin((plr) => {
        //const plr = J.getLocalPlayer();
        switch(type) {
            case "blank":
                let lastAtkTime = 0;
                let equipTime = 0;
                let spinningBC: number | undefined;
                J.onGameTick((_, time) => {
                    if (!J.getTrait(plr, traits.HeldItemTrait) && time - lastAtkTime > cooldown) {
                        const card = J.assets.props["Blank Card"]
                        const newBlankCard = J.setTrait(plr, traits.HeldItemTrait, {
                            enabled: true,
                            firstPerson: true,
                            source: {type: "prop", prop: card.id},
                            slot: "handRight",
                            holdPose: "",
                            position: [0,0,0],
                            fpPosition: [0.5,-0.7,-0.7],
                            rotation: [0,0,0],
                            fpRotation: [0,0,0],
                            scale: 0.1,
                            fpScale: 0.1
                        });
                        spinningBC = J.spawnProp(card.id);
                        J.setTrait(spinningBC, traits.SpinningTrait, {
                            enabled: true,
                            axis: [0, 1, 0],
                            speedDegreesPerSecond: 270
                        });
                        J.moveKinematicEntity(spinningBC, J.getEntityPosition(plr), [0,0,0,0]);
                        console.log("Equipped");
                        equipTime = time;
                    };
                    if (equipTime && time - equipTime > duration) {
                        J.removeTrait(plr,traits.HeldItemTrait);
                        J.removeEntity(spinningBC);
                        console.log("Unequipped");
                        equipTime = 0;
                        lastAtkTime = time;
                    };
                    if (spinningBC) {
                        const playerPos = J.getEntityPosition(plr);
                        J.moveKinematicEntity(spinningBC, [playerPos[0], playerPos[1] + 1.5, playerPos[2]], [0,0,0,0]);
                    };
                });
            }
    });
};

//Client Functions

