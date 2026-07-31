import * as J from "jamango";
import * as traits from "./traits/index";
import * as server from "./server/systems";
import * as hudkit from "./client/hud-kit";
import * as commands from "./shared/commands";

// Constants and Variables
let healthUI: HTMLDivElement | undefined;
let abilityUI: HTMLDivElement | undefined;
let statUI: HTMLDivElement | undefined;
let healthCounter: HTMLDivElement | undefined;
let currentAbility: HTMLDivElement | undefined;
let speedCounter: HTMLDivElement | undefined;
let cooldownCounter: HTMLDivElement | undefined;

const MOVEMENT_SPEEDS = [
    6,
    6.3,
    6.9,
    7.9,
    9
];

const UPGRADE_CARDS = [
    "Attack",
    "Movement",
    "Queen",
    "Rebound",
    "Joker",
    "Reverse"
];

const ATTACK_SPEEDS = [
    5,
    4.75,
    4,
    2.75,
    1
];

//Server Functions
export function gameServerTasks() {
    spawnLoot();
    damageEnemy();
    interactWithUpgrade();
    damageEnemy();
};

export function spawnLoot() {
    J.onEntityCollisionStart({ source: [traits.PlayerTrait], target: [traits.ChestTrait] }, (_, chest) => {
        let x = 3;
        const chestPos = J.getEntityPosition(chest);
        while (x > 0) {
            const chosenCard = UPGRADE_CARDS[randomIntFromInterval(0, UPGRADE_CARDS.length - 1)]
            const loot = J.spawnProp(J.assets.props["New Prop"].id);
            J.setEntityPosition(loot, [chestPos[0] - randomIntFromInterval(3,5), chestPos[1] + 5, chestPos[2] + randomIntFromInterval(-5, 5)], false);
            J.setTrait(loot, traits.LootCardTrait, {
                card: chosenCard
            });
            J.updatePropPhysicsProperties(loot, {
                motionType: J.MOTION_TYPE_DYNAMIC
            });
            x = x - 1;
            const lootPos = J.getEntityPosition(loot);
        };
        J.removeEntity(chest);
    });
};

export function interactWithUpgrade() {
    J.onEntityCollisionStart({ source:[traits.PlayerTrait], target: [traits.LootCardTrait]}, (plr, loot) => {
        const playerAbilities = J.getTrait(plr, traits.PlayerAbilitiesTrait);
        const lootCard = J.getTrait(loot, traits.LootCardTrait);
        const playerMovement = J.getCharacterMovementProperties(plr);

        if (lootCard.card == "Movement") {
            let next = 0;
            for (let index in MOVEMENT_SPEEDS) {
                if (playerMovement.walkSpeed == MOVEMENT_SPEEDS[index]) {
                    next = MOVEMENT_SPEEDS[Number(index) + 1];
                };
            };
            if (next == MOVEMENT_SPEEDS[-1]) { return };
            J.setCharacterMovementProperties(plr, { walkSpeed: next });
            J.removeEntity(loot);
        } else if (lootCard.card == "Attack") {
            let next = 0
            for (let i in ATTACK_SPEEDS) {
                if (playerAbilities.reload == ATTACK_SPEEDS[i]) {
                    next = ATTACK_SPEEDS[Number(i) + 1];
                };
            };
            if (next == ATTACK_SPEEDS[-1]) { return };
            J.removeTrait(plr, traits.PlayerAbilitiesTrait);
            J.setTrait(plr, traits.PlayerAbilitiesTrait, {
                abilities: playerAbilities.abilities,
                current: playerAbilities.current,
                reload: next
            });
            J.removeEntity(loot)
        } else {
            let playerCards = playerAbilities.abilities;
            let newCard = ""
            for (let indexedCard of playerCards) {
                if (lootCard.card == indexedCard) {
                    return;
                } else {
                    newCard = lootCard.card;
                    playerCards.push(newCard);
                };
            };
            if (newCard == "") { return };
            J.removeTrait(plr, traits.PlayerAbilitiesTrait);
            J.setTrait(plr, traits.PlayerAbilitiesTrait, {
                abilities: playerCards,
                current: playerAbilities.current,
                reload: playerAbilities.reload
            });
            J.removeEntity(loot);
        };
    });
};

export function damageEnemy() {
    //blank
    J.onEntityCollisionStart({source: [traits.EnemyDamageTrait], target: [traits.EnemyTrait]}, (proj, enemy) => {
        const d = J.getTrait(proj, traits.EnemyDamageTrait).damage;
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
                    particleId: J.assets.particles.Bang.id
                });
                J.removeEntity(enemy);   
            };
        };
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

        if (currentHealth > 0) {
            J.removeTrait(enemy, traits.EnemyTrait);
            J.setTrait(enemy, traits.EnemyTrait, {
                health: currentHealth - d,
                type: enemyType,
            });
            J.clearCharacterMoveTarget(enemy);
            J.characterJump(enemy, 10, true, false);
            currentHealth = J.getTrait(enemy, traits.EnemyTrait).health;
            if (currentHealth <= 0) {
                J.net.sendToAll(commands.EmitParticleCommand, {
                    position: J.getEntityPosition(enemy), 
                    particleId: J.assets.particles.Bang.id
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
        } else {
            J.setTrait(plr, traits.PlayerTrait, {
                health: 100,
                score: plrTrait.score,
            });
        };
    });
};

