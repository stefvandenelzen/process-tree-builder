import React, { useState, useEffect } from 'react';
import { CutListProps } from '../interfaces/Props';
import { Loading } from '../components/Loading';
import { useCutContext, useDFGContext, useDataContext, useTreeContext } from './LayoutPage';
import { cleanSequences, getUniqueActionsFromArray } from '../helpers/TraceHelper';
import { Cut, CutType } from '../interfaces/CutData';
import { ActionDiv, ActivityContainer, CutSpan, CutSpanContainer, CutSpanContainerCustom, GroupDiv } from '../components/StyledComponents';
import { getColorFromScheme } from '../helpers/ColorHelper';
import { tracesToDFG } from '../helpers/DFGhelper';
import { BaseAlgorithmDataBackend, FilterAlgorithmDataBackend } from '../interfaces/DFGData';
import { setCutsByID, getNodeByID, findUndefined, setTypeByID } from '../helpers/TreeHelper';
import { TreeNode } from '../interfaces/TreeData';
import { selectAll } from 'd3-selection';
import { NodeSelection, removeDuplicateSelections } from '../helpers/LayoutHelper';
import Dropdown from 'react-dropdown';
import Modal from 'react-modal';

const customStyles = {
    content: {
        top: '50%',
        left: '50%',
        right: 'auto',
        bottom: 'auto',
        marginRight: '-50%',
        transform: 'translate(-50%, -50%)',
        overflow: 'visible',
        zIndex: 5,
    },
};

function CutList({ cut, removeCut, selectCut, colorScheme, viewing, setViewing, data, setDfgData }: CutListProps) {

    return <CutSpanContainer>
        <>
            {(cut.selectable === false) ? <></> : <button onClick={() => selectCut(cut)}>Select</button>}
            {(!viewing) ?
                <>{cut.algorithm === "filter" ? <button onClick={() => { setDfgData(cut.filteredDfgData); setViewing(true) }}>View</button> : <></>}</>
                :
                <>{cut.algorithm === "filter" ? <button onClick={() => { if (data) { setDfgData(tracesToDFG(data)) } setViewing(false) }}>Back</button> : <></>}</>
            }
            {(cut.algorithm === "custom") ?
                <button onClick={() => { removeCut(cut) }}>Remove</button>
                : <></>
            }
            <CutSpan>
                <GroupDiv $color="#f01919">
                    Group 1
                </GroupDiv>


                {cut.group1.map((action, i) => (
                    <ActionDiv $color={getColorFromScheme(action, colorScheme)}>
                        {action}
                    </ActionDiv>
                ))}
            </CutSpan>
            <CutSpan>
                <GroupDiv $color="#0099ff">
                    Group 2
                </GroupDiv>

                {cut.group2.map((action, i) => {
                    return <ActionDiv $color={getColorFromScheme(action, colorScheme)}>
                        {action}
                    </ActionDiv>
                })}
            </CutSpan >
        </>
    </CutSpanContainer>
}


