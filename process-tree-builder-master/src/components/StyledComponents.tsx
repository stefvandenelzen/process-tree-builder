import styled from "styled-components";

export const CenterButtonContainer = styled.div`
    display:flex;
    align-items:center;
    justify-content:center;
    padding: 10px;
`

export const CenterButton = styled.button`
    padding: 10px;
    font-size: 18px;
`

/* Importing Page */
export const TraceSpan = styled.div<{ $enabled?: boolean; }>`
    display:flex;
    overflow-x:scroll;
    width: auto;
    flex-flow: row;
    align-items:center;
    background-color: ${props => props.$enabled === true ? "#EEEEEE" : '#AAAAAA'};
`

export const EventUl = styled.ul<{ $fontWeight?: string; }> `
    white-space:nowrap;
    font-weight: ${props => props.$fontWeight || "none"}
`
export const EventLiAction = styled.li<{ $color?: string; }>`
    list-style: none;
    font-weight: inherit;
    background-color:#FFFFFF;
    border: solid ${props => props.$color || "#FFFFFF"};
    border-width: 1 1px;    
    padding: 6px;
    padding-right: 12px;
    border-radius: 5px;
    margin-top: 3px;
    margin-bottom: 3px;
    margin-left: -25px;
`

export const Button = styled.div`
    cursor: pointer;
    background-color:#FFFFFF;
    padding: 10px;
    border-radius: 5px;
    height:1em;
    margin-left:5px;
`

export const EventLi = styled.li<{ $color?: string; $characters?: number }>`
    list-style: none;
    font-weight: inherit;
    background-color:#FFFFFF;
    border: solid ${props => props.$color || "#FFFFFF"};
    border-width: 1 1px;    
    padding: 6px;
    padding-right: 12px;
    border-radius: 5px;
    margin-top: 3px;
    margin-bottom: 3px;
    margin-left: -35px;
    width: 20px;
    overflow: hidden;
    color:white;
    background-color: ${props => props.$color || "#FFFFFF"};
    transition: width 0.5s ease-in-out;
    &:hover {
        color: black;
        background-color: white;
        width: ${props => props.$characters! * 7 + 5}px;
    }
`

export const ActivityContainer = styled.div`
    padding: 5px;
    background-color:#EEEEEE;
    height:100%;
`

/* Algorithm Page */
export const CutSpanContainer = styled.div`
    overflow-x:scroll;
    padding: 5px;
    background-color:#EEEEEE;
    &:hover {
        background-color: #BBBBBB;
    }
`

// For resolving issues with overflow-y
export const CutSpanContainerCustom = styled.div`
    overflow-y: visible;
    padding: 5px;
    background-color:#EEEEEE;
    &:hover {
        background-color: #BBBBBB;
    }
`

export const CutSpan = styled.div`
    display:flex;
    overflow-y:visible;
    width: auto;
    flex-flow: row;
    margin-bottom: 2px;
`

export const ActionDiv = styled.div<{ $fontWeight?: string; $color?: string; }>`
    font-weight: ${props => props.$fontWeight || "none"};
    border:solid ${props => props.$color || "#FFFFFF"};
    border-width: 1 1px;  
    background-color:#FFFFFF;
    padding: 6px;
    border-radius: 5px;
    margin: 2px;
    white-space:nowrap;
`

export const GroupDiv = styled.div<{ $color?: string; }>`
font-weight: bold;
background-color: ${props => props.$color || "#FFFFFF"};
padding: 6px;
margin: 2px;
white-space:nowrap;
justify-content:center;
align-items:center;
display:flex;
border-radius:5px;
color:white;
`