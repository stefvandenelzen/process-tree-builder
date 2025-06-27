from pm4py.read import read_xes
import json
import os.path
import pandas as pd

# Load (and format) XES file
def load_xes(file_path, format = True):
    json_path = "data/json" + file_path[6:-3] + "json"

    if (os.path.isfile(json_path)):
        print('Reading XES file')
        xes = load_json(json_path)
    else:
        xes = read_xes(file_path=file_path) # Pandas dataframe
        if format:
            print('Formatting XES file')
            format_and_write_xes(xes, json_path)
            # write_dict_to_json(json_path, formatted_xes)
            return load_json(json_path)
    
    return xes


# Dictionary file format returned by format_xes
# traces = [
# 	{
#        "id" : "5",
#        "events": [{
#             "resource": "\"SYSTEM\"",
#             "action": "Receive application",
#             "lifecycle": "complete",
#             "time": 1654506000000,
#             "id": "1325252",
#             "b": None,
#             "al": None
# 	      },
#         {
#             "resource": "\"SYSTEM\"",
#             "action": "Receive application",
#             "lifecycle": "complete",
#             "time": 1654506000000,
#             "id": "1325252",
#             "b": None,
#             "al": None
# 	      }]
#    }
# ]

# Formats xes Dataframe to Typescript compatible dictionary (JSON)
def format_and_write_xes(xes, json_path):

    with open(json_path, 'w') as out:

        # xes = xes.head(500000)

        print("renaming")
        # Rename columns to Typescript appropriate formats
        xes.rename(columns={"org:resource": "resource", "concept:name":"action", "lifecycle:transition":"lifecycle", "time:timestamp":"time", "case:concept:name":"id"}, inplace=True)


        print("dropping")
        if ('lifecycle' in xes.columns):
            xes = xes[['action', 'lifecycle', 'id']] # No longer need "resource" or "time"
        else:
            xes = xes[['action', 'id']]

        print("grouping by id")
        # Group dataframes by id
        trace_groups = xes.groupby('id')

        print("creating dataframes")
        # Store dataframes in new object
        # dataframes = [trace_groups.get_group(x) for x in trace_groups.groups]

        # Initialize complete string
        df_complete_string = ''

        print(len(trace_groups.groups.keys()))

        out.write("[")

        # for i in range(len(dataframes)):
        for i, k in enumerate(trace_groups.groups):
            if (i%1000 == 0):
                print(i/1000)
                out.write(df_complete_string)
                df_complete_string = ""

            df = trace_groups.get_group(k) # Obtain dataframe from array of grouped dataframes
            # df = dataframes[i]
            
            # Save ID of group
            traceID = df.iloc[0]['id']

            # Remove ID column from group
            df = df.drop('id', axis=1)

            # Get JSON string from dataframe
            df_json_string = df.to_json(orient = "records") # <class 'str'>
            
            # Add JSON string to complete string with dataframe-string inside events property, and extra id property 
            df_complete_string = df_complete_string + '{"id":' + '"' +traceID + '"' + ',"events":' + df_json_string + '}'

            # Append comma, unless last entry
            # if i != len(dataframes) - 1:
            if i != len(trace_groups.groups) - 1:
                df_complete_string = df_complete_string + ','
            
        
        print("loop done")
        # # Append square brackets to complete string
        # df_complete_string = '[' + df_complete_string + ']'
        out.write(df_complete_string)
        out.write("]")

        print("creating dictionary")
        # Create dictionary object from complete string
        # df_json = json.loads(df_complete_string) # <class 'dict'>

def write_dict_to_json(path, dictObject):
    # Write JSON to file
    with open(path, 'w') as fp:
        print(f"Writing JSON file to {path}")
        json.dump(dictObject, fp)

def load_json(path):
    fs = open(path)
    jsonObject = json.load(fs)
    fs.close()

    return jsonObject