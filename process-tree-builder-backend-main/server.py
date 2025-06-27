import copy
from flask import Flask, request, jsonify, Response
import dataHandler as dh
import cutHandler as ch
import baseHandler as bh
import filterHandler as fh
import json
import os

app = Flask(__name__)

# Route for testing getting data
@app.route("/data", methods = ['GET', 'POST'])
def data():
    if request.method == 'POST':
        print('Data POST Request')
        json = request.get_json()
        print(json)
        print(json['path'])
        response = dh.load_xes(json['path']), 201
        return response
    return dh.load_xes("data/Top_10_Variants_Road_Traffic.xes")

# Route for saving processed data
@app.route("/freqdata", methods = ['POST'])
def freqdata():    
    if request.method == 'POST':
        print('Freq Data POST Request')
        json = request.get_json()
        # print(json)
        if (json['store']):
            dh.write_dict_to_json(json['path'], json['freqdata'])
            return jsonify(message="Done"), 201
        else:
            if (os.path.isfile(json['path'])):
                return dh.load_json(json['path'])
            else:
                print("404 - File not found")
                return jsonify(message="File not found"), 404
    return jsonify(message="Invalid path"), 400

# Route for getting TODO data
@app.route("/todo", methods = ['GET', 'POST'])
def todo():
    if request.method == 'GET':
        todos = dh.load_json('./data/todo.json')
        return todos
    
    if request.method == 'POST':
        print('Todo POST Request')
        json = request.get_json()
        dh.write_dict_to_json('./data/todo.json', json)
        return jsonify(message="Done"), 201

# Route for getting test cut
@app.route("/testcuts", methods = ['GET'])
def testcut():
    return ch.get_mock_cuts()

# Route for getting randomly generated cuts
@app.route("/randomcuts", methods = ['POST'])
def randomcuts():
    if request.method == 'POST':
        print('Random Cuts POST Request')
        json = request.get_json()
        response = ch.get_random_cuts(json), 201
        return response
    
# Route for getting base algorithm generated cuts
@app.route("/im-base", methods = ['POST'])
def im_base():
    if request.method == 'POST':
        print('Base cut POST Request')
        base_cut = bh.im_base(copy.deepcopy(request.get_json()), "base")
        response = base_cut, 201
        return response
    
# Route for getting base algorithm generated cuts
@app.route("/im-filter", methods = ['POST'])
def im_filter():
    if request.method == 'POST':
        print('Filter cut POST Request')
        filter_cut = fh.im_filter(copy.deepcopy(request.get_json()))
        response = filter_cut, 201
        return response
    

def test(path):
   dh.load_json(path)
   return

if __name__ == "__main__":
    app.run(debug=True)
    # dh.write_dict_to_json('./data/Exam Eventlog.json', dh.load_xes("./data/Exam Eventlog.xes")) 
    #test("data/freqdata/Traffic_Fine_Management_Process.json")
    #test("data/freqdata/Exam Eventlog.json")