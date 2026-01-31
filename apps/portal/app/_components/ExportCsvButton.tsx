'use client';

import { Button } from './ui';

type CsvPrimitive = string | number | boolean | null | undefined;
type CsvRow = Record<string, CsvPrimitive>;

function escapeCsvCell(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows: CsvRow[], columns: string[], prefixLines?: string[]) {
  const parts: string[] = [];
  if (prefixLines?.length) {
    prefixLines.forEach((line) => parts.push(escapeCsvCell(line)));
    parts.push(''); // blank line before header
  }
  const header = columns.map((c) => escapeCsvCell(c)).join(',');
  const body = rows.map((row) => columns.map((c) => escapeCsvCell(String(row[c] ?? ''))).join(',')).join('\n');
  parts.push(header, body);
  return parts.join('\n');
}

export function ExportCsvButton({
  rows,
  columns,
  filename = 'export.csv',
  label = 'Export CSV',
  prefixLines,
}: {
  rows: CsvRow[];
  columns: string[];
  filename?: string;
  label?: string;
  /** Optional trace lines at the top (e.g. filter context, export time) for audit */
  prefixLines?: string[];
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => {
        const csv = toCsv(rows, columns, prefixLines);
        const bom = '\uFEFF'; // Excel UTF-8
        const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }}
    >
      {label}
    </Button>
  );
}

