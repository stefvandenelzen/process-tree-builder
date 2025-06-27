import copy
from collections import deque

def im_base(dfg_backend, algorithm):
    dfgData, traces, actions = dfg_backend['dfgData'], dfg_backend['traces'], dfg_backend['unique_actions']

    # Handled in front-end
    # baseCase = bh.base_case(traces)

    # if (baseCase == None):
    #     print("No basecase found")
    # else: 
    #     print("Basecase found")

    cuts = find_cut(traces, dfgData, actions)
    
    if (len(cuts) == 0 and algorithm != "fallthrough"):
        print("No cut found, going to fallthrough")
        cut = fallthrough(traces, dfgData, actions)
        if (len(cut) > 0):
            return cut
        return []
        # return { "type": "sequence", "algorithm": "base", "group1": [], "group2": []}
    
    print("Base cut(s) found of type " + cuts[0]["type"])
    return cuts

def fallthrough(traces, dfgData, actions):
    # (Tau, left out) EmptyTraces
    # ActivityOncePerTrace
    # ActivityConcurrent
    # (Tau, left out) StrictTauLoop
    # (Tau, left out) TauLoop
    # FlowerModel

    cut = activity_once_per_trace(traces, dfgData, actions)

    if (len(cut) > 0):
        return cut

    # To be implemented:
    # cut = activity_concurrent(traces, dfgData, actions)
    
    # Needs support for multiple groups
    # cut = flowermodel(traces, dfgData, actions)

    return cut
    


def activity_once_per_trace(traces, dfgData, actions):

    present_actions = []

    # Check if any action occurs exactly once in every trace
    for action in actions:
        presentOnce = True
        for trace in traces:
            # Abort when a trace does not contain the action exactly once
            if (presentOnce):
                # Check if occurs exactly once
                if trace["events"].count(action) != 1:
                    presentOnce = False

        if (presentOnce):
            present_actions.append(action)

    return_cuts = []

    if len(present_actions) > 0:
         for action in present_actions:
            group2 = copy.deepcopy(actions)
            group2.remove(action)
            return_cuts.append({
                "group1": [action],
                "group2": group2,
                "type": "concurrency",
                "algorithm": "fallthrough-activity-once-per-trace"
            })

    return return_cuts

def activity_concurrent(traces, dfgData, actions):
    return

def flowermodel(traces, dfgData, actions):
    return
    
def find_cut(traces, dfgData, actions):
   
    # Get directly follows relation
    direct_follows = get_direct_follows(dfgData, actions)

    # Get reachable nodes dictionary
    reachable = get_reachable_nodes(dfgData, actions)

    # Get minimum self distance witnesses dictionary
    min_self_dist = get_minimum_self_distances_witnesses(traces, actions)

    if (True): # Check for the empty trace, not present in current testing
        operator, logs = xor_cut(dfgData, actions)
        if (len(logs) > 1):
            # logs = reduce_islands_to_two(logs)
            return generate_binary_cuts(operator, logs, dfgData)
        
        operator, logs = sequence_cut(actions, reachable, dfgData)
        if (len(logs) > 1):
            return generate_binary_cuts(operator, logs, dfgData)
        
        operator, logs = concurrency_cut(dfgData, actions, direct_follows, min_self_dist)
        if (len(logs) > 1):
            # logs = reduce_islands_to_two(logs)
            return generate_binary_cuts(operator, logs, dfgData)
        
        operator, logs = loop_cut(dfgData, actions, direct_follows)
        if (len(logs) > 1):
            # logs = reduce_islands_to_two(logs)
            return generate_binary_cuts(operator, logs, dfgData)

    return []

# Function for finding XOR cut (disconnected components in DFG)
def xor_cut(dfgData, actions):

    # Initialize separate islands for each action
    islands = []
    for action in actions:
        temp = []
        temp.append(action)
        islands.append(temp)

    for link in dfgData["links"]:
        # Merge two groups of the link
        sourceIndex = None
        targetIndex = None

        sourceIndex, targetIndex = get_island_indices(link["source"], link["target"], islands)

        # print('Link: %s -> %s ' % (link["source"], link["target"]))   

        # Merge if the indices are not the same
        if (sourceIndex != targetIndex):
            islands[sourceIndex] += islands[targetIndex]
            islands.remove(islands[targetIndex])    

    return "xor", islands

