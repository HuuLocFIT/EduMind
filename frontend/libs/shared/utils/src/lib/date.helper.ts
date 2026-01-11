/**
 * Date formatting utilities for consistent display across the application
 * Uses date-fns for reliable date manipulation
 */

import { format, formatDistanceToNow, parseISO, isValid } from "date-fns";

/**
 * Format date to a standard short format (e.g., "Jan 15, 2026")
 */
export const formatDate = (value?: string | Date | null): string => {
  if (!value) return "—";
  
  try {
    const date = typeof value === "string" ? parseISO(value) : value;
    if (!isValid(date)) return "—";
    return format(date, "MMM d, yyyy");
  } catch {
    return "—";
  }
};

/**
 * Format date to a full format with time (e.g., "Jan 15, 2026, 3:45 PM")
 */
export const formatDateTime = (value?: string | Date | null): string => {
  if (!value) return "—";
  
  try {
    const date = typeof value === "string" ? parseISO(value) : value;
    if (!isValid(date)) return "—";
    return format(date, "MMM d, yyyy, h:mm a");
  } catch {
    return "—";
  }
};

/**
 * Format date to a compact format (e.g., "01/15/26")
 */
export const formatDateCompact = (value?: string | Date | null): string => {
  if (!value) return "—";
  
  try {
    const date = typeof value === "string" ? parseISO(value) : value;
    if (!isValid(date)) return "—";
    return format(date, "MM/dd/yy");
  } catch {
    return "—";
  }
};

/**
 * Format date as relative time (e.g., "2 days ago", "just now")
 */
export const formatTimeAgo = (value?: string | Date | null): string => {
  if (!value) return "Never";
  
  try {
    const date = typeof value === "string" ? parseISO(value) : value;
    if (!isValid(date)) return "Never";
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return "Never";
  }
};

/**
 * Format date as relative time with smart fallback
 * Shows "Today", "Yesterday" for recent dates, then relative time, then full date for old dates
 */
export const formatTimeAgoSmart = (value?: string | Date | null): string => {
  if (!value) return "Never";
  
  try {
    const date = typeof value === "string" ? parseISO(value) : value;
    if (!isValid(date)) return "Never";
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    
    return formatDate(date);
  } catch {
    return "Never";
  }
};

/**
 * Format month and year (e.g., "January 2026")
 */
export const formatMonthYear = (value?: string | Date | null): string => {
  if (!value) return "—";
  
  try {
    const date = typeof value === "string" ? parseISO(value) : value;
    if (!isValid(date)) return "—";
    return format(date, "MMMM yyyy");
  } catch {
    return "—";
  }
};

/**
 * Format for ISO date string (yyyy-MM-dd) - useful for inputs & APIs
 */
export const formatISODate = (value?: string | Date | null): string => {
  if (!value) return "";
  
  try {
    const date = typeof value === "string" ? parseISO(value) : value;
    if (!isValid(date)) return "";
    return format(date, "yyyy-MM-dd");
  } catch {
    return "";
  }
};
