import { Cut, CutType } from "./CutData";
import { DFGData, StaticDFGData } from "./DFGData";
import { TraceFrequency } from "./TraceData";

export interface TreeData {
    name: string,
    value: number,
    children?: TreeData[];
}

export interface TreeNode {
    id: string;
    parent_id: string;
    type: TreeNodeType;
    frequency: number; // Total frequency of traces array
    activity?: string; // Is only set if the node is of type "activity"
    maxloop?: number; // Is only set if the type is "loop"
    warning?: boolean; // Is only set to true if a warning icon is added
    expected_frequency?: number; // Is set upon checking for warning icons

    traces?: TraceFrequency[]; // Stores associated data object
    dfg?: StaticDFGData, // Stores associated dfgData object
    cut?: Cut, // Stores selected cut
    cuts?: Cut[];  // Stores generated cuts by the backend

    children?: TreeNode[]; // Stores any children the node has
}

export interface ProcessTree {
    id: string;
    root: TreeNode;
}

export interface History {
    trees?: History[]; 
}

export type TreeNodeType = CutType | "activity" | "undefined";