import { max, range } from "d3-array";
import { axisBottom, axisLeft } from "d3-axis";
import { scaleBand, scaleLinear } from "d3-scale";
import { select, Selection } from "d3-selection";
import { useEffect, useRef, useState } from "react";


// const rawData = [
//     {
//         name: "Bitcoin",
//         price: 10,
//         base: "USD",
//         date: "1560507303",
//         creator: "Satoshi Nakamoto"
//     },
//     {
//         name: "Bitcoin",
//         price: 12,
//         base: "USD",
//         date: "1592129703",
//         creator: "Satoshi Nakamoto"
//     }
// ]

/* P2 - Data manipulation*/
// const getPrice = (value: number) => value * 100;
// const getDate = (date: number) => new Date(date * 100);
//
// const data = rawData.map((d) => ({
//     price: getPrice(d.price),
//     date: getDate(+d.date), // + operator can convert string to number
// }))
//
// Instead of:
// const data = rawData.map((d) => ({
//     price: d.price * 100,
//     date: new Date(+d.date * 100),
// }))

const data = [
    { name: "A", value: 100 },
    { name: "B", value: 200 },
    { name: "C", value: 500 },
    { name: "D", value: 150 },
    { name: "E", value: 300 },
];

const yMax = max(data, (d) => d.value)!;

const margin = {
    top: 30,
    right: 0,
    bottom: 30,
    left: 40
}

const height = 250;

const width = 300;




function TutorialPage2a() {

    const [selection, setSelection] = useState<null | Selection<HTMLDivElement | null, unknown, null, undefined>>(null);
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!selection) {
            setSelection(select(ref.current))
        } else {
            const y =
                scaleLinear()
                    .domain([0, max(data, (d) => d.value)!])
                    .nice()
                    .range([height - margin.bottom, margin.top]);

            const x =
                scaleBand()
                    .domain(data.map((d) => d.name))
                    .range([margin.left, width - margin.right])
                    .padding(0.1);

            const svg =
                selection
                    .append("svg")
                    .attr("width", width)
                    .attr("height", height);

            const yAxis = (g: Selection<SVGGElement, unknown, null, undefined>) =>
                g
                    .attr("transform", `translate(${margin.left},0)`)
                    .call(axisLeft(y)
                        // .ticks(null, data.format)
                    )
                    .call((g) => g.select(".domain").remove())
                    .call((g) =>
                        g
                            .append("text")
                            .attr("x", -margin.left)
                            .attr("y", 10)
                            .attr("fill", "currentColor")
                            .attr("text-anchor", "start")
                        // .text(data.y)
                    );

            const xAxis = (g: Selection<SVGGElement, unknown, null, undefined>) =>
                g.attr("transform", `translate(0,${height - margin.bottom})`).call(
                    axisBottom(x)
                        // .tickFormat((i) => data[i].name)
                        .tickSizeOuter(0)
                );

            svg.append("g").call(xAxis);

            svg.append("g").call(yAxis);

            svg
                .append("g")
                .selectAll("rect")
                .data(data)
                .join(
                    (enter) => enter.append("rect"),
                    (update) => update,
                    (exit) => exit.remove()
                )
                .attr('x', d => (x(d.name)!))
                .attr("y", (d) => y(d.value))
                .attr("height", (d) => y(0) - y(d.value))
                .attr("width", x.bandwidth());
        }
    }, [selection])

    return (
        <div ref={ref} />
    );
}

export default TutorialPage2a;