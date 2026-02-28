/**
 * services/tax/taxNotificationService.ts
 *
 * Tax deadline notification system
 * Checks for upcoming FIRS deadlines and triggers notifications
 */

import { useNotificationStore } from '../../stores/useNotificationStore';

const NOTIFICATION_CHECK_KEY = 'tax-notification-last-check';
const NOTIFICATION_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Check if any FIRS deadline is within 7 days
 * If so, add a notification via useNotificationStore
 * Only fires once per day (tracked in localStorage)
 */
export async function checkTaxDeadlines(): Promise<void> {
  try {
    // Check if already checked today
    const lastCheckTime = localStorage.getItem(NOTIFICATION_CHECK_KEY);
    const now = Date.now();

    if (lastCheckTime && now - parseInt(lastCheckTime) < NOTIFICATION_CHECK_INTERVAL) {
      // Already checked within 24 hours, skip
      return;
    }

    // Update last check time
    localStorage.setItem(NOTIFICATION_CHECK_KEY, now.toString());

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate upcoming deadlines
    const deadlines = getUpcomingDeadlines(today);

    // Check if any deadline is within 7 days
    for (const deadline of deadlines) {
      const daysUntil = Math.ceil((deadline.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntil > 0 && daysUntil <= 7) {
        // Add notification
        const message = `⚠️ ${deadline.type} due in ${daysUntil} day${daysUntil > 1 ? 's' : ''} — open Tax Advisor`;
        useNotificationStore.setState(state => ({
          notifications: [
            ...state.notifications,
            {
              id: Date.now().toString(),
              type: 'warning',
              message,
              timestamp: Date.now()
            }
          ]
        }));

        // Only notify for the most urgent deadline
        break;
      }
    }
  } catch (error) {
    console.error('Error checking tax deadlines:', error);
  }
}

/**
 * Calculate upcoming FIRS deadlines
 */
function getUpcomingDeadlines(
  baseDate: Date
): Array<{ type: string; date: Date; description: string }> {
  const today = new Date(baseDate);
  today.setHours(0, 0, 0, 0);

  const deadlines: Array<{ type: string; date: Date; description: string }> = [];

  // VAT deadline: 21st of next month
  const vatDeadline = new Date(today);
  vatDeadline.setMonth(vatDeadline.getMonth() + 1);
  vatDeadline.setDate(21);
  deadlines.push({
    type: 'VAT Return',
    date: vatDeadline,
    description: 'VAT return due to FIRS'
  });

  // PAYE deadline: 10th of next month
  const payeDeadline = new Date(today);
  payeDeadline.setMonth(payeDeadline.getMonth() + 1);
  payeDeadline.setDate(10);
  deadlines.push({
    type: 'PAYE Remittance',
    date: payeDeadline,
    description: 'Monthly PAYE deduction remittance due'
  });

  // CIT deadline: 6 months after year-end (assume 31 Dec year-end)
  const currentYear = today.getFullYear();
  let citDeadline = new Date(currentYear, 7, 31); // 31 August next year (6 months after Dec 31)

  if (today > citDeadline) {
    // If we've already passed this year's deadline, calculate next year's
    citDeadline = new Date(currentYear + 1, 7, 31);
  }

  deadlines.push({
    type: 'CIT Return',
    date: citDeadline,
    description: 'Annual CIT return due (6 months after year-end)'
  });

  return deadlines;
}

/**
 * Reset notification check (for testing)
 */
export function resetNotificationCheck(): void {
  localStorage.removeItem(NOTIFICATION_CHECK_KEY);
}

/**
 * Get formatted days until deadline
 */
export function daysUntilDeadline(deadline: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);

  const diffTime = deadline.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Get status color for deadline based on days remaining
 */
export function getDeadlineStatus(daysRemaining: number): 'red' | 'amber' | 'green' {
  if (daysRemaining <= 7 && daysRemaining > 0) {
    return 'red';
  } else if (daysRemaining <= 14) {
    return 'amber';
  }
  return 'green';
}
