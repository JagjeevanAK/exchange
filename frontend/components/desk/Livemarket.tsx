import { BTC, ETH, SOL } from "@/components/icons/icons"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import { useWebSocket } from "@/hooks/useWebSocket"
import { useEffect, useState } from "react"

type Market = {
    symbol: string
    bid: number
    ask: number
    lastUpdate?: number
}

const defaultMarkets: Market[] = [
    { symbol: "BTCUSDT", bid: 0, ask: 0 },
    { symbol: "SOLUSDT", bid: 0, ask: 0 },
    { symbol: "ETHUSDT", bid: 0, ask: 0 },
]

export default function LiveMarket () {
    const [markets, setMarkets] = useState<Market[]>(defaultMarkets);
    const symbols = defaultMarkets.map(m => m.symbol);
    const { marketData, isConnected, error, subscribe } = useWebSocket();

    useEffect(() => {
        // Subscribe to all symbols when component mounts
        if (isConnected) {
            subscribe(symbols);
        }
    }, [isConnected, subscribe]);

    useEffect(() => {
        // Update markets when new data arrives
        setMarkets(prevMarkets => 
            prevMarkets.map(market => {
                const liveData = marketData.get(market.symbol);
                if (liveData) {
                    return {
                        ...market,
                        bid: liveData.bid,
                        ask: liveData.ask,
                        lastUpdate: liveData.timestamp
                    };
                }
                return market;
            })
        );
    }, [marketData]);

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

    const formatPrice = (price: number) => {
        if (price === 0) return '-';
        return price.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 6
        });
    };

    const getRowClassName = (lastUpdate?: number) => {
        if (!lastUpdate) return '';
        const timeSinceUpdate = Date.now() - lastUpdate;
        if (timeSinceUpdate < 1000) {
            return 'bg-green-500/10 transition-colors duration-1000';
        }
        return '';
    };

    return (
        <div className="bg-transparent text-card-foreground shadow border border-dashed border-border rounded mx-4">
            <div className="p-2 border-b border-dashed border-border flex justify-between items-center">
                <h3 className="text-sm font-medium">Live Market</h3>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-xs text-muted-foreground">
                        {isConnected ? 'Connected' : error ? 'Error' : 'Connecting...'}
                    </span>
                </div>
            </div>
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
                        <TableRow key={i} className={getRowClassName(market.lastUpdate)}>
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
                            <TableCell className="font-mono">
                                {formatPrice(market.bid)}
                            </TableCell>
                            <TableCell className="font-mono">
                                {formatPrice(market.ask)}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}