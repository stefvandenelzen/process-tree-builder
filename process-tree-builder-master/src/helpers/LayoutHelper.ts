import { HierarchyLink, HierarchyPointLink, HierarchyPointNode, hierarchy, tree } from 'd3-hierarchy';
import { BaseType, Selection, select, selectAll } from 'd3-selection';
import { TreeNode } from '../interfaces/TreeData';

export type NodeSelection = Selection<SVGGElement | null, HierarchyPointNode<TreeNode>, any, unknown>;
export type EdgeSelection = Selection<BaseType | null, HierarchyPointLink<TreeNode>, any, unknown>;

export function getActivityIDs(node: TreeNode, activityIDs: string[]): string[] {
    if (node.type === "activity" || node.type === "undefined" || node.type === "none") {
        activityIDs.push(node.id);
    }
    if (node.children) {
        for (let child of node.children) {
            activityIDs = getActivityIDs(child, activityIDs);
        }
    }
    return activityIDs;
}

export function placeActivities(activities: NodeSelection, X_jump: number) {
    let counter = 0;

    activities.each(function (d) {
        d.x = counter * X_jump;
        d.y = 0;
        select(this).attr("transform", () => {
            return (`translate(${d.x},0)`)
        })
        counter++;
    })
}

export function getParentSelection(nodes: NodeSelection): NodeSelection {
    let selection: NodeSelection | undefined = undefined;
    const nodeSelection: NodeSelection = selectAll("g.tree-node");
    const parentIDs: string[] = [];
    nodes.each((nd) => {
        const parent: NodeSelection = nodeSelection.filter((pd) => pd.data.id === nd.data.parent_id) as NodeSelection  
        const parentID = parent.datum().data.id;
        if (!parentIDs.includes(parentID)) {
            parentIDs.push(parentID);
            if (selection) {
                selection =  selectAll([...selection, ...parent]);
            } else {
                selection = parent;
            }
        }
    })  

    if(!selection) {
        console.log("This should never happen, no activity parents found")
        return nodes;
    }

    return selection;  
}

export function getPlacableNodes(nextNodes: NodeSelection, placedNodes: NodeSelection): NodeSelection {
    let selection: NodeSelection | undefined = undefined;

    nextNodes.each(function (nn) {
        // Should always have children
        if (nn.children) {
            const childNodes = placedNodes.filter((pn) => nn.children!.map((ch) => ch.data.id).includes(pn.data.id))
            if (childNodes.size() === nn.children.length) {
                if (selection) {
                    selection = selectAll([...selection, ...select(this)]);
                } else {
                    selection = select(this);
                }
            }
        } else {
            console.log("This should never happen, to-be-placed node has no children");
        }
    })

    if (!selection) {
        console.log("This should never happen, no valid placable element found")
        return nextNodes;
    }

    return selection;
}

// Only works for a single node
export function getChildrenSelection(node: NodeSelection): NodeSelection {
    let selection: NodeSelection | undefined = undefined;
    const children = node.datum().data.children;
    if (children) {
        for (let child of children) {
            const selectedChild = (selectAll("g.tree-node") as NodeSelection).filter((d) => d.data.id === child.id);
            if (selection) {
                selection = selectAll([...selection, ...selectedChild]);
            } else {
                selection = selectedChild;
            }
        }
    } else {
        console.log("This should never happen, getChildrenSelection() called with selection that has no children")
    }

    if (selection) {
        return selection;
    } else {
        console.log("This should never happen, getChildrenSelection() called but no children selected")
        return node;
    }
}

