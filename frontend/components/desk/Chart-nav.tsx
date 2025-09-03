"use client"

// import { useTheme } from "next-themes";
import CustomDropdown from "../ui/CuDropdown";
import { BTC, ETH, SOL } from "@/components/icons/icons";
import { useTradingContext } from "./TradingContext";

export default function ChartNav(){
    const { selectedSymbol, setSelectedSymbol, timeInterval, setTimeInterval } = useTradingContext();
    // const { resolvedTheme } = useTheme();
    // const isDark = resolvedTheme === 'dark';

    const intervalButtons = [
        { key: '1m', label: '1m' },
        { key: '5m', label: '5m' },
        { key: '15m', label: '15m' },
        { key: '30m', label: '30m' },
        { key: '1h', label: '1h' },
        { key: '1d', label: '1d' },
        { key: '1w', label: '1w' },
    ];

    const getIcons = (sym: string) => {
        switch (sym) {
            case 'btcusdt':
                return <BTC />;
            case 'ethusdt':
                return <ETH />
            case 'solusdt':
                return <SOL />
        }
    }

    const symbolOptionsWithIcons = [
        { key: 'BTCUSDT', label: 'BTC', icon: getIcons('btcusdt') },
        { key: 'ETHUSDT', label: 'ETH', icon: getIcons('ethusdt') },
        { key: 'SOLUSDT', label: 'SOL', icon: getIcons('solusdt') },
    ];

    return (
        <div className="border border-dashed border-border px-4 py-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <CustomDropdown
                        value={selectedSymbol}
                        onChange={setSelectedSymbol}
                        options={symbolOptionsWithIcons}
                    />
                </div>

                <div className="flex items-center gap-2">
                    {intervalButtons.map((interval) => (
                        <button
                            key={interval.key}
                            className={`px-4 py-1 border border-dashed transition-colors ${timeInterval === interval.key
                                ? 'bg-foreground text-background border-foreground'
                                : 'bg-background border-border text-foreground hover:border-muted-foreground/50 hover:bg-muted'
                                }`}
                            onClick={() => setTimeInterval(interval.key)}
                        >
                            {interval.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}