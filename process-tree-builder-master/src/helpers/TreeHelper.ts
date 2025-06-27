import { selectAll } from "d3-selection";
import { Cut } from "../interfaces/CutData";
import { TreeNode, TreeNodeType } from "../interfaces/TreeData";
import { NodeSelection } from "./LayoutHelper";

export function getNodeByID(id: string, tree: TreeNode): TreeNode | undefined {
    if (tree.id === id)  {
        return tree;
    } else if (tree.children) {
        for (let ch of tree.children) {
            const returned = getNodeByID(id, ch);
            if (returned) {
                return returned;
            }
        }
    }
}

export function setCutsByID(id: string, tree:TreeNode, cuts: Cut[]): void {
    if (tree.id === id)  {
        tree.cuts = cuts;
    } else if (tree.children) {
        for (let ch of tree.children) {
            setCutsByID(id, ch, cuts);
        }
    }
}

export function setChildByID(id: string, child: TreeNode, tree:TreeNode): TreeNode {
    if (tree.id === id)  {
        if (tree.children) {
            tree.children.push(child);
        } else {
            tree.children = [child];
        }
    } else if (tree.children) {
        for (let ch of tree.children) {
            setChildByID(id, child, ch);
        }
    }
    
    return tree;
}

export function removeChildrenByID(id: string, tree:TreeNode): TreeNode {
    if (tree.id === id)  {
        if (tree.children) {
            tree.children = [];
        }
    } else if (tree.children) {
        for (let ch of tree.children) {
            removeChildrenByID(id, ch);
        }
    }
    
    return tree;
}

export function setTypeByID(id: string, type: TreeNodeType, tree:TreeNode): TreeNode {
    if (tree.id === id)  {
        tree.type=type;
    } else if (tree.children) {
        for (let ch of tree.children) {
            setTypeByID(id, type, ch);
        }
    }
    
    return tree;
}

export function setMaxLoopByID(id: string, maxloop: number, tree:TreeNode) {
    if (tree.id === id)  {
        tree.maxloop=maxloop;
    } else if (tree.children) {
        for (let ch of tree.children) {
            setMaxLoopByID(id, maxloop, ch);
        }
    }
}

export function setCutByID(id: string, cut: Cut, tree:TreeNode): TreeNode {
    if (tree.id === id)  {
        tree.cut = cut;
    } else if (tree.children) {
        for (let ch of tree.children) {
            setCutByID(id, cut, ch);
        }
    }
    
    return tree;
}

export function getTypeByID(id: string, tree:TreeNode): TreeNodeType | undefined {
    if (tree.id === id)  {
        return tree.type;
    } else if (tree.children) {
        for (let ch of tree.children) {
            return getTypeByID(id, ch);
        }
    }
    
    return undefined;
}

export function getTreeNodeFromUndefined(tree: TreeNode): TreeNode | void {
    if (tree.type === "undefined") {
        return tree;
    } else if (tree.children) {
        for (let ch of tree.children) {
            const foundNode = getTreeNodeFromUndefined(ch)
            if (foundNode) {
                return foundNode
            }
        }
    }  
}

export function mergeToParent(parent_id: string, child_id: string, node: TreeNode): TreeNode {
    if (node.id === parent_id && node.children) {
        for (let j = 0; j < node.children.length; j++) {
            const prospect_child: TreeNode = node.children[j]
            if (prospect_child.id === child_id && prospect_child.children) {
                // Child found
                // Get children that aren't the child begin merged to parent
                const filtered_children: TreeNode[] = node.children.filter((ch) => ch.id !== child_id)

                if (prospect_child.cut && node.cut && prospect_child.cut.algorithm === "filter") {
                    node.cut.algorithm = "filter";
                    node.cut.filterThreshold = prospect_child.cut.filterThreshold;
                    if (node.cut.algorithm === "filter") {
                        node.cut.filterThreshold = Math.max(node.cut.filterThreshold!, prospect_child.cut.filterThreshold!)
                    }
                } else {
                    console.log("ERROR - Prospect child / node has no Cut in mergeToParent()s")
                }

                // Adjust parent_id's accordingly
                for (let child of prospect_child.children) {
                    child.parent_id = node.id;
                }
            
                if (j === 0) {
                    // If child_id belongs to leftmost child
                    node.children = [...prospect_child.children, ...filtered_children]
                } else if (j === node.children.length - 1) {
                    // If child_id belongs to rightmost child
                    node.children = [...filtered_children, ...prospect_child.children]
                } else {
                    // If child is somewhere in the middle
                    let children_left: TreeNode[] = []
                    let children_right: TreeNode[] = [...filtered_children]
                    const nr_children = node.children.length;

                    let i = 0;
                    let found = false;

                    let while_child: TreeNode | undefined = undefined;

                    while (i < nr_children && !found) {

                        while_child = node.children[i];

                        if (node.children[i].id === child_id) {
                            found = true;
                        } else {
                            children_left.push(while_child);
                            children_right.shift();
                        }

                        i++;
                    }

                    if (while_child && while_child.children) {
                        // console.log([...children_left, ...while_child.children, ...children_right])
                        node.children = [...children_left, ...while_child.children, ...children_right]
                    }
                }
            }
        }
    } else if (node.children) {
        for (let ch of node.children) {
            mergeToParent(parent_id, child_id, ch)
        }
    }
    
    return node
}

export function findUndefined(node: TreeNode): TreeNode | undefined {
    if (node.type === "undefined") {
        return node;
    }
    
    if (node.children) {       
        for (let child of node.children) {
            if (findUndefined(child)) {
                return node;
            }
        }
    }

    return undefined;
}

export function getWarningSelection(root: TreeNode): NodeSelection | undefined {
    let returnIDs: string[] = []
    
    // Get total frequency
    const totalFrequency = root.frequency;

    // Recursively add all appropriate nodes to selection
    function helper(node: TreeNode, returns: string[], localMax: number): string[] {

        if (node.frequency < localMax) {
            returns.push(node.id);
            node.expected_frequency = localMax;
        }

        if (node.children) {

            if (node.type === "loop") {
                for (let child of node.children) {
                    returns = helper(child, returns, child.frequency);
                }
            } else {
                if (node.type === "xor" ) { // && !returns.includes(node.id) left out, you dont know where the problem lies from the XOR onwards
                    for (let child of node.children) {
                        returns = helper(child, returns, child.frequency);
                    }
                } else {
                    for (let child of node.children) {
                        returns = helper(child, returns, localMax);
                    }
                }
            }

            
        }
        return returns
    }
    returnIDs = helper(root, returnIDs, totalFrequency);

    return (selectAll(".tree-node") as NodeSelection).filter((d) => returnIDs.includes(d.data.id))

}