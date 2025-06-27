import { DFGData } from "../interfaces/DFGData";
import { DFGEvent, TraceFrequency } from "../interfaces/TraceData";

/* File for generating / manipulating DFGs */

const mockData: TraceFrequency[] = [
    {
        id: "trace1",
        frequency: 6,
        enabled: true,
        events: [
            {resource: "1", action:"a", lifecycle:"", time:0, b:false, al:""},
            {resource: "1", action:"b", lifecycle:"", time:0, b:false, al:""},
            {resource: "1", action:"c", lifecycle:"", time:0, b:false, al:""},
            {resource: "1", action:"d", lifecycle:"", time:0, b:false, al:""},
            {resource: "1", action:"e", lifecycle:"", time:0, b:false, al:""},
            {resource: "1", action:"f", lifecycle:"", time:0, b:false, al:""},
            {resource: "1", action:"a", lifecycle:"", time:0, b:false, al:""},
        ],
    },
    {
        id: "trace2",
        frequency: 8,
        enabled: true,
        events: [
            {resource: "1", action:"a", lifecycle:"", time:0, b:false, al:""},
            {resource: "1", action:"g", lifecycle:"", time:0, b:false, al:""},
            {resource: "1", action:"c", lifecycle:"", time:0, b:false, al:""},
            {resource: "1", action:"g", lifecycle:"", time:0, b:false, al:""},
            {resource: "1", action:"e", lifecycle:"", time:0, b:false, al:""},
            {resource: "1", action:"g", lifecycle:"", time:0, b:false, al:""},
            {resource: "1", action:"a", lifecycle:"", time:0, b:false, al:""},
        ],
    }
]

// Syntax: action A before B, means connection from A to B
// Each connection must store frequency
interface DFGFollows {
    action: string,
    before: Before[],
}

interface Before {
    action: string, 
    frequency: number
}

interface Sequence {
    sequence: string[], // Actions
    frequency: number
}

interface FreqEvents {
    events: DFGEvent[], // DFG event with multiple properties
    frequency: number
}

export function tracesToDFG(dataInit: TraceFrequency[]): DFGData  {
    // console.log("Starting tracesToDFG()")
    let dfg: DFGData = {nodes:[], links:[]};

    // data = mockData;

    const data = dataInit.filter(trace => trace.enabled)

    // Collect all events + keep frequency
    const events: FreqEvents[] = data.map((trace) => ({events: trace.events, frequency: trace.frequency}));
    
    // Only keep action attribute from event + keep frequency
    const sequences: Sequence[] = events.map((evts) => ({sequence: evts.events.map((ev) => (ev.action)), frequency: evts.frequency}));

    // Compress all actions into single array
    const all_actions = sequences.map((seq) => seq.sequence).flat(1);

    // Get unique values from array
    const uniques = all_actions.filter((item, i, ar) => ar.indexOf(item) === i);

    // Create dictionary for mapping entries to their function (start, end or undefined)
    const map: {
        [k: string]: "start" | "end" | "none" | "both";
     } = Object.fromEntries(uniques.map((u) => [u, "none"]))

    // Adjust map to correct function entries
    sequences.forEach((s) => {
        const first_entry = map[s.sequence[0]];
        const last_entry = map[s.sequence[s.sequence.length-1]];

        if (first_entry === "none") {
            map[s.sequence[0]] = "start";
        } else if (first_entry === "end") {
            map[s.sequence[0]] = "both";
        }

        if (last_entry === "none") {
            map[s.sequence[s.sequence.length-1]] = "end";
        } else if (last_entry === "start") {
            map[s.sequence[s.sequence.length-1]] = "both";
        }
    });

    // Create nodes
    uniques.forEach((u) => dfg.nodes.push({id: u, type: map[u]}));

    // Initialize follows object that stores links
    const follows: DFGFollows[] = [];
    uniques.forEach((u) => follows.push({action: u, before:[]}))

    // Fill follows object with appropriate connections
    // Syntax: action A before B, means connection from A to B
    let prevAction: string | undefined = undefined;
    sequences.forEach((seq) => {
        for (let i = 0; i < seq.sequence.length; i++) {
            if (prevAction) {
                // eslint-disable-next-line no-loop-func
                let follows_action = follows.find(((fol)=>fol.action===prevAction));  
                if (follows_action) {
                    if(!follows_action.before.map((bef) => bef.action).includes(seq.sequence[i])) {
                        follows_action.before.push({action: seq.sequence[i], frequency: seq.frequency});
                        // console.log("Frequency of " + follows_action.action + " => " + follows_action.before + " initialized with " + seq.frequency);
                    } else {
                        let before = follows_action.before.find((bef) => bef.action===seq.sequence[i]);
                        if (before) before.frequency += seq.frequency;
                        // console.log("Frequency of " + follows_action.action + " => " + follows_action.before + " increased by " + seq.frequency);
                    }
                }            
            }
            prevAction = seq.sequence[i];
        }
        prevAction = undefined;
    })

    // Create links
    follows.forEach((follow) => {follow.before.forEach((before)=>{addLink(follow.action, before.action, before.frequency)})});
    function addLink(action: string, before: string, frequency: number) {
        dfg.links.push({source:action, target:before, frequency: frequency})
    }

    // console.log("Finished tracesToDFG()")
    return dfg;
}