# Source: https://stackoverflow.com/questions/8922060/how-to-trace-the-path-in-a-breadth-first-search
# Function to perform Breadth First Search on a graph
def bfs(graph, start, end):
    # maintain a queue of paths
    queue = []
    # push the first path into the queue
    queue.append([start])
    while queue:
        # get the first path from the queue
        path = queue.pop(0)
        # get the last node from the path
        node = path[-1]
        # path found
        if node == end:
            return path
        # enumerate all adjacent nodes, construct a 
        # new path and push it into the queue
        # for adjacent in graph.get(node, []):
        for link in graph["links"]:
            if node == link["source"]:
                new_path = list(path)
                new_path.append(link["target"])
                queue.append(new_path)      
    return None
    
    

# Function for finding Sequence cut
def sequence_cut(actions, reachable, dfgData):
    #Initialize separate islands for each action
    islands = []
    for action in actions:
        temp = []
        temp.append(action)
        islands.append(temp)

    test_action_a = 'Create Purchase Order Item'
    test_action_b = 'Change Quantity'
    
    # print(reachable)
    # print(actions)

    for i in range(0, len(actions)):
        for j in range(i, len(actions)):
            if (j > i):
                a = actions[i]
                b = actions[j]

                a_island_index, b_island_index = get_island_indices(a, b, islands)
                if a in reachable[b] and b in reachable[a]:
                    if(a_island_index != b_island_index):
                        # if (a == "Change Rejection Indicator" or b == "Change Rejection Indicator"):
                        # print ("-----")
                        # print("[TEST] - Merging reachable " + a + " to island of " + b)
                        # print("[TEST] Island indices: a: " + str(a_island_index) + ", b: " + str(b_island_index))
                        # print("[TEST] Island a: " + str(islands[a_island_index]))
                        # print("[TEST] Island b: " + str(islands[b_island_index]))
                        # trail = bfs(dfgData, a, b)
                        # if (trail == None):
                        #     print("[TEST] - (a,b) trail not found")
                        # else:
                        #     print("[TEST] - (a,b) trail found: " + str(trail))
                        # trail = bfs(dfgData, b, a)
                        # if (trail == None):
                        #     print("[TEST] - (b,a) trail not found")
                        # else:
                        #     print("[TEST] - (b,a) trail found: " + str(trail))
                        islands[a_island_index] += islands[b_island_index]
                        islands.remove(islands[b_island_index]) 
                        # if (a == test_action_a and b == test_action_b):
                        # print("[TEST] - Postmerge islands: " + str(islands))
                    

                # print(islands)

                a_island_index, b_island_index = get_island_indices(a, b, islands)
                if a not in reachable[b] and b not in reachable[a]:
                    if(a_island_index != b_island_index):
                        print ("-----")
                        print("[TEST] - Merging unreachable " + a + " to island of " + b)
                        print("[TEST] Island indices: a: " + str(a_island_index) + ", b: " + str(b_island_index))
                        print("[TEST] Island a: " + str(islands[a_island_index]))
                        print("[TEST] Island b: " + str(islands[b_island_index]))
                        islands[a_island_index] += islands[b_island_index]
                        islands.remove(islands[b_island_index])
                        print("[TEST] - Postmerge islands: " + str(islands))
    # print(islands)

    if(len(islands) == 1):
        return "none", islands

    # May not work as inteded, may have to sort on reachability first
    # islands = reduce_islands_to_two(islands)

    # islands = sort_islands_sequence(islands, dfgData)

    return "sequence", islands

