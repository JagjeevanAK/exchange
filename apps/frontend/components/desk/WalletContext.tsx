'use client';
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { api } from '@/lib/api';

export interface WalletBalance {
  tradable: number;
  locked: number;
}

interface WalletContextType {
  balance: WalletBalance;

  isLoading: boolean;
  error: string | null;

  refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const POLLING_INTERVAL = 5000;

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [balance, setBalance] = useState<WalletBalance>({ tradable: 0, locked: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use ref to track mount state without causing re-renders
  const isMountedRef = useRef(true);

  /**
   * Fetch balance from the backend
   */
  const refreshBalance = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      setError(null);
      const data = await api.balance();

      if (isMountedRef.current) {
        setBalance({
          tradable: data.usd_balance || 0,
          locked: data.locked_balance || 0,
        });
      }
    } catch (err) {
      console.error('Error fetching balance:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch balance');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    refreshBalance();

    // Set up polling interval
    const intervalId = setInterval(() => {
      refreshBalance();
    }, POLLING_INTERVAL);

    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [refreshBalance]);

  return (
    <WalletContext.Provider
      value={{
        balance,
        isLoading,
        error,
        refreshBalance,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