// Places SINGLE node
// placedNodes for accessing activity nodes to re-adjust
export function placeNode(node: NodeSelection, placedNodes: NodeSelection, X_jump: number, customArcs: { [id: string]: boolean; }) {
    const childrenSelection = getChildrenSelection(node);
    const x_data: {x:number, frequency: number, y: number}[] = [];
    const y_values: number[] = [];
    const y_jump = 100;
    const XOR_Y_jump = 50;
    let x_min = 1000000;
    let x_max = -1000000;

    childrenSelection.each((d) => {
        x_data.push({x: d.x, frequency: d.data.frequency, y: d.y})
        y_values.push(d.y)
    });

    const FAVOR_STRENGTH = 2.5;

    const sum_frequency = x_data.map((d) => d.frequency).reduce((a,b) => a+b**FAVOR_STRENGTH, 0)
    const x = x_data.reduce((acc, d) => acc + d.x*(d.frequency**FAVOR_STRENGTH/sum_frequency), 0) // Weighted x placement based on frequency

    if (node.datum().data.id === "1715010926964") {
        console.log(node.datum())
        console.log(x)
        console.log(x_data)
    }
    
    // const sum_y_diff = x_data.map((d) => node.datum().y - d.y).reduce((a,b) => a+b, 0)
    // const x = x_data.reduce((acc, d) => acc + d.x*(((node.datum().y - d.y)**2)/(sum_y_diff**2)), 0)// Weighted x placement based on y values

    const y = Math.min(...y_values) - y_jump;
    

    if (node.datum().data.cut) {
        if (node.datum().data.cut!.type === "xor") {
           // XORs have to be placed differently
           placeXORnode(node, placedNodes, childrenSelection, X_jump, XOR_Y_jump, x_data);
        } else {   
            node.datum().x = x;
            node.datum().y = y;
            node.attr("transform", () => {
                return (`translate(${x},${y})`)
            })
        }
    } else {
        console.log("This should never happen - placeNode called without a defined cut (should have been placed as activity)")
    }

    // Only detects problems, and marks them in customArcs dictionary
    const Y_boost = 100 - 25*(node.datum().y / 100);
    detectArcErrors(node, placedNodes, Y_boost, customArcs);
}

function detectArcErrors(node: NodeSelection, placedNodes: NodeSelection, Y_boost: number, customArcs: { [id: string]: boolean; }) {
    // if (node.datum().data.type === "xor") {
    //     customArcs[node.datum().data.id] = true;
    // }
    // console.log("Checking for arc problems:")
    // console.log(node.node())
    let problem = false;

    // Collect gradients and y-values
    // If next_gradient smth smth -> keep one with max-y    
    if (node.datum().data.children) {
        const gradientObject: { gradient: number, y: number, id: string}[] = [];
        const childrenSelection = getChildrenSelection(node);
        childrenSelection.each(function (d) {
            const parent_x = node.datum().x
            const parent_y = node.datum().y;

            const child_x = d.x;
            const child_y = d.y;

            const gradient = (child_y - parent_y) / (child_x - parent_x);
            gradientObject.push({ gradient: gradient, y: child_y, id: d.data.id});
        })
        
        // console.log(gradientObject);

        let compareGradient = -0.001;
        let compareY = 0;
        let compareID = "SHOULD_NEVER_OCCUR_IN_CUSTOM_ARCS";

        for (let gr of gradientObject) {
            if (gr.gradient < 0) {
                // Gradient should become smaller
                if (gr.gradient > compareGradient) {
                    // PROBLEM
                    problem = true;
                    // Keep one with larger y and set that as next compareGradient (but y is negative)
                    if (gr.y < compareY) {
                        // console.log("Previous problem (-)")
                        customArcs[compareID] = true;
                        compareGradient = gr.gradient;
                        compareY = gr.y;
                        compareID = gr.id;
                    } else {
                        // console.log("Current problem (-)")
                        // Otherwise: dont change compare variables
                        customArcs[gr.id] = true;
                    }
                } else {
                    // console.log("No problem (-)")
                    compareGradient = gr.gradient;
                    compareY = gr.y;
                    compareID = gr.id;
                }
            } else {
                // Gradient should become smaller
                if (gr.gradient > compareGradient && compareGradient >= 0) {
                    // PROBLEM
                    problem = true;
                    // Keep one with larger y and set that as next compareGradient (but y is negative)
                    if (gr.y < compareY) {
                        // console.log("Previous problem (+)")
                        customArcs[compareID] = true;
                        compareGradient = gr.gradient;
                        compareY = gr.y;
                        compareID = gr.id;
                    } else {
                        // Otherwise: dont change compare variables
                        // console.log("Current problem (+)")
                        customArcs[gr.id] = true;
                    }
                } else {
                    // console.log("No problem (+)")
                    compareGradient = gr.gradient;
                    compareY = gr.y;
                    compareID = gr.id;
                }
            }
        }

    } else {
        console.log("This should never happen - placeNode -> detectArcErrors called with node without children")
    }    

    // If a problem has been detected, add Y_boost to y value of parent node
    if (problem) {
        node.datum().y -= Y_boost;
        const x = node.datum().x;
        const y = node.datum().y;
        node.attr("transform", () => {
            return (`translate(${x},${y})`)
        })
    }
}

