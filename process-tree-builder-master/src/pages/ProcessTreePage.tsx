import { MutableRefObject, useEffect, useRef, useState } from 'react';
import { TreeNode } from '../interfaces/TreeData';
import { HierarchyLink, HierarchyPointLink, HierarchyPointNode, hierarchy, tree } from 'd3-hierarchy';
import { Selection, select, selectAll } from 'd3-selection';
import { linkVertical } from 'd3-shape';
import { zoom } from 'd3-zoom';
import { useDataContext, useTreeContext } from './LayoutPage';
import { getColorFromScheme } from '../helpers/ColorHelper';
import { getNodeByID, getWarningSelection, mergeToParent } from '../helpers/TreeHelper';
import { EdgeSelection, NodeSelection, generateArcs, generateConcurrencyMask, generateXORArcs, getActivityIDs, getParentSelection, getPlacableNodes, getSubTreeSelection, placeActivities, placeNode, removeDuplicateSelections } from '../helpers/LayoutHelper';
import { drag } from 'd3-drag';
import loop_icon from "../img/loop.svg";
import sequence_icon from "../img/sequence.svg";
import concurrency_icon from "../img/concurrency.svg";
import xor_icon from "../img/xor.svg";
import undefined_icon from "../img/undefined.svg";
import filter_icon from "../img/filter.svg";
import warning_icon from "../img/warning.svg";
import maxloop_icon from "../img/maxloop.svg";
import wrench_icon from "../img/wrench.svg";


/*
SVG Credits:
    Loop icon: https://thenounproject.com/icon/loop-399232/
    Sequence icon: https://thenounproject.com/icon/implication-711174/
    Xor icon: https://thenounproject.com/icon/cross-2310549/    
    Question mark icon: https://thenounproject.com/icon/question-mark-2152791/
    Wedge icon: https://thenounproject.com/icon/wedge-1277693/
*/

