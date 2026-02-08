# ResumeLoop - Complete Project Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture](#architecture)
4. [Workflow Pipeline](#workflow-pipeline)
5. [File Structure](#file-structure)
6. [Core Components](#core-components)
7. [Configuration](#configuration)
8. [Performance Tuning](#performance-tuning)
9. [Excel Integration](#excel-integration)
10. [Resume Customization](#resume-customization)
11. [Troubleshooting](#troubleshooting)

---

## Project Overview

**ResumeLoop** is an automated resume generation system that uses local AI to create tailored resumes for job applications. It reads job descriptions, extracts key information, generates customized resumes using your master resume, converts them to LaTeX, compiles PDFs, and tracks everything in an Excel spreadsheet.

### Key Features
- **Local AI processing** - No cloud dependency, uses Ollama with llama3.2:3b
- **Stage-aware tailoring** - Automatically detects FAANG/Mid-size/Startup stages
- **Excel tracking** - Integrates with existing SharePoint/OneDrive Excel trackers
- **ATS-optimized** - Custom LaTeX template for Applicant Tracking Systems
- **Fast generation** - 1-2 minutes per resume with optimizations

### Use Case
You paste a job description into the web interface → JobLoop generates a tailored resume PDF and adds the job to your tracker spreadsheet automatically.

---

## Technology Stack

### Frontend
- **Next.js 14.2.0** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **React** - UI component library

### Backend (API Routes)
- **Next.js API Routes** - Serverless functions
- **Node.js v20.18.0** - JavaScript runtime
- **Zod** - Schema validation for requests/responses

### AI & Generation
- **Ollama v0.15.4** - Local LLM inference server
- **llama3.2:3b** - 2GB fast language model (customizable)
- **Custom prompts** - Stage-aware resume tailoring system

### Document Processing
- **ExcelJS 4.4.0** - Excel file manipulation (read/write)
- **MiKTeX 25.4** - LaTeX distribution for PDF compilation
- **pdflatex** - LaTeX to PDF compiler

### Development
- **Python 3.13.0** - Venv for PDF reading during setup
- **Git** - Version control
- **GitHub** - Remote repository (https://github.com/VHarshB/ResumeLoop)

---

## Architecture

### System Design
```
┌─────────────────┐
│   Web Browser   │
│  (localhost:3000)│
└────────┬────────┘
         │ HTTP POST /api/run
         ▼
┌─────────────────────────────────┐
│     Next.js Server              │
│  ┌───────────────────────────┐  │
│  │  API Route: /api/run      │  │
│  │  - Validates request      │  │
│  │  - Orchestrates pipeline  │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│   5-Step Pipeline               │
│                                 │
│  1. Extract → lib/ollama.ts     │
│  2. Track   → lib/excel.ts      │
│  3. Resume  → lib/ollama.ts     │
│  4. LaTeX   → lib/ollama.ts     │
│  5. Compile → lib/latex.ts      │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│   External Services             │
│  - Ollama (localhost:11434)     │
│  - pdflatex (MiKTeX)            │
│  - Excel file (Downloads/)      │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│   Output                        │
│  - data/runs/{runId}/resume.pdf │
│  - Excel tracker updated        │
│  - Download link returned       │
└─────────────────────────────────┘
```

### Data Flow
1. **User Input** → Job description (required), Job link (optional)
2. **Request** → `POST /api/run` with JSON body
3. **Processing** → 5-step pipeline creates run directory and files
4. **Storage** → Files saved to `data/runs/{runId}/`
5. **Tracking** → New row appended to Excel tracker
6. **Response** → Download URL for generated PDF

---

## Workflow Pipeline

### Step 1: Extract Job Fields
**File:** `app/api/run/route.ts` (line 40-75)  
**AI Call:** `ollamaChat(model, SYSTEM_EXTRACT, jobDescription)`

**What it does:**
- Sends JD to AI with extraction prompt
- AI parses and returns JSON: `{company, title, location, pay, link}`
- Overwrites link if user provided one
- Saves to `data/runs/{runId}/extract.json`

**Prompt:** `prompts/extract_prompt.txt`

**Time:** ~5-20 seconds

---

### Step 2: Update Excel Tracker
**File:** `lib/excel.ts` → `appendJobToExcel()`

**What it does:**
- Opens existing Excel file (or creates new one)
- Finds specified sheet name ("Job Search Database")
- Reads header row (row 2) to build column map
- Finds last non-empty row
- Appends new row after last row with mapped data:
  - Job Title → fields.title
  - Organization → fields.company
  - Link to Job Post → fields.link
  - Job Description → full JD text
  - Pay → fields.pay
  - Date Applied → today's date
- Saves Excel file

**Configuration:**
```env
JOBLOOP_EXCEL=C:\Users\vaish\Downloads\INTERNSHIP APPLICATION TRACKER (1).xlsx
JOBLOOP_EXCEL_SHEET=Job Search Database
JOBLOOP_EXCEL_HEADER_ROW=2
```

**Time:** ~2-5 seconds

**Error Handling:**
- If Excel is open: "Excel file is locked. Close '...' in Excel and try again."
- If sheet not found: Uses first worksheet
- If header row empty: Throws error

---

### Step 3: Generate Tailored Resume
**File:** `app/api/run/route.ts` (line 86-97)  
**AI Call:** `ollamaChat(model, SYSTEM_RESUME, masterResume + JD)`

**What it does:**
- Loads master resume from `assets/master_resume.txt`
- Loads resume prompt from `prompts/resume_prompt.txt`
- Sends both to AI with instructions to tailor
- AI analyzes JD for stage (FAANG/Mid-size/Startup)
- AI selects relevant experiences, rewrites bullets
- Returns tailored resume text
- Saves to `data/runs/{runId}/resume.txt`

**Prompt Features:**
- **Stage Detection:** Identifies company size/type from JD
- **Bullet Rules:** Action verb + metric + impact, no periods
- **Metric Preservation:** Never invents numbers
- **Filename Format:** `{company}_{position}_(HarshV)`

**Time:** ~40-90 seconds (longest step)

---

### Step 4: Convert to LaTeX
**File:** `app/api/run/route.ts` (line 99-111)  
**AI Call:** `ollamaChat(model, SYSTEM_LATEX, tailoredResume)`

**What it does:**
- Loads LaTeX prompt from `prompts/latex_prompt.txt`
- Sends tailored resume text to AI
- AI converts to LaTeX using custom template style
- Handles special characters (`&`, `#`, `_`, etc.)
- Uses custom environments: `twocolentry`, `onecolentry`, `highlights`
- Removes markdown code blocks if present
- Saves to `data/runs/{runId}/resume.tex`

**Template:** `templates/resume_template.tex`

**Key LaTeX Rules:**
- No periods at end of bullet points
- Proper escaping for special characters
- Custom spacing and formatting
- ATS-compatible fonts and structure

**Time:** ~20-45 seconds

---

### Step 5: Compile PDF
**File:** `lib/latex.ts` → `writeAndCompileLatex()`

**What it does:**
- Writes LaTeX content to `resume.tex`
- Runs `pdflatex` command with options:
  - `-interaction=nonstopmode` (don't stop on errors)
  - `-output-directory` (specify output location)
  - 30 second timeout
- Checks if PDF was created
- Saves compilation logs to `compile.log`
- Returns success/failure with error details

**Command:**
```bash
pdflatex -interaction=nonstopmode -output-directory="data/runs/{runId}" "data/runs/{runId}/resume.tex"
```

**Output:** `data/runs/{runId}/resume.pdf`

**Time:** ~2-8 seconds

**Error Handling:**
- If pdflatex not installed: Falls back to error message
- If compilation fails: Returns logs with line numbers
- If timeout: Returns partial logs

---

## File Structure

```
ResumeLoop/
├── .env.local                    # Environment configuration (not in git)
├── .env.example                  # Environment template
├── .gitignore                    # Git ignore rules
├── package.json                  # Node dependencies
├── tsconfig.json                 # TypeScript configuration
├── next.config.js                # Next.js configuration
├── tailwind.config.js            # Tailwind CSS configuration
├── postcss.config.js             # PostCSS configuration
│
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout with metadata
│   ├── page.tsx                  # Main UI page (form, history)
│   ├── globals.css               # Global styles
│   └── api/
│       ├── run/
│       │   └── route.ts          # POST /api/run - Main pipeline
│       └── download/[id]/
│           └── route.ts          # GET /api/download/{id} - PDF download
│
├── lib/                          # Core business logic
│   ├── config.ts                 # Configuration loader (env vars)
│   ├── ollama.ts                 # Ollama API client
│   ├── excel.ts                  # Excel tracker integration
│   ├── latex.ts                  # LaTeX compilation
│   ├── prompts.ts                # Prompt loaders
│   └── utils.ts                  # Run ID, directory creation
│
├── prompts/                      # AI prompts
│   ├── extract_prompt.txt        # Field extraction instructions
│   ├── resume_prompt.txt         # Resume tailoring instructions (custom)
│   └── latex_prompt.txt          # LaTeX conversion instructions
│
├── templates/                    # LaTeX templates
│   └── resume_template.tex       # Custom resume template (twocolentry/onecolentry)
│
├── assets/                       # Static assets
│   └── master_resume.txt         # Master resume (Harsh Vaishya's details)
│
├── data/                         # Generated data (not in git)
│   ├── runs/                     # Run directories
│   │   └── {runId}/              # Individual run (YYYYMMDD-HHMMSS-random)
│   │       ├── jd.txt            # Original job description
│   │       ├── extract.json      # Extracted fields
│   │       ├── resume.txt        # Tailored resume text
│   │       ├── resume.tex        # LaTeX source
│   │       ├── resume.pdf        # Final PDF
│   │       └── compile.log       # pdflatex logs
│   └── jobs.xlsx                 # Fallback Excel (if not using external)
│
├── Aboutproject.pdf              # Project specification
├── architectureproject.pdf       # Architecture documentation
├── README.md                     # Quick start guide
└── PROJECT_DOCUMENTATION.md      # This file
```

---

## Core Components

### 1. Configuration (`lib/config.ts`)
**Purpose:** Centralized configuration from environment variables

**Settings:**
```typescript
{
  model: 'llama3.2:3b',              // AI model name
  ollamaHost: 'http://localhost:11434', // Ollama API endpoint
  ollamaTimeout: 120000,              // Request timeout (2 minutes)
  ollamaNumThread: undefined,         // CPU threads (auto-detect)
  ollamaNumCtx: undefined,            // Context window size
  ollamaNumPredict: undefined,        // Max output tokens
  ollamaKeepAlive: '5m',              // Keep model loaded
  runsDir: 'data/runs',               // Run output directory
  excelPath: 'C:\\Users\\...',        // Excel tracker path
  excelSheet: 'Job Search Database',  // Target sheet name
  excelHeaderRow: 2,                  // Header row number
  promptsDir: 'prompts',              // Prompts directory
  templatesDir: 'templates',          // Templates directory
  assetsDir: 'assets'                 // Assets directory
}
```

---

### 2. Ollama Client (`lib/ollama.ts`)
**Purpose:** Interface with local Ollama AI server

**Key Functions:**

#### `ollamaChat(model, systemPrompt, userMessage)`
- Sends chat request to Ollama
- Adds system and user messages
- Configures performance options (threads, context, predict)
- Sets keep-alive to keep model warm
- Handles timeout with abort controller
- Returns AI response text

**Request Structure:**
```typescript
{
  model: 'llama3.2:3b',
  messages: [
    { role: 'system', content: '...' },
    { role: 'user', content: '...' }
  ],
  stream: false,
  keep_alive: '5m',
  options: {
    num_thread: 12,    // CPU threads
    num_ctx: 4096,     // Context size
    num_predict: 1024  // Max output
  }
}
```

#### `testOllamaConnection()`
- Checks if Ollama is reachable
- Calls `/api/tags` endpoint
- Returns true/false

**Error Handling:**
- Timeout: "Ollama timeout after 120s. Check if Ollama is running"
- Connection refused: "Cannot connect to Ollama. Is Ollama running? Start with: ollama serve"
- Other errors: Returns full error message

---

### 3. Excel Integration (`lib/excel.ts`)
**Purpose:** Read and write to Excel tracker spreadsheet

**Key Functions:**

#### `appendJobToExcel(fields, runId, pdfPath, jobDescription)`

**Process:**
1. Load workbook from file or create new
2. Find target sheet by name (case-insensitive)
3. Read header row to build column map (normalized, lowercase)
4. Find last non-empty row
5. Build row values array matching column indices
6. Insert row after last row
7. Save workbook

**Header Normalization:**
```typescript
'Job Title' → 'job title'
' Organization ' → 'organization'
'Link to Job Post' → 'link to job post'
```

**Column Mapping:**
```typescript
'job title' → fields.title
'organization' → fields.company
'link to job post' → fields.link
'job description' → jobDescription (full text)
'pay' → fields.pay
'date applied' → new Date() (today)
```

**Unmapped columns:** Left blank

**Row Insertion Logic:**
```typescript
const lastRowNumber = worksheet.lastRow?.number ?? headerRowIndex;
const targetRow = Math.max(lastRowNumber + 1, headerRowIndex + 1);
```

**Error Handling:**
- EBUSY: "Excel file is locked. Close '...' in Excel and try again."
- Sheet not found: Uses first worksheet
- Empty header: Throws error

---

### 4. LaTeX Compilation (`lib/latex.ts`)
**Purpose:** Compile LaTeX to PDF using pdflatex

**Key Functions:**

#### `writeAndCompileLatex(runId, latexContent)`

**Process:**
1. Write LaTeX content to `resume.tex`
2. Execute `pdflatex` command
3. Wait for completion (30s timeout)
4. Check if PDF was created
5. Save compilation logs
6. Return result with success/failure

**Command Execution:**
```typescript
const command = `pdflatex -interaction=nonstopmode -output-directory="${runDir}" "${texPath}"`;
await execAsync(command, { cwd: runDir, timeout: 30000 });
```

**Return Structure:**
```typescript
{
  success: boolean,
  pdfPath?: string,
  logPath?: string,
  error?: string,
  logs?: string
}
```

#### `checkLatexInstalled()`
- Runs `pdflatex --version`
- Returns true if installed

---

### 5. Prompt System (`lib/prompts.ts`)
**Purpose:** Load prompts and assets from files

**Functions:**
- `loadPrompt(filename)` - Load prompt from `prompts/`
- `loadMasterResume()` - Load from `assets/master_resume.txt`
- `loadLatexTemplate()` - Load from `templates/resume_template.tex`

**Exported Constants:**
- `SYSTEM_EXTRACT` - Field extraction prompt
- `SYSTEM_RESUME` - Resume tailoring prompt (custom Claude-based)
- `SYSTEM_LATEX` - LaTeX conversion prompt

---

### 6. Utilities (`lib/utils.ts`)
**Purpose:** Helper functions for run management

**Functions:**
- `generateRunId()` - Creates `YYYYMMDD-HHMMSS-{6random}` ID
- `createRunDirectory(runId)` - Creates `data/runs/{runId}/`
- `saveRunFile(runId, filename, content)` - Saves text file
- `saveRunJson(runId, filename, data)` - Saves JSON file

---

## Configuration

### Environment Variables

#### Required
```env
# AI Model
JOBLOOP_MODEL=llama3.2:3b

# Excel Tracker
JOBLOOP_EXCEL=C:\Users\vaish\Downloads\INTERNSHIP APPLICATION TRACKER (1).xlsx
JOBLOOP_EXCEL_SHEET=Job Search Database
JOBLOOP_EXCEL_HEADER_ROW=2
```

#### Optional (Performance)
```env
# Ollama Connection
OLLAMA_HOST=http://localhost:11434
OLLAMA_TIMEOUT=120000                # 2 minutes (milliseconds)
OLLAMA_KEEP_ALIVE=5m                 # Keep model loaded

# Ollama Performance
OLLAMA_NUM_THREAD=                   # Auto-detect (leave empty)
OLLAMA_NUM_CTX=                      # Context window (e.g., 2048)
OLLAMA_NUM_PREDICT=                  # Max output tokens (e.g., 700)

# Paths
JOBLOOP_RUNS_DIR=data/runs
```

### Files to Customize

#### 1. Master Resume (`assets/master_resume.txt`)
Your complete resume with all experiences, projects, skills.

**Current Content:**
- Harsh Vaishya's contact info
- ASU education
- 4 hackathons (Tom Riddle AI-3rd, CRM-Top 5, Faith-1st, Melodia-2nd)
- 2 personal projects (Registration System, EnKoat)
- Work experience at ASU
- Skills and leadership

**Format:** Plain text, detailed descriptions

#### 2. Resume Prompt (`prompts/resume_prompt.txt`)
Instructions for how AI should tailor resumes.

**Key Features:**
- **Stage detection:** FAANG vs Mid-size vs Startup
- **Bullet rules:** Action verb + specific implementation + metric + impact
- **No periods:** Bullets end without punctuation
- **Metric preservation:** Never invent numbers
- **Filename format:** `{Company}_{Position}_(HarshV)`

**Stages:**
```
FAANG: 75% technical depth, algorithms, scale
Mid-size: 60% technical, 40% business impact
Startup: 50% technical, 50% autonomy/versatility
```

#### 3. LaTeX Template (`templates/resume_template.tex`)
Custom LaTeX formatting with special environments.

**Environments:**
- `\twocolentry{left}{right}` - Two-column entry (dates on right)
- `\onecolentry{text}` - Single-column entry (section headers)
- `\begin{highlights} ... \end{highlights}` - Bullet list

**Styling:**
- No bold section headers
- Custom spacing (0.10 cm between entries)
- ATS-compatible fonts
- Proper margins

---

## Performance Tuning

### Current Timing (per job)
```
Extract:   5-20s   (short AI call)
Excel:     2-5s    (file I/O)
Resume:    40-90s  (longest - complex AI)
LaTeX:     20-45s  (medium AI call)
Compile:   2-8s    (pdflatex)
────────────────────
Total:     ~1-2 minutes
```

### Optimization Options

#### 1. Keep Model Warm (ENABLED)
```env
OLLAMA_KEEP_ALIVE=5m
```
**Impact:** Eliminates 10-30s model loading between runs  
**Tradeoff:** Uses 2.5GB RAM continuously

#### 2. Limit Output Length
```env
OLLAMA_NUM_PREDICT=700
```
**Impact:** Reduces resume/LaTeX generation by 20-40%  
**Tradeoff:** May truncate long resumes

#### 3. Reduce Context Window
```env
OLLAMA_NUM_CTX=2048
```
**Impact:** Faster processing for long JDs  
**Tradeoff:** May miss context in very long descriptions

#### 4. Use All CPU Threads (AUTO-ENABLED)
```env
OLLAMA_NUM_THREAD=12
```
**Impact:** Uses all available CPU cores  
**Note:** Auto-detected, don't set manually

#### 5. Merge Resume + LaTeX Steps (NOT IMPLEMENTED)
**Concept:** Single AI call generates LaTeX directly  
**Impact:** Could reduce total time by 30-50%  
**Tradeoff:** Less control over intermediate resume text

### Recommended Settings for Speed
```env
OLLAMA_NUM_CTX=3072          # Enough for most JDs
OLLAMA_NUM_PREDICT=800       # Enough for 1-page resume
OLLAMA_KEEP_ALIVE=5m         # Always keep loaded
OLLAMA_TIMEOUT=90000         # 90 seconds
```

**Expected timing:** 45-75 seconds per job

---

## Excel Integration

### Supported Excel Formats
- `.xlsx` (Office Open XML)
- SharePoint/OneDrive synced files
- Local files

### Sheet Detection
- Case-insensitive: "Job Search Database" = "job search database"
- Whitespace-trimmed
- Falls back to first sheet if not found

### Header Row Reading
1. Specified row (e.g., row 2) is read
2. Each cell value is normalized:
   - Converted to lowercase
   - Whitespace trimmed
   - Special characters preserved
3. Column index map is built

### Column Mapping
**Standard mapping:**
```
"job title" → fields.title
"organization" → fields.company
"link to job post" → fields.link
"job description" → jobDescription (full text)
"pay" → fields.pay
"date applied" → new Date() (today)
```

**Unmapped columns:**
- "close/review date" → blank
- "hiring manager/helpful contact information" → blank
- "heard back" → blank
- "sent thank yous" → blank

### Row Insertion
1. Find last non-empty row (checks for any cell with value)
2. Insert at `lastRow + 1`
3. Handles sparse data (skips empty rows)

### Column Value Population
```typescript
const rowValues = [];  // Array matching column count
rowValues[jobTitleCol] = fields.title;
rowValues[organizationCol] = fields.company;
// etc.
```

**Write method:**
```typescript
const row = worksheet.getRow(targetRow);
row.values = rowValues;
row.commit();
```

### Lock Detection
If Excel file is open in Excel:
```
Error: EBUSY: resource busy or locked
Message: "Excel file is locked. Close '...' in Excel and try again."
```

**Solution:** Close Excel completely before running JobLoop

---

## Resume Customization

### Stage Detection Logic

**FAANG Stage (Tech giants):**
- Keywords: Google, Meta, Amazon, Apple, Microsoft, Netflix
- Keywords: scalability, distributed systems, algorithms
- Emphasis: Technical depth (75%), system design, efficiency

**Mid-size Stage (Established companies):**
- Keywords: Schneider, IBM, OneMain, established companies
- Keywords: team collaboration, business impact
- Emphasis: Balance (60% technical, 40% business)

**Startup Stage (Small/growing companies):**
- Keywords: startup, founding team, seed stage
- Keywords: autonomy, multiple roles, rapid iteration
- Emphasis: Versatility (50% technical, 50% ownership)

### Bullet Point Rules

**Format:** `Action verb + specific implementation + metric (if applicable) + impact`

**Example:**
```
❌ Bad: "Developed a website for the company"
✅ Good: "Architected full-stack web application using React and Node.js, reducing page load times by 40%"
```

**Key Rules:**
1. No periods at end
2. Start with strong action verb (Architected, Engineered, Optimized)
3. Include specific technologies
4. Preserve existing metrics (never invent)
5. Show impact/result

### Experience Selection
- Match JD requirements to master resume experiences
- Choose 3-5 most relevant projects/roles
- Prioritize recent and high-impact work
- Adapt bullet points for each stage

### File Naming Convention
```
{Company}_{Position}_(HarshV)
Example: Google_SoftwareEngineer_(HarshV)
```

---

## Troubleshooting

### Common Errors

#### 1. Excel File Locked (EBUSY)
**Error:**
```
Error: EBUSY: resource busy or locked, open 'C:\Users\...\TRACKER.xlsx'
```

**Solution:**
1. Close Excel completely
2. Check Task Manager for lingering Excel processes
3. Try again

---

#### 2. Ollama Timeout
**Error:**
```
Ollama timeout after 120s. Check if Ollama is running: ollama serve
```

**Causes:**
- Ollama service stopped
- Model not loaded
- System too slow

**Solutions:**
1. Check Ollama status:
   ```powershell
   ollama ps
   ```
2. Restart Ollama:
   ```powershell
   ollama serve
   ```
3. Increase timeout:
   ```env
   OLLAMA_TIMEOUT=180000  # 3 minutes
   ```
4. Use smaller model:
   ```env
   JOBLOOP_MODEL=llama3.2:1b
   ```

---

#### 3. Cannot Connect to Ollama
**Error:**
```
Cannot connect to Ollama. Is Ollama running? Start with: ollama serve
```

**Solutions:**
1. Start Ollama:
   ```powershell
   ollama serve
   ```
2. Check if running:
   ```powershell
   Get-Process ollama
   ```
3. Verify host:
   ```env
   OLLAMA_HOST=http://localhost:11434
   ```

---

#### 4. LaTeX Compilation Failed
**Error:**
```
PDF compilation failed - no PDF generated
```

**Causes:**
- MiKTeX not installed
- LaTeX syntax errors
- Missing packages

**Solutions:**
1. Install MiKTeX: https://miktex.org/download
2. Check compile logs: `data/runs/{runId}/compile.log`
3. Test pdflatex:
   ```powershell
   pdflatex --version
   ```
4. Review LaTeX content: `data/runs/{runId}/resume.tex`

**Common LaTeX errors:**
- Unescaped special characters (`&`, `#`, `_`, `%`)
- Missing `\end{document}`
- Invalid environment names

---

#### 5. Excel Sheet Not Found
**Error:**
```
No worksheet found in the Excel tracker.
```

**Solutions:**
1. Check sheet name in Excel
2. Update `.env.local`:
   ```env
   JOBLOOP_EXCEL_SHEET=Correct Sheet Name
   ```
3. Check for typos (case-insensitive but spelling matters)

---

#### 6. Header Row Empty
**Error:**
```
Header row is empty. Check JOBLOOP_EXCEL_HEADER_ROW.
```

**Solutions:**
1. Verify header row number (1-indexed):
   ```env
   JOBLOOP_EXCEL_HEADER_ROW=2
   ```
2. Open Excel and check row has headers
3. Ensure headers are not merged cells

---

### Performance Issues

#### Slow Generation (>3 minutes)
**Causes:**
- Model not loaded
- CPU throttling
- Large context/output

**Solutions:**
1. Keep model warm:
   ```env
   OLLAMA_KEEP_ALIVE=5m
   ```
2. Use all threads (auto-enabled)
3. Limit output:
   ```env
   OLLAMA_NUM_PREDICT=700
   ```
4. Use faster model:
   ```env
   JOBLOOP_MODEL=llama3.2:1b  # 1.3GB, faster
   ```

#### High Memory Usage
**Cause:** Model loaded in RAM (2.5GB for llama3.2:3b)

**Solutions:**
1. Use smaller model:
   ```env
   JOBLOOP_MODEL=llama3.2:1b  # 1.3GB
   ```
2. Reduce keep-alive:
   ```env
   OLLAMA_KEEP_ALIVE=2m
   ```
3. Unload model manually:
   ```powershell
   ollama stop llama3.2:3b
   ```

---

### Debugging Tips

#### 1. Check Run Logs
Every run creates a directory with all intermediate files:
```
data/runs/{runId}/
├── jd.txt          # Original job description
├── extract.json    # Extracted fields
├── resume.txt      # Tailored resume text
├── resume.tex      # LaTeX source
├── resume.pdf      # Final PDF (if successful)
└── compile.log     # pdflatex output
```

#### 2. Test Ollama Directly
```powershell
ollama run llama3.2:3b "Say hello"
```

#### 3. Check Excel Manually
Open Excel file and verify:
- Correct sheet name
- Header row number
- Last row number
- Column names

#### 4. Validate LaTeX
Copy `resume.tex` content and test online:
https://www.overleaf.com/

#### 5. Monitor Ollama
```powershell
ollama ps  # See loaded models
ollama list  # See all models
```

---

## Development Workflow

### Starting Development Server
```powershell
npm run dev
```
Access at `http://localhost:3000`

### Running Ollama
```powershell
ollama serve
```
Background service on port 11434

### Git Workflow
```powershell
# Check status
git status

# Add changes
git add .

# Commit
git commit -m "Description"

# Push to GitHub
git push

# Pull latest
git pull
```

### Environment Files
- `.env.local` - Your local configuration (not in git)
- `.env.example` - Template for others (in git)

**Never commit `.env.local` to git!**

---

## API Reference

### POST /api/run
**Request:**
```json
{
  "jd": "string (required, min 10 chars)",
  "jobLink": "string (optional)",
  "resumePrompt": "string (optional)",
  "latexPrompt": "string (optional)"
}
```

**Response (Success):**
```json
{
  "runId": "20260208-020930-g0h89u",
  "fields": {
    "company": "OneMain Financial",
    "title": "Technology Intern",
    "location": "Remote",
    "pay": "Target base salary is $25.00",
    "link": "https://..."
  },
  "downloadUrl": "/api/download/20260208-020930-g0h89u",
  "status": "ok",
  "logs": {
    "compile": "..."
  }
}
```

**Response (Error):**
```json
{
  "status": "error",
  "error": "Error message",
  "details": "Additional details"
}
```

### GET /api/download/{runId}
**Response:**
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="resume.pdf"`
- Body: PDF file bytes

**Errors:**
- 404: Run ID not found
- 404: PDF not compiled yet
- 500: File read error

---

## Future Enhancements

### Potential Features
1. **Merge Resume + LaTeX Steps**
   - Single AI call for both
   - 30-50% faster
   - Less intermediate storage

2. **Batch Processing**
   - Queue multiple jobs
   - Process in parallel
   - Background task queue

3. **Web Interface Improvements**
   - Live progress updates (websockets)
   - PDF preview in browser
   - Edit LaTeX before compile

4. **Resume Versions**
   - Save multiple versions per job
   - A/B testing different styles
   - Version history

5. **Custom Field Mapping**
   - UI to configure Excel columns
   - Multiple tracker support
   - Custom data transformations

6. **AI Model Options**
   - Switch models per step
   - Use different models for extract/resume/latex
   - GPU acceleration support

7. **Cover Letter Generation**
   - Additional pipeline step
   - Uses same prompt system
   - PDF or Word output

8. **Analytics Dashboard**
   - Tracking application success rates
   - Time to generate metrics
   - Most common job types

---

## Credits & References

### Built By
- Harsh Vaishya (hvaishya@asu.edu)
- Arizona State University

### GitHub Repository
https://github.com/VHarshB/ResumeLoop

### Technologies Used
- Next.js: https://nextjs.org/
- Ollama: https://ollama.ai/
- ExcelJS: https://github.com/exceljs/exceljs
- MiKTeX: https://miktex.org/

### Documentation Sources
- `Aboutproject.pdf` - Original project specification
- `architectureproject.pdf` - Architecture design
- Custom Claude resume prompt by user

---

## License & Usage

This project is for personal use in automating job application resume generation.

**Do not:**
- Submit AI-generated content without review
- Falsify experience or metrics
- Use for commercial purposes without attribution

**Do:**
- Customize prompts for your needs
- Share improvements via pull requests
- Adapt architecture for other use cases

---

## Version History

### v1.0.0 (Initial Release) - February 8, 2026
- ✅ 5-step pipeline (extract → track → resume → latex → compile)
- ✅ Custom Claude-based resume prompt
- ✅ Excel tracker integration
- ✅ Custom LaTeX template
- ✅ Stage-aware tailoring
- ✅ Performance optimizations
- ✅ Error handling and timeouts

### Key Commits
- `94affb9` - Initial commit with full project
- `b050385` - Custom resume prompt and master resume

---

**End of Documentation**
