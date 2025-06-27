
import React, { useState, useEffect, useRef } from 'react';
import { TraceListProps } from '../interfaces/Props';
import { Loading } from '../components/Loading';
import { useDataContext, useTreeContext } from './LayoutPage';
import { filterLifecycle, getUniqueActions, getUniqueActionsFromArray, toggleTraceById, tracesToFrequency } from '../helpers/TraceHelper';
import { Button, CenterButton, CenterButtonContainer, EventLi, EventUl, TraceSpan } from '../components/StyledComponents';
import { getColorFromScheme } from '../helpers/ColorHelper';
import Modal from 'react-modal';
import Dropdown from 'react-dropdown';
import 'react-dropdown/style.css';



function TraceList({ trace, colorScheme, toggleTrace }: TraceListProps) {
    return <TraceSpan $enabled={trace.enabled}>
        <Button onClick={() => toggleTrace(trace.id)}> {(trace.enabled ? "Disable" : "Enable")} </Button>
        <>
            {trace.events.map((event, i) =>
            (<EventUl key={trace.id + "e" + i.toString()}>
                <EventLi $color={getColorFromScheme(event.action, colorScheme)} $characters={event.action.length}>
                    {event.action}
                </EventLi>
            </EventUl>)
            )
            }</>
    </TraceSpan >
}

