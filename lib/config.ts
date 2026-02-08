export const config = {
  model: process.env.JOBLOOP_MODEL || 'qwen2.5:14b',
  ollamaHost: process.env.OLLAMA_HOST || 'http://localhost:11434',
  ollamaTimeout: Number(process.env.OLLAMA_TIMEOUT || '120000'),
  ollamaNumThread: Number.isFinite(Number(process.env.OLLAMA_NUM_THREAD))
    ? Number(process.env.OLLAMA_NUM_THREAD)
    : undefined,
  ollamaNumCtx: Number.isFinite(Number(process.env.OLLAMA_NUM_CTX))
    ? Number(process.env.OLLAMA_NUM_CTX)
    : undefined,
  ollamaNumPredict: Number.isFinite(Number(process.env.OLLAMA_NUM_PREDICT))
    ? Number(process.env.OLLAMA_NUM_PREDICT)
    : undefined,
  ollamaKeepAlive: process.env.OLLAMA_KEEP_ALIVE,
  runsDir: process.env.JOBLOOP_RUNS_DIR || 'data/runs',
  excelPath: process.env.JOBLOOP_EXCEL || 'data/jobs.xlsx',
  excelSheet: process.env.JOBLOOP_EXCEL_SHEET || 'Applications',
  excelHeaderRow: Number(process.env.JOBLOOP_EXCEL_HEADER_ROW || '1'),
  promptsDir: 'prompts',
  templatesDir: 'templates',
  assetsDir: 'assets',
};
