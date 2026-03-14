/**
 * functions/src/taxAgent.ts
 *
 * Firebase Cloud Function for Tax Advisor Claude Integration
 * Handles all Claude API calls server-side to protect the API key
 * Manages conversation history and tool execution
 */

import * as functions from 'firebase-functions';
import fetch from 'node-fetch';
import { SYSTEM_PROMPT } from './taxSystemPrompt';
import { TOOL_DEFINITIONS, getTool } from './taxTools';

// Type definitions for Claude API
interface Message {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

interface ContentBlock {
  type: 'text' | 'tool_use';
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, any>;
}

interface ClaudeRequest {
  model: string;
  max_tokens: number;
  system: string;
  tools: any[];
  messages: Message[];
}

interface ClaudeResponse {
  id: string;
  type: string;
  role: string;
  content: ContentBlock[];
  stop_reason: string;
}

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const CLAUDE_MODEL = 'claude-3-5-sonnet-20241022';
const ANTHROPIC_BASE_URL = 'https://api.anthropic.com/v1';

// Firebase Admin initialization (automatic in Cloud Functions)
if (!process.env.GCLOUD_PROJECT) {
  // Local dev or special setup
}

/**
 * Main Cloud Function: getTaxSnapshot
 * Fetches current tax performance metrics for the dashboard
 */
export const getTaxSnapshot = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      // Use tools to get real data (mock implementation for now)
      const vatData: any = await getTool('get_vat_collected', { month: currentMonth, year: currentYear });

      // Calculate next deadline (15th of next month for VAT)
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
      const deadlineDate = new Date(nextYear, nextMonth - 1, 15);

      const diffTime = deadlineDate.getTime() - now.getTime();
      const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        currentMonthVAT: vatData.vat_on_taxable || 0,
        yearToDateCIT: 1250000, // Mock YTD CIT
        nextFIRSDeadline: {
          type: 'VAT',
          date: deadlineDate.toISOString(),
          daysUntil: daysUntil > 0 ? daysUntil : 0
        }
      };
    } catch (error) {
      console.error('Get Tax Snapshot Error:', error);
      throw new functions.https.HttpsError('internal', 'Failed to fetch tax snapshot');
    }
  }
);

/**
 * Main Cloud Function: sendTaxMessage
 * Handles incoming tax advisor messages and returns Claude responses
 */
export const sendTaxMessage = functions.https.onCall(
  async (data: { userMessage: string; conversationHistory: Message[]; userId: string }, context: functions.https.CallableContext) => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const { userMessage, conversationHistory, userId } = data;

    if (!userMessage || typeof userMessage !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'userMessage must be a non-empty string');
    }

    if (!Array.isArray(conversationHistory)) {
      throw new functions.https.HttpsError('invalid-argument', 'conversationHistory must be an array');
    }

    try {
      // Build the messages array with new user message
      const messages: Message[] = [
        ...conversationHistory,
        {
          role: 'user',
          content: userMessage
        }
      ];

      // Invoke Claude with tool use
      const response = await callClaudeWithTools(messages);

      // Extract final text response (after all tool calls are resolved)
      const finalResponse = extractFinalResponse(response);

      return {
        success: true,
        response: finalResponse,
        assistantMessage: {
          role: 'assistant',
          content: finalResponse
        }
      };
    } catch (error) {
      console.error('Tax Agent Error:', error);

      if (error instanceof Error) {
        throw new functions.https.HttpsError(
          'internal',
          `Tax advisor error: ${error.message}`
        );
      }

      throw new functions.https.HttpsError('internal', 'Unexpected error in tax advisor');
    }
  }
);

/**
 * Call Claude API with tool use capability
 * Handles tool_use blocks by executing the tool and returning results
 */
async function callClaudeWithTools(messages: Message[]): Promise<string> {
  let currentMessages = messages;
  let maxIterations = 5; // Prevent infinite loops
  let iteration = 0;

  while (iteration < maxIterations) {
    iteration++;

    // Make request to Claude
    const response = await callClaude(currentMessages);

    // Check if Claude wants to use tools
    const hasToolUse = response.content.some((block: ContentBlock) => block.type === 'tool_use');

    if (!hasToolUse) {
      // No tool use - extract final text response
      const textContent = response.content
        .filter((block: ContentBlock) => block.type === 'text')
        .map((block: ContentBlock) => block.text)
        .join('\n');

      return textContent;
    }

    // Execute tool calls and collect results
    const toolResults: ContentBlock[] = [];
    const assistantMessage: Message = {
      role: 'assistant',
      content: response.content
    };

    for (const block of response.content) {
      if (block.type === 'tool_use') {
        try {
          // Execute the tool function
          const toolResult = await getTool(block.name!, block.input || {});

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id!,
            content: JSON.stringify(toolResult)
          } as any);
        } catch (error) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id!,
            content: `Error executing tool ${block.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            is_error: true
          } as any);
        }
      }
    }

    // Add assistant's response and tool results to message history
    currentMessages = [
      ...currentMessages,
      assistantMessage,
      {
        role: 'user',
        content: toolResults
      }
    ];
  }

  // If we hit max iterations, return a timeout message
  return 'The tax advisor encountered a processing timeout. Please try again with a simpler question.';
}

/**
 * Call Claude API
 */
async function callClaude(messages: Message[]): Promise<ClaudeResponse> {
  const requestBody: ClaudeRequest = {
    model: CLAUDE_MODEL,
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    tools: TOOL_DEFINITIONS,
    messages
  };

  const response = await fetch(`${ANTHROPIC_BASE_URL}/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Claude API Error:', response.status, errorText);
    throw new Error(`Claude API error: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as ClaudeResponse;
  return data;
}

/**
 * Extract final text response from Claude's message
 * (in case there are multiple text blocks)
 */
function extractFinalResponse(response: string | ClaudeResponse): string {
  if (typeof response === 'string') {
    return response;
  }

  const textBlocks = response.content
    .filter((block: ContentBlock) => block.type === 'text')
    .map((block: ContentBlock) => block.text || '')
    .filter(text => text.length > 0);

  return textBlocks.join('\n\n');
}

// Export the system prompt for reference
export { SYSTEM_PROMPT } from './taxSystemPrompt';

// Export tool definitions for reference
export { TOOL_DEFINITIONS } from './taxTools';
