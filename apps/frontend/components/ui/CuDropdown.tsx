import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

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
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((option) => option.key === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // Check if click is outside both the button and the menu
      const isOutsideButton = buttonRef.current && !buttonRef.current.contains(target);
      const isOutsideMenu = menuRef.current && !menuRef.current.contains(target);

      if (isOutsideButton && isOutsideMenu) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.top - 4, // Position above the button with small gap
        left: rect.left,
        width: rect.width,
      });
    }
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleSelect = (optionKey: string) => {
    console.log('Selecting symbol:', optionKey);
    onChange(optionKey);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Dropdown Trigger */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="px-3 py-2 border border-dashed border-border bg-background text-foreground focus:outline-none focus:border-muted-foreground transition-colors font-mono flex items-center gap-2 min-w-[140px] justify-between"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6">{selectedOption?.icon}</div>
          <span>{selectedOption?.label}</span>
        </div>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu using Portal */}
      {isOpen &&
        typeof window !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed border border-dashed border-border bg-background z-[9999]"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
              transform: 'translateY(-100%)',
            }}
          >
            {options.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => handleSelect(option.key)}
                className={`w-full px-3 py-2 text-left hover:bg-accent transition-colors flex items-center gap-2 ${
                  value === option.key ? 'bg-accent' : ''
                }`}
              >
                <div className="w-6 h-6">{option.icon}</div>
                <span className="font-mono text-foreground">{option.label}</span>
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
};

export default CustomDropdown;
