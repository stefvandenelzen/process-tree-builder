import { SimulationNodeDatum, SimulationLinkDatum } from "d3-force";
import { TraceFrequency, TraceFrequencyClean } from "./TraceData";

export interface DFGNode extends SimulationNodeDatum {
    id: string // Action / activity
    type: "start" | "end" | "none" | "both",
}

export interface DFGLink extends SimulationLinkDatum<DFGNode>{
    frequency: number
}

export interface DFGData {
    nodes: DFGNode[],
    links: DFGLink[],
}

export interface StaticDFGData {
    nodes: StaticDFGNode[],
    links: StaticDFGLink[],
}

export interface StaticDFGNode {
    id: string // Action / activity
    type: "start" | "end" | "none" | "both",
}

export interface StaticDFGLink {
    frequency: number
}

export interface BaseAlgorithmDataBackend {
    dfgData: DFGData,
    traces: TraceFrequencyClean[],
    unique_actions: string[]
}

export interface FilterAlgorithmDataBackend extends BaseAlgorithmDataBackend{
    threshold: number
}