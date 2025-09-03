import { BTC, ETH, SOL } from "@/components/icons/icons"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import { useWebSocket } from "@/hooks/useWebSocket"
import { useEffect, useState } from "react"

type Market = {
    symbol: string
    bid: number
    ask: number
    lastUpdate?: number
    previousPrice?: number
    priceChange?: 'up' | 'down' | 'neutral'
}

const defaultMarkets: Market[] = [
    { symbol: "ETHUSDT", bid: 0, ask: 0 },
    { symbol: "SOLUSDT", bid: 0, ask: 0 },
    { symbol: "BTCUSDT", bid: 0, ask: 0 },
    { symbol: "BTCFDUSD", bid: 0, ask: 0 },
    { symbol: "ETHFDUSD", bid: 0, ask: 0 },
    { symbol: "SOLFDUSD", bid: 0, ask: 0 },
    { symbol: "XRPUSDC", bid: 0, ask: 0 },
    { symbol: "ETHUSDC", bid: 0, ask: 0 },
    { symbol: "USDCUSDT", bid: 0, ask: 0 },
    { symbol: "SOLUSDC", bid: 0, ask: 0 },
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
                    const currentPrice = (liveData.bid + liveData.ask) / 2;
                    const previousPrice = market.previousPrice || currentPrice;
                    
                    let priceChange: 'up' | 'down' | 'neutral' = 'neutral';
                    if (currentPrice > previousPrice) {
                        priceChange = 'up';
                    } else if (currentPrice < previousPrice) {
                        priceChange = 'down';
                    }
                    
                    return {
                        ...market,
                        bid: liveData.bid,
                        ask: liveData.ask,
                        lastUpdate: liveData.timestamp,
                        previousPrice: currentPrice,
                        priceChange
                    };
                }
                return market;
            })
        );
    }, [marketData]);

    const getAssetLogo = (symbol: string) => {
        // Extract base asset from symbol
        let asset = '';
        if (symbol.includes('USDT')) {
            asset = symbol.replace('USDT', '');
        } else if (symbol.includes('USDC')) {
            asset = symbol.replace('USDC', '');
        } else if (symbol.includes('FDUSD')) {
            asset = symbol.replace('FDUSD', '');
        }
        
        switch(asset) {
            case 'BTC':
                return <BTC />;
            case 'ETH':
                return <ETH />;
            case 'SOL':
                return <SOL />;
            case 'XRP':
                return (
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                        XRP
                    </div>
                );
            case 'USD':
                return (
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                        $
                    </div>
                );
            default:
                return (
                    <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center text-xs font-bold">
                        {asset.charAt(0)}
                    </div>
                );
        }
    };

    const formatSymbol = (symbol: string) => {
        // Convert symbols to readable format
        if (symbol.includes('USDT')) {
            const asset = symbol.replace('USDT', '');
            return `${asset}/USDT`;
        } else if (symbol.includes('USDC')) {
            const asset = symbol.replace('USDC', '');
            return `${asset}/USDC`;
        } else if (symbol.includes('FDUSD')) {
            const asset = symbol.replace('FDUSD', '');
            return `${asset}/FDUSD`;
        }
        return symbol;
    };

    const formatPrice = (price: number) => {
        if (price === 0) return '-';
        return price.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 6
        });
    };

    const getRowClassName = (lastUpdate?: number, priceChange?: 'up' | 'down' | 'neutral') => {
        let className = '';
        
        // Price change colors
        if (priceChange === 'up') {
            className += 'bg-green-600/20 border-l-2 border-green-600 ';
        } else if (priceChange === 'down') {
            className += 'bg-red-500/20 border-l-2 border-red-500 ';
        }
        
        // Recent update flash effect
        if (lastUpdate) {
            const timeSinceUpdate = Date.now() - lastUpdate;
            if (timeSinceUpdate < 1000) {
                className += 'transition-colors duration-1000 ';
            }
        }
        
        return className.trim();
    };

    const getPriceClassName = (priceChange?: 'up' | 'down' | 'neutral') => {
        if (priceChange === 'up') {
            return 'text-green-600 font-semibold';
        } else if (priceChange === 'down') {
            return 'text-red-500 font-semibold';
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
            <div className="max-h-96 overflow-y-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="sticky top-0 bg-background">SYMBOL</TableHead>
                            <TableHead className="sticky top-0 bg-background">BID</TableHead>
                            <TableHead className="sticky top-0 bg-background">ASK</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {markets.map((market, i) => (
                            <TableRow key={i} className={getRowClassName(market.lastUpdate, market.priceChange)}>
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
                                <TableCell className={`font-mono ${getPriceClassName(market.priceChange)}`}>
                                    {formatPrice(market.bid)}
                                </TableCell>
                                <TableCell className={`font-mono ${getPriceClassName(market.priceChange)}`}>
                                    {formatPrice(market.ask)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}