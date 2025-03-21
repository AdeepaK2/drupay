/**
 * Gets the current month (1-12)
 */
export function getCurrentMonth(): number {
  return new Date().getMonth() + 1; // JavaScript months are 0-indexed
}

/**
 * Gets the current year
 */
export function getCurrentYear(): number {
  return new Date().getFullYear();
}

/**
 * Formats a date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Gets the first day of the current month
 */
export function getFirstDayOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/**
 * Gets the last day of the current month
 */
export function getLastDayOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0);
}