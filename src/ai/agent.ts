import { GoogleGenAI } from '@google/genai';
import { setGlobalDispatcher, Agent } from 'undici';
import { analyticsTools } from './tools.js';
import { AnalyticsService } from '../services/analytics.service.js';

// Increase undici fetch timeout for long-running LLM requests & tool calls (5 mins)
setGlobalDispatcher(
  new Agent({
    headersTimeout: 300000,
    bodyTimeout: 300000,
    connectTimeout: 30000,
  })
);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const MODEL_NAME = 'gemini-3.8-flash';

const SYSTEM_INSTRUCTION = `
You are an internal data analytics assistant for our portal database.
Rules:
1. Always invoke the matching tool to fetch accurate metrics. Never hallucinate counts or numbers.
2. If asked for role-wise breakdown or distribution, call getUserCountsGroupedByRole.
3. If asked for user counts with specific roles/status/state, call getUserStatistics.
4. If asked about learners, pass counts, or certified learners, call getLearnerMetrics.
5. Provide concise, clear, and direct answers summarizing the tool outputs.
`;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function callWithRetry<T>(fn: () => Promise<T>, retries = 4, delayMs = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isTemporary =
      error?.status === 503 ||
      error?.message?.includes('503') ||
      error?.message?.includes('high demand') ||
      error?.status === 429 ||
      error?.message?.includes('fetch failed') ||
      error?.cause?.code === 'UND_ERR_HEADERS_TIMEOUT' ||
      error?.code === 'ETIMEDOUT' ||
      error?.code === 'ECONNRESET';

    if (isTemporary && retries > 0) {
      console.warn(`[Gemini API Busy/Timeout] Retrying in ${delayMs / 1000}s... (${retries} attempts left)`);
      await delay(delayMs);
      return callWithRetry(fn, retries - 1, delayMs * 2);
    }
    throw error;
  }
}

export async function askAnalyticsBot(userMessage: string): Promise<string> {
  const chat = ai.chats.create({
    model: MODEL_NAME,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: analyticsTools,
    },
  });

  // Step 1: Send user message
  let response = await callWithRetry(() => chat.sendMessage({ message: userMessage }));

  // Step 2: Handle any tool calls requested by the model
  while (response.functionCalls && response.functionCalls.length > 0) {
    const call = response.functionCalls[0];
    let toolResult: Record<string, any> = {};

    if (call.name === 'getUserStatistics') {
      toolResult = await AnalyticsService.getUserStatistics(call.args || {});
    } else if (call.name === 'getUserCountsGroupedByRole') {
      toolResult = await AnalyticsService.getUserCountsGroupedByRole();
    } else if (call.name === 'getLearnerMetrics') {
      toolResult = await AnalyticsService.getLearnerMetrics(call.args || {});
    } else {
      toolResult = { error: `Tool ${call.name} is not recognized` };
    }

    // Step 3: Send function execution response back to the chat session
    // The chat session manages thought signatures and previous parts internally
    response = await callWithRetry(() =>
      chat.sendMessage({
        message: [
          {
            functionResponse: {
              name: call.name,
              response: toolResult,
            },
          },
        ],
      })
    );
  }

  return response.text || 'Query completed.';
}