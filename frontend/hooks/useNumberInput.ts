import { useState, useCallback } from 'react';

interface UseNumberInputOptions {
  initialValue?: string;
  decimals?: number;
  allowNegative?: boolean;
}

export function useNumberInput(options: UseNumberInputOptions = {}) {
  const { initialValue = '', decimals = 2, allowNegative = false } = options;
  
  const [displayValue, setDisplayValue] = useState(initialValue);
  const [rawValue, setRawValue] = useState(initialValue);

  // Format number with commas
  const formatNumber = useCallback((value: string): string => {
    // Remove all non-numeric characters except decimal point and minus
    let cleaned = value.replace(/[^\d.-]/g, '');
    
    // Handle negative numbers
    if (!allowNegative) {
      cleaned = cleaned.replace(/-/g, '');
    } else {
      // Ensure only one minus sign at the beginning
      const hasNegative = cleaned.startsWith('-');
      cleaned = cleaned.replace(/-/g, '');
      if (hasNegative) cleaned = '-' + cleaned;
    }

    // Handle decimal places
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Limit decimal places
    if (parts[1] && parts[1].length > decimals) {
      cleaned = parts[0] + '.' + parts[1].slice(0, decimals);
    }

    if (cleaned) {
      const [integerPart, decimalPart] = cleaned.split('.');
      const isNegative = integerPart.startsWith('-');
      const absoluteInteger = integerPart.replace('-', '');
      
      if (absoluteInteger) {
        const formattedInteger = absoluteInteger.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        const result = (isNegative ? '-' : '') + formattedInteger + (decimalPart !== undefined ? '.' + decimalPart : '');
        return result;
      }
    }
    
    return cleaned;
  }, [decimals, allowNegative]);

  const getRawValue = useCallback((value: string): string => {
    return value.replace(/,/g, '');
  }, []);

  const handleChange = useCallback((value: string) => {
    const formatted = formatNumber(value);
    const raw = getRawValue(formatted);
    
    setDisplayValue(formatted);
    setRawValue(raw);
  }, [formatNumber, getRawValue]);

  const getNumericValue = useCallback((): number => {
    return parseFloat(rawValue) || 0;
  }, [rawValue]);

  const setValue = useCallback((value: string | number) => {
    const stringValue = value.toString();
    const formatted = formatNumber(stringValue);
    const raw = getRawValue(formatted);
    
    setDisplayValue(formatted);
    setRawValue(raw);
  }, [formatNumber, getRawValue]);

  const reset = useCallback(() => {
    setDisplayValue(initialValue);
    setRawValue(initialValue);
  }, [initialValue]);

  return {
    displayValue,     
    rawValue,        
    numericValue: getNumericValue(), 
    handleChange,     
    setValue,         
    reset,           
  };
}
