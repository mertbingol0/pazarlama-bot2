"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type SearchableSelectOption = {
  label: string;
  value: string;
};

type SearchableSelectProps = {
  label: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  value: string;
  options: SearchableSelectOption[];
  disabled?: boolean;
  onChange: (value: string) => void;
};

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c");
}

export function SearchableSelect({
  label,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  value,
  options,
  disabled = false,
  onChange,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            role="combobox"
            aria-expanded={open}
            className="h-12 w-full justify-between rounded-xl border border-slate-200 bg-white px-4 text-sm font-normal text-slate-800 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50/40 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            <span className="truncate">
              {selectedOption ? selectedOption.label : placeholder}
            </span>

            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
          <Command
            filter={(value, search) => {
              const normalizedValue = normalizeText(value);
              const normalizedSearch = normalizeText(search);

              if (normalizedValue.includes(normalizedSearch)) {
                return 1;
              }

              return 0;
            }}
          >
            <CommandInput placeholder={searchPlaceholder} />

            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>

              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={`${option.label} ${option.value}`}
                    onSelect={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />

                    <span>{option.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}