import copy
import baseHandler as bh

def im_filter(dfg_backend):
    dfgData, traces, actions, threshold = dfg_backend['dfgData'], dfg_backend['traces'], dfg_backend['unique_actions'], dfg_backend["threshold"]

    # Filtering is supposed to include starts and end of traces too, left out for now
    # As in, if traces start/end infrequently enough with a certain activity that relalion should also be removed, in other words remove a start/end roperty

    # Note on filtering traces:
    # Not filtering the traces object may cause issues in the concurreny cut finding as it uses min_self_dist which is made from the trace object
    # Potentially have to rewrite min_self_dist to obtain from DFG instead

    print("Starting filter algorithm with threshold [" + str(threshold) + "]")

    # Filter data
    filteredDfgData = filter_data(traces, copy.deepcopy(dfgData), actions, threshold)
    # Traces object not altered

    cuts = bh.find_cut(traces, filteredDfgData, actions)

    if (len(cuts) == 0):
        print("No cut found")
        return []
        # return {
        #     "group1": [],
        #     "group2": [],
        #     "type": "none",
        #     "algorithm": "filter",
        #     "filteredDfgData": filteredDfgData,
        #     "filterThreshold": threshold,
        #     "selectable": False
        # }
        # return { "type": "sequence", "algorithm": "filter", "group1": [], "group2": []}
        # return fallthrough(traces)
    
    print("Filter cut(s) found of type " + cuts[0]["type"])

    return_cuts = []

    for cut in cuts:
        return_cuts.append({
            "group1": cut["group1"],
            "group2": cut["group2"],
            "type": cut["type"],
            "algorithm": "filter",
            "filteredDfgData": filteredDfgData,
            "filterThreshold": threshold
        })

    return return_cuts

def filter_data(traces, dfgData, actions, threshold):

    # START / END STATE HANDLING
    start_actions = []
    end_actions = []
    start_state_freq = {}
    end_state_freq = {}

    # Get start states and initialize frequency object
    for node in dfgData["nodes"]:
        if node["type"] == "start" or node["type"] == "both":
            start_actions.append(node["id"])
            start_state_freq[node["id"]] = 0
        if node["type"] == "end" or node["type"] == "both":
            end_actions.append(node["id"])
            end_state_freq[node["id"]] = 0

    # Get start/end frequencies
    for trace in traces:
        if (len(trace["events"]) != 0):
            for action in start_actions:
                if trace["events"][0] == action:
                    start_state_freq[action] += trace["frequency"]
            for action in end_actions:
                if trace["events"][-1] == action:
                    end_state_freq[action] += trace["frequency"]

    max_start_freq = 0

    # Get max start_state_freq
    for action in start_actions:
        max_start_freq = max(max_start_freq, start_state_freq[action])

    test_threshold = 0.99
    test = False

    # Filter start property
    for action in start_actions:
        if start_state_freq[action] < max_start_freq * threshold:
            # Find node
            for node in dfgData["nodes"]:
                if (node["id"] == action):
                    if node["type"] == "start":
                        node["type"] = "none"
                    elif node["type"] == "both":
                        node["type"] = "end"

    if(test):
        for node in dfgData["nodes"]:
            print(node)
        print(start_state_freq)

    old_len = len(dfgData["links"])

    test_node = ""

    links_to_remove = []

    max_freq = {}
    for action in actions:
        max_freq[action] = 0

    # Get max edge frequencies for each node
    for action in actions:
        for link in dfgData["links"]:
            if link["source"] == action:
                    max_freq[action] = max(link["frequency"], max_freq[action])

    # Update max frequencies with to_end_state frequences
    for action in end_actions:
        max_freq[action] = max(max_freq[action], end_state_freq[action])

    # Filter end state loop
    for action in end_actions:
        if end_state_freq[action] <  max_freq[action] * threshold:
            # Find node
            for node in dfgData["nodes"]:
                if (node["id"] == action):
                    if node["type"] == "end":
                        node["type"] = "none"
                    elif node["type"] == "both":
                        node["type"] = "start"

    test = False

    if(test):
        for node in dfgData["nodes"]:
            print(node)
            print(max_freq[node["id"]])
            if (node["type"] == "end" or node["type"] == "both"):
                for link in dfgData["links"]:
                    if (link["source"] == node["id"]):
                        print(link)
        print(end_state_freq)


    # Filter dfg relations
    for link in dfgData["links"]:
        if (link["source"] == test_node):
            print("-----")
            print("Considering " + "'" + str(link["source"]) + "' to '" + str(link["target"]) + "'")
            print("Frequency: " + str(link["frequency"]))
            print("Max frequency: " + str(max_freq[link["source"]]))
            print("Threshold calculated: " + str(max_freq[link["source"]] * threshold))
            print("Verdict: " + str(link["frequency"] < max_freq[link["source"]] * threshold))
        if link["frequency"] < max_freq[link["source"]] * threshold:
            links_to_remove.append(link)
            if (link["source"] == test_node):
                print("Removing '" + str(link["source"]) + "' to '" + str(link["target"]) + "'")   
                print("Freq: " + str(link["frequency"]) + " " + "Max freq: " + str(max_freq[link["source"]]) + "(" + str(round(link["frequency"]/max_freq[link["source"]]*100, 2)) + "%)")      
    
    for link in links_to_remove:
        dfgData["links"].remove(link)
        
    
    # print("-----")
    # print("Removed " + str(old_len - len(dfgData["links"])) + " edges during filtering")

    return dfgData