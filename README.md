# JobLoop – Automated Resume Generator

> **Local-first AI tool** for generating tailored resumes from job descriptions

Paste a job description → Get a tailored PDF resume in 20-30 seconds. All processing happens locally using AI (Ollama). No API costs, no internet required, completely private.

## 🎯 Features

- **One-click resume generation** from job descriptions
- **Excel tracker** automatically logs all applications
- **Loop workflow** - generate hundreds of resumes
- **100% local & offline** - free unlimited usage
- **Professional PDFs** via LaTeX compilation
- **Simple UI** - ChatGPT-like interface

## ✅ System Status

All prerequisites are already installed:

- ✅ Node.js v20.18.0
- ✅ Ollama v0.15.4 with **llama3.2:3b** model
- ✅ MiKTeX (LaTeX) 25.4
- ✅ npm packages

## 🚀 Quick Start

### 1. Update Your Master Resume

**Important:** Edit your resume in `assets/master_resume.txt` before generating tailored versions.

### 2. Start the Application

```bash
npm run dev
```

Open: **http://localhost:3000**

### 3. Generate Resumes

1. Paste a job description
2. (Optional) Add job posting URL
3. Click "Generate Resume"
4. Wait ~20-30 seconds
5. Download your tailored PDF
6. Repeat for more jobs

## 📊 What Gets Created

### Excel Tracker
`data/jobs.xlsx` tracks all applications with:
- Date/Time
- Company, Title, Location, Pay
- Job Link
- Run ID and PDF path

### Run Artifacts
Each generation creates `data/runs/<runId>/`:
- `jd.txt` - Job description
- `extract.json` - Extracted fields
- `resume.txt` - Tailored resume text
- `resume.tex` - LaTeX source
- `resume.pdf` - **Your PDF resume**
- `compile.log` - Compilation logs

## 🔧 Customization

### Change AI Model

Edit `.env.local`:
```env
JOBLOOP_MODEL=llama3.2:3b
```

Available models (after `ollama pull <model>`):
- `llama3.2:3b` (2GB, fast) ← Currently used
- `llama3.2:1b` (1GB, very fast)
- `qwen2.5:7b` (4.7GB, better quality)
- `qwen2.5:14b` (8GB, best quality)

### Customize Prompts

Edit files in `prompts/`:
- `extract_prompt.txt` - How AI extracts job fields
- `resume_prompt.txt` - How AI tailors your resume
- `latex_prompt.txt` - How AI converts to LaTeX

### Customize PDF Layout

Edit `templates/resume_template.tex` to change formatting.

## 📁 Project Structure

```
ResumeLoop/
├── app/
│   ├── page.tsx              # Main UI
│   ├── api/
│   │   ├── run/route.ts      # Generation pipeline
│   │   └── download/[id]/route.ts  # PDF download
│   ├── layout.tsx
│   └── globals.css
├── lib/
│   ├── ollama.ts             # AI integration
│   ├── excel.ts              # Excel tracker
│   ├── latex.ts              # PDF compilation
│   ├── prompts.ts            # Prompt loader
│   ├── config.ts             # Configuration
│   └── utils.ts              # Utilities
├── prompts/                  # AI prompts (customizable)
├── assets/
│   └── master_resume.txt     # YOUR RESUME (edit this!)
├── templates/
│   └── resume_template.tex   # LaTeX template
├── data/                     # Auto-created
│   ├── jobs.xlsx            # Application tracker
│   └── runs/                # Generated resumes
├── .env.local               # Environment config
└── package.json
```

## 🔄 How It Works

```
Job Description → Extract Fields → Update Excel → Generate Resume
                                      ↓
                  Download PDF ← Compile LaTeX ← Convert to LaTeX
```

1. **Extract** - AI parses JD for company, title, location, pay, link
2. **Track** - Appends job info to Excel spreadsheet
3. **Generate** - AI creates tailored resume from master resume + JD
4. **Convert** - AI transforms resume text into LaTeX code
5. **Compile** - pdflatex creates professional PDF
6. **Download** - User gets tailored resume

## 🐛 Troubleshooting

### "Failed to communicate with Ollama"

Ollama service may not be running. Restart it:

```bash
# Add Ollama to PATH in PowerShell
$env:Path += ";C:\Users\$env:USERNAME\AppData\Local\Programs\Ollama"

# Start Ollama service
ollama serve
```

### "LaTeX compilation failed"

Check compilation logs in `data/runs/<runId>/compile.log`. Common issues:
- Special characters not escaped (%, $, &, #, _, etc.)
- Missing LaTeX packages (MiKTeX usually auto-installs)

### Slow Generation

- Current model (llama3.2:3b) is optimized for speed
- First generation is slower (model loading)
- Subsequent runs are faster (~20 seconds)

### Model Not Found

```bash
# Add Ollama to PATH
$env:Path += ";C:\Users\$env:USERNAME\AppData\Local\Programs\Ollama"

# Verify model
ollama list

# Re-pull if needed
ollama pull llama3.2:3b
```

## ⚙️ Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `JOBLOOP_MODEL` | llama3.2:3b | Ollama model name |
| `OLLAMA_HOST` | http://localhost:11434 | Ollama API URL |
| `JOBLOOP_RUNS_DIR` | data/runs | Artifacts directory |
| `JOBLOOP_EXCEL` | data/jobs.xlsx | Excel tracker path |

## 🎓 Tips

1. **Update master resume regularly** with new experience
2. **Review generated resumes** before submitting
3. **Keep Excel tracker** as your application log
4. **Customize prompts** to match your style
5. **Test on a few jobs** before bulk generation
6. **Back up `data/` folder** periodically

## 🚀 Production Build

For better performance:

```bash
npm run build
npm start
```

## 🔒 Privacy

- **100% local** - no data leaves your machine
- **No external APIs** - only local Ollama
- **Offline capable** - no internet needed
- **Your data** - stored only on your computer

## 📦 Tech Stack

- **Frontend:** Next.js 14, React 18, Tailwind CSS
- **Backend:** Next.js API Routes
- **AI:** Ollama (llama3.2:3b)
- **Data:** ExcelJS
- **PDF:** LaTeX (pdflatex)
- **Language:** TypeScript

## 🤝 Contributing

This is a personal project. Feel free to fork and customize for your needs.

## 📄 License

Free for personal use.

---

**Happy job hunting!** 🎯

For issues or questions, check the troubleshooting section above.
