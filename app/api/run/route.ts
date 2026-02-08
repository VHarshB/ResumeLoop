import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ollamaChat } from '@/lib/ollama';
import { config } from '@/lib/config';
import { SYSTEM_EXTRACT, SYSTEM_RESUME, SYSTEM_LATEX, loadMasterResume } from '@/lib/prompts';
import { appendJobToExcel, JobFields } from '@/lib/excel';
import { writeAndCompileLatex } from '@/lib/latex';
import { generateRunId, createRunDirectory, saveRunFile, saveRunJson } from '@/lib/utils';

// Request schema
const RunRequestSchema = z.object({
  jd: z.string().min(10, 'Job description is too short'),
  jobLink: z.string().optional(),
  resumePrompt: z.string().optional(),
  latexPrompt: z.string().optional(),
});

// Extracted fields schema
const ExtractedFieldsSchema = z.object({
  company: z.string(),
  title: z.string(),
  location: z.string(),
  pay: z.string(),
  link: z.string(),
});

export async function POST(request: NextRequest) {
  console.log('\n=== NEW RUN STARTED ===');

  try {
    // Parse and validate request
    const body = await request.json();
    const { jd, jobLink, resumePrompt, latexPrompt } = RunRequestSchema.parse(body);

    // Generate unique run ID and create directory
    const runId = generateRunId();
    createRunDirectory(runId);

    // Save job description
    saveRunFile(runId, 'jd.txt', jd);

    console.log(`\nRun ID: ${runId}`);
    console.log('Step 1: Extracting job fields...');

    // STEP 1: Extract fields from JD
    let extractPrompt = jd;
    if (jobLink) {
      extractPrompt += `\n\nJob Link: ${jobLink}`;
    }

    const extractResponse = await ollamaChat(config.model, SYSTEM_EXTRACT, extractPrompt);

    // Parse extracted fields
    let fields: JobFields;
    try {
      // Try to parse JSON directly
      const parsed = JSON.parse(extractResponse);
      fields = ExtractedFieldsSchema.parse(parsed);
    } catch (parseError) {
      console.error('Failed to parse extraction response, retrying...');
      
      // Retry with a fix instruction
      const retryPrompt = `The previous response was not valid JSON. Please provide ONLY a valid JSON object with the fields: company, title, location, pay, link.\n\nJob Description:\n${jd}`;
      const retryResponse = await ollamaChat(config.model, SYSTEM_EXTRACT, retryPrompt);
      
      try {
        const parsed = JSON.parse(retryResponse);
        fields = ExtractedFieldsSchema.parse(parsed);
      } catch (retryError) {
        throw new Error('Failed to extract job fields after retry');
      }
    }

    // Override link if provided
    if (jobLink) {
      fields.link = jobLink;
    }

    // Save extracted fields
    saveRunJson(runId, 'extract.json', fields);
    console.log('✓ Extracted fields:', fields);

    console.log('\nStep 2: Updating Excel tracker...');

    // STEP 2: Update Excel tracker
    const pdfPath = `data/runs/${runId}/resume.pdf`;
    await appendJobToExcel(fields, runId, pdfPath);

    console.log('\nStep 3: Generating tailored resume...');

    // STEP 3: Generate tailored resume
    const masterResume = loadMasterResume();
    const resumeSystemPrompt = resumePrompt || SYSTEM_RESUME;
    
    const resumeUserPrompt = `Master Resume:\n${masterResume}\n\n---\n\nJob Description:\n${jd}\n\n---\n\nGenerate a tailored resume for this job.`;
    
    const tailoredResume = await ollamaChat(config.model, resumeSystemPrompt, resumeUserPrompt);
    saveRunFile(runId, 'resume.txt', tailoredResume);
    console.log('✓ Resume generated');

    console.log('\nStep 4: Converting to LaTeX...');

    // STEP 4: Convert to LaTeX
    const latexSystemPrompt = latexPrompt || SYSTEM_LATEX;
    const latexUserPrompt = `Resume Content:\n${tailoredResume}\n\n---\n\nConvert this to LaTeX code.`;
    
    let latexContent = await ollamaChat(config.model, latexSystemPrompt, latexUserPrompt);
    
    // Clean up LaTeX content (remove markdown code blocks if present)
    latexContent = latexContent.replace(/```latex\n/g, '').replace(/```\n?/g, '').trim();
    
    saveRunFile(runId, 'resume.tex', latexContent);
    console.log('✓ LaTeX generated');

    console.log('\nStep 5: Compiling PDF...');

    // STEP 5: Compile LaTeX to PDF
    const compileResult = await writeAndCompileLatex(runId, latexContent);

    if (!compileResult.success) {
      console.error('❌ PDF compilation failed');
      return NextResponse.json({
        runId,
        fields,
        downloadUrl: null,
        status: 'error',
        error: 'LaTeX compilation failed. Check compile.log for details.',
        logs: {
          compile: compileResult.logs,
        },
      }, { status: 500 });
    }

    console.log('✓ PDF compiled successfully');
    console.log('\n=== RUN COMPLETED SUCCESSFULLY ===\n');

    // Return success response
    return NextResponse.json({
      runId,
      fields,
      downloadUrl: `/api/download/${runId}`,
      status: 'ok',
      logs: {
        compile: compileResult.logs,
      },
    });

  } catch (error: any) {
    console.error('❌ Run failed:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        status: 'error',
        error: 'Invalid request data',
        details: error.errors,
      }, { status: 400 });
    }

    // Handle other errors
    return NextResponse.json({
      status: 'error',
      error: error.message || 'Unknown error occurred',
    }, { status: 500 });
  }
}
