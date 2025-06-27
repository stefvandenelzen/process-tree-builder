export type DFGEvent = {
    resource?: string,
    action: string,
    lifecycle: string,
    time?: number,
    b?: boolean,
    al?: string
}

export type Trace = {
    id: string,
    sequence_id?: number,
    events: DFGEvent[]
}

// Type of DataContext
export type TraceFrequency = {
    id: string,
    frequency: number,
    enabled: boolean,
    events: DFGEvent[]
}

// Type to be exported to backend, only keep event's action
export type TraceFrequencyClean = {
    id: string,
    frequency: number,
    events: string[]
}

export type Color = {
    color: string,
    action: string
}