export function getSubTreeSelection(nodes: NodeSelection): NodeSelection {
    nodes.each(function (d) {
        if (d.data.children) {
            const childrenSelection = getChildrenSelection(select(this))
            nodes = selectAll([...nodes, ...getSubTreeSelection(childrenSelection)]);
        }
    })
    return nodes;
}

function placeXORnode(
        node: NodeSelection,
        placedNodes: NodeSelection,
        childrenSelection: NodeSelection,
        X_jump: number,
        XOR_Y_jump: number,
        x_data: {x: number, frequency: number}[]) {

    // console.log("Placing XOR Node")
    // console.log(node.node())

    let allChildrenActivities = true;
    childrenSelection.each((d) => {
        if (d.data.type !== "activity" && d.data.type !== "none" && d.data.type !== "undefined") {
            allChildrenActivities = false;
        }
    })

    if (allChildrenActivities) {
        const min_x = Math.min(...x_data.map((d) => d.x));
        const XOR_y_jump = 50;
        let XORcounter = 0;

        // Stack children nodes on top of each other, followed my the XOR node
        childrenSelection.each(function (d) {
            const childNode: NodeSelection = select(this);
            childNode.datum().x = min_x;
            childNode.datum().y = -XOR_y_jump * XORcounter;
            childNode.attr("transform", () => {
                return (`translate(${min_x},${-XOR_y_jump * XORcounter})`)
            })
            XORcounter++;
        })
        node.datum().x = min_x;
        node.datum().y = -XOR_y_jump * XORcounter;
        node.attr("transform", () => {
            return (`translate(${min_x},${-XOR_y_jump * XORcounter})`)
        })

        // Adjust children activities to the right, send them left by X_jump
        placedNodes.filter((d) => (d.data.type === "activity" || d.data.type === "undefined" || d.data.type === "none") && d.x > min_x).each(function (d) {
            const string = select(this).attr("transform")
            const translate = string.substring(string.indexOf("(")+1, string.indexOf(")")).split(",");
            const new_x = ((translate[0] as unknown as number) - X_jump*(XORcounter-1));
            (select(this) as NodeSelection).datum().x = new_x;
            select(this).attr("transform", `translate(${new_x}, ${translate[1]})`)
        })
    } else {
        interface XORSubtree {
            subtree: NodeSelection,
            min_x?: number,
            max_x?: number,
            min_y?: number,
            max_y?: number,
            width?: number,
            height?: number
         }

         const subTrees: XORSubtree[] = []

         // Get subtree selections
         childrenSelection = getChildrenSelection(node).each(function (d) {
                subTrees.push({
                    subtree: getSubTreeSelection(select(this))
                })
         })

         // Fill subtree data
        // Get global min_x and max width
        let minx = 1000000;
        let max_width = 0;

        for (let tree of subTrees) {
        let min_x = 1000000;
        let min_y = 1000000;
        let max_x = 0;
        let max_y = 0;

        tree.subtree.each(function(d) {
            min_x = Math.min(min_x, d.x)
            min_y = Math.min(min_y, d.y)
            max_x = Math.max(max_x, d.x)
            max_y = Math.max(max_y, d.y)
        })

        tree.min_x = min_x;
        tree.min_y = min_y;
        tree.max_x = max_x;
        tree.max_y = max_y;
        tree.width = max_x - min_x;
        tree.height = max_y - min_y;

        minx = Math.min(minx, tree.min_x);
        max_width = Math.max(max_width, tree.width);
        }

        const center_x = minx + max_width / 2;

        // Sort subtree selections on width
        subTrees.sort((a,b) => a.width! < b.width! ? 1 : -1)         
        
        // Place subtrees according to above coords
        // Save total number of nodes at y = 0 for later calculations
        const botActivityTotal = subTrees.map((d) => d.subtree.filter((d) => d.y === 0).size()).reduce((acc,b) => acc + b, 0)

        let move_y = 0;
        let move_x = 0;
        for (let tree of subTrees) {
            move_x = (tree.min_x! - minx) - (max_width - tree.width!)/2;
            
            // eslint-disable-next-line no-loop-func
            tree.subtree.each(function (d) {
                const string = select(this).attr("transform")
                const translate = string.substring(string.indexOf("(")+1, string.indexOf(")")).split(",");
                const new_x = (translate[0] as unknown as number) - move_x;
                const new_y = (translate[1] as unknown as number) - move_y;
                (select(this) as NodeSelection).datum().x = new_x;
                (select(this) as NodeSelection).datum().y = new_y;
                select(this).attr("transform", `translate(${new_x}, ${new_y})`)
            })

            move_y = move_y + tree.height! + XOR_Y_jump; 
        }

        // Fix direct children's X coordinates to center_x, so they are right below the X node
        childrenSelection.each(function (d) {
            const string = select(this).attr("transform")
            const translate = string.substring(string.indexOf("(")+1, string.indexOf(")")).split(",");
            const y = (translate[1] as unknown as number);
            d.x = center_x;
            d.y = y;
            select(this).attr("transform", () => {
                return (`translate(${center_x},${y})`)
            })
        })

        // Place XOR node
        node.datum().x = center_x;
        node.datum().y = -move_y;
        node.attr("transform", () => {
            return (`translate(${center_x},${-move_y})`)
        })

        // Adjust children activities to the right, send them left by X_jump
        const bottomSubTree = subTrees[0];
        const botActivityBottomSubtree = bottomSubTree.subtree.filter((d) => d.y === 0).size();
        const nrOfShift = botActivityTotal - botActivityBottomSubtree;
        // console.log(botActivityBottomSubtree)
        // console.log(botActivityTotalTree)

        // Move entire XOR subtrees:
        // Keep track of moved activities
        // Afterwards, move all remaining activities
        // let movedActivityIDs: string[] = []
        // // Current node is not yet in placedNodes, so it has to be manually appended
        // const placedXORNodes: NodeSelection = placedNodes.filter((d) => { return d.data.type === "xor"});
        // // const XORNodes: NodeSelection = selectAll([...placedXORNodes, ...node]);
        // const XORSubTrees: NodeSelection = removeDuplicateSelections(getSubTreeSelection(placedXORNodes))

        // // Move XOR subtrees
        // XORSubTrees.filter((d) => d.x > bottomSubTree.max_x!).each(function (d) {
        //     console.log(select(this).nodes())
        //     const string = select(this).attr("transform")
        //     const translate = string.substring(string.indexOf("(")+1, string.indexOf(")")).split(",");
        //     const new_x = ((translate[0] as unknown as number) - X_jump*nrOfShift);
        //     (select(this) as NodeSelection).datum().x = new_x;
        //     select(this).attr("transform", `translate(${new_x}, ${translate[1]})`)
        //     if (d.data.type === "activity") {
        //         movedActivityIDs.push(d.data.id);
        //     }
        // })

        // console.log(movedActivityIDs);

        // // Move all remaining activities
        // placedNodes.filter((d) => (d.data.type === "activity"|| d.data.type === "undefined" || d.data.type === "none") && !movedActivityIDs.includes(d.data.id) && d.x > bottomSubTree.max_x!).each(function (d) {
        //     const string = select(this).attr("transform")
        //     const translate = string.substring(string.indexOf("(")+1, string.indexOf(")")).split(",");
        //     const new_x = ((translate[0] as unknown as number) - X_jump*nrOfShift);
        //     (select(this) as NodeSelection).datum().x = new_x;
        //     select(this).attr("transform", `translate(${new_x}, ${translate[1]})`)
        // })

        // Move all nodes to the right of this tree to the left
        placedNodes.filter((d) =>  d.x > bottomSubTree.max_x!).each(function (d) {
            const string = select(this).attr("transform")
            const translate = string.substring(string.indexOf("(")+1, string.indexOf(")")).split(",");
            const new_x = ((translate[0] as unknown as number) - X_jump*nrOfShift);
            (select(this) as NodeSelection).datum().x = new_x;
            select(this).attr("transform", `translate(${new_x}, ${translate[1]})`)
        })
    }

    // console.log("Placed XOR Node with transform:")
    // console.log(node.attr("transform"))
}

