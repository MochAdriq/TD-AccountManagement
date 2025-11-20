"use client";

import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps {
  value?: DateRange;
  onChange: (date: DateRange | undefined) => void;
  placeholder?: string;
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Pilih rentang tanggal",
}: DateRangePickerProps) {
  return (
    <div className={cn("grid gap-2")}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[240px] justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value?.from ? (
              value.to ? (
                <>
                  {format(value.from, "dd MMM yyyy")} -{" "}
                  {format(value.to, "dd MMM yyyy")}
                </>
              ) : (
                format(value.from, "dd MMM yyyy")
              )
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={value?.from}
            selected={value}
            onSelect={onChange}
            numberOfMonths={1} // <--- PERUBAHAN DI SINI (Sebelumnya 2)
            showOutsideDays={false} // Agar tampilan lebih bersih
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
