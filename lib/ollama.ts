import { config } from './config';

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaRequest {
  model: string;
  messages: OllamaMessage[];
  stream: boolean;
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
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data: OllamaResponse = await response.json();
    return data.message.content.trim();
  } catch (error) {
    console.error('Ollama chat error:', error);
    throw new Error(`Failed to communicate with Ollama: ${error}`);
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