def concurrency_cut(dfgData, actions, direct_follows, min_self_dist):
    #Initialize separate islands for each action
    islands = []
    for action in actions:
        temp = []
        temp.append(action)
        islands.append(temp)

    for i in range(0, len(actions)): # For all distinct action pairs
        for j in range(i, len(actions)):
            if (j > i): 
                a = actions[i]
                b = actions[j]

                a_island_index, b_island_index = get_island_indices(a, b, islands) 
                if a not in direct_follows[b] or b not in direct_follows[a]:
                    if(a_island_index != b_island_index):
                        islands[a_island_index] += islands[b_island_index]
                        islands.remove(islands[b_island_index]) 

                a_island_index, b_island_index = get_island_indices(a, b, islands)  
                if a in min_self_dist[b] or b in min_self_dist[a]:
                    if(a_island_index != b_island_index):
                        islands[a_island_index] += islands[b_island_index]
                        islands.remove(islands[b_island_index]) 
    
    for i, island in enumerate(islands):
        if not check_island_for_type(island, dfgData, "start") and not check_island_for_type(island, dfgData, "end"):
            if i != len(islands):
                islands[i+1] += island
                islands.remove(island)
            else:
                islands[i-1] += island
                islands.remove(island)

    return "concurrency", islands

def loop_cut(dfgData, actions, direct_follows):
    start_end = []
    start = []
    start_excl = []
    end = []
    end_excl = []
    none = []
    for action in actions:
        action_type = ""
        for node in dfgData["nodes"]:
            if (node["id"] == action):
                action_type = node["type"]
        if action_type == ("start"):
            start_end.append(action)
            start.append(action)
            start_excl.append(action)
        elif action_type == ("end"):
            start_end.append(action)
            end.append(action)
            end_excl.append(action)
        elif action_type == ("both"):
            start.append(action)
            end.append(action)
            start_end.append(action)
        else:
            none.append(action)

    # Get disconnected islands from activities excluding start and end activities
    dfgData_wo_start_end = dfg_clean_actions(start_end, dfgData)

    _, islands = xor_cut(dfgData_wo_start_end, none) 
    start_end_island = start_end

    # print(start_end_island)
    # print(islands)

    # Merge the groups that are connected from a start activity to the main start_end_island
    for start_action in start_excl:
        for action in direct_follows[start_action]:
            index = get_island_index(action, islands)
            if (index != -1):
                start_end_island += islands[index]
                islands.remove(islands[index])

    # Merge the groups that are connected to an end activity to the main start_end_island
    for actions in none:
        for end_action in end_excl:
            if (end_action in direct_follows[action]):
                index = get_island_index(action, islands)
                if (index != -1):
                    start_end_island += islands[index]
                    islands.remove(islands[index])

    remove_indices = []

    # print(start_end_island)
    
    # Merge the groups that are connected to a start activity, but not all
    # for island in islands:
    #     contains_to_start_connection = False
    #     for action in island:
    #         for start_action in start:
    #             if(start_action in direct_follows[action]):
    #                 contains_to_start_connection = True
    #     if (contains_to_start_connection):
    #         for action in island: # MIGHT BE A BUG: Potentially the start only has to be REACHABLE
    #             for start_action in start:
    #                 if(start_action not in direct_follows[action]):
    #                     if (index not in remove_indices): # Do not insert duplicate indices
    #                         index = get_island_index(action, islands) # THIS SHOULD BE BEFORE THE IF
    #                         start_end_island += islands[index]
    #                         remove_indices.append(index)
    
    # Merge the groups that have activities that are connected to a start activity, but not all start activities
    for island in islands:
        for action in island:
            for start_action in start:
                if(start_action in direct_follows[action]): # action has connection to a start action
                    for start_act in start:
                        if(start_act not in direct_follows[action]): # If a single start action is not a direct connection from said action, merge its island
                            index = get_island_index(action, islands)
                            if (index not in remove_indices): # Do not insert duplicate indices
                                start_end_island += islands[index]
                                remove_indices.append(index)
    

    # print(start_end_island)
    remove_indices.sort(reverse=True)
    for index in remove_indices: # Update islands array after
        islands.remove(islands[index])

    remove_indices = []

    # Merge the groups that are connected from an end activity, but not all
    # for island in islands:
    #     contains_from_end_connection = False
    #     for action in island:
    #         for end_action in end:
    #             if(action in direct_follows[end_action]):
    #                 contains_from_end_connection = True
    #     if (contains_from_end_connection):
    #         end_action_okay = False
    #         for end_action in end:
    #             for action in island:
    #                 if(action in direct_follows[end_action]):
    #                     end_action_okay = True
    #             if(not end_action_okay):
    #                 if (index not in remove_indices): # Do not insert duplicate indices
    #                     index = get_island_index(action, islands) # THIS SHOULD BE BEFORE THE IF
    #                     start_end_island += islands[index]
    #                     remove_indices.append(index)
    #             end_action_okay = False

    # Merge the groups that have an activity connected from an end activity, but not all end activities
    for island in islands:
        for action in island:
            for end_action in end:
                if(action in direct_follows[end_action]): #action has connection from a end activity
                    for end_act in end:
                        if(action not in direct_follows[end_act]):
                            index = get_island_index(action, islands)
                            if (index not in remove_indices): # Do not insert duplicate indices
                                start_end_island += islands[index]
                                remove_indices.append(index)
        
    remove_indices.sort(reverse=True)
    for index in remove_indices: # Update islands array after
        islands.remove(islands[index])

    print(islands)

    # print(start_end_island)
    # print(islands)

    return "loop", [start_end_island] + islands
    


