import * as J from "jamango";
import * as traits from "../traits/index";
import * as abilities from "./abilities";
import * as hudkit from "../client/hud-kit";
import * as commands from "../shared/commands";

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
    "Hearts",
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
    interactWithUpgrade();
    abilities.damageEnemy();
    abilitySwitch();
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
            abilities.switchCard(ent.player);
        });
    };
};

// Source - https://stackoverflow.com/a/7228322
// Posted by Francisc, modified by community. See post 'Timeline' for change history
// Retrieved 2026-07-31, License - CC BY-SA 4.0

function randomIntFromInterval(min, max) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min);
};
