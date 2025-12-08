import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  ButtonComponent,
  CardComponent,
  SearchBarComponent,
  BadgeComponent,
  AlertComponent,
  ModalComponent,
  TextareaComponent,
} from '@edumind/admin-ui';
import { TeacherApplicationService } from '../../../core/services/teacher-application.service';
import { TrialStatusResponse, TrialTeachersResponse, AdminMessageResponse } from '@edumind/shared-types';

@Component({
  selector: 'app-trial-teachers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ButtonComponent,
    CardComponent,
    SearchBarComponent,
    BadgeComponent,
    AlertComponent,
    ModalComponent,
    TextareaComponent,
  ],
  templateUrl: './trial-teachers.component.html',
})
export class TrialTeachersComponent implements OnInit {
  private applicationService = inject(TeacherApplicationService);

  // State
  teachers = signal<TrialStatusResponse[]>([]);
  expiringTeachers = signal<TrialStatusResponse[]>([]);
  isLoading = signal(true);
  currentPage = signal(1);
  totalItems = signal(0);
  pageSize = 10;

  showExpiringOnly = signal(false);
  showExpiredFilter = false;
  searchQuery = '';

  // Modals
  showUpgradeModal = signal(false);
  selectedTeacher = signal<TrialStatusResponse | null>(null);
  adminNotes = '';

  successMessage = signal('');
  errorMessage = signal('');

  // Computed
  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize));
  activeCount = computed(() => this.teachers().filter(t => !t.isExpired).length);
  expiredCount = computed(() => this.teachers().filter(t => t.isExpired).length);
  
  displayedTeachers = computed(() => {
    let filtered = this.showExpiringOnly() ? this.expiringTeachers() : this.teachers();
    
    // Filter by expired if needed
    if (!this.showExpiredFilter) {
      filtered = filtered.filter((t: TrialStatusResponse) => !t.isExpired);
    }
    
    // Filter by search query
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter((t: TrialStatusResponse) => {
        const fullName = `${t.firstName || ''} ${t.lastName || ''}`.toLowerCase();
        const username = (t.username || '').toLowerCase();
        return fullName.includes(query) || username.includes(query);
      });
    }
    
    return filtered;
  });

  ngOnInit(): void {
    this.loadTeachers();
  }

  loadTeachers(): void {
    this.isLoading.set(true);
    this.applicationService.getTrialTeachers({
      page: this.currentPage() - 1,
      size: this.pageSize,
    }).subscribe({
      next: (response: TrialTeachersResponse) => {
        const teachers: TrialStatusResponse[] = response.data || [];
        this.teachers.set(teachers);
        this.totalItems.set(response.pagination?.totalElements || teachers.length);
        this.currentPage.set((response.pagination?.page || 0) + 1);
        
        // Calculate expiring teachers from loaded data
        const expiring = teachers.filter((t: TrialStatusResponse) => 
          typeof t.daysRemaining === 'number' && 
          t.daysRemaining >= 0 && 
          t.daysRemaining <= 7 &&
          !t.isExpired
        );
        this.expiringTeachers.set(expiring);
        
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load trial teachers');
        this.isLoading.set(false);
      },
    });
  }

  onSearch(query: string): void {
    this.searchQuery = query;
  }

  onFilterChange(): void {
    // Filter is handled in computed property
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
    this.loadTeachers();
  }

  getStartIndex(): number { return (this.currentPage() - 1) * this.pageSize + 1; }
  getEndIndex(): number { return Math.min(this.currentPage() * this.pageSize, this.totalItems()); }
  displayTotalItems(): number { return this.totalItems(); }

  getTrialProgress(teacher: TrialStatusResponse): number {
    if (teacher.isExpired) return 100;
    if (typeof teacher.daysRemaining !== 'number') return 0;
    const totalDays = 30;
    const usedDays = totalDays - teacher.daysRemaining;
    return Math.min(100, Math.round((usedDays / totalDays) * 100));
  }

  getFullName(teacher: TrialStatusResponse): string {
    const firstName = teacher.firstName || '';
    const lastName = teacher.lastName || '';
    return `${firstName} ${lastName}`.trim() || teacher.username;
  }

  openUpgradeModal(teacher: TrialStatusResponse): void {
    this.selectedTeacher.set(teacher);
    this.adminNotes = '';
    this.showUpgradeModal.set(true);
  }

  upgradeTeacher(): void {
    const teacher = this.selectedTeacher();
    if (teacher) {
      this.applicationService.upgradeTrialToFull(teacher.userId, {
        adminNotes: this.adminNotes || undefined,
      }).subscribe({
        next: (res: AdminMessageResponse) => {
          this.successMessage.set(res.message || 'Teacher upgraded to full access');
          this.showUpgradeModal.set(false);
          this.loadTeachers();
        },
        error: () => this.errorMessage.set('Failed to upgrade teacher'),
      });
    }
  }
}