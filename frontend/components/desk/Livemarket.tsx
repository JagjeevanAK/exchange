import { CustomTable } from "../ui/table"

type Market = {
    symbol: string
    bid: number
    ask: number
}

const markets: Market[] = [
    { symbol: "BTCUSDT", bid: 108927.65, ask: 110016.9265 },
    { symbol: "SOLUSDT", bid: 205.16, ask: 207.2116 },
    { symbol: "ETHUSDT", bid: 4481.39, ask: 4526.2039 },
]

export default function LiveMarket () {
    return (
        <div>
            <CustomTable<Market>
                data={markets}
                columns={[
                    { header: "SYMBOL", accessor: "symbol" },
                    { header: "BID", accessor: "bid" },
                    { header: "ASK", accessor: "ask" },
                ]}
            />
        </div>
    )
}