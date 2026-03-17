import { Component, OnInit, TemplateRef, ViewChild, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import {
  injectAsyncState,
  injectMediaQuery,
  injectModal,
  injectPagination,
  getActiveBadgeVariant,
  getFullName,
  getInitials,
} from '../../core/utils';

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
export class StudentsComponent implements OnInit {
  private adminUserService = inject(AdminUserService);

  // ── Utilities ────────────────────────────────────────────────────────────
  private pagination = injectPagination<StudentRow>();
  currentPage = this.pagination.currentPage;
  totalItems  = this.pagination.totalItems;
  readonly pageSize = this.pagination.pageSize;

  private async = injectAsyncState();
  isLoading      = this.async.isLoading;
  isSubmitting   = this.async.isSubmitting;
  errorMessage   = this.async.errorMessage;
  successMessage = this.async.successMessage;

  isMobile = injectMediaQuery('(max-width: 768px)');

  private detailModal = injectModal<StudentRow>();
  private toggleModal = injectModal<StudentRow>();
  private deleteModal = injectModal<StudentRow>();
  showDetailModal   = this.detailModal.isOpen;
  showToggleConfirm = this.toggleModal.isOpen;
  showDeleteConfirm = this.deleteModal.isOpen;
  selectedStudent   = this.detailModal.data;

  // ── Data ─────────────────────────────────────────────────────────────────
  students     = signal<StudentRow[]>([]);
  searchQuery  = signal('');
  statusFilter = signal<StatusFilter>('ALL');

  statsTotal    = signal(0);
  statsActive   = signal(0);
  statsInactive = signal(0);

  visibleStudents = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return this.students();
    return this.students().filter(
      (s) =>
        s.username.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query) ||
        `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase().includes(query),
    );
  });

  // ── Table ─────────────────────────────────────────────────────────────────
  columns: TableColumn<StudentRow>[] = [];
  actionsSticky = signal<'left' | 'right' | undefined>('right');

  @ViewChild('fullNameTpl', { static: true }) fullNameTpl!: TemplateRef<{ $implicit: StudentRow; row: StudentRow; index: number }>;
  @ViewChild('statusTpl',   { static: true }) statusTpl!:   TemplateRef<{ $implicit: StudentRow; row: StudentRow; index: number }>;
  @ViewChild('phoneTpl',    { static: true }) phoneTpl!:    TemplateRef<{ $implicit: StudentRow; row: StudentRow; index: number }>;
  @ViewChild('createdTpl',  { static: true }) createdTpl!:  TemplateRef<{ $implicit: StudentRow; row: StudentRow; index: number }>;

  ngOnInit(): void {
    this.buildColumns();
    this.loadStats();
    this.loadStudents();
  }

  private buildColumns(): void {
    const stickyRight: 'right' | undefined = this.isMobile() ? undefined : 'right';

    this.columns = [
      { key: 'fullName',    header: 'Full Name', template: this.fullNameTpl, sortable: true, width: '200px' },
      { key: 'username',    header: 'Username',  sortable: true },
      { key: 'email',       header: 'Email',     sortable: true },
      { key: 'phoneNumber', header: 'Phone',     template: this.phoneTpl },
      { key: 'isActive',    header: 'Status',    template: this.statusTpl },
      { key: 'createdAt',   header: 'Joined',    sortable: true, template: this.createdTpl },
    ];

    this.actionsSticky.set(stickyRight);
  }

  loadStats(): void {
    this.async.execute(this.adminUserService.getUserRoleStats('ROLE_STUDENT'), {
      silent: true,
      onSuccess: (stats) => {
        this.statsTotal.set(stats.total);
        this.statsActive.set(stats.active);
        this.statsInactive.set(stats.inactive);
      },
    });
  }

  loadStudents(): void {
    const page = this.currentPage() - 1;
    const status = this.statusFilter();
    const isActiveFilter = status === 'ACTIVE' ? true : status === 'INACTIVE' ? false : undefined;

    this.async.execute(
      this.adminUserService.getUsersByRole('ROLE_STUDENT', { page, size: this.pageSize, isActive: isActiveFilter }),
      {
        errorMsg: 'Failed to load students',
        onSuccess: (response: AdminUserListResponse) => {
          this.pagination.applyPagedResponse(response, (items) => this.students.set(items));
        },
      },
    );
  }

  onSearch(query: string): void {
    this.searchQuery.set(query);
  }

  onStatusFilterChange(filter: StatusFilter): void {
    this.statusFilter.set(filter);
    this.pagination.resetPage();
    this.loadStudents();
  }

  onPageChange(page: number): void {
    this.pagination.goToPage(page);
    this.loadStudents();
  }

  getFullName(student: StudentRow): string {
    return getFullName(student) || student.username || student.email;
  }

  getInitials(student: StudentRow): string {
    return getInitials(this.getFullName(student));
  }

  getStatusVariant(isActive: boolean): BadgeVariant {
    return getActiveBadgeVariant(isActive);
  }

  viewStudent(student: StudentRow): void {
    this.detailModal.open(student);
  }

  openToggleModal(student: StudentRow): void {
    this.selectedStudent.set(student);
    this.toggleModal.open(student);
  }

  openDeleteModal(student: StudentRow): void {
    this.selectedStudent.set(student);
    this.deleteModal.open(student);
  }

  toggleStatus(): void {
    const student = this.selectedStudent();
    if (!student) return;

    const activating = !student.isActive;
    this.async.execute(
      this.adminUserService.toggleUserStatus(student.id, activating),
      {
        submitting: true,
        successMsg: `Student ${activating ? 'activated' : 'deactivated'} successfully`,
        errorMsg:   'Failed to update student status',
        onSuccess: () => {
          this.toggleModal.close();
          if (activating) {
            this.statsActive.update(v => v + 1);
            this.statsInactive.update(v => v - 1);
          } else {
            this.statsActive.update(v => v - 1);
            this.statsInactive.update(v => v + 1);
          }
          this.loadStudents();
        },
      },
    );
  }

  deleteStudent(): void {
    const student = this.selectedStudent();
    if (!student) return;

    this.async.execute(
      this.adminUserService.deleteUser(student.id),
      {
        submitting: true,
        successMsg: 'Student deleted successfully',
        errorMsg:   'Failed to delete student',
        onSuccess: () => {
          this.deleteModal.close();
          this.statsTotal.update(v => v - 1);
          if (student.isActive) {
            this.statsActive.update(v => v - 1);
          } else {
            this.statsInactive.update(v => v - 1);
          }
          this.loadStudents();
        },
      },
    );
  }
}
