import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BadgeComponent, BadgeVariant } from './badge.component';

export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'REJECTED';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type EnrollmentStatus = 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';

type StatusType = CourseStatus | UserStatus | ReviewStatus | EnrollmentStatus;

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule, BadgeComponent],
  template: `
    <app-badge [variant]="getVariant()" [size]="size">
      {{ getLabel() }}
    </app-badge>
  `,
})
export class StatusBadgeComponent {
  @Input() status!: StatusType;
  @Input() size: 'sm' | 'md' | 'lg' = 'sm';

  private statusConfig: Record<string, { variant: BadgeVariant; label: string }> = {
    // Course Status
    DRAFT: { variant: 'secondary', label: 'Draft' },
    PUBLISHED: { variant: 'success', label: 'Published' },
    ARCHIVED: { variant: 'default', label: 'Archived' },
    REJECTED: { variant: 'error', label: 'Rejected' },
    
    // User Status
    ACTIVE: { variant: 'success', label: 'Active' },
    INACTIVE: { variant: 'secondary', label: 'Inactive' },
    SUSPENDED: { variant: 'error', label: 'Suspended' },
    PENDING: { variant: 'warning', label: 'Pending' },
    
    // Review Status
    APPROVED: { variant: 'success', label: 'Approved' },
    
    // Enrollment Status
    COMPLETED: { variant: 'info', label: 'Completed' },
    EXPIRED: { variant: 'default', label: 'Expired' },
    CANCELLED: { variant: 'error', label: 'Cancelled' },
  };

  getVariant(): BadgeVariant {
    return this.statusConfig[this.status]?.variant || 'default';
  }

  getLabel(): string {
    return this.statusConfig[this.status]?.label || this.status;
  }
}