def get_direct_follows(dfgData, actions):
    direct_follows = {}
    for action in actions:
        direct_follows[action] = []

    # Add relations for all existing links
    for link in dfgData["links"]:
        direct_follows[link["source"]].append(link["target"])

    return direct_follows 

def get_reachable_nodes(dfgData, actions):
    reachable = {}
    for action in actions:
        reachable[action] = []

    # First add relations for all existing links
    for link in dfgData["links"]:
        # Add target to source reachable entry if it is not already there
        if link["target"] not in reachable[link["source"]]:
            # print("Adding %s to %s" % (link["target"], link["source"]))
            reachable[link["source"]].append(link["target"])

    # Add target to any entry in reachable that contains the source
    # Problem: This has to be infinitely recurisve somehow
    # Solution: For the amount of nodes (max loop length) add all reachable nodes from target to source
            
    # Save length of reachable and stop when it is unchanged after iteration
    old_reachable_length = 0
    for val in reachable.values():
        old_reachable_length += len(val)

    count = 0
    for _ in actions:
        for action in actions:
            for key, value in reachable.items():
                if action in value:
                    count += 1
                    # If action in a node's reachable list
                    # Add the entire reachable node section of that action to reachable[key]
                    reachable[key] = list(set(reachable[key] + reachable[action]))
        
        # Save length of reachable and stop when it is unchanged after iteration
        reachable_length = 0
        for val in reachable.values():
            reachable_length += len(val)

        # print("%s - %s" % (old_reachable_length, reachable_length))

        if (reachable_length == old_reachable_length):
            break
       
        old_reachable_length = reachable_length

    # print('Reachable: %s' % reachable)
    # for key, value in reachable.items():
    #     print("%s: %s" % (key, len(value)))

    return reachable

