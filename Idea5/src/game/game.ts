import * as J from "jamango";
import * as traits from "../traits/index";
import * as abilities from "./abilities";
import * as hudkit from "../client/hud-kit";
import * as commands from "../shared/commands";
import { wait } from "../shared/utils";
import { command } from "./reset";

// Constants and Variables
let healthUI: HTMLDivElement | undefined;
let abilityUI: HTMLDivElement | undefined;
let statUI: HTMLDivElement | undefined;
let beaconUI: HTMLDivElement | undefined;
let healthCounter: HTMLDivElement | undefined;
let currentAbility: HTMLDivElement | undefined;
let speedCounter: HTMLDivElement | undefined;
let cooldownCounter: HTMLDivElement | undefined;
let activeBeaconCounter: HTMLDivElement | undefined;
let serverBeaconCount: number | undefined;
let maxServerBeacons: number | undefined;

const MOVEMENT_SPEEDS = [
    6,
    6.3,
    6.9,
    7.9,
    9
];

const UPGRADE_CARDS = [
    "Reload",
    "Movement",
    "Hearts",
    "Impulse",
    "Joker",
    "Reverse",
    "King",
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
    serverBeaconCount = 0;
    const allEnemies = J.getAllWithTraits([traits.EnemyTrait]);
    maxServerBeacons = 0;
    for (let x of allEnemies) {
        if (x[1].type == "King") {
            maxServerBeacons = maxServerBeacons + 1;
        };
    };
    J.net.sendToAll(commands.GetBeaconInfoCommand, {
        current: serverBeaconCount,
        max: maxServerBeacons
    });
    spawnLoot();
    interactWithUpgrade();
    abilities.damageEnemy();
    abilitySwitch();
    abilityDisable();
    abilities.playerAttacked();
};

export function spawnLoot() {
    J.onEntityCollisionStart({ source: [traits.PlayerTrait], target: [traits.ChestTrait] }, (_, chest) => {
        let x = 3;
        const chestPos = J.getEntityPosition(chest);
        while (x > 0) {
            const chosenCard = UPGRADE_CARDS[randomIntFromInterval(0, UPGRADE_CARDS.length - 1)];
            const loot = J.spawnProp(J.assets.props[`${chosenCard} Card`].id);
            J.setEntityPosition(loot, [chestPos[0] - randomIntFromInterval(1,2), chestPos[1] + 2, chestPos[2] + randomIntFromInterval(-2, 2)], false);
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
            if (next == MOVEMENT_SPEEDS[-1]) return;
            J.setCharacterMovementProperties(plr, { walkSpeed: next });
            J.net.send(commands.ShowNotificationCommand, {
                message: "Movement Upgrade Obtained!",
                durationSeconds: 3
            }, plr);
            J.removeEntity(loot);
        } else if (lootCard.card == "Reload") {
            let next = 0
            for (let i in ATTACK_SPEEDS) {
                if (playerAbilities.reload == ATTACK_SPEEDS[i]) {
                    next = ATTACK_SPEEDS[Number(i) + 1];
                };
            };
            if (next == ATTACK_SPEEDS[-1]) return;
            J.removeTrait(plr, traits.PlayerAbilitiesTrait);
            J.setTrait(plr, traits.PlayerAbilitiesTrait, {
                abilities: playerAbilities.abilities,
                current: playerAbilities.current,
                reload: next
            });
            J.net.send(commands.ShowNotificationCommand, {
                message: "Reload Upgrade Obtained!",
                durationSeconds: 3
            }, plr);
            J.removeEntity(loot)
        } else {
            let playerCards = playerAbilities.abilities;
            let newCard = ""
            if (playerCards.includes(lootCard.card)) return;
            newCard = lootCard.card;
            playerCards.push(newCard);
            J.removeTrait(plr, traits.PlayerAbilitiesTrait);
            J.setTrait(plr, traits.PlayerAbilitiesTrait, {
                abilities: playerCards,
                current: playerAbilities.current,
                reload: playerAbilities.reload
            });
            J.net.send(commands.ShowNotificationCommand, {
                message: `${lootCard.card} Card Obtained!`,
                durationSeconds: 3
            }, plr);
            J.removeEntity(loot);
        };
    });
};

export function activateBeacon() {
    serverBeaconCount = serverBeaconCount + 1;
    J.net.sendToAll(commands.GetBeaconInfoCommand, {
        current: serverBeaconCount,
        max: maxServerBeacons
    });
    if (serverBeaconCount == maxServerBeacons) {
        J.net.sendToAll(commands.ShowNotificationCommand, {
            message: "All Beacons Activated, Congratulations!",
            durationSeconds: 10
        });
        wait(10, () => {
            J.net.sendToAll(command, {});
        });
    };
};

//Client Functions
export function gameClientTasks() {
    const plr = J.getLocalPlayer();
    
    J.setLocalPlayerCamera(["firstPerson", "thirdPerson"]);
    J.setCharacterVisualFacingMode(plr, "camera");
    J.net.listen(commands.EmitParticleCommand, (data) => {
        const particles = J.spawnParticles(data.particleId);
        J.setEntityPosition(particles, data.position, false);
    });
    J.net.listen(commands.AddTempEntityOutline, (data) => {
        J.setEntityOutline(data.entity, data.size, data.colour);
        wait(data.duration, () => {
            J.setEntityOutline(data.entity, 0, [0,0,0,0]);
        });
    });

    particleEmission();
    abilitySwitch();
    abilityDisable();
    HUD();
};

