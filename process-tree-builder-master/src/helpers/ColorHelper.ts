import { scaleOrdinal } from "d3-scale";
import { Color, TraceFrequency } from "../interfaces/TraceData";
import { getUniqueActionsFromArray } from "./TraceHelper";
import { schemePaired } from "d3-scale-chromatic";
import { Cut } from "../interfaces/CutData";
import { DFGNode, DFGLink } from "../interfaces/DFGData";

export function getNodeCutColor(d: DFGNode, cut: Cut): string {
  if (cut.group1.includes(d.id)) {
    return "#f01919"
  } else if (cut.group2.includes(d.id)) {
    return  "#0099ff"
  }
  return "#000000"
}

export function getLinkCutColor(d: DFGLink, cut: Cut): string {

  if (cut.group1.includes((d.source as DFGNode).id) !== cut.group1.includes((d.target as DFGNode).id)) {
      return "#f2ccff";
  } else return (cut.group1.includes((d.source as DFGNode).id)) ? "#f01919" : "#0099ff";
}

export function getColorScheme(traces: TraceFrequency[]): Color[] {
    let color_scheme: Color[] = [];
    const actions: string[] = getUniqueActionsFromArray(traces);
    for (let action of actions) {
      color_scheme.push({color:color(action), action: action});
    }
    return color_scheme;
}

/* Source: https://stackoverflow.com/questions/1484506/random-color-generator */
function getRandomColor() {
    var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

export function getColorFromScheme(action: string, colorScheme: Color[]) {
  const colorSchemeEntry: Color | undefined = colorScheme?.filter((c) => c.action === action)[0];
  if (colorSchemeEntry) {
      return colorSchemeEntry.color;
  }
  return "#000000";
}

const color = scaleOrdinal(schemePaired)