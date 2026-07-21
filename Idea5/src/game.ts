import * as J from "jamango";
import * as traits from "./traits/index";
import * as server from "./server/systems";
import * as hudkit from "./client/hud-kit";
// Constants and Variables
let healthUI: HTMLDivElement | undefined;

//Server Functions
export function damageEnemy() {
    J.onEntityCollisionStart({source: [traits.EnemyDamageTrait], target: [traits.EnemyTrait]}, (proj, enemy) => {
        const d = J.getTrait(proj, traits.EnemyDamageTrait).damage;
        const Damage = J.getTrait(enemy, traits.EnemyTrait);
        const currentHealth = Damage.health;
        if (currentHealth > 0) {
            J.removeTrait(enemy, traits.EnemyTrait);
            J.setTrait(enemy, traits.EnemyTrait, {
                health: currentHealth - d
            });
            J.clearCharacterMoveTarget(enemy);
            J.addEntityVelocity(enemy, [100,100,50]);
        } else {
            J.removeEntity(enemy);
        };
        J.removeEntity(proj);
    });
};

export function damagePlayer(d: number, plr: J.EntityId, t: number) {
        const Damage = J.getTrait(plr, traits.PlayerTrait);
        let currentHealth = Damage.health;
        const currentScore = Damage.score;
        if (currentHealth > 0) {
            console.log(currentHealth);
            J.removeTrait(plr, traits.PlayerTrait);
            J.setTrait(plr, traits.PlayerTrait, {
                health: currentHealth - d,
                score: currentScore
            });
            currentHealth = Damage.health;
            console.log(currentHealth);
            if (currentHealth <= 0) {
                server.killPlayer(plr, t)
            };
        } else {
            server.killPlayer(plr, t);
        };
};

export function useCard(type: string, duration: number, cooldown: number) {
    J.onPlayerJoin((plr) => {
        switch(type) {
            case "blank":
                let lastAtkTime = 0;
                let equipTime = 0;
                J.onGameTick((_, time) => {
                    //damageEnemy();
                    if (time - lastAtkTime > cooldown) {
                        const card = J.assets.props["Blank Card"]
                        J.setTrait(plr, traits.HeldItemTrait, {
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
                        J.setTrait(plr, traits.ProjectileSpawnerTrait, {
                            "enabled": true,
                            "projectile": "prop#E1BE395617A24B34A29009E07F7C3C17",
                            "killOnHit": false,
                            "direction": [
                            0,
                            0,
                            1
                            ],
                            "speed": 24,
                            "fireEverySeconds": 1.5,
                            "lifetimeSeconds": 5,
                            "scale": 1,
                            "startDelaySeconds": 0,
                            "projectileTraits": {
                                "enemyDamage": {
                                    "damage": 10
                                },
                            },
                        });
                        equipTime = time;
                    };
                    if (equipTime && time - equipTime > duration) {
                        J.removeTrait(plr,traits.HeldItemTrait);
                        J.removeTrait(plr, traits.ProjectileSpawnerTrait);
                        console.log("Unequipped");
                        equipTime = 0;
                        lastAtkTime = time;
                    };
                });
            }
    });
};

//Client Functions
export function HUD() {
    const plr = J.getLocalPlayer();
    J.onGameStart(() => {
        const HUD = hudkit.createHUDPanel("health");
        HUD.style.top = "24px";
        HUD.style.left = "5px";

        healthUI = hudkit.createText(HUD, "health", "NULL");
    });
    J.onGameRender(() => {
        updateHealthUI(plr, healthUI);
    });
};

function updateHealthUI(plr: J.EntityId, ui: HTMLDivElement) {
    hudkit.setText(ui, String(checkHealth(plr)));
};

// Shared Functions
function checkHealth(entity: J.EntityId) {
    const health = J.getTrait(entity, traits.PlayerTrait).health;
    return health;
};