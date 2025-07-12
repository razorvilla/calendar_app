import React, { useState, useRef, useEffect } from 'react';
import classNames from 'classnames';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  value,
  onChange,
  placeholder,
  ariaLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedOption = options.find(option => option.value === value);

  const handleToggle = () => {
    setIsOpen(prev => !prev);
  };

  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isOpen && listRef.current) {
      // Scroll to the top of the list when opened
      listRef.current.scrollTop = 0;
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={selectRef}>
      <button
        type="button"
        className="block appearance-none w-full bg-surface border border-outlineVariant text-onSurfaceVariant py-2 px-4 pr-8 rounded-md shadow leading-tight focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-left"
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || placeholder || 'Select option'}
      >
        {selectedOption ? selectedOption.label : placeholder}
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-onSurfaceVariant">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
        </span>
      </button>

      {isOpen && (
        <ul
          ref={listRef}
          className="absolute z-30 mt-1 w-full bg-surface rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 overflow-auto max-h-60 focus:outline-none"
          tabIndex={-1}
          role="listbox"
          aria-label={ariaLabel || placeholder || 'Select option'}
        >
          {options.map(option => (
            <li
              key={option.value}
              className={classNames(
                'px-4 py-2 text-sm cursor-pointer',
                {
                  'text-onPrimary bg-primary': option.value === value,
                  'text-onSurface hover:bg-surfaceVariant': option.value !== value,
                },
              )}
              onClick={() => handleOptionClick(option.value)}
              role="option"
              aria-selected={option.value === value}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CustomSelect;
