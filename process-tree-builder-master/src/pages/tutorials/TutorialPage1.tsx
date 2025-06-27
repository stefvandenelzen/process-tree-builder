/* eslint-disable react-hooks/exhaustive-deps */
import { max } from 'd3-array';
import { Axis, axisBottom, axisLeft } from 'd3-axis';
import { NumberValue, ScaleBand, scaleBand, ScaleLinear, scaleLinear } from 'd3-scale';
import { BaseType, select, selectAll, Selection } from 'd3-selection';
import { generate } from 'randomstring';
import { useEffect, useRef, useState } from 'react';
import 'd3-transition';
import { easeElastic } from 'd3-ease';

/* Tutorial link: https://www.youtube.com/watch?v=rQ19SlL9HKA&list=PLzCAqE_rafAc_2QWK8ii16m2ju4qhYAJT&index=4 */
/* React, D3, Typescript Tutorial - zfc9d3f */

/* Part 2 - data*/
// const data = [
//     {
//         units: 150,
//         color: 'purple'
//     },
//     {
//         units: 100,
//         color: 'red'
//     },
//     {
//         units: 50,
//         color: 'blue'
//     },
//     {
//         units: 70,
//         color: 'teal'
//     },
//     {
//         units: 120,
//         color: 'orange'
//     }
// ]

/* Part 3 - Scales */
const initialData = [
    {
        name: 'foo1',
        number: 32
    },
    {
        name: 'foo2',
        number: 67
    },
    {
        name: 'foo3',
        number: 81
    },
    {
        name: 'foo4',
        number: 38
    },
    {
        name: 'foo5',
        number: 28
    },
    {
        name: 'foo6',
        number: 59
    }
]

/* Part 4 - Groups and margins */
const dimensions = {
    width: 900,
    height: 600,
    marginLeft: 100,
    marginTop: 50
}

