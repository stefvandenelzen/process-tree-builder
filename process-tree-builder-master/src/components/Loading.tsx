import { useEffect, useState } from "react";
import styled from "styled-components";

const LoadingDiv = styled.div`
margin-top: 15px;
margin-bottom: 15px;
margin-left: 15px;
background-color: rgb(53, 78, 100);
color:white;
text-decoration:none;
padding: 8px;
border-radius: 5px;
width:70px;
align-items:center;`

export const Loading = () => {

    const [text, setText] = useState("Loading");
    const [counter, setCounter] = useState(0);

    useEffect(() => {
        timer(250).then(
            _ => {
                if (counter % 3 === 0) {
                    setText("Loading.")
                } else if (counter % 3 === 1) {
                    setText("Loading..")
                } else {
                    setText("Loading...")
                }
            }
        ).then(
            _ => setCounter(counter + 1)
        )
    }, [counter])

    async function timer(time: number) { await new Promise(f => setTimeout(f, time)) };

    return (
        <LoadingDiv className="loading">
            {text}
        </LoadingDiv>
    );
};
