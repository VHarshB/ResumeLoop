import { writeFileSync, readFileSync, existsSync, readdirSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';
import { config } from '../config';

const QUEUE_DIR = join(config.runsDir, '..', 'queue');

interface QueueJob {
  runId: string;
  jd: string;
  jobLink?: string;
  enqueuedAt: string;
}

/**
 * Ensure queue directory exists
 */
function ensureQueueDir(): void {
  if (!existsSync(QUEUE_DIR)) {
    mkdirSync(QUEUE_DIR, { recursive: true });
  }
}

/**
 * Add a job to the queue
 * @param runId - Unique run identifier
 * @param payload - Job payload with jd and optional jobLink
 */
export function enqueueJob(runId: string, payload: { jd: string; jobLink?: string }): void {
  ensureQueueDir();
  
  const job: QueueJob = {
    runId,
    jd: payload.jd,
    jobLink: payload.jobLink,
    enqueuedAt: new Date().toISOString(),
  };

  const jobPath = join(QUEUE_DIR, `${runId}.json`);
  writeFileSync(jobPath, JSON.stringify(job, null, 2), 'utf-8');
  console.log(`✓ Job enqueued: ${runId}`);
}

/**
 * Get the next job from the queue (FIFO)
 * @returns The oldest job or null if queue is empty
 */
export function dequeueJob(): QueueJob | null {
  ensureQueueDir();
  
  const files = readdirSync(QUEUE_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => ({
      name: f,
      path: join(QUEUE_DIR, f),
      time: existsSync(join(QUEUE_DIR, f)) 
        ? readFileSync(join(QUEUE_DIR, f), 'utf-8')
        : null,
    }))
    .filter(f => f.time !== null)
    .sort((a, b) => {
      try {
        const aJob = JSON.parse(a.time!) as QueueJob;
        const bJob = JSON.parse(b.time!) as QueueJob;
        return new Date(aJob.enqueuedAt).getTime() - new Date(bJob.enqueuedAt).getTime();
      } catch {
        return 0;
      }
    });

  if (files.length === 0) {
    return null;
  }

  const oldest = files[0];
  try {
    const content = readFileSync(oldest.path, 'utf-8');
    const job = JSON.parse(content) as QueueJob;
    
    // Remove from queue
    unlinkSync(oldest.path);
    
    console.log(`✓ Job dequeued: ${job.runId}`);
    return job;
  } catch (error) {
    console.error(`Failed to dequeue job from ${oldest.name}:`, error);
    // Try to remove corrupted file
    try {
      unlinkSync(oldest.path);
    } catch {}
    return null;
  }
}

/**
 * Get the number of pending jobs in the queue
 */
export function getQueueSize(): number {
  ensureQueueDir();
  return readdirSync(QUEUE_DIR).filter(f => f.endsWith('.json')).length;
}

/**
 * Check if a specific job is in the queue
 */
export function isJobInQueue(runId: string): boolean {
  const jobPath = join(QUEUE_DIR, `${runId}.json`);
  return existsSync(jobPath);
}
