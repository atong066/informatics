import { useEffect, useMemo, useRef, useState } from 'react';
import { FiCheck, FiChevronDown } from 'react-icons/fi';

type CustomMultiSelectProps = {
  id: string;
  options: Array<string | { label: string; value: string }>;
  placeholder: string;
  values: string[];
  onChange: (values: string[]) => void;
  error?: string;
  menuPosition?: 'top' | 'bottom';
  tone?: 'default' | 'muted';
};

function CustomMultiSelect({
  id,
  options,
  placeholder,
  values,
  onChange,
  error,
  menuPosition = 'bottom',
  tone = 'default',
}: CustomMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const normalizedOptions = useMemo(
    () =>
      options.map((option) => (
        typeof option === 'string'
          ? { label: option, value: option }
          : option
      )),
    [options],
  );

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

  const isMuted = tone === 'muted';
  const menuPositionClasses =
    menuPosition === 'top'
      ? 'bottom-[calc(100%+0.5rem)]'
      : 'top-[calc(100%+0.5rem)]';
  const resolvedValues =
    values.length > 0 ? values : [];
  const resolvedDisplayValue = (() => {
    if (resolvedValues.length === 0) {
      return placeholder;
    }

    if (resolvedValues.includes('All sections')) {
      return 'All sections';
    }

    const selectedLabels = normalizedOptions
      .filter((option) => resolvedValues.includes(option.value))
      .map((option) => option.label);

    if (selectedLabels.length <= 2) {
      return selectedLabels.join(', ');
    }

    return `${selectedLabels.length} sections selected`;
  })();

  function handleToggleOption(nextValue: string) {
    if (nextValue === 'All sections') {
      onChange(['All sections']);
      return;
    }

    const nextValues = resolvedValues.includes('All sections')
      ? []
      : [...resolvedValues];
    const valueIndex = nextValues.indexOf(nextValue);

    if (valueIndex >= 0) {
      nextValues.splice(valueIndex, 1);
    } else {
      nextValues.push(nextValue);
    }

    onChange(nextValues.length > 0 ? nextValues : ['All sections']);
  }

  return (
    <div ref={containerRef} className="relative">
      {resolvedValues.map((value) => (
        <input key={value} id={`${id}-${value}`} name={id} type="hidden" value={value} />
      ))}

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
        className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-[15px] outline-none transition duration-200 ${
          isOpen
            ? isMuted
              ? 'border-[#7ea8cf] bg-[rgba(209,220,231,0.96)] text-[#21486d] ring-4 ring-[rgba(126,168,207,0.18)] shadow-[0_8px_18px_rgba(43,70,99,0.08)]'
              : 'border-[#3498db] bg-white text-[#2c3e50] ring-4 ring-sky-100 shadow-[0_10px_24px_rgba(52,152,219,0.08)]'
            : error
              ? isMuted
                ? 'border-red-300 bg-[rgba(209,220,231,0.96)] text-[#21486d]'
                : 'border-red-300 bg-white text-[#2c3e50]'
              : isMuted
                ? 'border-[#b6c7d6] bg-[rgba(209,220,231,0.96)] text-[#21486d] focus:border-[#7ea8cf] focus:ring-4 focus:ring-[rgba(126,168,207,0.16)]'
                : 'border-[#bdc3c7] bg-white text-[#2c3e50] focus:border-[#3498db] focus:ring-4 focus:ring-blue-100'
        }`}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span
          className={`min-w-0 truncate whitespace-nowrap text-left ${
            resolvedValues.length > 0
              ? isMuted
                ? 'text-[#21486d]'
                : 'text-[#2c3e50]'
              : isMuted
                ? 'text-[#6f89a4]'
                : 'text-[#95a5a6]'
          }`}
        >
          {resolvedDisplayValue}
        </span>
        <span
          className={`shrink-0 text-[12px] leading-none transition duration-200 ${
            isOpen
              ? 'rotate-180 text-[#3498db]'
              : isMuted
                ? 'text-[#6f89a4]'
                : 'text-[#7f8c8d]'
          }`}
        >
          <FiChevronDown className="h-4 w-4" />
        </span>
      </button>

      {isOpen ? (
        <div
          id={`${id}-listbox`}
          className={`absolute left-0 right-0 z-20 overflow-hidden rounded-2xl border shadow-[0_18px_36px_rgba(15,23,42,0.12)] ${
            isMuted
              ? 'border-[#b6c7d6] bg-[rgba(210,220,231,0.98)] backdrop-blur-sm'
              : 'border-[#bdc3c7] bg-white'
          } ${menuPositionClasses}`}
          role="listbox"
          aria-multiselectable="true"
        >
          {normalizedOptions.map((option) => {
            const isSelected = resolvedValues.includes(option.value);

            return (
              <button
                key={option.value}
                type="button"
                className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-[15px] transition ${
                  isSelected
                    ? isMuted
                      ? 'bg-[rgba(194,209,224,0.92)] text-[#255a91]'
                      : 'bg-[#ebf5fb] text-[#3498db]'
                    : isMuted
                      ? 'text-[#33516f] hover:bg-[rgba(219,228,237,0.98)]'
                      : 'text-[#34495e] hover:bg-[#f7f9fa]'
                }`}
                onClick={() => handleToggleOption(option.value)}
              >
                <span>{option.label}</span>
                <span className={`shrink-0 ${isSelected ? 'opacity-100' : 'opacity-0'}`}>
                  <FiCheck className="h-4 w-4" />
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default CustomMultiSelect;
