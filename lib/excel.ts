import ExcelJS from 'exceljs';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { config } from './config';

export interface JobFields {
  company: string;
  title: string;
  location: string;
  pay: string;
  link: string;
}

interface JobRecord extends JobFields {
  dateTime: string;
  runId: string;
  pdfPath: string;
  notes?: string;
}

function normalizeHeader(value: ExcelJS.CellValue | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim().toLowerCase();
  }

  if (value instanceof Date) {
    return value.toISOString().trim().toLowerCase();
  }

  if (typeof value === 'object' && 'text' in value && typeof value.text === 'string') {
    return value.text.trim().toLowerCase();
  }

  if (typeof value === 'object' && 'richText' in value && Array.isArray(value.richText)) {
    return value.richText.map((part) => part.text || '').join('').trim().toLowerCase();
  }

  if (typeof value === 'object' && 'formula' in value && 'result' in value) {
    return String(value.result ?? '').trim().toLowerCase();
  }

  return '';
}

function resolveWorksheet(workbook: ExcelJS.Workbook, sheetName: string): ExcelJS.Worksheet | undefined {
  const direct = workbook.getWorksheet(sheetName);
  if (direct) {
    return direct;
  }

  const normalized = sheetName.trim().toLowerCase();
  return workbook.worksheets.find((sheet) => sheet.name.trim().toLowerCase() === normalized);
}

/**
 * Append a job record to the Excel tracker
 * @param fields - Extracted job fields
 * @param runId - Unique run identifier
 * @param pdfPath - Path to generated PDF
 */
export async function appendJobToExcel(
  fields: JobFields,
  runId: string,
  pdfPath: string,
  jobDescription: string
): Promise<void> {
  const excelPath = config.excelPath;
  const sheetName = config.excelSheet;
  const headerRowIndex = Number.isFinite(config.excelHeaderRow) ? config.excelHeaderRow : 1;

  // Ensure directory exists
  const dir = dirname(excelPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  let workbook: ExcelJS.Workbook;
  let worksheet: ExcelJS.Worksheet;

  try {

  // Check if file exists
  if (existsSync(excelPath)) {
    // Load existing workbook
    workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);
    worksheet = resolveWorksheet(workbook, sheetName) || workbook.worksheets[0];

    if (!worksheet) {
      throw new Error('No worksheet found in the Excel tracker.');
    }
  } else {
    // Create new workbook
    workbook = new ExcelJS.Workbook();
    worksheet = workbook.addWorksheet('Applications');

    // Add header row
    worksheet.columns = [
      { header: 'DateTime', key: 'dateTime', width: 20 },
      { header: 'Company', key: 'company', width: 25 },
      { header: 'Title', key: 'title', width: 30 },
      { header: 'Location', key: 'location', width: 20 },
      { header: 'Pay', key: 'pay', width: 20 },
      { header: 'Link', key: 'link', width: 40 },
      { header: 'RunId', key: 'runId', width: 25 },
      { header: 'PDFPath', key: 'pdfPath', width: 40 },
      { header: 'Notes', key: 'notes', width: 30 },
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };
  }

  // Add new row
  if (worksheet.name === 'Applications') {
    const record: JobRecord = {
      dateTime: new Date().toISOString(),
      company: fields.company,
      title: fields.title,
      location: fields.location,
      pay: fields.pay,
      link: fields.link,
      runId,
      pdfPath,
      notes: '',
    };

    worksheet.addRow(record);
  } else {
    const headerRow = worksheet.getRow(headerRowIndex);
    const headerMap = new Map<string, number>();

    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const normalized = normalizeHeader(cell.value);
      if (normalized) {
        headerMap.set(normalized, colNumber);
      }
    });

    if (headerMap.size === 0) {
      throw new Error('Header row is empty. Check JOBLOOP_EXCEL_HEADER_ROW.');
    }

    const rowValues: (string | number | Date | null)[] = [];

    const setValue = (header: string, value: string | number | Date | null) => {
      const columnIndex = headerMap.get(header);
      if (columnIndex) {
        rowValues[columnIndex] = value;
      }
    };

    setValue('job title', fields.title);
    setValue('organization', fields.company);
    setValue('link to job post', fields.link);
    setValue('job description', jobDescription);
    setValue('pay', fields.pay);
    setValue('date applied', new Date());

    const lastRowNumber = worksheet.lastRow?.number ?? headerRowIndex;
    const targetRow = Math.max(lastRowNumber + 1, headerRowIndex + 1);
    const row = worksheet.getRow(targetRow);
    row.values = rowValues;
    row.commit();
  }

  // Save workbook
    await workbook.xlsx.writeFile(excelPath);
    console.log(`✓ Excel tracker updated: ${excelPath}`);
  } catch (error: any) {
    if (error.code === 'EBUSY') {
      throw new Error(`Excel file is locked. Close '${excelPath}' in Excel and try again.`);
    }
    throw error;
  }
}
