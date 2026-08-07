import * as J from "jamango";
import * as traits from "../traits/index";
import * as server from "../server/systems";
import * as commands from "../shared/commands";
import { wait } from "../shared/utils";
import { activateBeacon } from "./game";
import { entityId } from "jamango/schema";

export function damageEnemy() {
    //blank
    J.onEntityCollisionStart({source: [traits.EnemyDamageTrait], target: [traits.EnemyTrait]}, (proj, enemy) => {
        const d = J.getTrait(proj, traits.EnemyDamageTrait).damage;
        const Damage = J.getTrait(enemy, traits.EnemyTrait);
        let currentHealth = Damage.health;
        const enemyType = Damage.type;
        if (enemyType == "King") return;
        J.removeTrait(enemy, traits.EnemyTrait);
        J.setTrait(enemy, traits.EnemyTrait, {
            health: currentHealth - d,
            type: enemyType,
        });
        if (currentHealth > 0) {
            J.clearCharacterMoveTarget(enemy);
            J.characterJump(enemy, 10, true, false);
            currentHealth = J.getTrait(enemy, traits.EnemyTrait).health;
            if (currentHealth <= 0) {
                J.net.sendToAll(commands.EmitParticleCommand, {
                    position: J.getEntityPosition(enemy), 
                    particleId: J.assets.particles["Enemy Death"].id
                });
                J.removeEntity(enemy);   
            };
        };
        J.net.sendToAll(commands.EmitParticleCommand, {
            position: J.getEntityPosition(proj),
            particleId: J.assets.particles["Damage Indicator"].id
        });
        J.removeEntity(proj);
    });
    //reverse
    J.onEntityCollisionStart({source: [traits.EnemyStealTrait], target: [traits.EnemyTrait]}, (proj, enemy) => {
        const d = J.getTrait(proj, traits.EnemyStealTrait).damage;
        const plr = J.getTrait(proj, traits.EnemyStealTrait).player;
        const Damage = J.getTrait(enemy, traits.EnemyTrait);
        let currentHealth = Damage.health;
        const plrTrait = J.getTrait(plr, traits.PlayerTrait);
        const playerHealth = plrTrait.health;
        const enemyType = Damage.type;
        if (enemyType == "King") return;
        if (currentHealth > 0) {
            J.removeTrait(enemy, traits.EnemyTrait);
            J.setTrait(enemy, traits.EnemyTrait, {
                health: currentHealth - d,
                type: enemyType,
            });
            J.clearCharacterMoveTarget(enemy);
            J.characterJump(enemy, 10, true, false);
            currentHealth = J.getTrait(enemy, traits.EnemyTrait).health;
            J.net.sendToAll(commands.EmitParticleCommand, {
                position: J.getEntityPosition(enemy), 
                particleId: J.assets.particles["Damage Indicator"].id
            });
            if (currentHealth <= 0) {
                J.net.sendToAll(commands.EmitParticleCommand, {
                    position: J.getEntityPosition(enemy), 
                    particleId: J.assets.particles["Enemy Death"].id
                });
                J.removeEntity(enemy);   
            };
        };
        J.removeEntity(proj);

        if (playerHealth + d < 100) {
            J.removeTrait(plr, traits.PlayerTrait);
            J.setTrait(plr, traits.PlayerTrait, {
                health: playerHealth + d,
                score: plrTrait.score,
            });
            J.net.sendToAll(commands.EmitParticleCommand, {
                position: J.getEntityPosition(Number(plr) as J.EntityId), 
                particleId: J.assets.particles["Reverse Player"].id
            });
        } else {
            J.setTrait(plr, traits.PlayerTrait, {
                health: 100,
                score: plrTrait.score,
            });
        };
    });
    //king
    J.onEntityCollisionStart({source: [traits.KingCardTrait], target: [traits.EnemyTrait]}, (proj, enemy) => {
        const trait = J.getTrait(enemy, traits.EnemyTrait);
        if (trait.type == "King") {
            const d = 100;
            const Damage = J.getTrait(enemy, traits.EnemyTrait);
            let currentHealth = Damage.health;
            const enemyType = Damage.type;
            J.removeTrait(enemy, traits.EnemyTrait);
            J.setTrait(enemy, traits.EnemyTrait, {
                health: currentHealth - d,
                type: enemyType,
            });
            if (currentHealth > 0) {
                J.clearCharacterMoveTarget(enemy);
                J.characterJump(enemy, 10, true, false);
                currentHealth = J.getTrait(enemy, traits.EnemyTrait).health;
                if (currentHealth <= 0) {
                    J.net.sendToAll(commands.EmitParticleCommand, {
                        position: J.getEntityPosition(enemy), 
                        particleId: J.assets.particles["Beacon Initialize"].id
                    });
                    J.net.sendToAll(commands.EmitParticleCommand, {
                        position: J.getEntityPosition(enemy), 
                        particleId: J.assets.particles["Beacon Beam"].id
                    });
                    J.removeEntity(enemy); 
                    activateBeacon();  
                };
            };
        } else {
            J.net.sendToAll(commands.EmitParticleCommand, {
                position: J.getEntityPosition(proj), 
                particleId: J.assets.particles["Absorbed Attack"].id
            });
        };
        J.removeEntity(proj);
    });
    //joker
    J.onEntityCollisionStart({source: [traits.JokerCardTrait], target: [traits.EnemyTrait]}, (proj, enemy) => {
        const enemyTrait = J.getTrait(enemy, traits.EnemyTrait);
        
        
        if (enemyTrait.type != "Rook") {
            J.net.sendToAll(commands.EmitParticleCommand, {
                position: J.getEntityPosition(proj), 
                particleId: J.assets.particles["Absorbed Attack"].id
            });
            return;
        };
        J.removeEntity(proj);

        const projectileTrait = J.getTrait(enemy, traits.ProjectileSpawnerTrait);
        const lookAtTrait = J.getTrait(enemy, traits.NPCLookAtNearestPlayerTrait);
        
        J.removeTrait(enemy, traits.ProjectileSpawnerTrait);
        J.removeTrait(enemy, traits.NPCLookAtNearestPlayerTrait);

        wait(10, () => {
            J.setTrait(enemy, traits.ProjectileSpawnerTrait, projectileTrait);
            J.setTrait(enemy, traits.NPCLookAtNearestPlayerTrait, lookAtTrait);
        });
    });
    //queen
    J.onEntityCollisionStart({source: [traits.HeartsCardTrait], target: [traits.EnemyTrait]}, (proj, enemy) => {
        const enemyTrait = J.getTrait(enemy, traits.EnemyTrait);
        
        if (enemyTrait.type != "Queen") {
            J.net.sendToAll(commands.EmitParticleCommand, {
                position: J.getEntityPosition(proj), 
                particleId: J.assets.particles["Absorbed Attack"].id
            });
            return;
        };
        J.removeEntity(proj);
        
        const zombieTrait = J.getTrait(enemy, traits.ZombieTrait);
        
        J.removeTrait(enemy, traits.ZombieTrait);

        wait(10, () => {
            J.setTrait(enemy, traits.ZombieTrait, zombieTrait);
        });
    });
};

