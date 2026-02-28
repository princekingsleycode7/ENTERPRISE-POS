"use strict";
/**
 * functions/src/taxAgent.ts
 *
 * Firebase Cloud Function for Tax Advisor Claude Integration
 * Handles all Claude API calls server-side to protect the API key
 * Manages conversation history and tool execution
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITIONS = exports.SYSTEM_PROMPT = exports.sendTaxMessage = void 0;
const functions = __importStar(require("firebase-functions"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const taxSystemPrompt_1 = require("./taxSystemPrompt");
const taxTools_1 = require("./taxTools");
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const CLAUDE_MODEL = 'claude-3-5-sonnet-20241022';
const ANTHROPIC_BASE_URL = 'https://api.anthropic.com/v1';
// Firebase Admin initialization (automatic in Cloud Functions)
if (!process.env.GCLOUD_PROJECT) {
    // Local dev or special setup
}
/**
 * Main Cloud Function: sendTaxMessage
 * Handles incoming tax advisor messages and returns Claude responses
 */
exports.sendTaxMessage = functions.https.onCall(async (data, context) => {
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
        const messages = [
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
    }
    catch (error) {
        console.error('Tax Agent Error:', error);
        if (error instanceof Error) {
            throw new functions.https.HttpsError('internal', `Tax advisor error: ${error.message}`);
        }
        throw new functions.https.HttpsError('internal', 'Unexpected error in tax advisor');
    }
});
/**
 * Call Claude API with tool use capability
 * Handles tool_use blocks by executing the tool and returning results
 */
async function callClaudeWithTools(messages) {
    let currentMessages = messages;
    let maxIterations = 5; // Prevent infinite loops
    let iteration = 0;
    while (iteration < maxIterations) {
        iteration++;
        // Make request to Claude
        const response = await callClaude(currentMessages);
        // Check if Claude wants to use tools
        const hasToolUse = response.content.some((block) => block.type === 'tool_use');
        if (!hasToolUse) {
            // No tool use - extract final text response
            const textContent = response.content
                .filter((block) => block.type === 'text')
                .map((block) => block.text)
                .join('\n');
            return textContent;
        }
        // Execute tool calls and collect results
        const toolResults = [];
        const assistantMessage = {
            role: 'assistant',
            content: response.content
        };
        for (const block of response.content) {
            if (block.type === 'tool_use') {
                try {
                    // Execute the tool function
                    const toolResult = await (0, taxTools_1.getTool)(block.name, block.input || {});
                    toolResults.push({
                        type: 'tool_result',
                        tool_use_id: block.id,
                        content: JSON.stringify(toolResult)
                    });
                }
                catch (error) {
                    toolResults.push({
                        type: 'tool_result',
                        tool_use_id: block.id,
                        content: `Error executing tool ${block.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        is_error: true
                    });
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
async function callClaude(messages) {
    const requestBody = {
        model: CLAUDE_MODEL,
        max_tokens: 2000,
        system: taxSystemPrompt_1.SYSTEM_PROMPT,
        tools: taxTools_1.TOOL_DEFINITIONS,
        messages
    };
    const response = await (0, node_fetch_1.default)(`${ANTHROPIC_BASE_URL}/messages`, {
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
    const data = (await response.json());
    return data;
}
/**
 * Extract final text response from Claude's message
 * (in case there are multiple text blocks)
 */
function extractFinalResponse(response) {
    if (typeof response === 'string') {
        return response;
    }
    const textBlocks = response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text || '')
        .filter(text => text.length > 0);
    return textBlocks.join('\n\n');
}
// Export the system prompt for reference
var taxSystemPrompt_2 = require("./taxSystemPrompt");
Object.defineProperty(exports, "SYSTEM_PROMPT", { enumerable: true, get: function () { return taxSystemPrompt_2.SYSTEM_PROMPT; } });
// Export tool definitions for reference
var taxTools_2 = require("./taxTools");
Object.defineProperty(exports, "TOOL_DEFINITIONS", { enumerable: true, get: function () { return taxTools_2.TOOL_DEFINITIONS; } });
