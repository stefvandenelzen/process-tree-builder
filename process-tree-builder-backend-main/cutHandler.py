import random
from flask import jsonify

# Dictionary file format returned by format_xes
mock_cuts = [
    {
        "group1": [
            "Open file",
            "Add meter details",
            "Add customer details",
            "Close file",
            "Cancel previous contract"
        ],
        "group2": [
            "Receive application",
            "pre-check",
            "Reject contract",
            "Approve contract",
            "Start cancellation"
        ],
        "type": "sequence",
        "algorithm": "test"
    },
    {
        "group1": [
            "Open file"
        ],
        "group2": [
            "Receive application",
            "pre-check",
            "Reject contract",
            "Approve contract",
            "Start cancellation",
            "Add meter details",
            "Add customer details",
            "Close file",
            "Cancel previous contract"
        ],
        "type": "sequence",
        "algorithm": "test"
    },
    {
        "group1": [
            "Receive application",
            "pre-check",
            "Reject contract",
            "Approve contract",
            "Open file",
            "Add meter details",
            "Add customer details",
            "Close file",
            "Cancel previous contract"
        ],
        "group2": [
            "Start cancellation"
        ],
        "type": "sequence",
        "algorithm": "test"
    }
]

# Get cut mock data
def get_mock_cuts():
    return mock_cuts

def get_random_cuts(dfg_backend):
    dfgData, traces, actions = dfg_backend['dfgData'], dfg_backend['unique_actions']

    group1 = []
    group2 = []

    cuts = []

    cutTypes = ["sequence","xor","concurrency","loop"]

    if (len(actions) == 1): 
        return [];
    
    if (len(actions) == 2):
        return [{
            "group1": [actions[0]],
            "group2": [actions[1]],
            "type": cutTypes[random.randint(0, len(cutTypes)-1)],
            "algorithm": "random"
        }]
    
    for i in range(0, len(cutTypes)):
        for j in range(0, len(actions)):
            if (j == 0):
                group1.append(actions[j])
            elif (j == len(actions)-1):
                group2.append(actions[j])
            elif (random.randint(0,1) == 0):
                group1.append(actions[j])
            else:
                group2.append(actions[j])

        cuts.append({
            "group1": group1,
            "group2": group2,
            "type": cutTypes[i],
            "algorithm": "random"
        })

        group1 = []
        group2 = []

    return cuts

