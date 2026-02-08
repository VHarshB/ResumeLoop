import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { config } from '@/lib/config';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const runId = params.id;

    // Validate runId to prevent path traversal
    if (!runId || runId.includes('..') || runId.includes('/') || runId.includes('\\')) {
      return NextResponse.json(
        { error: 'Invalid run ID' },
        { status: 400 }
      );
    }

    // Construct PDF path
    const pdfPath = join(config.runsDir, runId, 'resume.pdf');

    // Check if PDF exists
    if (!existsSync(pdfPath)) {
      return NextResponse.json(
        { error: 'PDF not found' },
        { status: 404 }
      );
    }

    // Read PDF file
    const pdfBuffer = readFileSync(pdfPath);

    // Return PDF with appropriate headers
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="resume-${runId}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error: any) {
    console.error('Error downloading PDF:', error);
    return NextResponse.json(
      { error: 'Failed to download PDF' },
      { status: 500 }
    );
  }
}
