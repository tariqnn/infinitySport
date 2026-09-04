function htmlCell(value: unknown) {
  return (value == null ? "" : String(value))
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function openPdfTable(title: string, headers: string[], rows: unknown[][]) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to export the PDF.");
    return;
  }

  const tableRows = rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${htmlCell(cell)}</td>`).join("")}</tr>`,
    )
    .join("");
  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${htmlCell(title)}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111827; margin: 24px; }
          h1 { font-size: 22px; margin: 0 0 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #d1d5db; padding: 7px; text-align: left; vertical-align: top; }
          th { background: #f3f4f6; font-weight: 700; }
          tr:nth-child(even) td { background: #fafafa; }
          @media print { body { margin: 12mm; } }
        </style>
      </head>
      <body>
        <h1>${htmlCell(title)}</h1>
        <table>
          <thead><tr>${headers.map((header) => `<th>${htmlCell(header)}</th>`).join("")}</tr></thead>
          <tbody>${tableRows || `<tr><td colspan="${headers.length}">No registrations</td></tr>`}</tbody>
        </table>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  window.setTimeout(() => printWindow.print(), 250);
}
