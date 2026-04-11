import { useEffect, useRef, useState } from 'react';
import { FiChevronDown } from 'react-icons/fi';

type CustomSelectProps = {
  id: string;
  options: Array<string | { label: string; value: string }>;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  menuPosition?: 'top' | 'bottom';
};

function CustomSelect({
  id,
  options,
  placeholder,
  value,
  onChange,
  error,
  menuPosition = 'bottom',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    window.addEventListener('mousedown', handlePointerDown);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
    };
  }, []);

  const displayValue = value || placeholder;
  const normalizedOptions = options.map((option) => (
    typeof option === 'string'
      ? { label: option, value: option }
      : option
  ));
  const selectedOption = normalizedOptions.find((option) => option.value === value);
  const resolvedDisplayValue = selectedOption?.label ?? displayValue;
  const menuPositionClasses =
    menuPosition === 'top'
      ? 'bottom-[calc(100%+0.5rem)]'
      : 'top-[calc(100%+0.5rem)]';

  return (
    <div ref={containerRef} className="relative">
      <input id={id} name={id} type="hidden" value={value} />

      {error ? (
        <div className="pointer-events-none absolute -top-11 left-0 z-30 rounded-xl border border-red-200 bg-white px-3 py-2 text-[12px] font-medium text-red-500 shadow-[0_10px_24px_rgba(239,68,68,0.12)]">
          {error}
          <span className="absolute left-4 top-full h-2 w-2 -translate-y-1/2 rotate-45 border-b border-r border-red-200 bg-white" />
        </div>
      ) : null}

      <button
        type="button"
        aria-controls={`${id}-listbox`}
        aria-expanded={isOpen}
        className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-[15px] outline-none transition duration-200 focus:ring-4 focus:ring-blue-100 ${
          isOpen
            ? 'border-[#3498db] bg-white text-[#2c3e50] ring-4 ring-sky-100 shadow-[0_10px_24px_rgba(52,152,219,0.08)]'
            : error
              ? 'border-red-300 bg-white text-[#2c3e50] focus:border-red-400 focus:ring-red-100'
              : 'border-[#bdc3c7] bg-white text-[#2c3e50] focus:border-[#3498db]'
        }`}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span
          className={`min-w-0 truncate whitespace-nowrap text-left ${
            value ? 'text-[#2c3e50]' : 'text-[#95a5a6]'
          }`}
        >
          {resolvedDisplayValue}
        </span>
        <span
          className={`shrink-0 text-[12px] leading-none transition duration-200 ${
            isOpen
              ? 'rotate-180 text-[#3498db]'
              : 'text-[#7f8c8d]'
          }`}
        >
          <FiChevronDown className="h-4 w-4" />
        </span>
      </button>

      {isOpen ? (
        <div
          id={`${id}-listbox`}
          className={`absolute left-0 right-0 z-20 overflow-hidden rounded-2xl border border-[#bdc3c7] bg-white shadow-[0_18px_36px_rgba(15,23,42,0.12)] ${menuPositionClasses}`}
          role="listbox"
        >
          {normalizedOptions.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                className={`block w-full px-4 py-3 text-left text-[15px] transition ${
                  isSelected
                    ? 'bg-[#ebf5fb] text-[#3498db]'
                    : 'text-[#34495e] hover:bg-[#f7f9fa]'
                }`}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default CustomSelect;
