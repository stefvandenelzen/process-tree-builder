import { useMemo, TouchEvent, MouseEvent, useState, useEffect } from "react";
import { Bar } from "@visx/shape";
import appleStock, { AppleStock } from "@visx/mock-data/lib/mocks/appleStock";
import { scaleBand, scaleLinear } from "@visx/scale";
import { localPoint } from "@visx/event";
import { TooltipWithBounds, useTooltip, defaultStyles } from "@visx/tooltip";
import { AxisBottom, AxisLeft } from "@visx/axis";
import useMeasure from "react-use-measure";
import styled from "styled-components";
import { timeFormat } from "d3-time-format";
import { Group } from "@visx/group";

const initialData = appleStock.slice(0, 10);

const getYValue = (d: AppleStock) => d.close;

const getXValue = (d: AppleStock) => d.date;

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Container = styled.div`
  position: relative;
  width: 600px;
  height: 400px;
  min-width: 300px;
`;

const tooltipStyles = {
    ...defaultStyles,
    borderRadius: 4,
    background: "black",
    color: "white",
    fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
};

const margin = 32;

const TutorialPage2b = () => {
    // State is not reset everytime code is ran here, especially not usestate
    const [ref, bounds] = useMeasure();
    const [data, setData] = useState<AppleStock[]>(initialData);
    const [value, setValue] = useState<string>('10');

    const width = bounds.width || 100;
    const height = bounds.height || 100;

    const innerWidth = width - margin;
    const innerHeight = height - margin;

    const {
        showTooltip,
        hideTooltip,
        tooltipData,
        tooltipLeft = 0,
        tooltipTop = 0,
    } = useTooltip<AppleStock>();

    const xScale = useMemo(
        () =>
            scaleBand<string>({
                range: [margin, innerWidth],
                domain: data.map(getXValue),
                padding: 0.2,
            }),
        [innerWidth, data]
    );

    const yScale = useMemo(
        () =>
            scaleLinear<number>({
                range: [innerHeight, margin],
                domain: [
                    Math.min(...data.map(getYValue)) - 1,
                    Math.max(...data.map(getYValue)) + 1,
                ],
            }),
        [innerHeight, data]
    );

    useEffect(() => {
        console.log(data.length);
    }, [data])

    const isNumber = (n: string | number): boolean =>
        !isNaN(parseFloat(String(n))) && isFinite(Number(n));

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (isNumber(value)) {
            console.log('is Number')
            const newData = appleStock.slice(0, +value);
            setData(newData);
        }
        console.log('handleSubmit');
    }

    function handleChange(e: React.FormEvent<HTMLInputElement>) {
        setValue(e.currentTarget.value);
        console.log('handleChange');
    }

    return (
        <Wrapper>
            <Container ref={ref}>
                <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
                    <Group>
                        {data.map((d) => {
                            const xValue = getXValue(d);
                            const barWidth = xScale.bandwidth();
                            const barHeight = innerHeight - (yScale(getYValue(d)) ?? 0);
                            const barX = xScale(xValue);
                            const barY = innerHeight - barHeight;

                            return (
                                <Bar
                                    key={`bar-${xValue}`}
                                    x={barX}
                                    y={barY}
                                    width={barWidth}
                                    height={barHeight}
                                    fill="orange"
                                    onMouseMove={(
                                        event:
                                            | TouchEvent<SVGRectElement>
                                            | MouseEvent<SVGRectElement>
                                    ) => {
                                        const point = localPoint(event);

                                        if (!point) return;

                                        showTooltip({
                                            tooltipData: d,
                                            tooltipTop: point.y,
                                            tooltipLeft: point.x,
                                        });
                                    }}
                                    onMouseLeave={() => hideTooltip()}
                                />
                            );
                        })}
                    </Group>

                    <Group>
                        <AxisBottom
                            top={innerHeight}
                            scale={xScale}
                            tickFormat={(date) => timeFormat("%m/%d")(new Date(date))}
                        />
                    </Group>

                    <Group>
                        <AxisLeft left={margin} scale={yScale} />
                    </Group>
                </svg>

                {tooltipData ? (
                    <TooltipWithBounds
                        key={Math.random()}
                        top={tooltipTop}
                        left={tooltipLeft}
                        style={tooltipStyles}
                    >
                        <b>{`${timeFormat("%b %d, %Y")(
                            new Date(getXValue(tooltipData))
                        )}`}</b>
                        : ${getYValue(tooltipData)}
                    </TooltipWithBounds>
                ) : null}
            </Container>
            <form onSubmit={handleSubmit}>
                <label>
                    Amount of data:
                    <input type="text" value={value} onChange={handleChange} />
                </label>
                <input type="submit" value="Submit" />
            </form>
        </Wrapper >
    );
};

export default TutorialPage2b;