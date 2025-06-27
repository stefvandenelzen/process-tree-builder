# General information

This prototype was developed as part of the graduation project of [Wouter van der Heijden](https://github.com/Wvdh99) for a degree in Computer Science and Engineering from the Eindhoven University of Technology. The MSc project was supervised by [Stef van den Elzen](https://selzen.win.tue.nl/). The results of the MSc project, can be found in the public [Master's Thesis](https://research.tue.nl/en/studentTheses/interactive-process-discovery-using-visualization). Below are instructions to run both the front-end and back-end and how to use your own datasets with the developed prototype.

![Interactive Discovery and Visualization of Process Trees Prototype](https://github.com/stefvandenelzen/process-tree-builder/blob/main/prototype.jpg?raw=true)

## Front-end instructions

* The project is developed using npm with yarn as package manager. Yarn can be installed globally using: npm install --global yarn

* Clone the 'process-tree-builder-backend' project to a folder of choice.

* Use yarn to install all packages with 'yarn init', followed by 'yarn'.

* Add the following line to the 'package.json': "proxy": "http://127.0.0.1:5000",

* The project can be started with the command: npm start

* The front-end can now be accessed by browsing to: http://localhost:3000

### Resolving possible issues

* If you encounter issues with the split-pane package, these can be resolved by adding the line 'children?:React.ReactNode;' to the file 'process-tree-builder/node-modules/react-split-pane/index.d.ts' in the SplitPaneProps type on line 7.

* If you encounter errors on proxy settings in package.json, these can be resolved by changing allowedHosts:disableFirewall ? 'all':[allowedHost], by allowedHosts:'all', in the file 'node_modules/react_scripts/config/webpackDevServer.config.js' (line 46).

## Back-end instructions

* Clone the 'process-tree-builder-backend' project to a folder of choice.

* [Optional] initialize a python virtual environment (development was performed using Python 3.9).

* Install the needed dependencies using the requirements.txt file by running: python -m pip install -r requirements.txt

* Run the Flask back-end using the command: python server.py

## Data preparation

Only the cached data files (JSON) are included in this github. If you want to prepare these datafiles yourself you need to convert the .xes files to JSON as follows:

* place your example.xes file in the 'data' folder of the back-end project.

* Update 'server.py' line 22 (the /data route) with your xes file: return dh.load_xes("data/example.xes")

* start the back-end (python server.py) and open http://127.0.0.1:5000/data in a webbrowser. This will convert the xes file to an example.json file, positioned in the same folder.

* Copy the resulting example.json file to both the 'data/freqdata' and 'data/json' folders.

* To access the files in the front-end, adapt the TracesPage function in the 'TracesPage.tsx' file to include the newly generated json file: const PATH: string[] = [
        "./data/example.xes",

* Now the dataset is available in the front-end by clicking the 'Select Dataset' button.
