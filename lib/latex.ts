import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { config } from './config';

const execAsync = promisify(exec);

export interface CompileResult {
  success: boolean;
  pdfPath?: string;
  logPath?: string;
  error?: string;
  logs?: string;
}

/**
 * Write LaTeX content to file and compile to PDF
 * @param runId - Unique run identifier
 * @param latexContent - LaTeX source code
 * @returns Compilation result with paths and logs
 */
export async function writeAndCompileLatex(
  runId: string,
  latexContent: string
): Promise<CompileResult> {
  const runDir = join(config.runsDir, runId);
  const texPath = join(runDir, 'resume.tex');
  const pdfPath = join(runDir, 'resume.pdf');
  const logPath = join(runDir, 'compile.log');

  try {
    // Write LaTeX file
    writeFileSync(texPath, latexContent, 'utf-8');
    console.log(`✓ LaTeX file written: ${texPath}`);

    // Compile LaTeX to PDF using pdflatex
    // -interaction=nonstopmode: don't stop on errors
    // -output-directory: specify output location
    const command = `pdflatex -interaction=nonstopmode -output-directory="${runDir}" "${texPath}"`;

    console.log('Compiling LaTeX to PDF...');
    const { stdout, stderr } = await execAsync(command, {
      cwd: runDir,
      timeout: 30000, // 30 second timeout
    });

    const logs = stdout + '\n' + stderr;

    // Write compile logs
    writeFileSync(logPath, logs, 'utf-8');

    // Check if PDF was created
    const fs = await import('fs');
    if (fs.existsSync(pdfPath)) {
      console.log(`✓ PDF compiled successfully: ${pdfPath}`);
      return {
        success: true,
        pdfPath,
        logPath,
        logs: logs.substring(0, 500), // Return first 500 chars of logs
      };
    } else {
      console.error('PDF compilation failed - no PDF generated');
      return {
        success: false,
        logPath,
        error: 'PDF file was not generated',
        logs: logs.substring(0, 1000), // Return first 1000 chars on error
      };
    }
  } catch (error: any) {
    console.error('LaTeX compilation error:', error);

    // Extract useful error info
    const errorMessage = error.message || 'Unknown compilation error';
    const logs = error.stdout || error.stderr || errorMessage;

    // Write error logs
    try {
      writeFileSync(logPath, logs, 'utf-8');
    } catch (writeError) {
      console.error('Failed to write error logs:', writeError);
    }

    return {
      success: false,
      logPath,
      error: errorMessage,
      logs: logs.substring(0, 1000),
    };
  }
}

/**
 * Check if pdflatex is available on the system
 * @returns true if pdflatex is installed
 */
export async function checkLatexInstalled(): Promise<boolean> {
  try {
    await execAsync('pdflatex --version');
    return true;
  } catch {
    return false;
  }
}
