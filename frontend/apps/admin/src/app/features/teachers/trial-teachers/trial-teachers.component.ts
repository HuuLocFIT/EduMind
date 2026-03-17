import { Component, OnInit, DestroyRef, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { ApplicationStats, TrialStatusResponse, TrialTeachersResponse, AdminMessageResponse } from '@edumind/shared-types';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { injectAsyncState, injectModal, injectPagination } from '../../../core/utils';

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
  private destroyRef = inject(DestroyRef);

  // ── Utilities ────────────────────────────────────────────────────────────
  private pagination = injectPagination<TrialStatusResponse>();
  currentPage = this.pagination.currentPage;
  totalItems = this.pagination.totalItems;
  totalPages = this.pagination.totalPages;
  readonly pageSize = this.pagination.pageSize;

  private async = injectAsyncState();
  isLoading = this.async.isLoading;
  errorMessage = this.async.errorMessage;
  successMessage = this.async.successMessage;

  private upgradeModal = injectModal<TrialStatusResponse>();
  showUpgradeModal = this.upgradeModal.isOpen;
  selectedTeacher = this.upgradeModal.data;

  // ── Data ─────────────────────────────────────────────────────────────────
  teachers = signal<TrialStatusResponse[]>([]);
  trialStats = signal<ApplicationStats | null>(null);
  adminNotes = '';

  showExpiringOnly = signal(false);
  showExpiredFilter = false;
  searchQuery = '';

  // ── Search debounce ───────────────────────────────────────────────────────
  private searchSubject = new Subject<string>();

  // ── Computed ──────────────────────────────────────────────────────────────
  activeCount = computed(() => this.trialStats()?.activeTrialTeachers ?? 0);
  expiredCount = computed(() => this.trialStats()?.expiredTrialTeachers ?? 0);

  displayedTeachers = computed(() => {
    const filtered = this.teachers();
    if (this.showExpiredFilter) return filtered;
    return filtered.filter((t) => !t.isExpired);
  });

  ngOnInit(): void {
    this.loadTeachers();
    this.loadStats();

    this.searchSubject
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe((query) => {
        this.searchQuery = query;
        this.pagination.resetPage();
        this.loadTeachers();
      });
  }

  loadStats(): void {
    this.async.execute(this.applicationService.getStats(), {
      silent: true,
      onSuccess: (stats) => this.trialStats.set(stats),
    });
  }

  loadTeachers(): void {
    this.async.execute(
      this.applicationService.getTrialTeachers({
        page: this.currentPage() - 1,
        size: this.pageSize,
        search: this.searchQuery.trim() || undefined,
        expiringSoon: this.showExpiringOnly(),
      }),
      {
        errorMsg: 'Failed to load trial teachers',
        onSuccess: (response: TrialTeachersResponse) => {
          this.pagination.applyPagedResponse(response, (items) => this.teachers.set(items));
        },
      },
    );
  }

  onSearch(query: string): void {
    this.searchSubject.next(query);
  }

  setExpiringOnly(val: boolean): void {
    this.showExpiringOnly.set(val);
    this.pagination.resetPage();
    this.loadTeachers();
  }

  onFilterChange(): void {
    this.pagination.resetPage();
    this.loadTeachers();
  }

  goToPage(page: number): void {
    this.pagination.goToPage(page);
    this.loadTeachers();
  }

  getStartIndex(): number { return this.pagination.getStartIndex(); }
  getEndIndex(): number { return this.pagination.getEndIndex(); }
  displayTotalItems(): number { return this.totalItems(); }

  getTrialProgress(teacher: TrialStatusResponse): number {
    if (teacher.isExpired) return 100;
    if (typeof teacher.daysRemaining !== 'number' || teacher.daysRemaining === null) return 0;
    const totalDays = 30;
    const daysRemaining = Math.max(0, Math.min(totalDays, teacher.daysRemaining));
    return Math.max(0, Math.min(100, Math.round(((totalDays - daysRemaining) / totalDays) * 100)));
  }

  getProgressBarStyle(teacher: TrialStatusResponse): { [key: string]: string } {
    const width = this.getTrialProgress(teacher) + '%';
    let background: string;

    if (teacher.isExpired) {
      background = '#ef4444';
    } else if (typeof teacher.daysRemaining === 'number' && teacher.daysRemaining <= 3) {
      background = 'linear-gradient(to right, #ef4444, #f87171)';
    } else if (typeof teacher.daysRemaining === 'number' && teacher.daysRemaining <= 7) {
      background = 'linear-gradient(to right, #f97316, #fb923c)';
    } else {
      background = 'linear-gradient(to right, #3b82f6, #60a5fa)';
    }

    return { width, 'min-width': '0', display: 'block', background };
  }

  getFullName(teacher: TrialStatusResponse): string {
    return `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || teacher.username;
  }

  openUpgradeModal(teacher: TrialStatusResponse): void {
    this.adminNotes = '';
    this.upgradeModal.open(teacher);
  }

  upgradeTeacher(): void {
    const teacher = this.selectedTeacher();
    if (!teacher) return;

    this.async.execute(
      this.applicationService.upgradeTrialToFull(teacher.userId, { adminNotes: this.adminNotes || undefined }),
      {
        submitting: true,
        errorMsg: 'Failed to upgrade teacher',
        onSuccess: (res: AdminMessageResponse) => {
          this.successMessage.set(res.message || 'Teacher upgraded to full access');
          this.upgradeModal.close();
          this.loadTeachers();
          this.loadStats();
        },
      },
    );
  }
}
