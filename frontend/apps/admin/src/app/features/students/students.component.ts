import { Component, OnInit, OnDestroy, TemplateRef, ViewChild, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  AlertComponent,
  BadgeComponent,
  ButtonComponent,
  CardComponent,
  ConfirmDialogComponent,
  DataTableComponent,
  type TableColumn,
  SearchBarComponent,
  ModalComponent,
  type BadgeVariant,
} from '@edumind/admin-ui';
import { AdminUserService } from '../../core/services/admin-user.service';
import { UserListItem, AdminUserListResponse } from '@edumind/shared-types';

type StudentRow = UserListItem;
type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

@Component({
  selector: 'app-students',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardComponent,
    ButtonComponent,
    BadgeComponent,
    AlertComponent,
    DataTableComponent,
    SearchBarComponent,
    ConfirmDialogComponent,
    ModalComponent,
  ],
  templateUrl: './students.component.html',
})
export class StudentsComponent implements OnInit, OnDestroy {
  private adminUserService = inject(AdminUserService);

  students = signal<StudentRow[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');
  successMessage = signal('');

  searchQuery = signal('');
  statusFilter = signal<StatusFilter>('ALL');
  pageSize = 10;
  currentPage = signal(1);
  totalItems = signal(0);
  
  // Stats from server
  statsTotal = signal(0);
  statsActive = signal(0);
  statsInactive = signal(0);

  // Stats computed from server totals
  stats = computed(() => {
    return {
      total: this.statsTotal(),
      active: this.statsActive(),
      inactive: this.statsInactive(),
    };
  });

  // Filtered students (client-side search only, status filter is server-side)
  visibleStudents = computed(() => {
    let filtered = this.students();
    const query = this.searchQuery().trim().toLowerCase();

    // Apply search filter (client-side on current page)
    if (query) {
      filtered = filtered.filter(
        (s) =>
          s.username.toLowerCase().includes(query) ||
          s.email.toLowerCase().includes(query) ||
          `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase().includes(query)
      );
    }

    return filtered;
  });

  // Display total items (server total, filtered by status if active)
  displayTotalItems = computed(() => {
    return this.totalItems();
  });

  columns: TableColumn<StudentRow>[] = [];
  actionsSticky = signal<'left' | 'right' | undefined>('right');
  isMobile = signal(false);
  private mediaQuery: MediaQueryList | null = null;
  private mediaQueryHandler = (e: MediaQueryListEvent) => {
    this.isMobile.set(e.matches);
    this.buildColumns();
  };

  @ViewChild('fullNameTpl', { static: true })
  fullNameTpl!: TemplateRef<{ $implicit: StudentRow; row: StudentRow; index: number }>;
  @ViewChild('statusTpl', { static: true })
  statusTpl!: TemplateRef<{ $implicit: StudentRow; row: StudentRow; index: number }>;
  @ViewChild('phoneTpl', { static: true })
  phoneTpl!: TemplateRef<{ $implicit: StudentRow; row: StudentRow; index: number }>;
  @ViewChild('createdTpl', { static: true })
  createdTpl!: TemplateRef<{ $implicit: StudentRow; row: StudentRow; index: number }>;

  // Modals
  showDetailModal = signal(false);
  showToggleConfirm = signal(false);
  showDeleteConfirm = signal(false);
  selectedStudent = signal<StudentRow | null>(null);
  isSubmitting = signal(false);

  ngOnInit(): void {
    this.mediaQuery = window.matchMedia('(max-width: 768px)');
    this.isMobile.set(this.mediaQuery.matches);
    this.mediaQuery.addEventListener('change', this.mediaQueryHandler);

    this.buildColumns();
    this.loadStats();
    this.loadStudents();
  }

  ngOnDestroy(): void {
    if (this.mediaQuery) {
      this.mediaQuery.removeEventListener('change', this.mediaQueryHandler);
    }
  }

  private buildColumns(): void {
    const stickyRight: 'right' | undefined = this.isMobile() ? undefined : 'right';

    this.columns = [
      {
        key: 'fullName',
        header: 'Full Name',
        template: this.fullNameTpl,
        sortable: true,
        width: '200px',
      },
      { key: 'username', header: 'Username', sortable: true },
      { key: 'email', header: 'Email', sortable: true },
      { key: 'phoneNumber', header: 'Phone', template: this.phoneTpl },
      { key: 'isActive', header: 'Status', template: this.statusTpl },
      { key: 'createdAt', header: 'Joined', sortable: true, template: this.createdTpl },
    ];

    this.actionsSticky.set(stickyRight);
  }

  loadStats(): void {
    // Load stats in parallel: total and active, then calculate inactive
    forkJoin({
      total: this.adminUserService.getUsersByRole('ROLE_STUDENT', { page: 0, size: 1 }),
      active: this.adminUserService.getUsersByRole('ROLE_STUDENT', { page: 0, size: 1, isActive: true }),
    }).subscribe({
      next: ({ total, active }) => {
        const totalCount = total.pagination?.totalElements ?? 0;
        const activeCount = active.pagination?.totalElements ?? 0;
        const inactiveCount = totalCount - activeCount; // Calculate inactive as total - active
        
        this.statsTotal.set(totalCount);
        this.statsActive.set(activeCount);
        this.statsInactive.set(Math.max(0, inactiveCount)); // Ensure non-negative
      },
      error: () => {
        // Silently fail stats loading, don't show error
      },
    });
  }

  loadStudents(): void {
    this.isLoading.set(true);
    const page = this.currentPage() - 1;
    const status = this.statusFilter();
    
    // Determine isActive filter for server-side filtering
    const isActiveFilter: boolean | undefined = 
      status === 'ACTIVE' ? true : 
      status === 'INACTIVE' ? false : 
      undefined;

    this.adminUserService.getUsersByRole('ROLE_STUDENT', { 
      page, 
      size: this.pageSize,
      isActive: isActiveFilter 
    }).subscribe({
      next: (response: AdminUserListResponse) => {
        const items = response.data ?? [];
        this.students.set(items);
        const total = response.pagination?.totalElements ?? items.length;
        const pageIndex = response.pagination?.page ?? page;
        this.totalItems.set(total);
        this.currentPage.set(pageIndex + 1);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load students');
        this.isLoading.set(false);
      },
    });
  }

  onSearch(query: string): void {
    this.searchQuery.set(query);
    // Search is client-side on current page, no need to reload
  }

  onStatusFilterChange(filter: StatusFilter): void {
    this.statusFilter.set(filter);
    this.currentPage.set(1);
    // Reload students with server-side status filter
    this.loadStudents();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadStudents();
  }

  getFullName(student: StudentRow): string {
    const firstName = student.firstName || '';
    const lastName = student.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || student.username || student.email;
  }

  getInitials(student: StudentRow): string {
    const fullName = this.getFullName(student);
    const parts = fullName.split(' ').filter((p) => p.length > 0);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  }

  getStatusVariant(isActive: boolean): BadgeVariant {
    return isActive ? 'success' : 'error';
  }

  viewStudent(student: StudentRow): void {
    this.selectedStudent.set(student);
    this.showDetailModal.set(true);
  }

  openToggleModal(student: StudentRow): void {
    this.selectedStudent.set(student);
    this.showToggleConfirm.set(true);
  }

  openDeleteModal(student: StudentRow): void {
    this.selectedStudent.set(student);
    this.showDeleteConfirm.set(true);
  }

  toggleStatus(): void {
    const student = this.selectedStudent();
    if (!student) return;

    this.isSubmitting.set(true);
    this.adminUserService.toggleUserStatus(student.id, !student.isActive).subscribe({
      next: () => {
        this.successMessage.set(
          `Student ${!student.isActive ? 'activated' : 'deactivated'} successfully`
        );
        this.showToggleConfirm.set(false);
        this.loadStats(); // Reload stats after status change
        this.loadStudents();
        this.isSubmitting.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to update student status');
        this.isSubmitting.set(false);
      },
    });
  }

  deleteStudent(): void {
    const student = this.selectedStudent();
    if (!student) return;

    this.isSubmitting.set(true);
    this.adminUserService.deleteUser(student.id).subscribe({
      next: () => {
        this.successMessage.set('Student deleted successfully');
        this.showDeleteConfirm.set(false);
        this.loadStats(); // Reload stats after deletion
        this.loadStudents();
        this.isSubmitting.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to delete student');
        this.isSubmitting.set(false);
      },
    });
  }
}