export function playerAttacked() {
    J.onEntityCollisionStart({ source: [traits.PlayerDamageTrait], target: [traits.PlayerTrait] }, (proj, plr) => {
        const trait = J.getTrait(proj, traits.PlayerDamageTrait);
        damagePlayer(trait.damage, plr, server.serverTime, J.getEntityPosition(proj));
        J.removeEntity(proj);
    });
}

export function damagePlayer(d: number, plr: J.EntityId, t: number, pos: J.Vec3) {
        const Damage = J.getTrait(plr, traits.PlayerTrait);
        let currentHealth = Damage.health;
        if (currentHealth > 0) {
            J.removeTrait(plr, traits.PlayerTrait);
            J.setTrait(plr, traits.PlayerTrait, {
                health: currentHealth - d,
                score: Damage.score,
            });
            J.net.sendToAll(commands.EmitParticleCommand, {
                position: pos, 
                particleId: J.assets.particles["Player Damage"].id
            });
            currentHealth = J.getTrait(plr, traits.PlayerTrait).health
            if (currentHealth <= 0) {
                server.killPlayer(plr, t)
            };
        };
};

export function switchCard(plr: J.EntityId) {
    const trait = J.getTrait(plr, traits.PlayerAbilitiesTrait);
    let currentIndex = trait.current;
    const listOfCards = trait.abilities;
    J.removeTrait(plr, traits.PlayerAbilitiesTrait);

    if (listOfCards.length == currentIndex) {
        useCard(listOfCards[0], trait.reload, plr);
        currentIndex = 0;
    } else {
        useCard(listOfCards[currentIndex], trait.reload, plr);
        if (currentIndex + 1 == listOfCards.length) {
            currentIndex = 0;
        } else {
            currentIndex = currentIndex + 1;
        };

    };
    J.setTrait(plr, traits.PlayerAbilitiesTrait, {
        abilities: listOfCards,
        current: currentIndex,
        reload: trait.reload
    });
};

