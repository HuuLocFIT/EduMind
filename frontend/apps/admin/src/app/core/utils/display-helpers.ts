import { type BadgeVariant } from '@edumind/admin-ui';

/** Maps PENDING/APPROVED/REJECTED (and boolean active states) to badge variants. */
export function getStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'PENDING': return 'warning';
    case 'APPROVED': return 'success';
    case 'REJECTED': return 'error';
    default: return 'default';
  }
}

export function getActiveBadgeVariant(isActive: boolean): BadgeVariant {
  return isActive ? 'success' : 'error';
}

export function getFullName(entity: {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  email?: string | null;
}): string {
  const full = `${entity.firstName ?? ''} ${entity.lastName ?? ''}`.trim();
  return full || entity.username || entity.email || '';
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter((p) => p.length > 0);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

/** Formats a SNAKE_CASE enum value (e.g. "ALL_LEVELS") as "All Levels". */
export function formatEnumLabel(value: string): string {
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
