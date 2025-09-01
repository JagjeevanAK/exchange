
// import { useWebSocket } from "@/hooks/useWebsocket";
import { 
    useState, 
    // useCallback, 
    useEffect 
} from "react";
import { getIcons } from "@/lib/utility";
import { useTradingContext } from "./TradingContext";

const PriceCard = () => {
    const { selectedSymbol } = useTradingContext();
    const [currentPrice, setCurrentPrice] = useState(0);

    // const handleTradeUpdate = useCallback((trade: any) => {
    //     setCurrentPrice(trade.price);
    // }, []);

    useEffect(() => {
        setCurrentPrice(0);
    }, [selectedSymbol]);

    // const { } = useWebSocket(selectedSymbol, handleTradeUpdate);

    return (
        <div className="border-r border-[#202020] border-dashed p-4 flex gap-3 group">
            <div className="w-32 border border-dashed border-[#202020] flex-shrink-0 bg-[#101010] group-hover:border-[#808080] transition-colors duration-100 p-2 rounded-sm">
                {getIcons(selectedSymbol.toLowerCase())}
            </div>
            <div className="border border-dashed border-[#202020] py-2 px-3 w-full space-y-2 ">
                <p className="font-bold font-mono">{selectedSymbol}</p>
                <p className="font-semibold tracking-tight font-mono text-5xl">
                    {currentPrice > 0 ? `$${currentPrice.toLocaleString('en-US')}` : '0'}
                </p>
            </div>
        </div>
    );
}

export default PriceCard;
