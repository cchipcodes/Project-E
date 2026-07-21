import * as J from "jamango";
import * as traits from "./traits/index"
import * as server from "./server/systems"
// Constants and Variables

//Server Functions
function damageEnemy(d: number) {
    J.onEntityCollisionStart({source: [traits.SpinningTrait], target: [traits.EnemyTrait]}, (_, enemy) => {
        const Damage = J.getTrait(enemy, traits.EnemyTrait);
        const currentHealth = Damage.health;
        if (currentHealth > 0) {
            J.removeTrait(enemy, traits.EnemyTrait);
            J.setTrait(enemy, traits.EnemyTrait, {
                health: currentHealth - d
            });
        } else {
            J.removeEntity(enemy);
        };
    });
};

export function damagePlayer(d: number, plr: J.EntityId, t: number) {
        const Damage = J.getTrait(plr, traits.PlayerTrait);
        const currentHealth = Damage.health;
        const currentScore = Damage.score;
        if (currentHealth > 0) {
            J.removeTrait(plr, traits.PlayerTrait);
            J.setTrait(plr, traits.PlayerTrait, {
                health: currentHealth - d,
                score: currentScore
            });
        } else {
            server.killPlayer(plr, t);
        };
};

export function playerHealthManager() {
    J.onGameTick(() => {
        const players = J.getAllWithTraits([traits.PlayerTrait]);
        for (const player of players) {
            if (checkHealth(player[0]) == 0) {
                J.setCharacterAlive(player[0], false)
                console.log('Killed', player[0]);
            };
        };
    });
};

function checkHealth(entity: J.EntityId) {
    const health = J.getTrait(entity, traits.PlayerTrait).health;
    console.log(health);
    return health;
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
                    damageEnemy(2);
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