# Minimum self distance is the minimum distance between two occurences of the same activity
# Any activities occuring between such a minimal distance are their witnesses in the minimum self distance relation
def get_minimum_self_distances_witnesses(traces, actions):
    min_self_dist = {}
    min_self_wit = {}

    test_action = "no-action"

    for action in actions:
        min_self_dist[action] = []
        min_self_wit[action] = []

    for action in actions:
        if action == test_action:
            print(action)
        witnesses = []
        min_dist = -1
        for trace in traces:
            if action == test_action:
                print("-----------")
                print("New trace:")
                print("W: " + str(witnesses))
                print("MD: " + str(min_dist))
                print(trace)
            events = trace["events"]
            wit_temp = []
            start_index = -1
            temp_dist = 0
            for i in range(0, len(events)):
                # When currently in count, add to temp witness until you encounter the action again
                if i > start_index and start_index != -1:
                    if events[i] != action:
                        wit_temp.append(events[i])
                    elif events[i] == action and i == start_index + 1: # Reset count if min_dist = 1 (could also just break)
                        start_index = i
                        min_dist = 1
                    elif events[i] == action: # reset and calculate distance + update witnesses
                        temp_dist = i - start_index
                        if action == test_action:
                            print("End of streak found")
                            print("td:" + str(temp_dist))
                            print("md:" + str(min_dist))
                        if (temp_dist == min_dist): # If equal to best streak, append
                            witnesses += wit_temp
                            if action == test_action:
                                print("Equal to best streak")
                                print(witnesses)
                        elif(temp_dist < min_dist or min_dist == -1): # If better than min_dist or first streak, overwrite                                
                            min_dist = temp_dist
                            witnesses = wit_temp
                            if action == test_action:
                                print("Better or first streak")
                                print(witnesses)
                                print(min_dist)
                        wit_temp = []
                        temp_dist = 0
                        start_index = i

                # Check for first occurence of action and start adding witnesses after until you encounter the action again
                if events[i] == action:
                    start_index = i

        if action == test_action:
            print(min_dist)

        # Update final values for action and reset variables if at least one streak has been found
        if (min_dist != -1):
            min_self_wit[action] = list(set(witnesses))
            min_self_dist[action] = min_dist
            witnesses = []
            min_dist = -1     

    return min_self_wit

def get_island_indices(a_test, b_test, islands):
    a_island_index = -1
    b_island_index = -1

    for x in range(0, len(islands)):
        if a_test in islands[x]:
            a_island_index = x
        if b_test in islands[x]:
            b_island_index = x

    return a_island_index, b_island_index

def get_island_index(action, islands):
    island_index = -1
    for x in range(0, len(islands)):
        if action in islands[x]:
            island_index = x
    return island_index


def check_island_for_type(island, dfgData, tp):
    for action in island:
        for node in dfgData["nodes"]:
            if node["id"] == action:
                if tp == "start" or "end":
                    if node["type"] == tp or "both":
                        return True
                else:
                    if node["type"] == tp:
                        return True
    return False

# Not the same as reconstructing DFG, simply removes nodes from the DFG
def dfg_clean_actions(actions, dfgData):
    remove_indices_nodes = []
    for action in actions:
        for i in range(0, len(dfgData["nodes"])):
            if(dfgData["nodes"][i]["id"] == action):
                remove_indices_nodes.append(i)
    
    remove_indices_links = []
    for action in actions:
        for i in range(0, len(dfgData["links"])):
            if(dfgData["links"][i]["source"] == action or dfgData["links"][i]["target"] == action):
                remove_indices_links.append(i)

    remove_indices_nodes = list(set(remove_indices_nodes))
    remove_indices_links = list(set(remove_indices_links))

    remove_indices_nodes.sort()
    remove_indices_links.sort()

    newDfgData = copy.deepcopy(dfgData)
    for i in range(0, len(remove_indices_nodes)):
        k = len(remove_indices_nodes) - i - 1
        newDfgData["nodes"].remove(newDfgData["nodes"][remove_indices_nodes[k]])

    for i in range(0, len(remove_indices_links)):
        k = len(remove_indices_links) - i - 1
        
        # Split for debugging
        rem_ind = remove_indices_links[k]
        el_to_rem = newDfgData["links"][rem_ind]
        newDfgData["links"].remove(el_to_rem)

        # newDfgData["links"].remove(newDfgData["links"][remove_indices_links[k]])

    return newDfgData

