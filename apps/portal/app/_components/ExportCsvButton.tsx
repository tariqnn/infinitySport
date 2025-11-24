'use client';

import { Button } from '@infinity/ui';

type CsvPrimitive = string | number | boolean | null | undefined;
type CsvRow = Record<string, CsvPrimitive>;

function toCsv(rows: CsvRow[], columns: string[]) {
  const header = columns.join(',');
  const body = rows.map((row) => columns.map((c) => JSON.stringify(row[c] ?? '')).join(',')).join('\n');
  return [header, body].join('\n');
}

export function ExportCsvButton({ 
  rows, 
  columns, 
  filename = 'export.csv',
  label = 'Export CSV'
}: { 
  rows: CsvRow[]; 
  columns: string[]; 
  filename?: string;
  label?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => {
        const csv = toCsv(rows, columns);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
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

