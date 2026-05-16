import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isExpensePaidForCurrentTerm(lastPaid?: string, term?: string): boolean {
  if (!lastPaid) return false;
  const paidDate = new Date(lastPaid);
  const now = new Date();
  
  // Calculate difference in months
  const monthsDiff = (now.getFullYear() - paidDate.getFullYear()) * 12 + (now.getMonth() - paidDate.getMonth());
  
  // Parse term (e.g. "01-MONTH", "03-MONTH")
  const termMonths = parseInt((term || '01-MONTH').split('-')[0]) || 1;
  
  return monthsDiff >= 0 && monthsDiff < termMonths;
}
