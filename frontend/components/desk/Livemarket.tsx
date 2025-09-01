import { BTC, ETH, SOL } from "@/components/icons/icons"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"

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
    const getAssetLogo = (symbol: string) => {
        const asset = symbol.replace('USDT', '').replace('USD', '');
        
        switch(asset) {
            case 'BTC':
                return <BTC />;
            case 'ETH':
                return <ETH />;
            case 'SOL':
                return <SOL />;
            default:
                return (
                    <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center text-xs font-bold">
                        {asset.charAt(0)}
                    </div>
                );
        }
    };

    const formatSymbol = (symbol: string) => {
        // Convert BTCUSDT to BTC/USDT format
        const asset = symbol.replace('USDT', '').replace('USD', '');
        const quote = symbol.includes('USDT') ? 'USDT' : 'USD';
        return `${asset}/${quote}`;
    };

    return (
        <div className="bg-transparent text-card-foreground shadow border border-dashed border-border rounded mx-4">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>SYMBOL</TableHead>
                        <TableHead>BID</TableHead>
                        <TableHead>ASK</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {markets.map((market, i) => (
                        <TableRow key={i}>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 flex-shrink-0">
                                        {getAssetLogo(market.symbol)}
                                    </div>
                                    <span className="text-sm font-medium">
                                        {formatSymbol(market.symbol)}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell>{market.bid}</TableCell>
                            <TableCell>{market.ask}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}