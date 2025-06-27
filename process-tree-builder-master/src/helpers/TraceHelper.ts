import { trace } from "console";
import { Cut, CutTraces } from "../interfaces/CutData";
import { Color, DFGEvent, Trace, TraceFrequency, TraceFrequencyClean } from "../interfaces/TraceData";

/* File for manipulating / creating trace data */ 

/* Obtain unique action strings from TraceFrequency Object */
export function getUniqueActions(trace: TraceFrequency): string[] {
    const sequences = trace.events.map(ev => ev.action);
    const unique_sequences = sequences.filter((item, i, ar) => ar.indexOf(item) === i);

    return unique_sequences;
}

export function cleanSequences(traces: TraceFrequency[]): TraceFrequencyClean[] {
    return traces.map(trace => ({
        ...trace,
        events: trace.events.map(ev => ev.action)
    } ))
}

/* Obtain unique action strings from TraceFrequency Array */
export function getUniqueActionsFromArray(traces: TraceFrequency[]): string[] {
    const events = traces.map(tr => tr.events);
    const sequences = events.map(evs => evs.map(ev => ev.action)).flat();
    const unique_sequences = sequences.filter((item, i, ar) => ar.indexOf(item) === i);

    return unique_sequences;
}

/* Return 2 groups based on cut */
export function filterByCut(traces: TraceFrequency[], cut: Cut): CutTraces {
    // console.log("Starting filterByCut()")
    // Filter out disabled traces
    traces = traces.filter((t) => t.enabled)

    if (cut.type === "loop") {
        const new_traces = filterByCutForLoop(traces, cut) 
        // console.log("Finished filterByCut()")       
        return new_traces
    }
    
    let traces1: TraceFrequency[] = traces;
    let traces2: TraceFrequency[] = traces;

    // console.log("Started filtering activities")
    for (let action of cut.group2) {
        traces1 = filterActivity(traces1, action);
    }

    for (let action of cut.group1) {
        traces2 = filterActivity(traces2, action);
    }
    // console.log("Done filtering activities")

    traces1 = removeDuplicateTraces(traces1).filter(trace => trace.events.length > 0)
    traces2 = removeDuplicateTraces(traces2).filter(trace => trace.events.length > 0)

    // console.log("Finished filterByCut()")
    return {group1: traces1, group2: traces2}
}

function filterByCutForLoop(traces: TraceFrequency[], cut: Cut): CutTraces {
    let traces1: TraceFrequency[] = [];
    let traces2: TraceFrequency[] = [];

    for (let i = 0; i < traces.length; ++i) {
        let events_to_add: DFGEvent[] = []
        let looking_for = 2;
        for (let j = 0; j <= traces[i].events.length; ++j) {
            // Find when splits
            if (j === traces[i].events.length) {
                // When at the end of array looking_for must be 2  
                // Add remaining events to add
                traces1.push({
                    id: traces[i].id,
                    enabled: traces[i].enabled,
                    frequency: traces[i].frequency,
                    events: events_to_add
                })
            } else if (looking_for === 2 && j !== 0) {
                if (cut.group2.includes(traces[i].events[j].action)) {
                    // We are now at index that switches to group2
                    // Create trace and add it to traces1
                    traces1.push({
                        id: traces[i].id,
                        enabled: traces[i].enabled,
                        frequency: traces[i].frequency,
                        events: events_to_add
                    })
                    events_to_add = []
                    looking_for = 1
                }
            } else if (j !== 0) {
                if (cut.group1.includes(traces[i].events[j].action)) {
                    // We are now at index that switches to group2
                    // Create trace and add it to traces1
                    traces2.push({
                        id: traces[i].id,
                        enabled: traces[i].enabled,
                        frequency: traces[i].frequency,
                        events: events_to_add
                    })
                    events_to_add = []
                    looking_for = 2
                }
            }

            if (j < traces[i].events.length ) {
                events_to_add.push(traces[i].events[j])
            }
        }
    }

    traces1 = removeDuplicateTraces(traces1).filter(trace => trace.events.length > 0)
    traces2 = removeDuplicateTraces(traces2).filter(trace => trace.events.length > 0)

    // If the loop cut contains different behaviour (exceptions with both-nodes), this leaks activities
    // For safety: Filter out activities as well after

    cut.group2.forEach((a) => {
        traces1 = traces1.filter((t) => !t.events.map((ev) => ev.action).includes(a))
    })
    
    cut.group1.forEach((a) => {
        traces2 = traces2.filter((t) => !t.events.map((ev) => ev.action).includes(a))
    })

    // console.log(traces1)
    // console.log(traces2)

    return {group1: traces1, group2: traces2}
}

/* Filter singular activity out of traces from TraceFrequency[] object */
export function filterActivity(traces: TraceFrequency[], activity: string) {
    let newTraces: TraceFrequency[] | undefined = undefined;
        newTraces = traces.map((trace) => ({
            ...trace,
            events: trace.events.filter((ev) => ev.action !== activity)
        }));
    
    return newTraces;
}

