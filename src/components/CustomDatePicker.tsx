import { useEffect, useMemo, useRef, useState } from 'react';
import { FiCalendar, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

type CustomDatePickerProps = {
  id: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  menuPosition?: 'top' | 'bottom';
};

type PickerView = 'day' | 'month' | 'year';

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function CustomDatePicker({
  id,
  placeholder = 'Select date',
  value,
  onChange,
  error,
  menuPosition = 'bottom',
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<PickerView>('day');
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const initialDate = parseInputDate(value) ?? new Date();
    return new Date(initialDate.getFullYear(), initialDate.getMonth(), 1);
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parsedDate = parseInputDate(value);
    if (parsedDate) {
      setVisibleMonth(new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1));
    }
  }, [value]);

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

  const calendarDays = useMemo(() => {
    const start = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const startOffset = start.getDay();
    const gridStart = new Date(start);
    gridStart.setDate(start.getDate() - startOffset);

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      return date;
    });
  }, [visibleMonth]);

  const selectedDate = parseInputDate(value);
  const displayValue = selectedDate ? formatDisplayDate(selectedDate) : placeholder;
  const today = new Date();
  const monthLabel = visibleMonth.toLocaleDateString('en-US', { month: 'long' });
  const yearLabel = visibleMonth.getFullYear();
  const yearGridStart = Math.floor(yearLabel / 12) * 12;
  const yearOptions = Array.from({ length: 12 }, (_, index) => yearGridStart + index);
  const yearRangeLabel = `${yearGridStart} - ${yearGridStart + 11}`;
  const menuPositionClasses =
    menuPosition === 'top'
      ? 'bottom-[calc(100%+0.5rem)] right-0'
      : 'top-[calc(100%+0.5rem)] right-0';

  return (
    <div ref={containerRef} className="relative">
      <input id={id} name={id} type="hidden" value={value} />

      {error ? (
        <div className="pointer-events-none absolute -top-11 left-0 z-30 rounded-xl border border-red-200 bg-white px-3 py-2 text-fluid-xs font-medium text-red-500 shadow-[0_10px_24px_rgba(239,68,68,0.12)]">
          {error}
          <span className="absolute left-4 top-full h-2 w-2 -translate-y-1/2 rotate-45 border-b border-r border-red-200 bg-white" />
        </div>
      ) : null}

      <button
        type="button"
        aria-controls={`${id}-calendar`}
        aria-expanded={isOpen}
        className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-fluid-md outline-none transition duration-200 focus:ring-4 focus:ring-blue-100 ${
          isOpen
            ? 'border-[#3498db] bg-white text-[#2c3e50] ring-4 ring-sky-100 shadow-[0_10px_24px_rgba(52,152,219,0.08)]'
            : error
              ? 'border-red-300 bg-white text-[#2c3e50] focus:border-red-400 focus:ring-red-100'
              : 'border-[#bdc3c7] bg-white text-[#2c3e50] focus:border-[#3498db]'
        }`}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className={selectedDate ? 'text-[#2c3e50]' : 'text-[#95a5a6]'}>
          {displayValue}
        </span>
        <FiCalendar
          className={`${isOpen ? 'text-[#3498db]' : 'text-[#7f8c8d]'} h-4 w-4 shrink-0`}
        />
      </button>

      {isOpen ? (
        <div
          id={`${id}-calendar`}
          className={`picker-popover absolute z-20 w-[18rem] rounded-2xl border border-[#bdc3c7] bg-white p-4 shadow-[0_18px_36px_rgba(15,23,42,0.12)] ${menuPositionClasses}`}
        >
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#7f8c8d] transition hover:bg-[#f7f9fa]"
              onClick={() => {
                if (viewMode === 'day') {
                  setVisibleMonth(
                    new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1),
                  );
                  return;
                }

                if (viewMode === 'month') {
                  setVisibleMonth(
                    new Date(visibleMonth.getFullYear() - 1, visibleMonth.getMonth(), 1),
                  );
                  return;
                }

                setVisibleMonth(
                  new Date(visibleMonth.getFullYear() - 12, visibleMonth.getMonth(), 1),
                );
              }}
            >
              <FiChevronLeft className="h-4 w-4" />
            </button>

            {viewMode === 'month' ? (
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm font-semibold text-[#2c3e50] transition hover:bg-[#f7f9fa]"
                onClick={() => setViewMode('year')}
              >
                {yearLabel}
              </button>
            ) : viewMode === 'year' ? (
              <p className="rounded-md px-2 py-1 text-sm font-semibold text-[#2c3e50]">
                {yearRangeLabel}
              </p>
            ) : (
              <div className="flex items-center gap-1 text-sm font-semibold text-[#2c3e50]">
                <button
                  type="button"
                  className="rounded-md px-2 py-1 transition hover:bg-[#f7f9fa]"
                  onClick={() => setViewMode('month')}
                >
                  {monthLabel}
                </button>
                <button
                  type="button"
                  className="rounded-md px-2 py-1 transition hover:bg-[#f7f9fa]"
                  onClick={() => setViewMode('year')}
                >
                  {yearLabel}
                </button>
              </div>
            )}

            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#7f8c8d] transition hover:bg-[#f7f9fa]"
              onClick={() => {
                if (viewMode === 'day') {
                  setVisibleMonth(
                    new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1),
                  );
                  return;
                }

                if (viewMode === 'month') {
                  setVisibleMonth(
                    new Date(visibleMonth.getFullYear() + 1, visibleMonth.getMonth(), 1),
                  );
                  return;
                }

                setVisibleMonth(
                  new Date(visibleMonth.getFullYear() + 12, visibleMonth.getMonth(), 1),
                );
              }}
            >
              <FiChevronRight className="h-4 w-4" />
            </button>
          </div>

          {viewMode === 'day' ? (
            <div className="picker-view">
              <div className="mb-2 grid grid-cols-7 text-center text-fluid-2xs font-medium text-[#95a5a6]">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <span key={day} className="py-1">
                    {day}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((date) => {
                  const sameMonth = date.getMonth() === visibleMonth.getMonth();
                  const isSelected =
                    selectedDate !== null &&
                    date.getFullYear() === selectedDate.getFullYear() &&
                    date.getMonth() === selectedDate.getMonth() &&
                    date.getDate() === selectedDate.getDate();
                  const isToday =
                    date.getFullYear() === today.getFullYear() &&
                    date.getMonth() === today.getMonth() &&
                    date.getDate() === today.getDate();

                  return (
                    <button
                      key={date.toISOString()}
                      type="button"
                      className={`flex h-9 items-center justify-center rounded-xl text-sm transition ${
                        isSelected
                          ? 'bg-[#3498db] text-white'
                          : isToday
                            ? 'border border-[#3498db]/25 bg-[#ebf5fb] text-[#3498db]'
                            : sameMonth
                              ? 'text-[#34495e] hover:bg-[#f7f9fa]'
                              : 'text-[#bdc3c7] hover:bg-[#f8fafb]'
                      }`}
                      onClick={() => {
                        onChange(formatInputDate(date));
                        setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
                        setIsOpen(false);
                      }}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {viewMode === 'month' ? (
            <div className="picker-view grid grid-cols-3 gap-2">
              {monthNames.map((month, index) => {
                const isSelectedMonth = index === visibleMonth.getMonth();

                return (
                  <button
                    key={month}
                    type="button"
                    className={`rounded-xl px-3 py-3 text-sm transition ${
                      isSelectedMonth
                        ? 'bg-[#ebf5fb] text-[#3498db]'
                        : 'text-[#34495e] hover:bg-[#f7f9fa]'
                    }`}
                    onClick={() => {
                      setVisibleMonth(new Date(visibleMonth.getFullYear(), index, 1));
                      setViewMode('day');
                    }}
                  >
                    {month.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          ) : null}

          {viewMode === 'year' ? (
            <div className="picker-view grid grid-cols-3 gap-2">
              {yearOptions.map((year) => {
                const isSelectedYear = year === visibleMonth.getFullYear();

                return (
                  <button
                    key={year}
                    type="button"
                    className={`rounded-xl px-3 py-3 text-sm transition ${
                      isSelectedYear
                        ? 'bg-[#ebf5fb] text-[#3498db]'
                        : 'text-[#34495e] hover:bg-[#f7f9fa]'
                    }`}
                    onClick={() => {
                      setVisibleMonth(new Date(year, visibleMonth.getMonth(), 1));
                      setViewMode('month');
                    }}
                  >
                    {year}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function formatDisplayDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

function formatInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export default CustomDatePicker;

function parseInputDate(value: string) {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

