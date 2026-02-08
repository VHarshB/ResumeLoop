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

/**
 * Append a job record to the Excel tracker
 * @param fields - Extracted job fields
 * @param runId - Unique run identifier
 * @param pdfPath - Path to generated PDF
 */
export async function appendJobToExcel(
  fields: JobFields,
  runId: string,
  pdfPath: string
): Promise<void> {
  const excelPath = config.excelPath;

  // Ensure directory exists
  const dir = dirname(excelPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  let workbook: ExcelJS.Workbook;
  let worksheet: ExcelJS.Worksheet;

  // Check if file exists
  if (existsSync(excelPath)) {
    // Load existing workbook
    workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);
    worksheet = workbook.getWorksheet('Applications') || workbook.addWorksheet('Applications');
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

  // Save workbook
  await workbook.xlsx.writeFile(excelPath);
  console.log(`✓ Excel tracker updated: ${excelPath}`);
}
