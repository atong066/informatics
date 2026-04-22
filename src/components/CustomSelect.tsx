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
  tone?: 'default' | 'muted';
};

function CustomSelect({
  id,
  options,
  placeholder,
  value,
  onChange,
  error,
  menuPosition = 'bottom',
  tone = 'default',
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
      ? 'bottom-[calc(100%+0.08rem)]'
      : 'top-[calc(100%+0.08rem)]';
  const isMuted = tone === 'muted';

  return (
    <div ref={containerRef} className="relative min-w-0">
      <input id={id} name={id} type="hidden" value={value} />

      {error ? (
        <div className="pointer-events-none absolute -top-11 left-0 z-30 rounded-xl border border-red-200 bg-white px-3 py-2 text-fluid-xs font-medium text-red-500 shadow-[0_10px_24px_rgba(239,68,68,0.12)]">
          {error}
          <span className="absolute left-4 top-full h-2 w-2 -translate-y-1/2 rotate-45 border-b border-r border-red-200 bg-white" />
        </div>
      ) : null}

      <button
        type="button"
        aria-controls={`${id}-listbox`}
        aria-expanded={isOpen}
        className={`flex min-h-[0.48rem] w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-fluid-md outline-none transition duration-200 ${
          isOpen
            ? isMuted
              ? 'border-[#2f9d8f] bg-[#fbfefd] text-[#173b47] ring-4 ring-[rgba(47,157,143,0.18)] shadow-[0_10px_24px_rgba(19,94,89,0.1)]'
              : 'border-[#238fca] bg-white text-[#22384a] ring-4 ring-sky-100 shadow-[0_10px_24px_rgba(35,143,202,0.1)]'
            : error
              ? isMuted
                ? 'border-red-300 bg-[#fbfefd] text-[#173b47] focus:border-red-400 focus:ring-red-100'
                : 'border-red-300 bg-white text-[#22384a] focus:border-red-400 focus:ring-red-100'
              : isMuted
                ? 'border-[#b9ced2] bg-[#fbfefd] text-[#173b47] hover:border-[#8fb2b3] focus:border-[#2f9d8f] focus:ring-4 focus:ring-[rgba(47,157,143,0.16)]'
                : 'border-[#bdcbd0] bg-white text-[#22384a] hover:border-[#98b7c4] focus:border-[#238fca] focus:ring-4 focus:ring-sky-100'
        }`}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span
          className={`min-w-0 truncate whitespace-nowrap text-left ${
            value
              ? isMuted
                ? 'text-[#173b47]'
                : 'text-[#22384a]'
              : isMuted
                ? 'text-[#78919a]'
                : 'text-[#8ca0a8]'
          }`}
        >
          {resolvedDisplayValue}
        </span>
        <span
          className={`shrink-0 text-fluid-xs leading-none transition duration-200 ${
            isOpen
              ? 'rotate-180 text-[#2f9d8f]'
              : isMuted
                ? 'text-[#78919a]'
                : 'text-[#7b8f98]'
          }`}
        >
          <FiChevronDown className="h-4 w-4" />
        </span>
      </button>

      {isOpen ? (
        <div
          id={`${id}-listbox`}
          className={`scrollbar-super-thin absolute left-0 right-0 z-50 max-h-[2.56rem] overflow-x-hidden overflow-y-auto overscroll-contain rounded-2xl border shadow-[0_20px_42px_rgba(15,23,42,0.14)] ${
            isMuted
              ? 'border-[#abc8c7] bg-[rgba(252,254,253,0.98)] backdrop-blur-sm'
              : 'border-[#bdcbd0] bg-white'
          } ${menuPositionClasses}`}
          role="listbox"
        >
          {normalizedOptions.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                title={option.label}
                className={`flex w-full items-center px-4 py-3 text-left text-fluid-md transition ${
                  isSelected
                    ? isMuted
                      ? 'bg-[#dff5ef] text-[#126b63]'
                      : 'bg-[#e7f4fb] text-[#1978ad]'
                    : isMuted
                      ? 'text-[#31565c] hover:bg-[#eef8f6]'
                      : 'text-[#334b5c] hover:bg-[#f5fafc]'
                }`}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                <span className="min-w-0 truncate">{option.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default CustomSelect;

