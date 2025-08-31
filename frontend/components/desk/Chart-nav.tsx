"use client"

import { useState } from "react";
import CustomDropdown from "../ui/CuDropdown";
import { BTC, ETH, SOL } from "@/components/icons/icons";

export default function ChartNav(){
    const [timeInterval, setTimeInterval] = useState('1m');
    const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');

    const intervalButtons = [
        { key: '1m', label: '1m' },
        { key: '5m', label: '5m' },
        { key: '30m', label: '30m' },
        { key: '1h', label: '1h' },
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
        <div className="border">
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
                            className={`px-4 py-1 border border-dashed border-[#202020] transition-colors ${timeInterval === interval.key
                                ? 'bg-[#f7f7f7] border-[#808080] text-black'
                                : 'bg-[#101010] text-white hover:border-[#404040]'
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