export function generateXORArcs(edges: EdgeSelection) {
    edges.attr("d", function (d) {
        const from_x = d.source.x;
        const from_y = d.source.y;

        const to_x = d.target.x;
        const to_y = d.target.y;

        const diff_x = to_x - from_x;
        const diff_y = to_y - from_y;

        const control_diff_x = Math.sqrt(diff_y*(35*d.source.children!.length));

        return `M${from_x} ${from_y}c${control_diff_x },${0},${control_diff_x},${diff_y},${diff_x},${diff_y}`
    })
}

export function generateArcs(edges: EdgeSelection) {
    edges.attr("d", function (d) {

        // Same as in placeNode(), but 25 changed to 20
        const Y_boost = 100 - 20*(d.source.y / 100);

        const from_x = d.source.x;
        const from_y = d.source.y;

        const to_x = d.target.x;
        const to_y = d.target.y;

        const diff_x = to_x - from_x;
        const diff_y = to_y - from_y;

        const control1_x = 0;
        const control1_y = Y_boost;

        const control2_x = diff_x;
        const control2_y = 0;

        return `M ${from_x},${from_y} c ${control1_x}, ${control1_y}, ${control2_x} ,${control2_y},${diff_x}, ${diff_y}`
    }) 
}

// Check for XOR
// if (node.datum().data.type === "xor") {
//     let min_y = 0; // Highest on screen
//     const childrenSelection = getChildrenSelection(node).each(function (d) {
//         min_y = Math.min(min_y, d.y);
//     })
//     leftID = childrenSelection.filter((d) => d.y === min_y).datum().data.id;
//     console.log(node.node())
//     console.log(leftID)