function ProcessTreePage() {
    // const treeData: TreeNode = (processtree as TreeNode);

    const [nodeSelection, setNodeSelection] = useState<Selection<SVGGElement | null, HierarchyPointNode<TreeNode>, SVGGElement, unknown>>();
    const [activeNode, setActiveNode] = useState<Selection<SVGGElement | null, HierarchyPointNode<TreeNode>, any, unknown> | undefined>();
    const { processTree, setProcessTree, activeID, setActiveID, setHoverID, cutLoading } = useTreeContext();
    const { setData, colorScheme } = useDataContext();
    const firstRun = useRef(true);
    const autoMerged = useRef(false);
    const stopMerging = useRef(false);
    const layoutGenerated = useRef(false);
    const [layoutGeneratedState, setLayoutGeneratedState] = useState(false);
    const links = useRef<Selection<SVGPathElement | null, HierarchyLink<TreeNode>, SVGGElement, unknown> | undefined>();
    const max_link_frequency: MutableRefObject<number> = useRef(1);
    const MIN_EDGE_RATIO = 0.1;
    const MAX_EDGE_THICKNESS = 15;
    const HOVER_EDGE_THICKNESS = 25;
    const EDGE_SCALING: "logarithmic" | "linear" = "linear";
    const customArcs = useRef<{
        [id: string]: boolean;
    }>();

    /* Runs once on loading this component *
    /* Runs twice when React StrictMode is on */
    /* Runs once on loading this component */
    /* Runs twice when React StrictMode is on */
    useEffect(() => {

        if (!processTree) {
            firstRun.current = true;
        }

        /* Merge logic */
        // Stop merging when no mergable edges are left
        if (!stopMerging.current && autoMerged.current) {
            stopMerging.current = true;
            mergeEdges();
        }

        if (stopMerging.current) {
            autoMerged.current = false;
        }

        setNodeSelection(undefined)
        setActiveNode(undefined)

        const node_tooltips = selectAll("div .tree_node_tooltip")
        node_tooltips.remove()

        const edge_tooltips = selectAll("div .tree_edge_tooltip")
        edge_tooltips.remove()

        if (firstRun.current && processTree) {
            console.log("First Run in processTree bracket")
            // Branch added to preserve zoom behaviour over different trees
            // Be sure to set firstRun to true if at any time a different process tree is chosen

            const divDFGRef = select("div.process-tree-container").node() as HTMLDivElement;

            select("svg.process-tree")
                .attr("width", "100%")
                .attr("height", "100%")
                .append("g")
                .attr("transform", "translate(" + divDFGRef.offsetWidth / 2 + "," + divDFGRef.offsetHeight / 2 + ")")
                .attr("class", "tree-main-group"); // Class not currently in use

            (select("svg.process-tree") as Selection<Element, unknown, HTMLElement, any>).call(zoom().on("zoom", handleZoom));

            d3setup(processTree.root);
        } else if (processTree) {
            d3setup(processTree.root); // Set up the tree graph
            updateActiveElement(); // Update the active element once, based on activeID
        }
    }, [processTree]);


    // Local node updater from ID
    useEffect(() => {
        if (activeID && nodeSelection) {
            const newActiveNode = nodeSelection.filter((d) => {
                return d.data.id === activeID;
            })
            if (!newActiveNode.empty()) {
                setActiveNode(newActiveNode)
            }
        }
    }, [activeID, nodeSelection])

    //  Update click function with new activeNode value when it is changed
    useEffect(() => {
        if (activeNode) {
            bindNodeMouseBehaviour();
            updateActiveElement();
        }
    }, [activeNode, nodeSelection, cutLoading])

    useEffect(() => {
        if (activeNode && nodeSelection) {
            updateActiveElement();
        }
    }, [activeNode, nodeSelection])

    function handleZoom(e: any) {
        if (e) {
            const divDFGRef = select("div.process-tree-container").node() as HTMLDivElement;
            const g = select("svg.process-tree").select("g")
            const dx_page = (divDFGRef.offsetWidth / 2) * e.transform.k;
            const dy_page = (divDFGRef.offsetHeight / 2) * e.transform.k;
            g.attr('transform', 'translate(' + (e.transform.x + dx_page) + "," + (e.transform.y + dy_page) + ") scale(" + (e.transform.k) + ")");
        }
    }

    function getColorLight(d: HierarchyPointNode<TreeNode>): string {
        if (d.data.type === "undefined") {
            return "red";
        }
        if (colorScheme && d.data.type === "activity") {
            return getColorFromScheme(d.data.activity!, colorScheme)
        }
        return "white"
    }

    function getColorDark(d: HierarchyPointNode<TreeNode>): string {
        if ((d as HierarchyPointNode<TreeNode>).data.type === "undefined") {
            return "#8B0000";
        }
        return "gray"
    }

    function updateActiveElement() {
        if (nodeSelection) {
            // Find node that should become active
            const newActiveNode = nodeSelection.filter((d) => {
                if (activeNode) {
                    return d.data.id === activeNode.datum().data.id;
                } else {
                    return false;
                }
            })

            // Reset properties of all elements
            nodeSelection.classed("active", false);
            nodeSelection.select('circle')
                .attr("fill", (d) => getColorLight(d))

            // Check if active node is found
            if (!newActiveNode.empty()) {
                newActiveNode.classed("active", true);
                newActiveNode.select('circle').attr("fill", (d) => {
                    if (d.data.type === "undefined") {
                        return "#8B0000";
                    }
                    return "gray"
                });
            } else {
                // Error should be thrown in some way
                console.log("PROCESS TREE - ACTIVE NODE NOT FOUND")
                return "pink";
            }
        }


    }


    function bindNodeMouseBehaviour() {

        /* Tooltip */
        /* Source: https://observablehq.com/@mkane2/force-directed-graph-with-tooltip */
        const tree_node_tooltip = select("div.SplitPane")
            .append("div") // the tooltip always "exists" as its own html div, even when not visible
            .attr("class", "tree_node_tooltip")

        const tree_node_tooltip_in = function (e: any, d: HierarchyPointNode<TreeNode>) { // pass event and d to this function so that it can access d for our data
            let html = "<h4> ID: " + d.data.id + "</h4>"
            if (d.data.cut) {
                html = "";
                // html = "<h4> ID: " + d.data.id + "</h4>" + "<h4> Type: " + d.data.cut.type + "</h4>"
                html = "<h4> Type: " + d.data.cut.type + "</h4>"
                if (d.data.cut.algorithm === "filter" && d.data.cut.filterThreshold) {
                    html = "<h4> Type: " + d.data.cut.type + "</h4>" + "\n <h4> Threshold: " + d.data.cut.filterThreshold + "</h4>"
                }

                if (d.data.type === "loop") {
                    html += "\n <h4> Max nr. of loops: " + d.data.maxloop! + "</h4>"
                }
            }

            if (d.data.type === 'activity' && d.data.activity) {
                html = "<h4> Event: " + d.data.activity + "</h4>"
            }

            if (d.data.warning && d.data.expected_frequency) {
                html += "\n <h4> Frequency below expected frequency of " + d.data.expected_frequency + "</h4>"
            }

            return tree_node_tooltip
                .html(html) // add an html element with a header tag containing the name of the node.  This line is where you would add additional information like: "<h4>" + d.name + "</h4></br><p>" + d.type + "</p>"  Note the quote marks, pluses and </br>--these are necessary for javascript to put all the data and strings within quotes together properly.  Any text needs to be all one line in .html() here
                .style("visibility", "visible") // make the tooltip visible on hover
                .style("top", (e.pageY - 75) + "px") // position the tooltip with its top at the same pixel location as the mouse on the screen
                .style("left", e.pageX + "px") // position the tooltip just to the right of the mouse location
                .selectAll("h4")
                .classed("tree_node_tooltip", true)
        }

        if (activeNode && nodeSelection) {
            // Edge case bug -> If hovering when loading "mouseleave" event is never called for the loading node, resulting in an impssoibel state
            // Fix -> When cutLoading changes to false, setData of activeNode
            if (!cutLoading && processTree) {
                const activeNode = getNodeByID(activeID, processTree.root)
                if (activeNode && activeNode.traces) {
                    // console.log("[P] Re-setting data to active node's traces")
                    setHoverID("");
                    setData(activeNode.traces);
                }
            }

            let wasMoved = false;

            /* Don't use arrow-function when using this keyword!!! */
            // Mouse logic for nodes
            if (!cutLoading) { //Only bind behaviour if currently not loading
                nodeSelection.on('mouseover', function (event, d) {
                    // Remove DFG hover tooltips
                    const dfg_node_tooltips = selectAll("div .dfg_node_tooltip")
                    dfg_node_tooltips.remove()

                    const dfg_edge_tooltips = selectAll("div .dfg_edge_tooltip")
                    dfg_edge_tooltips.remove()

                    tree_node_tooltip_in(event, d)
                    // Make sure the node is not an activity
                    if ((select(this).datum() as HierarchyPointNode<TreeNode>).data.type !== "activity") {
                        select(this).select('circle').attr("fill", (d) => getColorDark(d as HierarchyPointNode<TreeNode>));
                        select(this).attr("cursor", "pointer")

                        // Set hover ID of hovered node
                        const hID = (select(this).datum() as HierarchyPointNode<TreeNode>).data.id;
                        if (hID) {
                            // console.log("hID: " + hID);
                            setHoverID(hID);
                        }

                        // Set data to hovered node's data
                        setData((select(this).datum() as HierarchyPointNode<TreeNode>).data.traces);
                    } else {
                        select(this).attr("cursor", "grab")
                    }

                }).on('mouseout', function (event, d) {
                    const tooltips = selectAll("div .tree_node_tooltip")
                    tooltips
                        .transition()
                        .duration(50) // give the hide behavior a 50 milisecond delay so that it doesn't jump around as the network moves
                        .style("visibility", "hidden"); // hide the tooltip when the mouse stops hovering

                    select(this).attr("cursor", "default")



                    if ((select(this).datum() as HierarchyPointNode<TreeNode>).data.type !== "activity") {
                        if (!select(this).classed("active")) {
                            select(this).select('circle').attr("fill", (d) => getColorLight(d as HierarchyPointNode<TreeNode>))
                        }

                        if (activeNode) {
                            // console.log((activeNode.datum() as HierarchyPointNode<TreeNode>).data.id)
                            // Set data to active node's data
                            setData((activeNode.datum() as HierarchyPointNode<TreeNode>).data.traces);
                        }

                        setHoverID("")
                    }
                }).on('click', function (event, d) {
                    // if ((select(this).datum() as HierarchyPointNode<TreeNode>).data.type !== "activity") {
                    //     // Check if already active
                    //     const isAlreadyActive: boolean = select(this).classed("active");
                    //     console.log("Clicked")


                    //     // Reference is still kept to d, prevent extra state behaviour and set white here

                    //     // Update states
                    //     if (!isAlreadyActive) {
                    //         setActiveID((select(this).datum() as HierarchyPointNode<TreeNode>).data.id)
                    //         // Update TraceData:
                    //         const traces = (select(this).datum() as HierarchyPointNode<TreeNode>).data.traces;
                    //         setData(traces);
                    //     } else {
                    //         setActiveID("")
                    //     }
                    // }
                }).call(drag<any, HierarchyPointNode<TreeNode>>()
                    .on("start", function (ev, d) {
                        select(this).raise()
                    })
                    .on("drag", function (ev, d) {
                        select(this).attr("transform", "translate(" + (ev.x) + ", " + (ev.y) + ")")
                        select(this).attr("cursor", "grabbing")
                        wasMoved = true;
                    })
                    .on("end", function (ev, d) {

                        select(this).attr("cursor", "pointer")

                        if (wasMoved) {
                            d.x = ev.x
                            d.y = ev.y

                            if (customArcs.current) {
                                generateEdges(customArcs.current);
                            } else {
                                select("g.link-group").selectAll("path")
                                    .attr("d", (dv) => {
                                        const linkGenerator =
                                            linkVertical<HierarchyPointLink<TreeNode>, [number, number]>()
                                                .source((dk) => [dk.source.x, dk.source.y])
                                                .target((dk) => [dk.target.x, dk.target.y]);
                                        return linkGenerator(dv as HierarchyPointLink<TreeNode>);
                                    });
                            }
                        } else {
                            // Used to be in 'click'
                            if ((select(this).datum() as HierarchyPointNode<TreeNode>).data.type !== "activity") {
                                // Check if already active
                                const isAlreadyActive: boolean = select(this).classed("active");

                                // Reference is still kept to d, prevent extra state behaviour and set white here

                                // Update states
                                if (!isAlreadyActive) {
                                    setActiveID((select(this).datum() as HierarchyPointNode<TreeNode>).data.id)
                                    // Update TraceData:
                                    const traces = (select(this).datum() as HierarchyPointNode<TreeNode>).data.traces;
                                    setData(traces);
                                } else {
                                    setActiveID("")
                                }
                            }
                        }
                        wasMoved = false;
                    })
                )

            } else { // Unbind behaviour if loading
                nodeSelection.on('mouseover', function (event, d) {
                }).on('mouseout', function (event, d) {
                }).on('click', function (event, d) {
                })
            }

        }
    }



    function getStrokeWidth(d: HierarchyPointLink<TreeNode>) {
        if (d) {
            const parent: TreeNode = d.target.data;
            const frequency = parent.frequency;
            const linear_thickness = Math.max(getBaseLog(10, (frequency / (max_link_frequency.current / 10))), MIN_EDGE_RATIO) * MAX_EDGE_THICKNESS;
            const logarithmic_thickness = Math.max(frequency / max_link_frequency.current, 0.25) * MAX_EDGE_THICKNESS;

            if (EDGE_SCALING === "linear") {
                return linear_thickness
            }
            if (EDGE_SCALING === "logarithmic") {
                return logarithmic_thickness
            }

            return 0

        }

        return 0;

        function getBaseLog(x: number, y: number) {
            return Math.log(y) / Math.log(x);
        }
    }

    function d3setup(root: TreeNode) {
        // Remove existing tree
        select("svg.process-tree g").selectAll("g").remove();
        layoutGenerated.current = false;
        setLayoutGeneratedState(false); // For re-rendering 

        /* From tutorial: */
        let rootNode = hierarchy(root); // of type HierarchyNode
        const dx = 100;
        const dy = 100;

        /* Create and sort root layout */
        const treeObject = tree<TreeNode>().nodeSize([dx, dy]);
        //root.sort((a, b) => ascending(a.data.id, b.data.id));

        treeObject(rootNode)

        /* Select SVG from reference */
        /* Set width, height and viewbox of SVG */
        const g = select("svg.process-tree g")

        max_link_frequency.current = Math.max(...rootNode.links().map((link) => link.target.data.frequency));

        g.append("g")
            .attr("class", "mask-group")

        /* Add links */
        links.current = g.append("g")
            .attr("fill", "none")
            .attr("stroke", "#555")
            .attr("stroke-opacity", .4)
            .attr("class", "link-group")
            .selectAll()
            .data(rootNode.links())
            .join("path")
            .attr("stroke-width", (d) => getStrokeWidth(d as HierarchyPointLink<TreeNode>))
            .attr("d", (d) => {
                const linkGenerator =
                    linkVertical<HierarchyPointLink<TreeNode>, [number, number]>()
                        .source((d) => [d.source.x, d.source.y])
                        .target((d) => [d.target.x, d.target.y]);
                return linkGenerator(d as HierarchyPointLink<TreeNode>);
            });


        const tree_edge_tooltip = select("div.SplitPane")
            .append("div") // the tooltip always "exists" as its own html div, even when not visible
            .attr("class", "tree_edge_tooltip")

        const tree_edge_tooltip_in = function (e: any, d: HierarchyLink<TreeNode>) { // pass event and d to this function so that it can access d for our data
            const parent: TreeNode = d.target.data;

            const html = "<h4> Frequency: " + parent.frequency + "</h4>"

            return tree_edge_tooltip
                .html(html) // add an html element with a header tag containing the name of the node.  This line is where you would add additional information like: "<h4>" + d.name + "</h4></br><p>" + d.type + "</p>"  Note the quote marks, pluses and </br>--these are necessary for javascript to put all the data and strings within quotes together properly.  Any text needs to be all one line in .html() here
                .style("visibility", "visible") // make the tooltip visible on hover
                .style("top", (e.pageY - 75) + "px") // position the tooltip with its top at the same pixel location as the mouse on the screen
                .style("left", e.pageX + "px") // position the tooltip just to the right of the mouse location
                .selectAll("h4")
                .classed("tree_edge_tooltip", true)
        }


        links.current
            .on("mouseover", function (ev, d) {
                tree_edge_tooltip_in(ev, d)
                if (d.source.data.type === d.target.data.type && d.target.data.type !== "loop") {
                    select(this).attr("cursor", "pointer")
                    select(this).attr("stroke-width", HOVER_EDGE_THICKNESS)
                }
            })
            .on("mouseout", function (ev, d) {
                const tooltips = selectAll("div .tree_edge_tooltip")
                tooltips
                    .transition()
                    .duration(50) // give the hide behavior a 50 milisecond delay so that it doesn't jump around as the network moves
                    .style("visibility", "hidden"); // hide the tooltip when the mouse stops hovering
                if (d.source.data.type === d.target.data.type) {
                    select(this).attr("cursor", "default")
                    select(this).attr("stroke-width", (d) => getStrokeWidth(d as HierarchyPointLink<TreeNode>))
                }
            })
            .on("click", function (ev, d) {
                if (d.source.data.type === d.target.data.type && d.source.data.type !== "loop") {
                    const parent_id = d.source.data.id;
                    const child_id = d.target.data.id
                    if (processTree) {
                        setProcessTree(
                            {
                                id: processTree.id,
                                root: mergeToParent(parent_id, child_id, processTree.root)
                            }
                        )
                        console.log(processTree)
                    }
                } else {
                    console.log("Adjusting arcs")
                    const newCustomArcs: { [id: string]: boolean; } = { ...customArcs.current };
                    if (newCustomArcs[d.target.data.id]) {
                        newCustomArcs[d.target.data.id] = false;
                    } else {
                        newCustomArcs[d.target.data.id] = true;
                    }
                    customArcs.current = newCustomArcs;
                    generateEdges(newCustomArcs);
                }
            })

        function getNodeClass(data: TreeNode) {
            if (data.cut) {
                if (data.cut.algorithm === "filter") {
                    return "tree-node filter"
                } else if (data.cut.algorithm === "custom") {
                    return "tree-node custom"
                }
            }
            return "tree-node"
        }

        /* Add nodes */
        const nodes = g.append("g")
            .attr("stroke-linejoin", "round")
            .attr("stroke-width", 2)
            .attr("class", "node-group")
            .selectAll()
            .data(treeObject(rootNode).descendants())
            .join("g")
            .attr("class", (d) => getNodeClass(d.data))
            .attr("transform", d => (`translate(${d.x},${d.y})`))

        setNodeSelection(nodes);

        // Original
        const circles = nodes.append("circle")
            .attr("fill", (d) => {
                if (d.data.type === "undefined") {
                    return "red";
                }
                if (colorScheme) {
                    return getColorFromScheme(d.data.id, colorScheme)
                }
                return "white"
            })
            .attr("stroke", d => (d.data.type === "undefined") ? "#8B0000" : (d.children ? "#222" : "#AAA"))
            .attr("r", 15);


        /* Add text to nodes */
        // nodes.append("text")
        //     .attr("dy", "0.31em")
        //     //.attr("x", d => d.children ? -6 : 6) // Original, set x position to left or right depending on children
        //     //.attr("text-anchor", d => d.children ? "end" : "start") // Original, set text anchor to end or start depending on children
        //     .attr("text-anchor", "middle") // Added
        //     .attr("pointer-events", "none") // Added
        //     .text(d => d.data.type)
        //     .clone(true).lower()
        //     .attr("stroke", "white");

        nodes.append("svg:image")
            .attr("href", (d) => {
                const dtype = (d as HierarchyPointNode<TreeNode>).data.type
                if (dtype === "loop") return loop_icon
                if (dtype === "concurrency") return concurrency_icon
                if (dtype === "xor") return xor_icon
                if (dtype === "sequence") return sequence_icon
                if (dtype === "undefined") return undefined_icon
                return ""
            })
            .attr("width", (d) => {
                const dtype = (d as HierarchyPointNode<TreeNode>).data.type
                if (dtype === "undefined") return 20
                return 30
            })
            .attr("x", (d) => {
                const dtype = (d as HierarchyPointNode<TreeNode>).data.type
                if (dtype === "undefined") return -10
                return -15
            })
            .attr("y", (d) => {
                const dtype = (d as HierarchyPointNode<TreeNode>).data.type
                if (dtype === "undefined") return -10
                return -15
            })
            .attr("pointer-events", "none")
            .attr("display", "block")
            .attr("margin-left", "auto")
            .attr("margin-right", "auto")




        // nodes.filter(function (d) {
        //     return d.data.activity !== undefined && d.data.frequency < max_link_frequency.current * NODE_WARNING_THRESHOLD;
        // })

        // Add warning icons
        addWarningIcons(getWarningSelection(processTree!.root));


        // Add wrench icons
        selectAll(".custom")
            .append("svg:image")
            .attr("href", wrench_icon)
            .attr("width", 17)
            .attr("x", -18)
            .attr("y", -19)

        // Add filter icons
        selectAll(".filter")
            .append("svg:image")
            .attr("href", filter_icon)
            .attr("width", 17)
            .attr("x", -20)
            .attr("y", -18)

        // Add maxloop icons
        nodes.filter(function (d) {
            return d.data.type === "loop";
        }).append("svg:image")
            .attr("href", maxloop_icon)
            .attr("pointer-events", "none")
            .attr("width", 17)
            .attr("x", 4)
            .attr("y", -21)

        nodes.filter(function (d) {
            return d.data.type === "loop";
        })
            .append("text")
            .attr("text-anchor", "middle")
            .attr("x", 12.5)
            .attr("y", -10)
            .attr("font-size", "0.5em")
            .attr("fill", "white")
            .attr("font-weight", "bold")
            .text((d) => d.data.maxloop!)

        if (firstRun.current) {
            console.log("Process Tree's first run in d3setup")
            firstRun.current = false;
        } else {
            bindNodeMouseBehaviour();
        }

    }

    function addWarningIcons(warningSelection: NodeSelection | undefined) {
        selectAll(".warning-icon").remove()
        selectAll(".tree-node").classed("warning", false)

        if (warningSelection) {
            warningSelection
                .classed("warning", true)
                .each((d) => d.data.warning = true)
                .append("svg:image")
                .attr("class", "warning-icon")
                .attr("href", warning_icon)
                .attr("pointer-events", "none")
                .attr("width", 17)
                .attr("x", -20)
                .attr("y", 1)
        }
    }

    function viewMergableEdges() {
        if (links.current) {
            links.current.attr("stroke-width", (d) => {
                if (d.source.data.type === d.target.data.type && d.source.data.type !== "loop") {
                    return HOVER_EDGE_THICKNESS
                }
                return getStrokeWidth(d as HierarchyPointLink<TreeNode>)
            })
            links.current.attr("stroke", (d) => {
                if (d.source.data.type === d.target.data.type && d.source.data.type !== "loop") {
                    return "#F3B021"
                }
                return "#555"
            })
        }
    }

    function mergeEdges() {
        setActiveID("root");
        setData(getNodeByID("root", processTree!.root)!.traces);
        autoMerged.current = true;
        if (links.current) {
            links.current.each(function (d) {
                if (d.source.data.type === d.target.data.type && d.source.data.type !== "loop") {
                    stopMerging.current = false;
                    const parent_id = d.source.data.id;
                    const child_id = d.target.data.id
                    if (processTree) {
                        setProcessTree(
                            {
                                id: processTree.id,
                                root: mergeToParent(parent_id, child_id, processTree.root)
                            }
                        )
                        console.log(processTree)
                    }
                }
            })
        }
    }

    function delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function generateLayout() {
        if (processTree) {
            // Reset placed class
            selectAll("g.tree-node").classed("placed", false)
            layoutGenerated.current = true;
            setLayoutGeneratedState(true); // For re-rendering 

            // Placing activities
            const rootNode: TreeNode = processTree!.root;
            const activityIDs = getActivityIDs(rootNode, []).filter((item, i, ar) => ar.indexOf(item) === i);// Remove duplicates
            let activitySelection = (selectAll(".empty-selection") as NodeSelection)
            for (let id of activityIDs) {
                activitySelection = selectAll([...activitySelection, ...(selectAll(".tree-node") as NodeSelection)
                    .filter((d) => d.data.id === id)])
            }
            const X_jump = 100;

            placeActivities(activitySelection, X_jump);
            let placedNodes = activitySelection;
            let placedIDs = activityIDs;
            let counter = 0;

            // Create dictionary for tracking problem cases
            // Track for which nodes its INCOMING edges are custom (as incoming is always one edge)
            const newCustomArcs: { [id: string]: boolean; } = {};
            // Fill customArcs with false
            (selectAll("g.tree-node") as NodeSelection).each((d) => {
                newCustomArcs[d.data.id] = false;
            })

            // Placing remaining nodes
            while (!placedIDs.includes(processTree!.root.id)) {
                // await delay(1000);

                counter++;
                console.log("-------------------------------------------------------------")
                console.log("While loop: " + counter)
                const nodesToBePlaced = (selectAll([...getParentSelection(placedNodes)]).filter(function (d) { return select(this).classed("placed") === false }) as NodeSelection)
                const placableNodes = getPlacableNodes(nodesToBePlaced, placedNodes)

                // console.log("Placed nodes:")
                // console.log(placedNodes.nodes())

                // console.log("All parent nodes:")
                // console.log(nodesToBePlaced.nodes())

                // console.log("Valid parent nodes:")
                // console.log(placableNodes.nodes())


                // eslint-disable-next-line no-loop-func
                placableNodes.each(function (d) {
                    placeNode(select(this), placedNodes, X_jump, newCustomArcs)
                    select(this).classed("placed", true)
                    placedNodes = selectAll([...placedNodes, ...select(this)])
                    placedIDs.push(d.data.id)
                })
                // Regenerate tree layout excluding placed XORs
                // Check if there was XORs in placable nodes
                let XORpresent = false;
                let XORselection: NodeSelection | undefined = undefined;
                placableNodes.each(function (d) {
                    if (d.data.cut) {
                        if (d.data.cut.type === "xor") {
                            XORpresent = true;
                        }
                    }
                })

                if (XORpresent) {
                    console.log("XOR present - partially regenerating layout")
                    // Reset placed class for everything 
                    selectAll("g.tree-node").classed("placed", false)

                    // Find XORs in placable nodes and placed nodes
                    placedNodes.each(function (d) {
                        if (d.data.cut) {
                            if (d.data.cut.type === "xor") {
                                if (XORselection) {
                                    XORselection = selectAll([...XORselection, ...select(this)]);
                                } else {
                                    XORselection = select(this);
                                }
                            }
                        }
                    })

                    // Get XOR subtrees w/o activities
                    const XORsubtrees = removeDuplicateSelections(getSubTreeSelection(XORselection!).filter((d) => d.data.type !== "activity" && d.data.type !== "undefined" && d.data.type !== "none"))

                    // Set XORs entire subtree to placed
                    XORsubtrees.classed("placed", true)

                    // Add XOR subtree selection to placedNodes + Add activitynodes to placedNodes
                    // For now 
                    placedNodes = selectAll([...XORsubtrees, ...activitySelection!]);
                    placedIDs = [...activityIDs];

                    // eslint-disable-next-line no-loop-func
                    XORsubtrees.each((d) => {
                        placedIDs.push(d.data.id);
                    });

                    // Reset custom arcs from non-placed nodes
                    // eslint-disable-next-line no-loop-func
                    (selectAll("g.tree-node") as NodeSelection).each((d) => {
                        if (!placedIDs.includes(d.data.id)) {
                            newCustomArcs[d.data.id] = false;
                        }
                    })

                    customArcs.current = newCustomArcs;
                }
            }

            // Remove previous links
            select("g.link-group").selectAll("path").attr("d", "");

            generateEdges(newCustomArcs);
        }
    }

    function generateEdges(customArcs: {
        [id: string]: boolean;
    }) {
        (select("g.link-group")
            .selectAll("path") as EdgeSelection)
            .filter((d) => {
                // Exclude XORs that dont exclusively have activity children
                if (d.source.data.type === "xor") {
                    let allActivities = true;
                    for (let child of d.source.data.children!) {
                        if (child.type !== "activity") {
                            allActivities = false;
                        }
                    }
                    if (!allActivities) {
                        return false;
                    } else {
                        return true;
                    }
                }
                // Exclude edges for which a custom arc should be generated
                if (customArcs[d.target.data.id]) {
                    return false;
                }
                return true;
            })
            .attr("d", (dv) => {
                const linkGenerator =
                    linkVertical<HierarchyPointLink<TreeNode>, [number, number]>()
                        .source((dk) => [dk.source.x, dk.source.y])
                        .target((dk) => [dk.target.x, dk.target.y]);
                return linkGenerator(dv as HierarchyPointLink<TreeNode>);
            });

        // Generate XOR special cases
        const XORarcs = select("g.link-group")
            .selectAll("path")
            .filter(function (d) {
                if ((d as HierarchyPointLink<TreeNode>).source.data.type === "xor") {
                    let allActivities = true;
                    for (let child of (d as HierarchyPointLink<TreeNode>).source.data.children!) {
                        if (child.type !== "activity") {
                            allActivities = false;
                        }
                    }
                    if (!allActivities) {
                        return true;
                    } else {
                        return false;
                    }
                }
                return false;
            })
        generateXORArcs(XORarcs as EdgeSelection);

        // Generate conflicting arc special cases
        const newArcs = (select("g.link-group")
            .selectAll("path") as EdgeSelection)
            .filter(function (d) {
                return customArcs[d.target.data.id]
            })
        generateArcs(newArcs);

        if (layoutGenerated.current) {
            // Generate concurrency masks
            const concurrencyNodes = (selectAll("g.tree-node") as NodeSelection).filter(function (d) {
                return (d.data.cut) ? (d.data.cut.type === "concurrency") : (false)
            })
            selectAll(".mask").remove();
            concurrencyNodes.each(function (d) {
                generateConcurrencyMask(select(this));
            })
        }
    }

    return (
        <div className="process-tree-container">
            <p className="banner">Process Tree</p>

            {(processTree) ?
                (<>
                    <svg className="process-tree" />

                    <div className="automerge"
                        onMouseEnter={() => viewMergableEdges()}
                        onMouseLeave={() => {
                            if (links.current) {
                                links.current.attr("stroke-width", (d) => getStrokeWidth(d as HierarchyPointLink<TreeNode>))
                                links.current.attr("stroke", "#555")
                            }
                        }}
                        onClick={() => mergeEdges()}
                    >
                        <p>Automerge</p>
                    </div>

                    {(layoutGeneratedState)
                        ?
                        <div className="generatelayout"
                            onClick={() => d3setup(processTree!.root)}
                        >
                            <p>Revert layout</p>
                        </div>
                        :
                        <div className="generatelayout"
                            onClick={() => generateLayout()}
                        >
                            <p>Generate layout</p>
                        </div>}
                </>)
                :
                (<div className="node-info">
                    <p className="node-info">There is currently no process tree.</p>
                </div>)
            }



        </ div >
    );
}

export default ProcessTreePage;