function TracesPage() {

    //const [data, setData] = useState<Trace[]>(); 
    const { data, setData, colorScheme } = useDataContext();
    const { setActiveID, setProcessTree } = useTreeContext();
    const TRACELIMIT_INITIAL = 25;
    const TRACELIMIT_INCREMENT = 25;
    const [traceLimit, setTraceLimit] = useState<number>(TRACELIMIT_INITIAL);
    const PATH: string[] = [
        "./data/pdc2021/pdc2021_1210001.xes",
        "./data/Exam Eventlog.xes", // Potential issue with minimal gradient difference
        // "./data/pdc2021/pdc2021_0110110.xes", // ERRORS
        "./data/pdc2021/pdc2021_0011014.xes",
        "./data/pdc2021/pdc2021_0200102.xes",
        "./data/pdc2021/pdc2021_1000002.xes",
        "./data/pdc2022/pdc2022_0000104.xes",
        "./data/pdc2022/pdc2022_0010010.xes",
        "./data/pdc2022/pdc2022_0101114.xes",
        "./data/pdc2022/pdc2022_1000012.xes",
        "./data/pdc2022/pdc2022_1211114.xes",
        "./data/pdc2023/pdc2023_02000000.xes", // Non-merge Wide top
        "./data/pdc2023/pdc2023_02111111.xes",
        "./data/pdc2023/pdc2023_12010110.xes",
        "./data/pdc2023/pdc2023_12111101.xes",
        "./data/pdc2023/pdc2023_00000010.xes", // Non-merge, no consideration for non-children when finding arc-problems -> after merge interestinge example for very wide sequence
        "./data/BPI Challenge 2017.xes",
        // "./data/BPI Challenge 2018.xes", Stuck on preprocessing
        "./data/BPI_Challenge_2019.xes",
		"./data/Road_Traffic_Fine_Management_Process.xes",
    ];

    // Potential solution for line-crossing:
    // Consider ALL nodes w/ higher x on left side || lower x on right side
    // Could also filter this to not include parents that are already in the range
    // Sort on x, and check if child has problem with any of them

    // Placing XOR subtrees:
    // For now the direct children are set right below the X node
    // should probably move whole tree so that it doesnt distort (requires different moving of other nodes)

    const [path, setPath] = useState<string>(PATH[0]);
    const newPath = useRef<string>(PATH[0])

    const [modalIsOpen, setIsOpen] = React.useState(false);

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

    const options = PATH;

    useEffect(() => {
        console.log('PATH CHANGED')
        console.log("./data/freqdata/" + path.slice(7, path.length - 3) + "json")
        setProcessTree(undefined);
        setActiveID("root");
        fetch("/freqdata", {
            method: "POST",
            headers: {
                "Content-type": "application/json",
            },
            body: JSON.stringify({ path: "./data/freqdata/" + path.slice(7, path.length - 3) + "json", store: false })
        }).then((freqres) => {
            if (freqres.status === 404) {
                console.log("Didn't find cached TraceFrequency json, getting new data")
                fetch("/data", {
                    method: "POST",
                    headers: {
                        "Content-type": "application/json",
                    },
                    body: JSON.stringify({ path: path })
                })
                    .then(
                        res => {
                            return res.json()
                        }
                    ).then(
                        data => {
                            console.log("Starting Trace Frequency conversion")
                            const processedData = tracesToFrequency(filterLifecycle(data))
                            fetch("/freqdata", {
                                method: "POST",
                                headers: {
                                    "Content-type": "application/json",
                                },
                                body: JSON.stringify({ path: "./data/freqdata/" + path.slice(7, path.length - 3) + "json", store: true, freqdata: processedData })
                            })
                            return processedData;
                        }
                    ).then(
                        data => {
                            return setData(data)
                        }
                    )

                return undefined;
            } else {
                console.log("Found cached json")
                return freqres.json();
            }
        }).then((freqres) => {
            if (freqres) {
                return setData(freqres)
            }
        })
    }, [path])

    function toggleTrace(id: string) {
        if (data) {
            const newData = toggleTraceById(id, data).slice(); //Forcefully update reference
            setData(newData);
        }
    }

    function openModal() {
        setIsOpen(true);
    }

    function closeModal() {
        setIsOpen(false);
    }

    return (
        <div className="importing">
            <p className="banner">Traces</p>
            {(!data) ? (
                // <>
                //     {(!activeNode) ? (<Loading />) : (<ActivityContainer><ActionDiv>Activity: {activeNode.datum().data.activity}</ActionDiv></ActivityContainer>)}
                // </>
                <>
                    <Loading />
                </>
            ) : (
                <>
                    <div className="traceHeader">
                        <div className="traceHeaderInfo">
                            <h4 className="traceHeaderH4">Unique traces: {data.length}</h4>
                            <h4 className="traceHeaderH4">Unique events: {getUniqueActionsFromArray(data).length}</h4>
                            <h4 className="traceHeaderH4">Average trace length: {(data.reduce((sum, add) => sum + add.events.length * add.frequency, 0) / data.reduce((sum, add) => sum + add.frequency, 0)).toFixed(2)}</h4>
                            <h4 className="traceHeaderH4">Total frequency: {data.reduce((sum, add) => sum + add.frequency, 0)}</h4>
                        </div>
                        <div className="traceHeaderButtonContainer">
                            <button className="traceHeaderButton" onClick={() => {
                                openModal();
                                // newPath.current = PATH[0];
                            }
                            }>Select Dataset</button>
                        </div>
                        <Modal
                            isOpen={modalIsOpen}
                            onRequestClose={closeModal}
                            style={customStyles}
                            contentLabel="Example Modal"
                            ariaHideApp={false}
                        >
                            <div className="modalHeader">
                                <div className="modalHeaderButtonContainer" >
                                    <button className="modalHeaderButton" onClick={closeModal}>Close</button>
                                    <button className="modalHeaderButton" onClick={() => {
                                        closeModal();
                                        setPath(newPath.current);
                                    }
                                    }
                                    >Select Dataset</button>
                                </div>
                                <div className="modalHeaderInfo">
                                    <p className="modalHeaderP"> Select data: </p>
                                </div>
                            </div>
                            <Dropdown options={options} onChange={(opt) => { newPath.current = opt.value; }} value={newPath.current} placeholder="Select an option" />
                        </Modal>
                    </div>
                    {data.sort((x, y) => {
                        return y.frequency - x.frequency // Sort on Frequency
                        // return y.id > x.id ? -1 : 1; // Sort on ID
                    }).map((trace, i) => {
                        if (i < traceLimit) {
                            return (
                                <>
                                    <p className="bannersmall">ID: {trace.id} - Frequency: {trace.frequency} - Length: {trace.events.length}</p>
                                    <TraceList key={i} trace={trace} colorScheme={colorScheme!} toggleTrace={toggleTrace} />
                                </>
                            )
                        }
                        if (i === traceLimit) {
                            return <CenterButtonContainer><CenterButton onClick={() => { setTraceLimit(traceLimit + TRACELIMIT_INCREMENT) }}>Load more</CenterButton></CenterButtonContainer>
                        }
                    }
                    )}
                </>
            )
            }
        </div >
    );
}

export default TracesPage;