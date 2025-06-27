import { DFGData } from "./DFGData";
import { TraceFrequency } from "./TraceData";

// Currently no support for multipe groups at once
export interface Cut {
    group1: string[],
    group2: string[],
    type: CutType,
    algorithm: string,
    selected?: boolean,

    filteredDfgData?: DFGData,
    selectable?: boolean,
    filterThreshold?: number
}


export interface CutTraces{
    group1: TraceFrequency[],
    group2: TraceFrequency[];
}

export type CutType = "sequence" | "xor" | "concurrency" | "loop" | "none";