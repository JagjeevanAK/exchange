import React from 'react';
import { BTC, ETH, SOL, XRP } from '@/components/icons/icons';

export const getIcons = (symbol: string): React.ReactElement => {
  const normalizedSymbol = symbol.toLowerCase();

  // Check for BTC pairs
  if (normalizedSymbol.startsWith('btc')) {
    return React.createElement(BTC);
  }
  // Check for ETH pairs
  if (normalizedSymbol.startsWith('eth')) {
    return React.createElement(ETH);
  }
  // Check for SOL pairs
  if (normalizedSymbol.startsWith('sol')) {
    return React.createElement(SOL);
  }
  // Check for XRP pairs
  if (normalizedSymbol.startsWith('xrp')) {
    return React.createElement(XRP);
  }

  // Default fallback
  return React.createElement(BTC);
};
