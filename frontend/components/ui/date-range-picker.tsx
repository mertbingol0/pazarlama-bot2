"use client";

import * as React from "react";
import { CalendarIcon, X } from "lucide-react";
import { DayPicker, type DateRange } from "react-day-picker";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import "react-day-picker/style.css";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type DateRangeValue = {
  from: string; // "YYYY-MM-DD" veya ""
  to: string;
};

type Props = {
  value: DateRangeValue;
  onChange: (next: DateRangeValue) => void;
  placeholder?: string;
  clearLabel?: string;
  align?: "start" | "center" | "end";
  className?: string;
  triggerClassName?: string;
};

const toIso = (d: Date | undefined) => (d ? format(d, "yyyy-MM-dd") : "");
const fromIso = (s: string): Date | undefined => (s ? parseISO(s) : undefined);
const trShort = (s: string) => format(parseISO(s), "d MMM yyyy", { locale: tr });

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Tarih aralığı seçin",
  clearLabel = "Temizle",
  align = "start",
  className,
  triggerClassName,
}: Props) {
  const selected: DateRange | undefined =
    value.from || value.to
      ? { from: fromIso(value.from), to: fromIso(value.to) }
      : undefined;

  const label = (() => {
    if (value.from && value.to) {
      return value.from === value.to
        ? trShort(value.from)
        : `${trShort(value.from)} – ${trShort(value.to)}`;
    }
    if (value.from) return trShort(value.from);
    if (value.to) return trShort(value.to);
    return placeholder;
  })();

  const hasValue = Boolean(value.from || value.to);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "h-9 justify-start gap-2 rounded-xl font-normal",
              !hasValue && "text-muted-foreground",
              triggerClassName,
            )}
          >
            <CalendarIcon className="h-4 w-4 text-slate-500" />
            <span className="truncate">{label}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align={align} className="w-auto p-0">
          <DayPicker
            mode="range"
            locale={tr}
            weekStartsOn={1}
            numberOfMonths={2}
            selected={selected}
            onSelect={(range) =>
              onChange({
                from: toIso(range?.from),
                to: toIso(range?.to),
              })
            }
            className="p-3"
          />
        </PopoverContent>
      </Popover>
      {hasValue && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 rounded-xl px-2 text-slate-500"
          onClick={() => onChange({ from: "", to: "" })}
          aria-label={clearLabel}
          title={clearLabel}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