function TutorialPage1() {

    // const svgRef = useRef<SVGSVGElement | null>(null); // Part 1

    /* Part 1, drawing rectangles) */
    // useEffect(() => {
    //     // Select creates a Selection object
    //     // SVG default dimensions are 300x150
    //     select(svgRef.current)
    //         .append('rect')
    //         .attr('width', '100')
    //         .attr('height', '100')
    //         .attr('fill', 'blue')
    //     // 3 rects present
    //     selectAll('rect')
    //         .attr('width', '100')
    //         .attr('height', '100')
    //         .attr('fill', 'blue')
    //         .attr('x', (_, i) => i * 100) // Way to use indices

    // }, [])

    /* Part 2 - Data binding*/
    // const svgRef = useRef(null);
    // const [selection, setSelection] = useState<null | Selection<null, unknown, null, undefined>>(null);


    // useEffect(() => {
    //     if (!selection) {
    //         setSelection(select(svgRef.current))
    //     }

    //     else {
    //         const rects = selection
    //             .selectAll('rect')
    //             .data(data)
    //             .attr('width', d => 100)
    //             .attr('height', d => d.units)
    //             .attr('fill', d => d.color)
    //             .attr('x', (_, i) => i * 100)

    //         // Once you bind to data, the selection will contain EnterNode elements for non-existing elements
    //         rects
    //             .enter()
    //             .append('rect')
    //             .attr('width', d => 100)
    //             .attr('height', d => d.units)
    //             .attr('fill', d => d.color)
    //             .attr('x', (_, i) => i * 100)
    //     }
    // }, [selection])


    /* Part 3 - Scales */
    // const svgRef = useRef(null);

    // const [selection, setSelection] = useState<null | Selection<null, unknown, null, undefined>>(null);

    // const maxValue = max(data, d => d.number)

    // // Domain is input range, range is output range
    // const y = scaleLinear()
    //     .domain([0, maxValue!])
    //     .range([0, 500]);

    // // Divide the range into uniform bands and map it into domain
    // // - domain accepts array of unique identifier-strings
    // const x = scaleBand()
    //     .domain(data.map(d => d.name))
    //     .range([0, 800])
    //     .paddingInner(0.05)

    // useEffect(() => {
    //     if (!selection) {
    //         setSelection(select(svgRef.current))
    //     } else {
    //         const rect = selection
    //             .selectAll('rect') //Necessary to select a group of non-existent children, cant leave empty, cant remove
    //             .data(data)
    //             .enter()
    //             .append('rect')
    //             .attr('width', x.bandwidth)
    //             // Attr does not accept undefined, so if undefined is returned by the ScaleBand, return null instead
    //             // Alternatively: .attr('x', d => (x(d.name)!)), which tells Typescript to ignore the potential undefined
    //             .attr('x', d => {
    //                 const xValue = x(d.name)
    //                 if (xValue) {
    //                     return xValue
    //                 }
    //                 return null;
    //             })
    //             .attr('fill', 'orange')
    //             .attr('height', d => y(d.number))

    //         console.log(rect)
    //     }
    // }, [selection])

    /* Part 3 - Scales */
    // const svgRef = useRef(null);

    // const [selection, setSelection] = useState<null | Selection<null, unknown, null, undefined>>(null);

    // const maxValue = max(data, d => d.number)

    // const number: NumberValue = 5;

    // // Domain is input range, range is output range
    // const y = scaleLinear()
    //     .domain([0, maxValue!])
    //     .range([0, dimensions.height]);

    // // Divide the range into uniform bands and map it into domain
    // // - domain accepts array of unique identifier-strings
    // const x = scaleBand()
    //     .domain(data.map(d => d.name))
    //     .range([0, dimensions.width])
    //     .paddingInner(0.05)

    // const yAxis = axisLeft(y).ticks(3).tickFormat(t => {
    //     return `${((t as number) / 1000).toFixed(1)}k`
    // }) //Accepts Scales as input
    // const xAxis = axisBottom(x) // Accepts Scales as input

    // useEffect(() => {
    //     if (!selection) {
    //         setSelection(select(svgRef.current))
    //     } else {
    //         const xAxisGroup = selection
    //             .append('g')
    //             .attr('transform', `translate(${dimensions.marginLeft}, ${dimensions.height + dimensions.marginTop})`)
    //             .call(xAxis) // Render function

    //         const yAxisGroup = selection
    //             .append('g')
    //             .attr('transform', `translate(${dimensions.marginLeft}, ${dimensions.marginTop})`)
    //             .call(yAxis) // Render function

    //         selection
    //             .append('g')
    //             .attr('transform', `translate(${dimensions.marginLeft}, ${dimensions.marginTop})`)
    //             .selectAll('rect') //Necessary to select a group of non-existent children, cant leave empty, cant remove
    //             .data(data)
    //             .enter()
    //             .append('rect')
    //             .attr('width', x.bandwidth)
    //             // Attr does not accept undefined (/void?), so if undefined is returned by the ScaleBand, return null instead
    //             // Alternatively: .attr('x', d => {x(d.name)!}), which tells Typescript to ignore the potential undefined
    //             .attr('x', d => {
    //                 const xValue = x(d.name)
    //                 if (xValue) {
    //                     return xValue
    //                 }
    //                 return null;
    //             })
    //             .attr('fill', 'orange')
    //             .attr('height', d => y(d.number))

    //     }
    // }, [selection])

    const svgRef = useRef<SVGSVGElement | null>(null);
    const [selection, setSelection] = useState<null | Selection<SVGSVGElement | null, unknown, null, undefined>>(null)
    const [data, setData] = useState(initialData);

    const maxValue = max(data, d => d.number);

    /* Create X Axis and Y axis objects */
    function createXAxis(): ScaleBand<string> {
        return scaleBand()
            .domain(data.map(d => d.name))
            .range([0, dimensions.width])
            .paddingInner(0.05)
    }
    function createYAxis(): ScaleLinear<number, number, never> {
        return scaleLinear()
            .domain([0, maxValue!])
            .range([dimensions.height, 0])
    }
    let x = createXAxis();
    let y = createYAxis();

    let yAxis: Axis<NumberValue> = axisLeft(y) //Accepts Scales as input
    let xAxis: Axis<string> = axisBottom(x) // Accepts Scales as input

    /* Refactored code to be re-used multiple times */
    // Doesn't play well with transitions 
    // Somehow, passthrough selections act funny when transition is called on them, they reset all attributes

    function rectAttributes(selection: Selection<any, { name: string; number: number; }, SVGGElement, unknown>) {
        selection
            .attr('width', x.bandwidth)
            .attr('x', d => x(d.name)!)
            .attr('fill', 'orange')
            .attr('height', d => dimensions.height - y(d.number))
            .attr('y', d => y(d.number))
    }

    useEffect(() => {
        if (!selection) {
            setSelection(select(svgRef.current))
        } else {
            selection
                .append('g')
                .attr('id', 'xaxis')
                .attr('transform', `translate(${dimensions.marginLeft}, ${dimensions.height + dimensions.marginTop})`)
                .call(xAxis) // Render function

            selection
                .append('g')
                .attr('id', 'yaxis')
                .attr('transform', `translate(${dimensions.marginLeft}, ${dimensions.marginTop})`)
                .call(yAxis) // Render function

            selection
                .append('g')
                .attr('id', 'rectangles')
                .attr('transform', `translate(${dimensions.marginLeft}, ${dimensions.marginTop})`)
                .selectAll('rect')
                .data(data)
                .enter()
                .append('rect')
                .attr('width', x.bandwidth)
                .attr('x', d => x(d.name)!)
                .attr('fill', 'orange')
                .attr('y', dimensions.height)
                .attr('height', 0)
                .transition() // Somehow assumes all values are 0 before, but do explicitly set ones to 0 
                .duration(1000)
                .ease(easeElastic)
                .delay((_, i) => i * 100)
                .attr('height', d => dimensions.height - y(d.number))
                .attr('y', d => y(d.number))
        }
    }, [selection])

    useEffect(() => {
        if (selection) {
            // Remake axis objects
            yAxis = axisLeft(createYAxis()) //Accepts Scales as input
            xAxis = axisBottom(createXAxis()) // Accepts Scales as input

            // Update axis
            selection
                .select<SVGSVGElement>('#xaxis') // Watch out with some functions, apparently you have to specify SVGSVGElement instead of BaseType for select!
                .call(xAxis)
            selection
                .select<SVGSVGElement>('#yaxis') // Watch out with some functions, apparently you have to specify SVGSVGElement instead of BaseType for select!
                .call(yAxis)

            // Select rectangles and join data
            const rects = selection.select<SVGGElement>('#rectangles').selectAll('rect').data(data) //SelectAll does not support type selection!

            // Remove existing elements
            rects
                .exit()
                .remove()

            // Update existing elements
            rects
                .transition()
                .duration(500)
                .attr('width', x.bandwidth)
                .attr('x', d => x(d.name)!)
                .attr('fill', 'orange')
                .attr('height', d => dimensions.height - y(d.number))
                .attr('y', d => y(d.number))

            // Create new elements
            rects.enter()
                .append('rect')
                .attr('width', x.bandwidth)
                .attr('x', d => x(d.name)!)
                .attr('fill', 'orange')
                .attr('y', dimensions.height)
                .attr('height', 0)
                .transition()
                .duration(1000)
                .ease(easeElastic)
                .delay(500)
                .attr('height', d => dimensions.height - y(d.number))
                .attr('y', d => y(d.number))
        }
    }, [data])

    const addRandom = () => {
        const dataToBeAdded = {
            name: generate(10),
            number: Math.floor(Math.random() * 80 + 20)
        }

        setData([...data, dataToBeAdded]);
    }

    const removeLast = () => {
        if (data.length === 0) {
            return;
        }

        setData(data.slice(0, data.length - 1))
    }

    /* Part 3 */
    return (
        <div>
            <svg ref={svgRef} width={dimensions.width + dimensions.marginLeft} height={dimensions.height + dimensions.marginTop + 50}>
            </svg>
            <button onClick={addRandom}>Add Random</button>
            <button onClick={removeLast}>Remove Last</button>
        </div>
    );
}

export default TutorialPage1;