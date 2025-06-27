import { Cut, CutType } from "../interfaces/CutData";
import { TraceFrequency } from "../interfaces/TraceData";
import { getUniqueActionsFromArray } from "./TraceHelper";

export function getRandomCuts(traces: TraceFrequency[]): Cut[] {
    const actions = getUniqueActionsFromArray(traces);

    let group1: string[] = [];
    let group2: string[] = [];

    const cuts: Cut[] = [];

    const cutTypes: CutType[] = ["sequence", "xor", "concurrency", "loop"];

    if (actions.length === 1) {
        return [];
    }

    if (actions.length === 2) {
        return [{
            group1: [actions[0]],
            group2: [actions[1]],
            type: cutTypes[Math.floor(Math.random()*cutTypes.length)],
            algorithm: "random"
        }]
    }

    for (let i = 0; i < cutTypes.length; i++) {
        for (let j = 0; j < actions.length; j++) {
            if (j === 0) {
                group1.push(actions[j]);
            } else if (j === actions.length-1) {
                group2.push(actions[j]);
            } else if (Math.random() < 0.5) {
                group1.push(actions[j]);
            } else {
                group2.push(actions[j]);
            }
        }  

        cuts.push({
            group1: group1,
            group2: group2,
            type: cutTypes[i],
            algorithm: "random"
        })

        group1 = [];
        group2 = [];
    }

    return cuts;
}

export function getMaxLoops(traces: TraceFrequency[], cut: Cut): number {
    let maxloop: number = 0;
    let loopcount: number = 0;
    const main = cut.group1;
    const repeat = cut.group2;

    // Count switches from group1 to group2
    let ingroup1 = true;

    for (let tr of traces) {
        loopcount = 0;
        const events: string[] = tr.events.map((ev) => ev.action)
        for (let i = 0; i < events.length; i++) {
            if (ingroup1 && repeat.includes(events[i])) {
                ingroup1 = false;
                loopcount++;
            }

            if (!ingroup1 && main.includes(events[i])) {
                ingroup1 = true;
            }
        }
        maxloop = Math.max(maxloop, loopcount);
    }

    return maxloop
}