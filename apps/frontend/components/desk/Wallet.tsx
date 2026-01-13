'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useWallet } from './WalletContext';

// Format balance to display with commas and 2 decimal places
function formatBalance(amount: number): string {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function WalletMenu() {
  const [open, setOpen] = useState(false);
  const { balance, isLoading } = useWallet();

  // Calculate derived values
  const tradableBalance = balance.tradable;
  const lockedBalance = balance.locked;
  const totalEquity = tradableBalance + lockedBalance;
  const freeMargin = tradableBalance;
  const marginLevel =
    lockedBalance > 0 ? ((totalEquity / lockedBalance) * 100).toFixed(2) + '%' : '-';

  return (
    <div className="flex gap-2 w-full">
      {/* Wallet Balance Dropdown */}
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="flex-1 items-center gap-2 text-lg font-semibold rounded-md"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              formatBalance(tradableBalance)
            )}{' '}
            USD
            {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="flex-1 w-80 p-3 rounded-xl shadow-lg">
          {/* Wallet Info */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Balance</span>
              <span className="font-medium">{formatBalance(tradableBalance)} USD</span>
            </div>
            <div className="flex justify-between">
              <span>Equity</span>
              <span className="font-medium">{formatBalance(totalEquity)} USD</span>
            </div>
            <div className="flex justify-between">
              <span>Margin</span>
              <span className="font-medium">{formatBalance(lockedBalance)} USD</span>
            </div>
            <div className="flex justify-between">
              <span>Free margin</span>
              <span className="font-medium">{formatBalance(freeMargin)} USD</span>
            </div>
            <div className="flex justify-between">
              <span>Margin level</span>
              <span className="font-medium">{marginLevel}</span>
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
      <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Deposit</Button>
    </div>
  );
}
