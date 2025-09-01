"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function WalletMenu() {
    const [open, setOpen] = useState(false)

    return (
        <div className="flex justify-around gap-3">
            {/* Wallet Balance Dropdown */}
            <DropdownMenu open={open} onOpenChange={setOpen}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        className="flex items-center gap-2 text-lg font-semibold rounded-md"
                    >
                        9,999.54 USD
                        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent className="w-80 p-3 rounded-xl shadow-lg">

                    {/* Wallet Info */}
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span>Balance</span>
                            <span className="font-medium">9,999.54 USD</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Equity</span>
                            <span className="font-medium">9,999.54 USD</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Margin</span>
                            <span className="font-medium">0.00 USD</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Free margin</span>
                            <span className="font-medium">9,999.54 USD</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Margin level</span>
                            <span className="font-medium">-</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Account leverage</span>
                            <span className="font-medium">1:200</span>
                        </div>
                    </div>

                    <DropdownMenuSeparator />

                    {/* Actions */}
                    <div className="flex flex-col gap-2 mt-2">
                        <Button className="w-full">Top Up</Button>
                        <Button variant="outline" className="w-full">
                            Manage Accounts
                        </Button>
                        <Button variant="outline" className="w-full">
                            Download Trading Log
                        </Button>
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Deposit Button */}
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                Deposit
            </Button>
        </div>
    )
}
