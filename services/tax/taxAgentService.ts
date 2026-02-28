/**
 * services/tax/taxAgentService.ts
 * 
 * Frontend service for Tax Advisor integration
 * Calls Firebase Cloud Function to invoke Claude API
 * Manages conversation history on the client side
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { TaxMessage } from '../../types';

// Initialize Firebase Functions
const functions = getFunctions();

export interface TaxAgentResponse {
  success: boolean;
  response: string;
  assistantMessage?: TaxMessage;
  error?: string;
}

/**
 * Send a message to the Tax Advisor and get a response
 * @param userMessage - The user's tax question
 * @param userId - The ID of the authenticated user
 * @param conversationHistory - Array of previous messages in the conversation
 * @returns The assistant's response text
 */
export async function sendTaxMessage(
  userMessage: string,
  userId: string,
  conversationHistory: TaxMessage[]
): Promise<string> {
  try {
    // Convert TaxMessage format to Claude message format for the function
    const messages = conversationHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }));

    // Call the Firebase Cloud Function
    const sendTaxMessageFn = httpsCallable<
      { userMessage: string; conversationHistory: any[]; userId: string },
      TaxAgentResponse
    >(functions, 'sendTaxMessage');

    const result = await sendTaxMessageFn({
      userMessage,
      conversationHistory: messages,
      userId
    });

    if (!result.data.success) {
      throw new Error(result.data.error || 'Failed to get tax advice');
    }

    return result.data.response;
  } catch (error) {
    console.error('Tax Agent Service Error:', error);
    if (error instanceof Error) {
      throw new Error(`Tax advisor error: ${error.message}`);
    }
    throw new Error('Failed to reach tax advisor. Please check your internet connection.');
  }
}

/**
 * Get initial tax snapshot data for the sidebar
 * This calls the tools directly to fetch real-time data
 * @returns Promise with VAT collected, CIT estimate, and next deadline
 */
export async function getTaxSnapshot() {
  try {
    const getTaxSnapshotFn = httpsCallable<void, any>(functions, 'getTaxSnapshot');
    const result = await getTaxSnapshotFn();
    return result.data;
  } catch (error) {
    console.error('Error fetching tax snapshot:', error);
    // Return default values if function fails
    return {
      currentMonthVAT: 0,
      yearToDateCIT: 0,
      nextFIRSDeadline: {
        type: 'VAT',
        date: new Date().toISOString(),
        daysUntil: 7
      }
    };
  }
}

/**
 * Format a message for storage in conversation history
 */
export function formatMessage(
  role: 'user' | 'assistant',
  content: string
): TaxMessage {
  return {
    role,
    content,
    timestamp: Date.now()
  };
}

/**
 * Helper to format currency in Naira
 */
export function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Calculate days until a specific FIRS deadline
 */
export function daysUntilDeadline(deadline: string | Date): number {
  const deadlineDate = typeof deadline === 'string' ? new Date(deadline) : deadline;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadlineDate.setHours(0, 0, 0, 0);
  
  const diffTime = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}