export function useCard(type: string, cooldown: number, plr: J.EntityId) {
    if (J.getTrait(plr, traits.HeldItemTrait) && J.getTrait(plr, traits.ProjectileSpawnerTrait)) {
        J.removeTrait(plr, traits.HeldItemTrait);
        J.removeTrait(plr, traits.ProjectileSpawnerTrait);
    };
    J.setTrait(plr, traits.HeldItemTrait, {
        enabled: true,
        firstPerson: true,
        source: {type: "prop", prop: J.assets.props[`${type} Card`].id},
        slot: "handRight",
        holdPose: J.assets.animations.items_oneHanded_idle_over.id,
        position: [0,0,0],
        fpPosition: [0.5,-0.7,-0.7],
        rotation: [90,0,0],
        fpRotation: [0,0,0],
        scale: 0.2,
        fpScale: 0.2
    });
    switch(type) {
        case "Blank":
            J.setTrait(plr, traits.ProjectileSpawnerTrait, {
                "enabled": true,
                "projectile": J.assets.props[`${type} Card`].id,
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
            break;
        case "Reverse":
            J.setTrait(plr, traits.ProjectileSpawnerTrait, {
                "enabled": true,
                "projectile": J.assets.props[`${type} Card`].id,
                "killOnHit": false,
                "direction": [0,0,1],
                "speed": 90,
                "fireEverySeconds": cooldown,
                "lifetimeSeconds": 5,
                "scale": 1,
                "startDelaySeconds": 0,
                "projectileTraits": {
                    "enemySteal": {
                        damage: 7,
                        player: plr,
                    }
                },
            });
            break;
        case "Impulse":
            J.setTrait(plr, traits.ProjectileSpawnerTrait, {
                "enabled": true,
                "projectile": J.assets.props[`${type} Card`].id,
                "killOnHit": false,
                "direction": [0,0,1],
                "speed": 90,
                "fireEverySeconds": cooldown,
                "lifetimeSeconds": 5,
                "scale": 1,
                "startDelaySeconds": 0,
                "projectileTraits": {
                    "velocityImpulse": {
                        "enabled": true,
                        "velocity": [
                        10,
                        10,
                        10
                        ],
                        "additive": false,
                        "predictable": true
                    },
                },
            });
            break;
        case "King":
            J.setTrait(plr, traits.ProjectileSpawnerTrait, {
                "enabled": true,
                "projectile": J.assets.props[`${type} Card`].id,
                "killOnHit": false,
                "direction": [0,0,1],
                "speed": 90,
                "fireEverySeconds": cooldown,
                "lifetimeSeconds": 5,
                "scale": 1,
                "startDelaySeconds": 0,
                "projectileTraits": {
                    "kingCard": {}
                },
            });
            break;
        case "Hearts":
            J.setTrait(plr, traits.ProjectileSpawnerTrait, {
                "enabled": true,
                "projectile": J.assets.props[`${type} Card`].id,
                "killOnHit": false,
                "direction": [0,0,1],
                "speed": 90,
                "fireEverySeconds": cooldown,
                "lifetimeSeconds": 5,
                "scale": 1,
                "startDelaySeconds": 0,
                "projectileTraits": {
                    "heartsCard": {}
                },
            });
            break;
        case "Joker":
            J.setTrait(plr, traits.ProjectileSpawnerTrait, {
                "enabled": true,
                "projectile": J.assets.props[`${type} Card`].id,
                "killOnHit": false,
                "direction": [0,0,1],
                "speed": 90,
                "fireEverySeconds": cooldown,
                "lifetimeSeconds": 5,
                "scale": 1,
                "startDelaySeconds": 0,
                "projectileTraits": {
                    "jokerCard": {}
                },
            });
            break;
        default: return;
        };
};
