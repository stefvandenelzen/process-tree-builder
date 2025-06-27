import SplitPane from "react-split-pane"; // Package manually fixed by adding: "children?: React.ReactNode;" to SplitPaneProps
import useWindowDimensions from "../helpers/useWindowDimensions";
import ProcessTreePage from "./ProcessTreePage";
import { DFGPage } from "./DFGPage";
import TracesPage from "./TracesPage";
import { Dispatch, SetStateAction, createContext, useContext, useEffect, useState } from "react";
import { Color, TraceFrequency } from "../interfaces/TraceData";
import { CutPage } from "./CutPage";
import { DFGData } from "../interfaces/DFGData";
import { ProcessTree } from "../interfaces/TreeData";
import { Cut } from "../interfaces/CutData";

const DataContext = createContext<DataContextType>({ data: undefined, setData: () => { }, colorScheme: undefined, setColorScheme: () => { } });
const DFGContext = createContext<DFGContextType>({ dfgData: undefined, setDfgData: () => { } });
const TreeContext = createContext<TreeContextType>({
    processTree: undefined, setProcessTree: () => { },
    activeID: "root", setActiveID: () => { },
    hoverID: "", setHoverID: () => { },
    cutLoading: false, setCutLoading: () => { },
    autoComplete: false, setAutoComplete: () => { }
});
const CutContext = createContext<CutContextType>({
    cut: undefined, setCut: () => { }, hoverCut: undefined, setHoverCut: () => { }, customCutGroup: [], setCustomCutGroup: () => { }, customCut: {
        group1: [],
        group2: [],
        type: "sequence",
        algorithm: "none"
    }, setCustomCut: () => { }
});

// To set current frequency data
interface DataContextType {
    data: TraceFrequency[] | undefined;
    setData: Dispatch<SetStateAction<TraceFrequency[] | undefined>>;
    colorScheme: Color[] | undefined;
    setColorScheme: Dispatch<SetStateAction<Color[] | undefined>>;
}

// To set current DFG data
interface DFGContextType {
    dfgData: DFGData | undefined;
    setDfgData: Dispatch<SetStateAction<DFGData | undefined>>
}

// To set current process tree and active node
interface TreeContextType {
    processTree: ProcessTree | undefined;
    setProcessTree: Dispatch<SetStateAction<ProcessTree | undefined>>
    activeID: string;
    setActiveID: Dispatch<SetStateAction<string>>;
    hoverID: string;
    setHoverID: Dispatch<SetStateAction<string>>;
    cutLoading: boolean;
    setCutLoading: Dispatch<SetStateAction<boolean>>;
    autoComplete: boolean;
    setAutoComplete: Dispatch<SetStateAction<boolean>>;
}

// To set selected cut, to be processed by DFG module
interface CutContextType {
    cut: Cut | undefined;
    setCut: Dispatch<SetStateAction<Cut | undefined>>;
    hoverCut: Cut | undefined;
    setHoverCut: Dispatch<SetStateAction<Cut | undefined>>;
    customCutGroup: string[];
    setCustomCutGroup: Dispatch<SetStateAction<string[]>>;
    customCut: Cut;
    setCustomCut: Dispatch<SetStateAction<Cut>>;
}

export const LayoutPage = () => {
    const { height, width } = useWindowDimensions();
    const [data, setData] = useState<TraceFrequency[]>();
    const [dfgData, setDfgData] = useState<DFGData>();
    const [processTree, setProcessTree] = useState<ProcessTree>();
    const [activeID, setActiveID] = useState<string>("root");
    const [cut, setCut] = useState<Cut>();
    const [colorScheme, setColorScheme] = useState<Color[]>();
    const [hoverCut, setHoverCut] = useState<Cut>();
    const [hoverID, setHoverID] = useState<string>("");
    const [cutLoading, setCutLoading] = useState<boolean>(false);
    const [autoComplete, setAutoComplete] = useState<boolean>(false);
    const [customCutGroup, setCustomCutGroup] = useState<string[]>([]);
    const [customCut, setCustomCut] = useState<Cut>({
        group1: [],
        group2: [],
        type: "sequence",
        algorithm: "none"
    });

    useEffect(() => {
        // setProcessTree({
        //     id: "test",
        //     root: (processtree as TreeNode),
        // });
    }, []);

    return (
        <DataContext.Provider value={{ data, setData, colorScheme, setColorScheme }}>
            <DFGContext.Provider value={{ dfgData, setDfgData }}>
                <TreeContext.Provider value={{ processTree, setProcessTree, activeID, setActiveID, hoverID, setHoverID, cutLoading, setCutLoading, autoComplete, setAutoComplete }}>
                    <CutContext.Provider value={{ cut, setCut, hoverCut, setHoverCut, customCutGroup, setCustomCutGroup, customCut, setCustomCut }}>
                        <div className="main-container">
                            <SplitPane split="vertical" defaultSize={width * 0.5} minSize={width * 0.2} maxSize={width * 0.8}>
                                <SplitPane className="left-pane" split="horizontal" defaultSize={height * 0.8} minSize={height * 0.2} maxSize={height * 0.8}>
                                    <ProcessTreePage />
                                    <TracesPage />
                                </SplitPane>
                                <SplitPane className="right-pane" split="horizontal" defaultSize={height * 0.8} minSize={height * 0.2} maxSize={height * 0.8}>
                                    <DFGPage />
                                    <CutPage />
                                </SplitPane>
                            </SplitPane>
                        </div >
                    </CutContext.Provider>
                </TreeContext.Provider>
            </DFGContext.Provider>
        </DataContext.Provider >
    );
}

// To use outside of scope
export const useDataContext = () => useContext<DataContextType>(DataContext);
export const useDFGContext = () => useContext<DFGContextType>(DFGContext);
export const useTreeContext = () => useContext<TreeContextType>(TreeContext);
export const useCutContext = () => useContext<CutContextType>(CutContext);