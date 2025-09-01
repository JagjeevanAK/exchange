import { useState, useCallback } from 'react';

export const useNumberFormat = (initialValue: string = '') => {
    const [value, setValue] = useState(initialValue);

    const formatNumber = useCallback((num: string): string => {

    const cleaned = num.replace(/[^\d.]/g, '');
    const parts = cleaned.split('.');
    const beforeDecimal = parts[0];
    const afterDecimal = parts.length > 1 ? '.' + parts[1] : '';
    
    const formatted = beforeDecimal.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    return formatted + afterDecimal;
  }, []);

  const getRawValue = useCallback((formattedValue: string): number => {
    const cleaned = formattedValue.replace(/,/g, '');
    return parseFloat(cleaned) || 0;
  }, []);

  const handleChange = useCallback((inputValue: string) => {
    const formatted = formatNumber(inputValue);
    setValue(formatted);
  }, [formatNumber]);

  const displayValue = value;

  const numericValue = getRawValue(value);

  return {
    value: displayValue,
    numericValue,
    onChange: handleChange,
    setValue: (newValue: string) => setValue(formatNumber(newValue)),
    getRawValue,
    formatNumber
  };
};
