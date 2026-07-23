import * as J from "jamango";
import * as traits from "./traits/index";
import * as server from "./server/systems";
import * as hudkit from "./client/hud-kit";
import { AssetSchema } from "jamango/schema";
// Constants and Variables
let healthUI: HTMLDivElement | undefined;

//Server Functions
export function damageEnemy() {
    //blank
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
            J.characterJump(enemy, 10, true, false);
        } else {
            J.removeEntity(enemy);
        };
        J.removeEntity(proj);
    });
    //reverse
    J.onEntityCollisionStart({source: [traits.EnemyStealTrait], target: [traits.EnemyTrait]}, (proj, enemy) => {
        const d = J.getTrait(proj, traits.EnemyStealTrait).damage;
        const plr = J.getTrait(proj, traits.EnemyStealTrait).player;
        const Damage = J.getTrait(enemy, traits.EnemyTrait);
        const currentHealth = Damage.health;
        const plrTrait = J.getTrait(plr, traits.PlayerTrait);
        const playerHealth = plrTrait.health;
        const playerScore = plrTrait.score;

        if (currentHealth > 0) {
            J.removeTrait(enemy, traits.EnemyTrait);
            J.setTrait(enemy, traits.EnemyTrait, {
                health: currentHealth - d
            });
            J.clearCharacterMoveTarget(enemy);
            J.characterJump(enemy, 10, true, false);
        } else {
            J.removeEntity(enemy);
        };
        J.removeEntity(proj);

        if (playerHealth < 100) {
            J.removeTrait(plr, traits.PlayerTrait);
            J.setTrait(plr, traits.PlayerTrait, {
                health: playerHealth + d,
                score: playerScore,
            });
        };
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

export function useCard(type: string, cooldown: number, plr: J.EntityId) {
    if (J.getTrait(plr, traits.HeldItemTrait) && J.getTrait(plr, traits.ProjectileSpawnerTrait)) {
        J.removeTrait(plr, traits.HeldItemTrait);
        J.removeTrait(plr, traits.ProjectileSpawnerTrait);
    };
    switch(type) {
        case "blank":
            J.setTrait(plr, traits.HeldItemTrait, {
                enabled: true,
                firstPerson: true,
                source: {type: "prop", prop: J.assets.props["Blank Card"].id},
                slot: "handRight",
                holdPose: J.assets.animations.items_shield_idle_over.id,
                position: [0,0,0],
                fpPosition: [0.5,-0.7,-0.7],
                rotation: [0,0,0],
                fpRotation: [0,0,0],
                scale: 0.1,
                fpScale: 0.1
            });
            J.setTrait(plr, traits.ProjectileSpawnerTrait, {
                "enabled": true,
                "projectile": J.assets.props["Blank Card"].id,
                "killOnHit": false,
                "direction": [0,0,1],
                "speed": 90,
                "fireEverySeconds": cooldown,
                "lifetimeSeconds": 5,
                "scale": 1,
                "startDelaySeconds": 0,
                "projectileTraits": {
                    "enemyDamage": {
                        "damage": 10
                    },
                },
            });
        case "reverse":
            J.setTrait(plr, traits.ProjectileSpawnerTrait, {
                "enabled": true,
                "projectile": J.assets.props["New Prop"].id,
                "killOnHit": false,
                "direction": [0,0,1],
                "speed": 90,
                "fireEverySeconds": cooldown,
                "lifetimeSeconds": 5,
                "scale": 1,
                "startDelaySeconds": 0,
                "projectileTraits": {
                    "enemySteal": {
                        damage: 10,
                        player: plr,
                    }
                },
            });
        }
};

//Client Functions
export function HUD() {
    const plr = J.getLocalPlayer();
    J.onGameStart(() => {
        const HUD = hudkit.createHUDPanel("health");
        HUD.style.top = "24px";

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
