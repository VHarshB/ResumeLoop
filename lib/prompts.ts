import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from './config';

/**
 * Load a prompt from a file
 * @param filename - Name of the prompt file (e.g., 'extract_prompt.txt')
 * @returns Prompt content as string
 */
function loadPrompt(filename: string): string {
  const filePath = join(process.cwd(), config.promptsDir, filename);
  return readFileSync(filePath, 'utf-8');
}

/**
 * Load master resume content
 * @returns Master resume text
 */
export function loadMasterResume(): string {
  const filePath = join(process.cwd(), config.assetsDir, 'master_resume.txt');
  return readFileSync(filePath, 'utf-8');
}

/**
 * Load LaTeX template
 * @returns LaTeX template content
 */
export function loadLatexTemplate(): string {
  const filePath = join(process.cwd(), config.templatesDir, 'resume_template.tex');
  return readFileSync(filePath, 'utf-8');
}

// System prompts
export const SYSTEM_EXTRACT = loadPrompt('extract_prompt.txt');
export const SYSTEM_RESUME = loadPrompt('resume_prompt.txt');
export const SYSTEM_LATEX = loadPrompt('latex_prompt.txt');
