export interface stream {
    stream: string
    data: Ticker
}

export interface Ticker {
    E: Date
    s: string
    t: string
    p: string
    q: string
    T: Date
}