import os from 'os';
import { config } from './config';

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaRequest {
  model: string;
  messages: OllamaMessage[];
  stream: boolean;
  options?: {
    num_thread?: number;
    num_ctx?: number;
    num_predict?: number;
  };
  keep_alive?: string;
}

interface OllamaResponse {
  message: {
    content: string;
  };
}

/**
 * Send a chat request to Ollama
 * @param model - Model name (e.g., 'qwen2.5:14b')
 * @param systemPrompt - System prompt for AI behavior
 * @param userMessage - User message/input
 * @returns AI response text
 */
export async function ollamaChat(
  model: string,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const url = `${config.ollamaHost}/api/chat`;
  const cpuThreads = os.cpus().length || undefined;
  const numThread = config.ollamaNumThread ?? cpuThreads;
  const options: OllamaRequest['options'] = {};

  if (numThread) {
    options.num_thread = numThread;
  }

  if (config.ollamaNumCtx) {
    options.num_ctx = config.ollamaNumCtx;
  }

  if (config.ollamaNumPredict) {
    options.num_predict = config.ollamaNumPredict;
  }

  const requestBody: OllamaRequest = {
    model,
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: userMessage,
      },
    ],
    stream: false,
    keep_alive: config.ollamaKeepAlive,
    options: Object.keys(options).length ? options : undefined,
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.ollamaTimeout);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data: OllamaResponse = await response.json();
    return data.message.content.trim();
  } catch (error: any) {
    console.error('Ollama chat error:', error);
    
    if (error.name === 'AbortError') {
      throw new Error(`Ollama timeout after ${config.ollamaTimeout / 1000}s. Check if Ollama is running: ollama serve`);
    }
    
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to Ollama. Is Ollama running? Start with: ollama serve');
    }
    
    throw new Error(`Failed to communicate with Ollama: ${error.message || error}`);
  }
}

/**
 * Test Ollama connection
 * @returns true if Ollama is reachable
 */
export async function testOllamaConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${config.ollamaHost}/api/tags`);
    return response.ok;
  } catch (error) {
    console.error('Ollama connection test failed:', error);
    return false;
  }
}
