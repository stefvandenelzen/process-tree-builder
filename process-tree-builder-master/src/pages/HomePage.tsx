import styled from "styled-components";
import { TodoList } from "../components/TodoList";

const GalleryLink = styled.a`
margin-top: 15px;
margin-left: 5px;
margin-right: 5px;
background-color: rgb(53, 78, 100);
color:white;
text-decoration:none;
padding: 15px;
border-radius: 10px;

&:visited {
    color:white;
}

&:hover {
    background-color: rgb(83, 117, 146);
}`

export const HomePage = () => {
    return (
        <div className="homepage">
            <p className="banner">Home Page</p>
            <TodoList></TodoList>
            <div>
                <GalleryLink href="https://airbnb.io/visx/gallery">Visx Gallery</GalleryLink>
                <GalleryLink href="https://codesandbox.io/p/sandbox/network-graph-visualization-forked-9j7mh?file=%2Fsrc%2FApp.tsx%3A9%2C10">Visx Force-directed</GalleryLink>
            </div>
        </div>
    );
}