import * as J from "jamango";

export function wait(t: number) {
    let lastRecordedTime = 0
    const time = J.getWorldTime();
    if (time - lastRecordedTime > t) {
        lastRecordedTime = time;
    };
};