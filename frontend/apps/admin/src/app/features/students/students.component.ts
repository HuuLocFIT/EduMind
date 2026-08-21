import { Component, DestroyRef, OnInit, TemplateRef, ViewChild, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import {
  AlertComponent,
  BadgeComponent,
  ConfirmDialogComponent,
  DataTableComponent,
  type TableColumn,
  SearchBarComponent,
  ModalComponent,
  SelectComponent,
  type SelectOption,
  ButtonComponent,
  DropdownMenuComponent,
  type DropdownMenuItem,
  type BadgeVariant,
  StatCardComponent,
} from '@edumind/admin-ui';
import { AdminUserService } from '../../core/services/admin-user.service';
import { UserListItem, AdminUserListResponse } from '@edumind/shared-types';
import { RoleLabelPipe } from '../../shared/pipes/role-label.pipe';
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
    BadgeComponent,
    AlertComponent,
    DataTableComponent,
    SearchBarComponent,
    ConfirmDialogComponent,
    ModalComponent,
    SelectComponent,
    ButtonComponent,
    DropdownMenuComponent,
    StatCardComponent,
    RoleLabelPipe,
  ],
  templateUrl: './students.component.html',
})
export class StudentsComponent implements OnInit {
  private adminUserService = inject(AdminUserService);
  private destroyRef = inject(DestroyRef);
  private searchSubject = new Subject<string>();

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
  modalErrorMessage = signal('');

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

  readonly statusOptions: SelectOption[] = [
    { value: 'ALL', label: 'All' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' },
  ];

  statsTotal    = signal(0);
  statsActive   = signal(0);
  statsInactive = signal(0);

  // ── Table ─────────────────────────────────────────────────────────────────
  columns: TableColumn<StudentRow>[] = [];
  actionsSticky = signal<'left' | 'right' | undefined>('right');

  @ViewChild('studentTpl', { static: true }) studentTpl!: TemplateRef<{ $implicit: StudentRow; row: StudentRow; index: number }>;
  @ViewChild('statusTpl',  { static: true }) statusTpl!:  TemplateRef<{ $implicit: StudentRow; row: StudentRow; index: number }>;
  @ViewChild('phoneTpl',   { static: true }) phoneTpl!:   TemplateRef<{ $implicit: StudentRow; row: StudentRow; index: number }>;
  @ViewChild('createdTpl', { static: true }) createdTpl!: TemplateRef<{ $implicit: StudentRow; row: StudentRow; index: number }>;

  ngOnInit(): void {
    this.buildColumns();
    this.loadStats();
    this.loadStudents();

    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      this.pagination.resetPage();
      this.loadStudents();
    });
  }

  private buildColumns(): void {
    const stickyRight: 'right' | undefined = this.isMobile() ? undefined : 'right';

    this.columns = [
      { key: 'fullName',    header: 'Student', template: this.studentTpl, sortable: false, width: '240px' },
      { key: 'email',       header: 'Email',   sortable: false },
      { key: 'phoneNumber', header: 'Phone',   template: this.phoneTpl },
      { key: 'isActive',    header: 'Status',  sortable: false, template: this.statusTpl },
      { key: 'createdAt',   header: 'Joined',  sortable: false, template: this.createdTpl },
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
    const search = this.searchQuery().trim() || undefined;

    this.async.execute(
      this.adminUserService.getUsersByRole('ROLE_STUDENT', { page, size: this.pageSize, isActive: isActiveFilter, search }),
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
    this.searchSubject.next(query);
  }

  onStatusFilterChange(filter: string | number): void {
    this.statusFilter.set(filter as StatusFilter);
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

  getRowActions(student: StudentRow): DropdownMenuItem[] {
    return [
      {
        id: 'toggle-status',
        label: student.isActive ? 'Deactivate' : 'Activate',
      },
      { id: 'divider', label: '', divider: true },
      {
        id: 'delete',
        label: 'Delete',
        danger: true,
      },
    ];
  }

  onRowAction(item: DropdownMenuItem, student: StudentRow): void {
    if (item.id === 'toggle-status') {
      this.openToggleModal(student);
    } else if (item.id === 'delete') {
      this.openDeleteModal(student);
    }
  }

  viewStudent(student: StudentRow): void {
    this.detailModal.open(student);
  }

  openToggleModal(student: StudentRow): void {
    this.modalErrorMessage.set('');
    this.selectedStudent.set(student);
    this.toggleModal.open(student);
  }

  openDeleteModal(student: StudentRow): void {
    this.modalErrorMessage.set('');
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
        errorTarget: this.modalErrorMessage,
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
        errorTarget: this.modalErrorMessage,
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
