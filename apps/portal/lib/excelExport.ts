import ExcelJS from "exceljs";

export type ExcelSheet = {
  name: string;
  headers: string[];
  rows: unknown[][];
  columnWidths?: number[];
  accentColor?: string;
};

const DEFAULT_ACCENT = "1D4ED8";
const HEADER_TEXT = "FFFFFFFF";
const BAND_FILL = "FFF1F5F9";
const BORDER_COLOR = "FFE2E8F0";

function columnWidth(header: string, explicit?: number) {
  if (explicit) return explicit;
  return Math.max(12, Math.min(34, header.length + 6));
}

export async function downloadStyledWorkbook(
  filename: string,
  sheets: ExcelSheet[],
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Infinity Sports Portal";
  workbook.created = new Date();

  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sheet.name.slice(0, 31), {
      views: [{ state: "frozen", ySplit: 1 }],
      properties: { defaultRowHeight: 20 },
    });

    worksheet.columns = sheet.headers.map((header, index) => ({
      header,
      width: columnWidth(header, sheet.columnWidths?.[index]),
    }));

    const headerRow = worksheet.getRow(1);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: HEADER_TEXT }, size: 11 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: `FF${sheet.accentColor ?? DEFAULT_ACCENT}` },
      };
      cell.alignment = { vertical: "middle", horizontal: "left" };
      cell.border = {
        bottom: { style: "thin", color: { argb: BORDER_COLOR } },
      };
    });

    sheet.rows.forEach((rowData, rowIndex) => {
      const row = worksheet.addRow(rowData);
      row.eachCell((cell) => {
        cell.alignment = { vertical: "middle", wrapText: true };
        cell.border = {
          bottom: { style: "thin", color: { argb: BORDER_COLOR } },
        };
        if (rowIndex % 2 === 1) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: BAND_FILL },
          };
        }
      });
    });

    if (sheet.headers.length > 0) {
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: sheet.headers.length },
      };
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
