import React, { Fragment, useState, useEffect } from "react";
import { Popover, Transition } from "@headlessui/react";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import { Button } from "@edumind/user-ui";
import { DayPicker, DateRange } from "react-day-picker";
import "react-day-picker/style.css";

interface DateRangeFilterProps {
  fromDate?: string;
  toDate?: string;
  onChange: (range: { fromDate?: string; toDate?: string }) => void;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ fromDate, toDate, onChange }) => {
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(
    fromDate && toDate 
      ? { from: parseISO(fromDate), to: parseISO(toDate) } 
      : fromDate 
       ? { from: parseISO(fromDate), to: undefined }
       : undefined
  );

  // Sync internal state if props change externally
  useEffect(() => {
     if (fromDate && isValid(parseISO(fromDate))) {
         setSelectedRange(prev => ({
             from: parseISO(fromDate),
             to: toDate && isValid(parseISO(toDate)) ? parseISO(toDate) : prev?.to
         }));
     } else if (!fromDate && !toDate) {
         setSelectedRange(undefined);
     }
  }, [fromDate, toDate]);

  const handleApply = (close: () => void) => {
    if (selectedRange?.from) {
        onChange({ 
            fromDate: format(selectedRange.from, 'yyyy-MM-dd'),
            toDate: selectedRange.to ? format(selectedRange.to, 'yyyy-MM-dd') : undefined
        });
    } else {
        onChange({ fromDate: undefined, toDate: undefined });
    }
    close();
  };

  const handleClear = (close?: () => void) => {
    setSelectedRange(undefined);
    onChange({ fromDate: undefined, toDate: undefined });
    if (close) close();
  };

  const label = fromDate && toDate 
    ? `${format(parseISO(fromDate), "MMM d")} - ${format(parseISO(toDate), "MMM d, yyyy")}`
    : fromDate 
      ? `From ${format(parseISO(fromDate), "MMM d, yyyy")}`
      : "Date Range";

  const isActive = !!(fromDate || toDate);

  return (
    <Popover className="relative">
      {({ open, close }) => (
        <>
          <Popover.Button
            className={`
              flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors
              ${isActive ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"}
              focus:outline-none focus:ring-2 focus:ring-indigo-500/20
            `}
          >
            <CalendarIcon className={`w-4 h-4 ${isActive ? "text-indigo-600" : "text-gray-500"}`} />
            <span className="font-medium">{label}</span>
            {isActive && (
              <div 
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); handleClear(); }}
                className="ml-1 p-0.5 rounded-full hover:bg-indigo-200 text-indigo-600"
              >
                <X className="w-3 h-3" />
              </div>
            )}
          </Popover.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel className="absolute right-0 z-50 mt-2 bg-white rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-4 origin-top-right w-auto min-w-[350px]">
              <div className="space-y-4">
                <div className="flex justify-center">
                    <style>{`
                      .rdp { --rdp-cell-size: 40px; --rdp-accent-color: #4f46e5; --rdp-background-color: #e0e7ff; margin: 0; }
                      .rdp-day_selected:not([disabled]) { font-weight: bold; background-color: var(--rdp-accent-color); color: white; }
                      .rdp-day_range_middle { background-color: var(--rdp-background-color) !important; color: #4338ca !important; }
                    `}</style>
                    <DayPicker
                        mode="range"
                        selected={selectedRange}
                        onSelect={setSelectedRange}
                        numberOfMonths={1}
                        pagedNavigation
                        showOutsideDays
                        disabled={{ after: new Date() }}
                    />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleClear(close)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Clear
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleApply(close)}
                    disabled={!selectedRange?.from}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
};
