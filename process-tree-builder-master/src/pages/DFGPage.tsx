import { Selection, select, selectAll } from "d3-selection";
import { blendColors } from "../helpers/StyleHelper";
import { zoom } from "d3-zoom";
import { MutableRefObject, useEffect, useRef, useState } from "react";
import { DFGNode, DFGLink, StaticDFGLink, StaticDFGNode } from "../interfaces/DFGData";
import { ForceLink, Simulation, forceCenter, forceLink, forceManyBody, forceSimulation } from "d3-force";
import { drag } from "d3-drag";
import { tracesToDFG } from "../helpers/DFGhelper";
import { Loading } from "../components/Loading";
import { useCutContext, useDFGContext, useDataContext, useTreeContext } from "./LayoutPage";
import { filterByCut, getUniqueActionsFromArray } from "../helpers/TraceHelper";
import { setChildByID, setTypeByID, getTreeNodeFromUndefined, getTypeByID, removeChildrenByID, setCutByID, setMaxLoopByID, getNodeByID } from "../helpers/TreeHelper";
import { ProcessTree, TreeNode, TreeNodeType } from "../interfaces/TreeData";
import { Color, TraceFrequency } from "../interfaces/TraceData";
import { CutTraces } from "../interfaces/CutData";
import { getColorScheme, getLinkCutColor, getNodeCutColor } from "../helpers/ColorHelper";
import { getMaxLoops } from "../helpers/CutHelper";

/* Original example (Javascript, no React): https://stackoverflow.com/questions/39439608/d3-4-0-graph-with-directed-edges-and-labels */
/* On fiddle: https://jsfiddle.net/owen_rodda/55zk55ut/16/ */


