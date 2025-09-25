"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NameFilter } from "./Filters";

/**
 * Controlled table shell:
 * - You pass nameFilterValue + onNameFilterChange so we can sync to URL.
 * - We apply the debounced value to the column filter (default "name").
 */
export function TableShell<TData, TValue>({
  columns,
  data,
  titleFilterColumn = "name",
  emptyEmoji = "📄",
  emptyMessage = "No results.",
  topLeft,
  topRight,
  nameFilterValue = "",
  onNameFilterChange,
  debounceMs = 250,
}: {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  titleFilterColumn?: string;
  emptyEmoji?: string;
  emptyMessage?: string;
  topLeft?: React.ReactNode;
  topRight?: React.ReactNode;
  nameFilterValue?: string;
  onNameFilterChange?: (v: string) => void;
  debounceMs?: number;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: { sorting, columnFilters },
  });

  // Debounce + apply the incoming controlled "q" to the column filter
  useEffect(() => {
    const id = setTimeout(() => {
      table.getColumn(titleFilterColumn)?.setFilterValue(nameFilterValue ?? "");
    }, debounceMs);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameFilterValue, titleFilterColumn, debounceMs]);

  const rows = table.getRowModel().rows;

  return (
    <div>
      <div className="flex items-center justify-between py-4 gap-2">
        <div className="flex items-center gap-2">
          <NameFilter
            value={nameFilterValue ?? ""}
            onChange={(v) => onNameFilterChange?.(v)}
          />
          {topLeft}
        </div>
        {topRight}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id}>
                    {h.isPlaceholder
                      ? null
                      : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {rows?.length ? (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-40 text-center align-middle"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="text-4xl">{emptyEmoji}</div>
                    <div className="text-sm text-slate-600">{emptyMessage}</div>
                    {topRight ? <div className="mt-2">{topRight}</div> : null}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
