import { mkdirSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { config } from './config';

/**
 * Generate a unique run ID
 * Format: YYYYMMDD-HHMMSS-RANDOM
 * @returns Unique run identifier
 */
export function generateRunId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8);

  return `${year}${month}${day}-${hours}${minutes}${seconds}-${random}`;
}

/**
 * Create a run directory and return its path
 * @param runId - Unique run identifier
 * @returns Path to the created run directory
 */
export function createRunDirectory(runId: string): string {
  const runDir = join(config.runsDir, runId);

  if (!existsSync(runDir)) {
    mkdirSync(runDir, { recursive: true });
    console.log(`✓ Created run directory: ${runDir}`);
  }

  return runDir;
}

/**
 * Save text content to a file in the run directory
 * @param runId - Run identifier
 * @param filename - Name of the file (e.g., 'jd.txt', 'resume.txt')
 * @param content - Text content to save
 */
export function saveRunFile(runId: string, filename: string, content: string): void {
  const runDir = join(config.runsDir, runId);
  const filePath = join(runDir, filename);
  writeFileSync(filePath, content, 'utf-8');
  console.log(`✓ Saved: ${filePath}`);
}

/**
 * Save JSON data to a file in the run directory
 * @param runId - Run identifier
 * @param filename - Name of the file (e.g., 'extract.json')
 * @param data - Data object to save
 */
export function saveRunJson(runId: string, filename: string, data: any): void {
  const content = JSON.stringify(data, null, 2);
  saveRunFile(runId, filename, content);
}