function addLoopEdges(edges: EdgeSelection[], dir: "left" | "right"): EdgeSelection[] {
    const allEdges: EdgeSelection = select("g.link-group").selectAll("path"); 

    let target = edges[edges.length-1].datum().target;
    let source = edges[edges.length-1].datum().source;

    if (dir === "left") {
        const childEdges: EdgeSelection[] = []
       
        allEdges.each(function (d) {
            if (target.data.id === d.source.data.id) {
                childEdges.push(select(this));
            }
        })

        if (childEdges.length > 0) {

            let leftID = 0;

            if (target.data.type === "xor") {
                let max_y = 0; // Highest on screen

                const y_values = childEdges.map((edge) => Math.abs(edge.datum().target.y))

                for (let j = 0; j < y_values.length; j++) {
                    if (y_values[j] > max_y) {
                        max_y = y_values[j];
                        leftID = j;
                    }
                }

            }

            return addLoopEdges([...edges, childEdges[leftID]], dir);
        } else {
            return edges;
        }
    } else {
        const childEdges: EdgeSelection[] = []
       
        allEdges.each(function (d) {
            if (target.data.id === d.source.data.id) {
                childEdges.push(select(this));
            }
        })

        if (childEdges.length > 0) {

            let rightID = childEdges.length - 1;

            if (target.data.type === "xor") {
                let min_y = 10000000; // Highest on screen

                const y_values = childEdges.map((edge) => Math.abs(edge.datum().target.y))

                for (let j = 0; j < y_values.length; j++) {
                    if (y_values[j] < min_y) {
                        min_y = y_values[j];
                        rightID = j;
                    }
                }
            }

            return addLoopEdges([...edges, childEdges[rightID]], dir);
        } else {
            return edges;
        }
    }
}

function getLoopEdges(node: NodeSelection): EdgeSelection[] {
    if (node.datum().data.children) {
        const leftID: string = node.datum().data.children![0].id;
        const rightID: string = node.datum().data.children![node.datum().data.children!.length-1].id;
    
        const edges: EdgeSelection = select("g.link-group").selectAll("path");       

        

        let leftSide: EdgeSelection[] = [edges.filter((d) => {
            if (d.target.data) {
                return d.target.data.id === leftID;
            } else {
                return false;
            }
        })];
        let rightSide: EdgeSelection[] = [edges.filter((d) => {
            if (d.target.data) {
                return d.target.data.id === rightID;
            } else {
                return false;
            }
        })];
        
        // Combine two sides, but one in reverse order
        let loopEdges: EdgeSelection[] = addLoopEdges(leftSide, "left");
        addLoopEdges(rightSide, "right").reverse().forEach((edge) => {loopEdges.push(edge)});
      
        return loopEdges;
    } else {
        console.log("This should never happen - getLoopEdges called with node without children")
        return [];
    }    
}