function removeDuplicateTraces(traces: TraceFrequency[]): TraceFrequency[]{
    // console.log("Started removeDuplicateTraces()")
    // const newTraces: TraceFrequency[] = []
    // while (traces.length !== 0) {
    //     const trace: TraceFrequency = traces[0]
    //     const traces_to_add = traces.filter(tr => arraysEqual(trace.events.map(ev=>ev.action), tr.events.map(ev => ev.action)))
    //     traces = traces.filter(tr => !arraysEqual(trace.events.map(ev=>ev.action), tr.events.map(ev => ev.action)))
    //     // console.log("Traces to add: ", traces_to_add)
    //     // console.log("Remaining traces", traces)

    //     newTraces.push({
    //         id: traces_to_add[0].id,
    //         enabled: traces_to_add[0].enabled,
    //         frequency: traces_to_add.reduce((sum, add) => sum + add.frequency, 0),
    //         events: traces_to_add[0].events            
    //     })
    // }
    // console.log("Finished removeDuplicateTraces()")
    // return newTraces;

    let arrayMap: Map<string, number> = new Map();
    
    traces.forEach((d, i) => {
        const actions = d.events.map(ev => ev.action);
        if (arrayMap.has(actions.toString())) {
            const index = arrayMap.get(actions.toString())!;
            traces[index].frequency += d.frequency;
        } else {
            arrayMap.set(actions.toString(), i);
        }
    }) 

    const ids: number[] = [...arrayMap.values()]
    const newTraces: TraceFrequency[] = []

    ids.forEach((i) => newTraces.push(traces[i]))

    console.log(newTraces);

    return newTraces;
}

/* Source: https://stackoverflow.com/questions/3115982/how-to-check-if-two-arrays-are-equal-with-javascript */
function arraysEqual(a: string[], b: string[]) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;
  
    // If you don't care about the order of the elements inside
    // the array, you should sort both arrays here.
    // Please note that calling sort on an array will modify that array.
    // you might want to clone your array first.
  
    for (var i = 0; i < a.length; ++i) {
      if (a[i] !== b[i]) return false;
    }
    return true;
    // return a.toString() === b.toString();
  }

/*
    Input Trace-array and filter out lifecycle start events
        - Not all events have a start in lifecycle, but all have an end
        - Possible improvement: Check for all activities if it never has a start, then take end. Otherwise default to start
 */
export function filterLifecycle(traces: Trace[]): Trace[] {
    let filtered_traces = traces;
    if (traces[0].events[0].lifecycle) {
        filtered_traces = traces.map(trace => ({
            ...trace,
            events: trace.events.filter(ev => ev.lifecycle === "complete")
        }))
    }
    return filtered_traces;
}

/* Input Trace-array and convert to TraceFrequency-array */
export function tracesToFrequency(traces: Trace[]): TraceFrequency[] {
   
    // Trace is unique when order of events is unique
    // Get unique sequences and assign an ID to each
    // Add sequence ID to each trace 
    // Count and group by ID on traces
    // Take first occurence of sequence as truth (removes value from all other attributes but action, others should probably be removed)

    const events = traces.map(tr => tr.events);
    const sequences = events.map(evs => evs.map(ev => ev.action).toString());
    const unique_sequences = sequences.filter((item, i, ar) => ar.indexOf(item) === i);

    // To find unique arrays:
    // const unique_sequences = Array.from(
    //     new Map(sequences.map((p) => [p.join(), p])).values()
    // )

    // Create dictionary for mapping entries to IDs
    const sequence_map = Object.fromEntries(unique_sequences.map((u, i) => [u, i]))

    // Add sequence id to trace object
    const enhanced_traces = traces.map(trace => ({
        ...trace,
        sequence_id: sequence_map[trace.events.map(ev => ev.action).toString()]
    }))

    // Keep first instance of each id
    let traces_frequency: TraceFrequency[] = [];
    let first_trace: Trace | undefined;
    let frequency: number;

    unique_sequences.forEach(u => {
        first_trace = enhanced_traces.find(trace => trace.sequence_id === sequence_map[u])
        frequency = enhanced_traces.filter(trace => trace.sequence_id === sequence_map[u]).length
        if (first_trace) {
            traces_frequency.push({
                id: first_trace.id,
                enabled: true,
                frequency: frequency,
                events: first_trace.events,
            })
        }
    })

    // console.log(traces_frequency.reduce((n, {frequency}) => n + frequency, 0))

    return traces_frequency;
}

export function toggleTraceById(id: string, traces: TraceFrequency[]): TraceFrequency[] {
    for (let j = 0; j < traces.length; ++j) {
        console.log(traces[j].id)
        console.log(id)
        if (traces[j].id === id) {
            traces[j].enabled = !traces[j].enabled;    
        }
    }

    return traces;
}