def generate_binary_cuts(operator, logs, dfgData):

    # if (len(logs) == 2):
    #     return [{
    #     "group1": logs[0],
    #     "group2": logs[1],
    #     "type": operator,
    #     "algorithm": "base"
    # }]

    cuts = []

    # print(operator, logs)

    if (operator == "sequence"):
        # first_logs = reduce_islands_to_two(copy.deepcopy(logs), False)
        # last_logs = reduce_islands_to_two(copy.deepcopy(logs), True)

        # first_logs = sort_islands_sequence(first_logs, dfgData)
        # last_logs = sort_islands_sequence(last_logs, dfgData)

        # cuts.append({
        #     "group1": first_logs[0],
        #     "group2": first_logs[1],
        #     "type": operator,
        #     "algorithm": "base"
        # })
        # cuts.append({
        #     "group1": last_logs[0],
        #     "group2": last_logs[1],
        #     "type": operator,
        #     "algorithm": "base"
        # })

        # return cuts

        logs = sort_logs_by_sequence(logs, dfgData)
        # print("Sorted logs:")
        # print(logs)

    for i in range(0, len(logs)-1):

        logs1 = logs[0:i+1]
        logs2 = logs[i+1:]

        group1 = []
        group2 = []

        for group in logs1:
            group1 += group

        for group in logs2:
            group2 += group
        
        cuts.append({
            "group1": group1,
            "group2": group2,
            "type": operator,
            "algorithm": "base"
        })

    # Add last configuration if type is not sequence:
    if (operator != "sequence" and len(logs) > 2):

        logs1 = [logs[0], logs[-1]]
        logs2 = logs[1:-1]

        group1 = []
        group2 = []

        for group in logs1:
            group1 += group

        for group in logs2:
            group2 += group

        cuts.append({
            "group1": group1,
            "group2": group2,
            "type": operator,
            "algorithm": "base"
        })   

    return cuts

def sort_logs_by_sequence(logs, dfgData):

    # print("Logs pre-sort")
    # print(logs)       

    if (len(logs) == 2):
        return sort_islands_sequence(logs, dfgData)

    remaining_logs = copy.deepcopy(logs)
    sorted_logs = []
    first_log = None

    for log in remaining_logs:
        # Check if none of these are ever a "target", thats the first in the sequence
        if(first_log == None):
            no_targets = True
            for action in log:
                for link in dfgData["links"]:
                    if link["target"] == action and no_targets:
                        if link["source"] not in log: # Exclude actions from own log
                            no_targets = False
        if (no_targets):
            first_log = log
            no_targets = False

    sorted_logs = [first_log]
    remaining_logs.remove(first_log)
    log_counter = 0

    while (len(remaining_logs) > 0):
        targets = []
        found = False

        # Collect outgoing states of arrows from last log
        for action in sorted_logs[log_counter]:
            for link in dfgData["links"]:
                if link["source"] == action:
                    if (link["target"] not in targets):
                        if (link["target"] not in sorted_logs[log_counter]): # Exclude actions from own log
                            targets.append(link["target"])

        next_log = None

        # Find which log does not have any incoming edges from remaining logs
        for log in remaining_logs:
            # Check if none of these are ever a "target"
            if(next_log == None):
                no_targets = True
                for action in log:
                    for link in dfgData["links"]:
                        if link["target"] == action and no_targets:
                            if link["source"] not in log: # Exclude actions from own log
                                if link["source"] not in [item for sub_list in sorted_logs for item in sub_list]: # Exclude links with sources from already sorted logs
                                    no_targets = False
            if (no_targets):
                next_log = log
                no_targets = False

        sorted_logs.append(next_log)
        remaining_logs.remove(next_log)

    return sorted_logs


def sort_islands_sequence(islands, dfgData):

    if (len(islands) > 1):
        # Check if a connection from group 0 to group 1 exists, if not then they must be swapped
        for action0 in islands[0]:
            for link in dfgData["links"]:
                if link["source"] == action0:
                    for action1 in islands[1]:
                        if (link["target"] == action1):
                            return islands
        return [islands[1], islands[0]]
    
    return islands


# Only create cuts with 2 groups
def reduce_islands_to_two(islands, reverse):
    if (not reverse):
        if(len(islands) > 2):
            for i in range(2, len(islands)):
                islands[1] += islands[i]
            islands = islands[:2]
    else:
        if(len(islands) > 2):
            for i in range(1, len(islands)-1):
                islands[0] += islands[i]
            
            islands = [islands[0], islands[-1]]

    return islands