export function generateConcurrencyMask(node: NodeSelection) {
    const loopEdges: EdgeSelection[] = getLoopEdges(node);
    let dString = `M ${node.datum().x} ${node.datum().y}`;
    // let dString = "";

    let counter = 0;

    for (let edge of loopEdges) {
        const string = edge.attr("d")
        const segment = string.substring(string.indexOf("C"), string.length);
        dString += " " + segment;

        counter++;

        if (edge.datum().target.data.type === "activity" || edge.datum().target.data.type === "undefined" || edge.datum().target.data.type === "none") {
            break;
        }
    }

    // Add path to y = 0, with min_x of subbranch, if y = 0 at this point
    // Get last point
    const commaSeparated = dString.split(",")
    const lastCoords = commaSeparated.splice(commaSeparated.length-2, commaSeparated.length);
    // dString += `M ${lastCoords[0]} ${lastCoords[1]}`

    let max_y = -1000000;
    let next_y = 0
    if (loopEdges[counter-1].datum().target.y !== 0) {
        
        let min_x = 1000000;
        
        // Draw to minimal x value in subtree
        getSubTreeSelection(node).each(function (d) {
            min_x = Math.min(min_x, d.x)
            max_y = Math.max(max_y, d.y)
        });

        // Draw to maximal y-value (lowest on screen)
        dString += `L ${min_x} ${max_y}`
        next_y = max_y
    }

    // Add path to beginning of right section
    const to_x = loopEdges[counter].datum().target.x;
    dString += `L ${to_x} ${next_y}`

    // Add right side edges
    for (let j = counter; j < loopEdges.length; j++) {
        const string = loopEdges[j].attr("d");
        let move = string.substring(string.indexOf("M")+1, string.indexOf("C")).split(",");
        let control_points = string.substring(string.indexOf("C")+1, string.length).split(",");
        if (move.length < 2) {
            // XOR-arc generated edges
            move = string.substring(string.indexOf("M")+1, string.indexOf("c")).split(" ");
            control_points = string.substring(string.indexOf("c")+1, string.length).split(",");

            const x = loopEdges[j].datum().target.x;
            const y = loopEdges[j].datum().target.y;

            const x_diff = Number(move[0]) - x
            const y_diff = Number(move[1]) - y

            dString += `c${Number(control_points[2]) + x_diff},${Number(control_points[3]) + y_diff},${Number(control_points[0]) + x_diff},${Number(control_points[1]) + y_diff },${x_diff},${y_diff}`
        } else {
            dString += `C${control_points[2]},${control_points[3]},${control_points[0]},${control_points[1]},${move[0]},${move[1]}`
        }
                
        // dString += `L ${move[0]} , ${move[1]} `
    }

    // dString += `Z`


    // Add reversed translation in subgroup
    const string = node.attr("transform");
    const translate = string.substring(string.indexOf("(")+1, string.indexOf(")")).split(",");

    select("g.mask-group")
    // .attr("transform", `translate(${-translate[0]}, ${-translate[1]})`)
    .append("path")
    .attr("d", dString)
    .attr("fill", "blue")
    .attr("stroke", "none")
    .attr("opacity", 0.1)
    .attr("class", "mask")
    .attr("fill-rule", "nonzero")
}

export function removeDuplicateSelections(nodes: NodeSelection): NodeSelection {
    let seenIDs: string[] = [];

    let selection: NodeSelection | undefined = undefined;

    nodes.each(function (d) {
        if (!seenIDs.includes(d.data.id)) {
            if (selection) {
                selection = selectAll([...selection, ...select(this)])
            } else {
                selection = select(this)
            }
            seenIDs.push(d.data.id);
        }
    })

    if (selection) {
        return selection;
    } else {
        return nodes;
    }
}