export const CutPage = () => {

    const { setCut, setHoverCut, customCutGroup, setCustomCutGroup, customCut, setCustomCut } = useCutContext();
    const { data, colorScheme } = useDataContext();
    const { processTree, setActiveID, activeID, hoverID, setCutLoading, autoComplete, setAutoComplete } = useTreeContext();
    const { setDfgData } = useDFGContext();
    const [cuts, setCuts] = useState<Cut[] | undefined>();
    const [viewing, setViewing] = useState<boolean>(false); // For use of viewing filtered dfg in filter cuts
    const [makingCustomCut, setMakingCustomCut] = useState<boolean>(false);
    const [customOperator, setCustomOperator] = useState<CutType>("sequence");
    const [confirmation, setConfirmation] = useState<boolean>(false);
    const [processedCut, setProcessedCut] = useState<Cut | undefined>();
    const FILTER_THRESHOLDS = [0.05, 0.10, 0.25, 0.33, 0.5, 0.75, 0.99]

    function selectCut(cut: Cut): void {
        setProcessedCut(cut);
        const activeNodeSelection: NodeSelection = (selectAll(".tree-node") as NodeSelection).filter((d) => d.data.id === activeID)
        if (activeNodeSelection.size() > 0) {
            const activeNode: TreeNode = activeNodeSelection.datum().data
            if (activeNode.cut) {
                setConfirmation(true);
                // console.log("Asking confirmation")
            } else {
                confirmCut(cut);
            }
        } else {
            // console.log("There is no active node.")
        }

    }

    function confirmCut(cut: Cut | undefined): void {
        if (cut) {
            // Set all cuts' selected to false again
            const activeNode = getNodeByID(activeID, processTree!.root);
            if (activeNode?.cuts) {
                cuts?.forEach((d) => d.selected = false);
            }
            setProcessedCut(undefined);
            setCut(cut);
        }
    }

    useEffect(() => {
        setMakingCustomCut(false);
        if (processTree) {
            setViewing(false)
            setCuts(undefined)
            getCuts(false)
        }
    }, [data, processTree])

    async function getCuts(overwrite: boolean) {
        // Check if active node has cuts stored, then load those instead
        // When to store nodes to active node? -> Upon choice? 
        // Disable hovering when still loading current cuts [DONE]

        let hoverNode: TreeNode | undefined = undefined;
        let activeNode: TreeNode | undefined = undefined;
        let newCuts: Cut[] = []

        if (processTree) {
            hoverNode = getNodeByID(hoverID, processTree.root)
            activeNode = getNodeByID(activeID, processTree.root)
            // console.log("HoverID: " + hoverID)
            // console.log("HoverNode: " + hoverNode);

            // console.log("activeID: " + activeID)
            // console.log("activeNode: " + activeNode);
        }

        if (processTree && hoverNode && hoverNode.cuts && !overwrite) {
            // console.log("Stored cuts found for hovered node")
            setCuts(hoverNode.cuts)
            newCuts = hoverNode.cuts;
        } else if (processTree && activeNode && activeNode.cuts && hoverID === "" && !overwrite) {
            // console.log("Stored cuts found for active node")
            setCuts(activeNode.cuts)
            newCuts = activeNode.cuts;
        } else {
            if (data) {
                setCutLoading(true) // SetLoading to true until after setting cuts
                const dataEnabled = data.filter(trace => trace.enabled)

                const data_to_send = (activeNode && activeNode.dfg) ? activeNode.dfg : tracesToDFG(dataEnabled);

                if (activeNode && activeNode.dfg) {
                    // console.log(tracesToDFG(dataEnabled))
                    // console.log(activeNode.dfg)
                }

                const baseCut = await fetch("/im-base", {
                    method: "POST",
                    headers: {
                        "Content-type": "application/json",
                    },
                    body: JSON.stringify({ dfgData: data_to_send, traces: cleanSequences(dataEnabled), unique_actions: getUniqueActionsFromArray(dataEnabled) } as BaseAlgorithmDataBackend)
                }).then(
                    res => res.json()
                ).then(
                    data => data
                )

                let filterCut: Cut[] = []

                for (let threshold of FILTER_THRESHOLDS) {
                    if (filterCut.length === 0 && (baseCut.length === 0 || baseCut[0].algorithm === "fallthrough-activity-once-per-trace")) {

                        filterCut = await fetch("/im-filter", {
                            method: "POST",
                            headers: {
                                "Content-type": "application/json",
                            },
                            body: JSON.stringify({ dfgData: data_to_send, traces: cleanSequences(dataEnabled), unique_actions: getUniqueActionsFromArray(dataEnabled), threshold: threshold } as FilterAlgorithmDataBackend)
                        }).then(
                            res => res.json()
                        ).then(
                            data => data
                        )
                    }
                }

                // Push found cuts into cuts state
                if (filterCut.length > 0) {
                    for (let i = 0; i < filterCut.length; i++) {
                        newCuts.push(filterCut[i])
                    }
                }
                if (baseCut.length > 0) {
                    for (let i = 0; i < baseCut.length; i++) {
                        newCuts.push(baseCut[i])
                    }
                }

                // Check if newCuts of length 0, if so: Add custom flower cut
                if (newCuts.length === 0) {
                    newCuts.push({
                        group1: getUniqueActionsFromArray(data),
                        group2: [],
                        type: "concurrency",
                        algorithm: "flower",
                    })
                }

                setCuts(newCuts);
                setCutLoading(false);

                // Add cuts to node
                if (processTree && newCuts && hoverID !== "") {
                    // console.log("[C] Adding cuts to hover ID [" + hoverID + "]")
                    // console.log(newCuts)
                    setCutsByID(hoverID, processTree.root, newCuts)
                } else if (processTree && newCuts) {
                    // console.log("[C] Adding cuts to active ID [" + activeID + "]")
                    // console.log(newCuts)
                    setCutsByID(activeID, processTree.root, newCuts)
                }
            }
        }

        // AUTO COMPLETION:
        if (autoComplete) {
            if (findUndefined(processTree!.root)) {
                if (newCuts.length > 0) {
                    setCut(newCuts[0]);
                } else {
                    // Cannot find cuts, set behaviour of node to activity
                    setTypeByID(activeID, "none", processTree!.root)
                    setAutoComplete(false);
                }
            } else {
                setAutoComplete(false);
                // console.log("Tree finished");
            }
        }


    }

    function intializeCustomCut() {
        if (data) {
            setCustomCutGroup([]);
            setCustomOperator("sequence");
            const actions = getUniqueActionsFromArray(data!);
            setCustomCut({
                group1: actions,
                group2: [],
                type: "sequence",
                algorithm: "custom"
            })
            setMakingCustomCut(true);
        }
    }

    function addCustomCut() {
        if (customCut.group1.length > 0 && customCut.group2.length > 0) {
            const activeNodeSelection: NodeSelection = (selectAll(".tree-node") as NodeSelection).filter((d) => d.data.id === activeID)
            if (activeNodeSelection.size() > 0) {
                const treeNode = activeNodeSelection.datum().data;
                if (treeNode) {
                    if (treeNode.cuts) {
                        treeNode.cuts.unshift(customCut);
                    }
                }
            }
        }
    }

    function setCutOperator(operator: CutType) {
        setCustomCut({
            group1: customCut.group1,
            group2: customCut.group2,
            type: operator,
            algorithm: "custom"
        });
    }

    function removeCut(cut: Cut) {
        if (cuts) {
            const group1String = cut.group1.toString();
            const group2String = cut.group2.toString();

            const filteredCuts = cuts.filter((d) =>
                group1String !== d.group1.toString()
                ||
                group2String !== d.group2.toString()
                ||
                cut.algorithm !== d.algorithm
                ||
                cut.type !== d.type
            )

            setCuts(filteredCuts)

            const activeNodeSelection: NodeSelection = (selectAll(".tree-node") as NodeSelection).filter((d) => d.data.id === activeID)
            if (activeNodeSelection.size() > 0) {
                const treeNode = activeNodeSelection.datum().data;
                if (treeNode) {
                    treeNode.cuts = filteredCuts;
                }
            }
        }
    }

    return (
        <div className="algorithm">
            <p className="banner">Cuts</p>
            {(cuts) ?
                <>
                    {(cuts!.length === 0) ? (
                        <>
                            <button onClick={() => getCuts(true)}>Refresh Cuts</button>
                            <ActivityContainer><ActionDiv>No cuts available</ActionDiv></ActivityContainer>
                        </>
                    ) : (
                        <>
                            <Modal
                                isOpen={confirmation}
                                onRequestClose={() => { setConfirmation(false) }}
                                style={customStyles}
                                contentLabel="Example Modal"
                                ariaHideApp={false}
                            >
                                <div className="confirmationContainer">
                                    <p>This node already has a cut, are you sure you want to overwrite it?</p>
                                    <div className="confirmationButtonContainer">
                                        <button className="modalHeaderButton goBack" onClick={() => { setConfirmation(false) }}> Go Back </button>
                                        <button className="modalHeaderButton confirm" onClick={() => {
                                            setConfirmation(false)
                                            confirmCut(processedCut);
                                        }
                                        }
                                        > Confirm </button>
                                    </div>
                                </div>
                            </Modal>
                            <div className="cutHeader">
                                <div className="cutHeaderButtonContainer">
                                    <button className="cutHeaderButton" onClick={() => getCuts(true)}>Refresh Cuts</button>
                                    <button className="cutHeaderButton" onClick={() => {
                                        setAutoComplete(true);
                                        setCut(cuts[0]);
                                    }}>Auto Complete</button>
                                    <button className="cutHeaderButton" onClick={() => {
                                        intializeCustomCut();
                                    }}>Custom Cut</button>
                                </div>
                                <h4 className="cutH4">Select a cut</h4>
                            </div>

                            {(makingCustomCut) ?
                                <div className="cut" onMouseEnter={() => {
                                    setHoverCut(customCut)
                                }} onMouseLeave={() => {
                                    setHoverCut(undefined)
                                }}>
                                    <p className="bannersmall">Type: {customCut!.type} - Algorithm: {customCut!.algorithm}</p>
                                    {(customCut)
                                        ?
                                        <CutSpanContainerCustom>
                                            <button onClick={() => {
                                                setMakingCustomCut(false);
                                            }}>Back</button>
                                            <button onClick={() => {
                                                setMakingCustomCut(false);
                                                addCustomCut();
                                            }}>Add cut</button>
                                            <CutSpan>
                                                <GroupDiv $color="#f01919">
                                                    Group 1
                                                </GroupDiv>
                                                {customCut!.group1.map((action, i) => (
                                                    <ActionDiv $color={getColorFromScheme(action, colorScheme!)}>
                                                        {action}
                                                    </ActionDiv>
                                                ))}
                                            </CutSpan>
                                            <CutSpan>
                                                <GroupDiv $color="#0099ff">
                                                    Group 2
                                                </GroupDiv>

                                                {customCut!.group2.map((action, i) => {
                                                    return <ActionDiv $color={getColorFromScheme(action, colorScheme!)}>
                                                        {action}
                                                    </ActionDiv>
                                                })}
                                            </CutSpan>
                                            <Dropdown options={["sequence", "xor", "concurrency", "loop"]} onChange={(opt) => {
                                                setCustomOperator(opt.value as CutType);
                                                setCutOperator(opt.value as CutType);
                                            }} value={customOperator} placeholder="Select an option" />
                                        </CutSpanContainerCustom>
                                        :

                                        <></>}
                                </div>
                                :
                                <>
                                    {cuts!.map((ct, i) => (
                                        <div className="cut" onMouseEnter={() => {
                                            setHoverCut(ct)
                                        }} onMouseLeave={() => {
                                            setHoverCut(undefined)
                                        }}>
                                            {
                                                ct.algorithm === "filter" ?
                                                    <p className="bannersmall" ><>{ct.selected ? "[SELECTED] " : ""}</>Type: {ct.type} - Algorithm: {ct.algorithm} - Threshold: {ct.filterThreshold}</p> :
                                                    <p className="bannersmall"><>{ct.selected ? "[SELECTED] " : ""}</>Type: {ct.type} - Algorithm: {ct.algorithm}</p>
                                            }
                                            <CutList cut={ct} removeCut={removeCut} selectCut={selectCut} colorScheme={colorScheme!} viewing={viewing} setViewing={setViewing} data={data} setDfgData={setDfgData} />
                                        </div>
                                    ))}
                                </>
                            }

                        </>
                    )}
                </>
                :
                <>
                    <button onClick={() => getCuts(true)}>Refresh Cuts</button>
                    <Loading></Loading>
                </>
            }

        </div >
    );
}