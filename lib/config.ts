export const config = {
  model: process.env.JOBLOOP_MODEL || 'qwen2.5:14b',
  ollamaHost: process.env.OLLAMA_HOST || 'http://localhost:11434',
  runsDir: process.env.JOBLOOP_RUNS_DIR || 'data/runs',
  excelPath: process.env.JOBLOOP_EXCEL || 'data/jobs.xlsx',
  promptsDir: 'prompts',
  templatesDir: 'templates',
  assetsDir: 'assets',
};