export function playerAttacked() {
    J.onEntityCollisionStart({ source: [traits.PlayerDamageTrait], target: [traits.PlayerTrait] }, (proj, plr) => {
        const trait = J.getTrait(proj, traits.PlayerDamageTrait);
        damagePlayer(trait.damage, plr, server.serverTime);
        J.removeEntity(proj);
    });
}

export function damagePlayer(d: number, plr: J.EntityId, t: number) {
        const Damage = J.getTrait(plr, traits.PlayerTrait);
        let currentHealth = Damage.health;
        if (currentHealth > 0) {
            J.removeTrait(plr, traits.PlayerTrait);
            J.setTrait(plr, traits.PlayerTrait, {
                health: currentHealth - d,
                score: Damage.score,
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
    switch(type) {
        case "Blank":
            J.setTrait(plr, traits.HeldItemTrait, {
                enabled: true,
                firstPerson: true,
                source: {type: "prop", prop: J.assets.props["Blank Card"].id},
                slot: "handRight",
                holdPose: J.assets.animations.items_oneHanded_idle_over.id,
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
            break;
        case "Reverse":
            J.setTrait(plr, traits.HeldItemTrait, {
                enabled: true,
                firstPerson: true,
                source: {type: "prop", prop: J.assets.props["New Prop"].id},
                slot: "handRight",
                holdPose: J.assets.animations.items_oneHanded_idle_over.id,
                position: [0,0,0],
                fpPosition: [0.5,-0.7,-0.7],
                rotation: [0,0,0],
                fpRotation: [0,0,0],
                scale: 1,
                fpScale: 1
            });
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
                        damage: 7,
                        player: plr,
                    }
                },
            });
            break;
        case "Rebound":
            J.setTrait(plr, traits.HeldItemTrait, {
                enabled: true,
                firstPerson: true,
                source: {type: "prop", prop: J.assets.props["New Prop"].id},
                slot: "handRight",
                holdPose: J.assets.animations.items_oneHanded_idle_over.id,
                position: [0,0,0],
                fpPosition: [0.5,-0.7,-0.7],
                rotation: [0,0,0],
                fpRotation: [0,0,0],
                scale: 1,
                fpScale: 1
            });
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
        }
};

//Client Functions
export function gameClientTasks() {
    J.net.listen(commands.EmitParticleCommand, (data) => {
        const particles = J.spawnParticles(data.particleId);
        J.setEntityPosition(particles, data.position, false);
    });
    abilitySwitch();
};

export function HUD() {
    const plr = J.getLocalPlayer();
    J.onGameStart(() => {
        //Stats HUD Panel
        statUI = hudkit.createHUDPanel(`jt-panel ${hudkit.positionClass("left-middle")}`);
        hudkit.createText(statUI, "jt-label", "Stats");
        speedCounter = hudkit.createText(statUI, "jt-value", `Speed: NULL`);
        cooldownCounter = hudkit.createText(statUI, "jt-value", `Reload: NULL`);
        //Health HUD Panel
        healthUI = hudkit.createHUDPanel(`jt-panel ${hudkit.positionClass("left-middle-bottom")}`);
        hudkit.createText(healthUI, "jt-label", "Health")
        healthCounter = hudkit.createText(healthUI, "jt-value", "NULL");
        //Ability HUD Panel
        abilityUI = hudkit.createHUDPanel(`jt-panel ${hudkit.positionClass("bottom-middle")}`);
        hudkit.createText(abilityUI, "jt-label", "Card");
        currentAbility = hudkit.createText(abilityUI, "jt-value", "None");
    });
    J.onGameRender(() => {
        updateHealthUI(plr, healthCounter);
        updateSpeedUI(plr, speedCounter);
        updateCooldownUI(plr, cooldownCounter);
    });
};

function updateHealthUI(plr: J.EntityId, ui: HTMLDivElement) {
    hudkit.setText(ui, String(checkHealth(plr)));
};

function updateSpeedUI(plr: J.EntityId, ui: HTMLDivElement) {
    const speed = J.getCharacterMovementProperties(plr).walkSpeed;
    hudkit.setText(ui, `Speed: ${String(speed)}`);
};

function updateCooldownUI(plr: J.EntityId, ui: HTMLDivElement) {
    const cd = J.getTrait(plr, traits.PlayerAbilitiesTrait).reload;
    hudkit.setText(ui, `Reload: ${String(cd)}`);
};


function updateAbilityUI(plr: J.EntityId, ui: HTMLDivElement) {
    const trait = J.getTrait(plr, traits.PlayerAbilitiesTrait);
    const i = trait.current;
    const active = trait.abilities[i];
    hudkit.setText(ui, active);
};

// Shared Functions
function checkHealth(entity: J.EntityId) {
    const health = J.getTrait(entity, traits.PlayerTrait).health;
    return health;
};

export function abilitySwitch() {
    if (J.net.isClient) {
        const plr = J.getLocalPlayer()
        J.onControlPress("KeyE", (playerId) => {
            if (playerId !== plr) return;
            J.net.send(commands.PlayerAbilitySwitchCommand, { player: plr });
            updateAbilityUI(plr, currentAbility);
        });
    }
    if (J.net.isHost) {
        J.net.listen(commands.PlayerAbilitySwitchCommand, (ent) => {
            switchCard(ent.player);
        });
    };
};

// Source - https://stackoverflow.com/a/7228322
// Posted by Francisc, modified by community. See post 'Timeline' for change history
// Retrieved 2026-07-31, License - CC BY-SA 4.0

function randomIntFromInterval(min, max) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min);
};
