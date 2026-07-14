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
export function attack(type: string) {
    switch(type) {
        case "blank":
            let lastAtkTime = 0;
            let equipTime = 0;
            const plr = J.getLocalPlayer()
            J.onGameTick((_, time) => {
                if (!J.getTrait(plr, traits.HeldItemTrait) && time - lastAtkTime > 5) {
                    const card = J.assets.props["Blank Card"]
                    const newBlankCard = J.setTrait(plr, traits.HeldItemTrait, {
                        enabled: true,
                        firstPerson: false,
                        source: {type: "prop", prop: card.id},
                        slot: "waist",
                        holdPose: "",
                        position: [0,0,0],
                        fpPosition: [0,0,0],
                        rotation: [0,0,0],
                        fpRotation: [0,0,0],
                        scale: 0.25,
                        fpScale: 1
                    });
                    console.log("Equipped");
                    equipTime = time;
                };
                if (equipTime && time - equipTime > 10) {
                    J.removeTrait(plr,traits.HeldItemTrait);
                    console.log("Unequipped");
                    equipTime = 0;
                    lastAtkTime = time;
                };
            })
    }
};