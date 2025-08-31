import { useState, useRef, useEffect } from 'react';

interface SymbolOption {
    key: string;
    label: string;
    icon: React.ReactNode; // Changed to ReactNode to accept JSX components
}

interface CustomDropdownProps {
    value: string;
    onChange: (value: string) => void;
    options: SymbolOption[];
}

const CustomDropdown = ({ value, onChange, options }: CustomDropdownProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(option => option.key === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Dropdown Trigger */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="px-3 py-2 border border-dashed border-[#202020] bg-[#101010] text-white focus:outline-none focus:border-[#808080] transition-colors font-mono flex items-center gap-2 min-w-[140px] justify-between"
            >
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6">
                        {selectedOption?.icon}
                    </div>
                    <span>{selectedOption?.label}</span>
                </div>
                <svg
                    className={`w-4 h-4 transition - transform ${ isOpen ? 'rotate-180' : '' } `}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 border border-dashed border-[#202020] bg-[#101010] z-50">
                    {options.map((option) => (
                        <button
                            key={option.key}
                            type="button"
                            onClick={() => {
                                onChange(option.key);
                                setIsOpen(false);
                            }}
                            className={`w - full px - 3 py - 2 text - left hover: bg - [#202020] transition - colors flex items - center gap - 2 ${
                                value === option.key ? 'bg-[#202020]' : ''
                            } `}
                        >
                            <div className="w-6 h-6">
                                {option.icon}
                            </div>
                            <span className="font-mono text-white">{option.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CustomDropdown;