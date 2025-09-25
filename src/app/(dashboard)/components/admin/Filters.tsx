"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FirmOption } from "@/lib/types";

export function NameFilter({
  value,
  onChange,
  placeholder = "Filter by name...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <Input
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="max-w-sm"
    />
  );
}

export function FirmFilter({
  value,
  onChange,
  firms,
  allLabel = "All firms",
}: {
  value: string;
  onChange: (v: string) => void;
  firms: FirmOption[];
  allLabel?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[220px]">
        <SelectValue placeholder="Filter by firm" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__ALL__">{allLabel}</SelectItem>
        {firms.map((f) => (
          <SelectItem key={f.id} value={f.id}>
            {f.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
