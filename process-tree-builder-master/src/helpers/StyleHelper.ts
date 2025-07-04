/* Source: https://stackoverflow.com/questions/6367010/average-2-hex-colors-together-in-javascript */

export function blendColors(colorA: string, colorB: string, amount: number) {
    const [rA, gA, bA] = colorA.match(/\w\w/g)!.map((c) => parseInt(c, 16));
    const [rB, gB, bB] = colorB.match(/\w\w/g)!.map((c) => parseInt(c, 16));
    const r = Math.round(rA + (rB - rA) * amount).toString(16).padStart(2, '0');
    const g = Math.round(gA + (gB - gA) * amount).toString(16).padStart(2, '0');
    const b = Math.round(bA + (bB - bA) * amount).toString(16).padStart(2, '0');
    return '#' + r + g + b;
}