import { Cut } from "./CutData";
import { DFGData } from "./DFGData";
import { Color, TraceFrequency } from "./TraceData";

export interface TraceListProps {
    trace: TraceFrequency,
    colorScheme: Color[],
    toggleTrace(id: String): void
}

export interface CutListProps {
    cut: Cut,
    removeCut(cut:Cut): void,
    selectCut(cut: Cut): void,
    colorScheme: Color[],
    viewing: boolean,
    setViewing: React.Dispatch<React.SetStateAction<boolean>>,
    data: TraceFrequency[] | undefined,
    setDfgData: React.Dispatch<React.SetStateAction<DFGData | undefined>>,
}