export const DFGPage = function () {

    const divDFGRef = useRef<HTMLDivElement | null>(null);
    const [selection, setSelection] = useState<Selection<SVGGElement, unknown, HTMLElement, any>>();
    const link: MutableRefObject<Selection<SVGLineElement, DFGLink, SVGGElement, unknown> | undefined> = useRef();
    const node: MutableRefObject<Selection<SVGCircleElement, DFGNode, SVGGElement, unknown> | undefined> = useRef();
    const parent: MutableRefObject<Selection<SVGGElement, DFGNode, SVGGElement, unknown> | undefined> = useRef();
    const start_circles: MutableRefObject<Selection<SVGCircleElement, DFGNode, SVGGElement, unknown> | undefined> = useRef();
    const end_circles: MutableRefObject<Selection<SVGCircleElement, DFGNode, SVGGElement, unknown> | undefined> = useRef();
    const both_circles: MutableRefObject<Selection<SVGCircleElement, DFGNode, SVGGElement, unknown> | undefined> = useRef();
    const simulation: MutableRefObject<Simulation<DFGNode, DFGLink> | undefined> = useRef();
    const max_link_frequency = useRef(1);
    const MIN_EDGE_RATIO = 0.25;
    const EDGE_SCALING: "logarithmic" | "linear" = "logarithmic";

    /* Data is passed in from TraceFrequency[] */
    const { data, setData, colorScheme, setColorScheme } = useDataContext();
    const { dfgData, setDfgData } = useDFGContext();
    const { processTree, setProcessTree, activeID, setActiveID, hoverID, setHoverID } = useTreeContext();
    const { cut, setCut, hoverCut, setHoverCut, customCutGroup, setCustomCutGroup, customCut, setCustomCut } = useCutContext();
    const [selectedNode, setSelectedNode] = useState<DFGNode | undefined>();
    const [currentNode, setCurrentNode] = useState<string>("root"); // To keep track where the current DFG originated from
    const edgeSwitch = useRef(false);

    useEffect(() => {
        if (data && !processTree) {
            // fetch("/data").then(
            //     res => res.json()
            // ).then(
            //     d => tracesToDFG(d)
            // ).then(
            //     d => { setData(d) }
            // )

            // setDFGData(dfg_mock);
            setColorScheme(getColorScheme(data));
            const dfg = tracesToDFG(data);
            setDfgData(dfg);
            const newTree = {
                id: "new_tree",
                root: {
                    id: "root",
                    parent_id: "",
                    type: "undefined",
                    frequency: data.reduce((sum, add) => sum + add.frequency, 0),
                    traces: data,
                    // dfg: dfg, for convenience DFG is recalculated (can be improved upon later)
                }
            }
            setProcessTree(newTree as ProcessTree);
        } else if (data && processTree) {
            const dfg = tracesToDFG(data);
            setDfgData(dfg);

            const activeNode = getNodeByID(activeID, processTree.root);
            if (activeNode) {
                // console.log("-----")
                let newNodes: StaticDFGNode[] = Object.assign([], dfg.nodes) as StaticDFGNode[];
                let newLinks: StaticDFGLink[] = Object.assign([], dfg.links) as StaticDFGLink[];

                newNodes = newNodes.map(node => ({ id: (node as DFGNode).id, type: node.type }))
                newLinks = newLinks.map(link => {
                    return { ...link }
                })
                activeNode.dfg = { nodes: newNodes, links: newLinks };
            }
        }

    }, [data])

    /* Create the DFG when the data state variable changes */
    useEffect(() => {
        // Remove old dfg
        select("svg.dfg g").remove();
        selectAll("div.dfg_node_tooltip").remove();
        selectAll("div.dfg_link_tooltip").remove();

        if (dfgData) {

            const svgElement: Selection<Element, unknown, HTMLElement, any> = select("svg.dfg")

            // When setting zoom behaviour here, somehow selection is never updated
            // const svgZoomed: Selection<Element, unknown, HTMLElement, any> = svgElement.call(zoom().on("zoom", handleZoom));


            const svgGroup: Selection<SVGGElement, unknown, HTMLElement, any> = svgElement
                .attr("width", "100%")
                .attr("height", "100%")
                .append("g")
                .attr("transform", "translate(" + divDFGRef.current!.offsetWidth / 2 + "," + divDFGRef.current!.offsetHeight / 2 + ")");


            setSelection(svgGroup);
        }
    }, [dfgData])

    function handleZoom(e: any) {
        if (selection) {
            const dx = divDFGRef.current!.offsetWidth / 2 * e.transform.k;
            const dy = divDFGRef.current!.offsetHeight / 2 * e.transform.k;
            selection.attr('transform', 'translate(' + (e.transform.x + dx) + "," + (e.transform.y + dy) + ") scale(" + e.transform.k + ")");
        }
    }

    function nodeColor(d: DFGNode): string {
        const colorSchemeEntry: Color | undefined = colorScheme?.filter((c) => c.action === d.id)[0];
        if (colorSchemeEntry) {
            return colorSchemeEntry.color;
        }
        return "#000000";
    }

    function edgeColor(d: DFGLink): string {
        if (typeof d.source !== "string") {
            const colorSchemeEntry: Color | undefined = colorScheme?.filter((c) => c.action === (d.source as DFGNode).id)[0];
            if (colorSchemeEntry) {
                return colorSchemeEntry.color;
            }
            return "#000000";
        }
        const colorSchemeEntry: Color | undefined = colorScheme?.filter((c) => c.action === d.source)[0];
        if (colorSchemeEntry) {
            return colorSchemeEntry.color;
        }
        return "#000000";
    }

    const marker = function (color: string, data: DFGLink) {

        const uid = function () {
            return Date.now().toString(36) + Math.random().toString(36);
        }

        const id = uid();


        // Create definition for arrow heads
        select("svg.dfg g").append("defs").append("marker")
            .attr("class", "edge-marker")
            // .attr("id", "arrow")
            .attr("id", color.replace("#", "") + id)
            .attr("viewBox", "0 0 10 10")
            .attr("refX", 1 / Math.max(data.frequency / max_link_frequency.current, MIN_EDGE_RATIO) ** 0.6 * 12.5 + 0.5 * Math.max(data.frequency / max_link_frequency.current, MIN_EDGE_RATIO) ** 2)
            .attr("refY", 5)
            .attr("markerWidth", 4)
            .attr("markerHeight", 4)
            // .attr("markerUnits", "userSpaceOnUse")
            .attr("orient", "auto")
            .append("svg:path")
            .attr("fill", color)
            .attr("d", "M 0 0 L 10 5 L 0 10 z"); // Draw arrow

        return "url(" + color + id + ")";

    }

    function getEdgeThickness(d: DFGLink, max_freq: number): number {
        const linear_thickness = Math.max(getBaseLog(10, (d.frequency / (max_freq / 10))), MIN_EDGE_RATIO) * 2.5
        const logarithmic_thickness = Math.max(d.frequency / max_freq, MIN_EDGE_RATIO) * 2.5
        if (EDGE_SCALING === "linear") {
            return linear_thickness
        }
        if (EDGE_SCALING === "logarithmic") {
            return logarithmic_thickness
        }
        return 0

        function getBaseLog(x: number, y: number) {
            return Math.log(y) / Math.log(x);
        }
    }

    useEffect(() => {
        setupDFG();
    }, [selection, dfgData, colorScheme])

    function setupDFG() {
        if (selection && dfgData && colorScheme) {


            // Get max frequency from links
            max_link_frequency.current = Math.max(...dfgData.links.map((link) => link.frequency));


            const svgElement: Selection<Element, unknown, HTMLElement, any> = select("svg.dfg")

            svgElement.call(zoom().on("zoom", handleZoom))

            const width = selection.attr("width");
            const height = selection.attr("height");

            // Sort dfgData.links on frequency for drawing order

            dfgData.links.sort((a, b) => b.frequency - a.frequency)
            link.current = selection.append("g")
                .attr("class", "links")
                .selectAll("line")
                .data(dfgData.links)
                .enter().append("line")
                .attr("class", "dfg-edge")
                .attr("stroke", function (d) { return edgeColor(d); })
                .attr("stroke-width", (d) => getEdgeThickness(d, max_link_frequency.current))
                .attr("marker-end", (d) => marker(edgeColor(d), d))


            parent.current = selection.append("g")
                .attr("class", "nodes")
                .attr("cursor", "grab")
                .selectAll("circle")
                .data(dfgData.nodes)
                .enter()
                .append("g")
                .attr("class", "node-parent")

            node.current = parent.current
                .append("circle")
                .attr("r", 5)
                .attr("fill", (d) => nodeColor(d))

            start_circles.current = parent.current
                .filter((d) => d.type === "start")
                .append("circle")
                .attr("r", 2)
                .attr("fill", "white")
                .attr("pointer-events", "none")
                .attr('stroke', (d) => blendColors(nodeColor(d as DFGNode), "#000000", 0.25))
                .attr('stroke-width', '1')

            end_circles.current = parent.current
                .filter((d) => d.type === "end")
                .append("circle")
                .attr("r", 2)
                .attr("fill", "black")
                .attr("pointer-events", "none")
                .attr('stroke', (d) => blendColors(nodeColor(d as DFGNode), "#000000", 0.25))
                .attr('stroke-width', '1')

            both_circles.current = parent.current
                .filter((d) => d.type === "both")
                .append("circle")
                .attr("r", 2)
                .attr("fill", "gray")
                .attr("pointer-events", "none")
                .attr('stroke', (d) => blendColors(nodeColor(d as DFGNode), "#000000", 0.25))
                .attr('stroke-width', '1')

            simulation.current = forceSimulation()

            const connectionCount = (node: DFGNode): number => {
                return dfgData.links.filter((link) => link.source === node || link.target === node).length;
            }

            const strengthFunction = function (link: DFGLink) {
                return 1 / Math.min(connectionCount((link.source as DFGNode)), connectionCount((link.target as DFGNode))) * 2;
            }

            simulation.current
                .force("link", forceLink<DFGNode, DFGLink>().id((d: any) => { return d.id; }).distance(50))//.strength((link) => strengthFunction(link)))
                .force("charge", forceManyBody().strength(-50))
                .force("center", forceCenter(+width / 2, +height / 2))

            simulation.current
                .nodes(dfgData.nodes)
                .on("tick", ticked)



            const simulationForceLink = simulation.current.force<ForceLink<DFGNode, DFGLink>>("link");

            if (simulationForceLink) {
                simulationForceLink.links(dfgData.links);
            }

            /* Tooltip */
            /* Source: https://observablehq.com/@mkane2/force-directed-graph-with-tooltip */
            const node_tooltip = select("div.SplitPane")
                .append("div") // the tooltip always "exists" as its own html div, even when not visible
                .attr("class", "dfg_node_tooltip")

            const node_tooltip_in = function (e: any, d: any) { // pass event and d to this function so that it can access d for our data
                return node_tooltip
                    .html("<h4>" + d.id + "</h4>") // add an html element with a header tag containing the name of the node.  This line is where you would add additional information like: "<h4>" + d.name + "</h4></br><p>" + d.type + "</p>"  Note the quote marks, pluses and </br>--these are necessary for javascript to put all the data and strings within quotes together properly.  Any text needs to be all one line in .html() here
                    .style("visibility", "visible") // make the tooltip visible on hover
                    .style("top", (e.pageY - 50) + "px") // position the tooltip with its top at the same pixel location as the mouse on the screen
                    .style("left", e.pageX + "px") // position the tooltip just to the right of the mouse location
                    .select("h4")
                    .classed("dfg_node_tooltip", true)
            }

            const node_tooltip_out = function (e: any, d: any) {
                return node_tooltip
                    .transition()
                    .duration(50) // give the hide behavior a 50 milisecond delay so that it doesn't jump around as the network moves
                    .style("visibility", "hidden"); // hide the tooltip when the mouse stops hovering
            }

            const link_tooltip = select("div.SplitPane")
                .append("div") // the tooltip always "exists" as its own html div, even when not visible
                .attr("class", "dfg_link_tooltip")

            const link_tooltip_in = function (e: any, d: any) { // pass event and d to this function so that it can access d for our data
                return link_tooltip
                    .html("<h4>" + d.frequency + "</h4>") // add an html element with a header tag containing the name of the node.  This line is where you would add additional information like: "<h4>" + d.name + "</h4></br><p>" + d.type + "</p>"  Note the quote marks, pluses and </br>--these are necessary for javascript to put all the data and strings within quotes together properly.  Any text needs to be all one line in .html() here
                    .style("visibility", "visible") // make the tooltip visible on hover
                    .style("top", (e.pageY - 75) + "px") // position the tooltip with its top at the same pixel location as the mouse on the screen
                    .style("left", e.pageX + "px") // position the tooltip just to the right of the mouse location
                    .select("h4")
                    .classed("dfg_link_tooltip", true)
            }

            const link_tooltip_out = function (e: any, d: any) {
                return link_tooltip
                    .transition()
                    .duration(50) // give the hide behavior a 50 milisecond delay so that it doesn't jump around as the network moves
                    .style("visibility", "hidden"); // hide the tooltip when the mouse stops hovering
            }

            node.current
                .on("mouseover", node_tooltip_in) // when the mouse hovers a node, call the tooltip_in function to create the tooltip
                .on("mouseout", node_tooltip_out) // when the mouse stops hovering a node, call the tooltip_out function to get rid of the tooltip

            link.current!
                .on("mouseover", link_tooltip_in) // when the mouse hovers a node, call the tooltip_in function to create the tooltip
                .on("mouseout", link_tooltip_out) // when the mouse stops hovering a node, call the tooltip_out function to get rid of the tooltip

            setMouseBehaviour();
        }
    }

    function setMouseBehaviour() {
        if (node.current && parent.current && simulation.current) {
            /* Click behaviour */
            node.current
                .on('mouseenter', function (event, d) {
                    select(this)
                        .attr('stroke', (d) => blendColors(nodeColor(d as DFGNode), "#000000", 0.25))
                        .attr('stroke-width', '1')
                }).on('mouseleave', function (event, d) {
                    if (!select(this).classed("active")) {
                        select(this)
                            .attr("fill", (d) => nodeColor(d as DFGNode))
                            .attr('stroke-width', '0')
                    }
                })

            /* Drag behaviour */
            /* Drag behaviour */
            parent.current.call(drag<any, DFGNode>()
                .on("start", function (e: any, d: DFGNode) {
                    select(this).attr("cursor", "grabbing")
                    if (!e.active) simulation.current!.alphaTarget(0.3).restart()
                    d.fx = d.x;
                    d.fy = d.y;

                    if (customCutGroup.includes(d.id)) {
                        setCustomCutGroup([...customCutGroup.filter((c) => c !== d.id)]);
                    } else {
                        setCustomCutGroup([...customCutGroup, d.id]);
                    }
                })
                .on("drag", (e: any, d: DFGNode) => {
                    d.fx = e.x;
                    d.fy = e.y;
                })
                .on("end", function (e: any, d: DFGNode) {
                    select(this).attr("cursor", "grab")
                    if (!e.active) simulation.current!.alphaTarget(0)
                    d.fx = null;
                    d.fy = null;
                })
            );
        }

    }

    useEffect(() => {
        setMouseBehaviour();
        if (data) {
            const actions = getUniqueActionsFromArray(data!);
            setCustomCut({
                group1: actions.filter((a) => !customCutGroup.includes(a)),
                group2: customCutGroup,
                type: customCut!.type,
                algorithm: customCut!.algorithm
            })
        }
    }, [customCutGroup])

    // Cut handling upon receiving a new cut from the algorithm module
    useEffect(() => {
        // Double check conditions ?
        if (cut && selection && processTree && data && dfgData) {
            // Set cut of currently selected node
            setCutByID(activeID, cut, processTree!.root);

            cut.selected = true;

            if (cut.algorithm === "flower") {
                // --- Change root by adding children and changing parent type
                let newRoot: TreeNode = processTree!.root;

                // Check if decision is already made, aka type != "undefined"
                // If decision is made, remove children before adding new ones
                const currentType = getTypeByID(activeID, processTree!.root);
                if (currentType !== "undefined") {
                    newRoot = removeChildrenByID(activeID, processTree!.root);
                }

                let counter = 0;

                for (let action of cut.group1) {
                    counter++;
                    const child = {
                        id: new Date().getTime().toString() + counter.toString(),
                        parent_id: activeID,
                        type: "activity" as TreeNodeType,
                        frequency: data.filter((trace) => trace.events.map((ev) => ev.action)
                            .includes(action)).map((trace) => trace.frequency)
                            .reduce((sum, add) => sum + add, 0),
                        activity: action,
                    }
                    newRoot = setChildByID(activeID, child, newRoot);
                }
                newRoot = setTypeByID(activeID, cut.type, newRoot);

                const newTree = {
                    id: "new_tree",
                    root: newRoot,
                }

                setSelectedNode(undefined);
                setProcessTree(newTree);

                const undefinedNode = getTreeNodeFromUndefined(newTree.root);
                if (undefinedNode) {
                    setActiveID(undefinedNode.id)
                    setData(undefinedNode.traces)
                }
            } else {
                if (cut.type === "loop") {
                    const maxloop = getMaxLoops(data, cut);
                    setMaxLoopByID(activeID, maxloop, processTree!.root)
                }

                // Create new data objects by filtering activities
                const cutTraces: CutTraces = filterByCut(data, cut);

                const group1: TraceFrequency[] = cutTraces.group1;
                const group2: TraceFrequency[] = cutTraces.group2;

                let child1: TreeNode | undefined = undefined;
                let child2: TreeNode | undefined = undefined;

                const group1_actions: string[] = getUniqueActionsFromArray(cutTraces.group1);
                const group2_actions: string[] = getUniqueActionsFromArray(cutTraces.group2);

                // Create TreeNodes for the two new groups (or 1 if check before passed)
                const id1 = (new Date().getTime() + new Date().getTime()).toString();
                const id2 = new Date().getTime().toString();

                child1 = {
                    id: id1,
                    parent_id: activeID,
                    type: "undefined",
                    frequency: group1.reduce((sum, add) => sum + add.frequency, 0),
                    traces: group1,
                    // dfg: tracesToDFG(data) //, for convenience DFG is recalculated (can be improved upon later)
                }

                child2 = {
                    id: id2,
                    parent_id: activeID,
                    type: "undefined",
                    frequency: group2.reduce((sum, add) => sum + add.frequency, 0),
                    traces: group2,
                }

                // Check if one is of size 1 and correct
                if (group1_actions.length === 1) {
                    child1 = {
                        id: id1,
                        parent_id: activeID,
                        type: "activity",
                        frequency: group1[0].frequency,
                        activity: group1.filter(trace => trace.events.length > 0)[0].events[0].action,
                        // dfg: dfg, for convenience DFG is recalculated (can be improved upon later)
                    }
                }

                if (group2_actions.length === 1) {
                    child2 = {
                        id: id2,
                        parent_id: activeID,
                        type: "activity",
                        frequency: group2[0].frequency,
                        activity: group2.filter(trace => trace.events.length > 0)[0].events[0].action,
                    }

                }

                // --- Change root by adding children and changing parent type
                let newRoot: TreeNode = processTree!.root;

                // Check if decision is already made, aka type != "undefined"
                // If decision is made, remove children before adding new ones
                const currentType = getTypeByID(activeID, processTree!.root);
                if (currentType !== "undefined") {
                    newRoot = removeChildrenByID(activeID, processTree!.root);
                }

                newRoot = setChildByID(activeID, child1!, processTree!.root);
                newRoot = setChildByID(activeID, child2!, newRoot);
                newRoot = setTypeByID(activeID, cut.type, newRoot);

                const newTree = {
                    id: "new_tree",
                    root: newRoot,
                }

                setSelectedNode(undefined);
                setProcessTree(newTree);

                if (group1_actions.length === 1 && group2_actions.length > 1) {
                    setActiveID(id2)
                    setData(group2)
                } else if (group1_actions.length !== 1) {
                    setActiveID(id1)
                    setData(group1)
                } else {
                    // Find any id that is still undefined and set its traces to data
                    const undefinedNode = getTreeNodeFromUndefined(newTree.root);
                    if (undefinedNode) {
                        setActiveID(undefinedNode.id)
                        setData(undefinedNode.traces)
                    }
                }
            }
        }
    }, [cut])

    /* Update node and link colors based on hovered cut */
    useEffect(() => {
        if (hoverCut) {
            // Set colors based on group in cut
            if (node.current && link.current && colorScheme) {
                node.current.attr("fill", (d) => getNodeCutColor(d, hoverCut));
                link.current.attr("stroke", (d) => getLinkCutColor(d, hoverCut))
                    .attr("marker-end", (d) => marker(getLinkCutColor(d, hoverCut), d));
            }
        } else {
            // Reset colors to what they were
            if (node.current && link.current) {
                node.current.attr("fill", (d) => nodeColor(d));
                link.current.attr("stroke", (d) => edgeColor(d))
                    .attr("marker-end", (d) => marker(edgeColor(d), d));
            }
        }
    }, [hoverCut])

    function ticked(this: Simulation<DFGNode, DFGLink>) {

        updateEdges();

        if (node.current && start_circles.current && end_circles.current && both_circles.current) {
            node.current
                .attr("cx", function (d) { return d.x!; })
                .attr("cy", function (d) { return d.y!; });

            start_circles.current
                .attr("cx", function (d) { return d.x!; })
                .attr("cy", function (d) { return d.y!; });

            end_circles.current
                .attr("cx", function (d) { return d.x!; })
                .attr("cy", function (d) { return d.y!; });

            both_circles.current
                .attr("cx", function (d) { return d.x!; })
                .attr("cy", function (d) { return d.y!; });
        }
    }

    function setEdgeCoordinates(d: DFGLink, th: SVGLineElement) {
        const x1 = (d.source as DFGNode).x!
        const y1 = (d.source as DFGNode).y!
        const x2 = (d.target as DFGNode).x!
        const y2 = (d.target as DFGNode).y!

        let perp_vector = { x: -(y2 - y1), y: (x2 - x1) }
        const magnitude = Math.sqrt(perp_vector.x ** 2 + perp_vector.y ** 2)
        perp_vector.x /= magnitude;
        perp_vector.y /= magnitude;

        // Is now normalized
        select(th)
            .attr("x1", x1 + perp_vector.x)
            .attr("y1", y1 + perp_vector.y)
            .attr("x2", x2 + perp_vector.x)
            .attr("y2", y2 + perp_vector.y)
    }

    function updateEdges() {
        if (link.current) {
            if (edgeSwitch.current) {
                link.current.each(function (d) { setEdgeCoordinates(d, this) })
            } else {
                link.current
                    .attr("x1", function (d) { return (d.source as DFGNode).x!; })
                    .attr("y1", function (d) { return (d.source as DFGNode).y!; })
                    .attr("x2", function (d) { return (d.target as DFGNode).x!; })
                    .attr("y2", function (d) { return (d.target as DFGNode).y!; })
            }
        }
    }

    function switchEdges() {
        if (dfgData) {
            edgeSwitch.current = !edgeSwitch.current

            select("g.links").selectAll("line").remove();
            selectAll("defs").remove()
            link.current = (select("g.links").selectAll("line")
                .data(dfgData.links)
                .enter().append("line")
                .attr("class", "dfg-edge")
                .attr("stroke", function (d) { return edgeColor(d); })
                .attr("stroke-width", (d) => getEdgeThickness(d, max_link_frequency.current))
                .attr("marker-end", (d) => marker(edgeColor(d), d)) as Selection<SVGLineElement, DFGLink, SVGGElement, unknown>)

            updateEdges()
        }
    }

    return (
        <div className="dfg" ref={divDFGRef}>
            <p className="banner">DFG</p>
            {(typeof data === 'undefined') ? (
                <>
                    <Loading />
                </>
            ) : (
                <>
                    <svg className="dfg" />
                    <div className="generatelayout"
                        onClick={() => { switchEdges() }}
                    >
                        <p>Switch edges</p>
                    </div>
                    <div className="legenda">
                        <p>⚪ Start Nodes</p>
                        <p>⚫ End Nodes</p>
                    </div>
                </>
            )
            }
        </div >
    );
}