function particleEmission() {
    const allEntities = J.getAllWithTraits([traits.ParticleEmissionTrait]);
    for (let ent of allEntities) {
        const trait = J.getTrait(ent[0], traits.ParticleEmissionTrait);
        const entPos = J.getEntityPosition(ent[0]);
        const entParticles = J.spawnParticles(trait.asset);
        J.setEntityPosition(entParticles, entPos, false);
    };
};

export function HUD() {
    const plr = J.getLocalPlayer();
        //Beacons HUD Panel
        beaconUI = hudkit.createHUDPanel(`jt-panel ${hudkit.positionClass("left-middle-top")}`);
        hudkit.createText(beaconUI, "jt-label", "Beacons Active");
        activeBeaconCounter = hudkit.createText(beaconUI, "jt-value", "0");
        //Stats HUD Panel
        statUI = hudkit.createHUDPanel(`jt-panel ${hudkit.positionClass("left-middle")}`);
        hudkit.createText(statUI, "jt-label", "Stats");
        hudkit.createText(statUI, "jt-label", "Movement Speed");
        speedCounter = hudkit.createText(statUI, "jt-value", `NULL`);
        hudkit.createText(statUI, "jt-label", "Reload Speed");
        cooldownCounter = hudkit.createText(statUI, "jt-value", `NULL`);
        //Health HUD Panel
        healthUI = hudkit.createHUDPanel(`jt-panel ${hudkit.positionClass("left-middle-bottom")}`);
        hudkit.createText(healthUI, "jt-label", "Health")
        healthCounter = hudkit.createText(healthUI, "jt-value", "NULL");
        //Ability HUD Panel
        abilityUI = hudkit.createHUDPanel(`jt-panel ${hudkit.positionClass("bottom-middle")}`);
        hudkit.createText(abilityUI, "jt-label", "Card");
        currentAbility = hudkit.createText(abilityUI, "jt-value", "None");
        const abilityBtn = document.createElement("button");
        abilityBtn.textContent = "⚡";
        abilityBtn.style.cssText = "position:absolute;bottom:90px;right:16px;width:56px;height:56px;font-size:24px;border-radius:50%;border:3px solid #000;background:#FFD700;pointer-events:auto;";
        abilityBtn.addEventListener("pointerdown", () => {
            J.net.send(commands.PlayerAbilitySwitchCommand, { player: plr });
            updateAbilityUI(plr, currentAbility);
        });
        J.uiElement?.appendChild(abilityBtn);
        const abilityDisableBtn = document.createElement("button");
        abilityDisableBtn.textContent = "❌";
        abilityDisableBtn.style.cssText = "position:absolute;bottom:60px;right:64px;width:56px;height:56px;font-size:24px;border-radius:50%;border:3px solid #000;background:#FFD700;pointer-events:auto;";
        abilityDisableBtn.addEventListener("pointerdown", () => {
            resetAbilityUI(currentAbility);
            J.net.send(commands.PlayerAbilityEndCommand, { player: plr });
        });
        J.uiElement?.appendChild(abilityDisableBtn);
    J.net.listen(commands.GetBeaconInfoCommand, (data) => {
        updateBeaconUI(activeBeaconCounter, data.current, data.max);
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
    hudkit.setText(ui, String(speed));
};

function updateBeaconUI(ui: HTMLDivElement, c: number, i: number) {
    hudkit.setText(ui, `${String(c)}/${String(i)}`);
};

function updateCooldownUI(plr: J.EntityId, ui: HTMLDivElement) {
    const cd = J.getTrait(plr, traits.PlayerAbilitiesTrait).reload;
    hudkit.setText(ui, String(cd));
};

function updateAbilityUI(plr: J.EntityId, ui: HTMLDivElement) {
    const trait = J.getTrait(plr, traits.PlayerAbilitiesTrait);
    const i = trait.current;
    const active = trait.abilities[i];
    hudkit.setText(ui, active);
};

function resetAbilityUI(ui: HTMLDivElement) {
    hudkit.setText(ui, "None");
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
    };
    if (J.net.isHost) {
        J.net.listen(commands.PlayerAbilitySwitchCommand, (ent) => {
            abilities.switchCard(ent.player);
        });
    };
};

export function abilityDisable() {
    if (J.net.isClient) {
        const plr = J.getLocalPlayer();
        J.onControlPress("KeyQ", (playerId) => {
            if (playerId !== plr) return;
            resetAbilityUI(currentAbility);
            J.net.send(commands.PlayerAbilityEndCommand, { player: plr });
        });
    };
    if (J.net.isHost) {
        J.net.listen(commands.PlayerAbilityEndCommand, (data) => {
            const abilityTrait = J.getTrait(data.player, traits.PlayerAbilitiesTrait);
            J.removeTrait(data.player, traits.ProjectileSpawnerTrait);
            J.removeTrait(data.player, traits.HeldItemTrait);
            J.removeTrait(data.player, traits.PlayerAbilitiesTrait);
            J.setTrait(data.player, traits.PlayerAbilitiesTrait, {
                abilities: abilityTrait.abilities,
                reload: abilityTrait.reload,
                current: 0
            });
        });
    };
};

// Source - https://stackoverflow.com/a/7228322
// Posted by Francisc, modified by community. See post 'Timeline' for change history
// Retrieved 2026-07-31, License - CC BY-SA 4.0

function randomIntFromInterval(min, max) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min);
};
