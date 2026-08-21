import {
  Component,
  DestroyRef,
  OnInit,
  TemplateRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EMPTY, Subject } from 'rxjs';
import { catchError, debounceTime, switchMap } from 'rxjs/operators';
import {
  AlertComponent,
  BadgeComponent,
  ButtonComponent,
  CardComponent,
  DataTableComponent,
  ModalComponent,
  type TableColumn,
  MultiSelectComponent,
  SearchBarComponent,
  SelectComponent,
  TextareaComponent,
  type SelectOption,
} from '@edumind/admin-ui';
import { CourseService, type CoursePagedResponse } from '../../core/services/course.service';
import { CategoryService } from '../../core/services/category.service';
import { CourseResponse } from '@edumind/shared-types';
import { CourseLevel, CourseStatus } from '@edumind/shared-constants';
import { StatusVariantPipe } from './status-variant.pipe';
import { EnumLabelPipe } from '../../shared/pipes/enum-label.pipe';
import { injectAsyncState, injectMediaQuery, injectModal, injectPagination, formatEnumLabel } from '../../core/utils';

type CourseRow = CourseResponse;

@Component({
  selector: 'app-courses',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardComponent,
    ButtonComponent,
    BadgeComponent,
    AlertComponent,
    DataTableComponent,
    SearchBarComponent,
    SelectComponent,
    MultiSelectComponent,
    ModalComponent,
    TextareaComponent,
    StatusVariantPipe,
    EnumLabelPipe,
  ],
  templateUrl: './courses.component.html',
})
export class CoursesComponent implements OnInit {
  private courseService = inject(CourseService);
  private categoryService = inject(CategoryService);
  private destroyRef = inject(DestroyRef);
  private filter$ = new Subject<void>();

  // ── Utilities ────────────────────────────────────────────────────────────
  private pagination = injectPagination<CourseRow>();
  currentPage = this.pagination.currentPage;
  totalItems = this.pagination.totalItems;
  readonly pageSize = this.pagination.pageSize;

  private async = injectAsyncState();
  isLoading = this.async.isLoading;
  isSubmitting = this.async.isSubmitting;
  errorMessage = this.async.errorMessage;
  successMessage = this.async.successMessage;
  archiveErrorMessage = signal('');

  isMobile = injectMediaQuery('(max-width: 768px)');

  private archiveModal = injectModal<CourseRow>();
  showArchiveModal = this.archiveModal.isOpen;
  selectedCourse = this.archiveModal.data;
  archiveReason = signal('');
  archiveReasonError = signal('');

  // ── Filters ───────────────────────────────────────────────────────────────
  searchQuery = signal('');
  selectedCategories = signal<number[]>([]);
  selectedLevels = signal<string[]>([]);
  selectedStatus = signal('');

  categoriesOptions = signal<SelectOption[]>([]);
  levelOptions: SelectOption[] = Object.values(CourseLevel).map((level) => ({
    value: level,
    label: formatEnumLabel(level),
  }));
  statusOptions: SelectOption[] = [
    { value: '', label: 'All' },
    ...Object.values(CourseStatus).map((status) => ({
      value: status,
      label: formatEnumLabel(status),
    })),
  ];

  // ── Data ─────────────────────────────────────────────────────────────────
  courses = signal<CourseRow[]>([]);

  // ── Table ─────────────────────────────────────────────────────────────────
  columns: TableColumn<CourseRow>[] = [];
  actionsSticky = signal<'left' | 'right' | undefined>('right');

  @ViewChild('titleTpl', { static: true }) titleTpl!: TemplateRef<{ $implicit: CourseRow; row: CourseRow; index: number }>;
  @ViewChild('priceTpl', { static: true }) priceTpl!: TemplateRef<{ $implicit: CourseRow; row: CourseRow; index: number }>;
  @ViewChild('statusTpl', { static: true }) statusTpl!: TemplateRef<{ $implicit: CourseRow; row: CourseRow; index: number }>;
  @ViewChild('levelTpl', { static: true }) levelTpl!: TemplateRef<{ $implicit: CourseRow; row: CourseRow; index: number }>;
  @ViewChild('createdTpl', { static: true }) createdTpl!: TemplateRef<{ $implicit: CourseRow; row: CourseRow; index: number }>;
  @ViewChild('idTpl', { static: true }) idTpl!: TemplateRef<{ $implicit: CourseRow; row: CourseRow; index: number }>;

  ngOnInit(): void {
    this.buildColumns();
    this.loadCategories();

    // Reactive filter pipeline with debounce + switchMap (cancels in-flight requests)
    this.filter$
      .pipe(
        debounceTime(300),
        switchMap(() => {
          this.isLoading.set(true);
          const page = this.currentPage() - 1;
          const categoryIds = this.selectedCategories().length > 0 ? this.selectedCategories() : undefined;
          const levels = this.selectedLevels().length > 0 ? this.selectedLevels() : undefined;
          const status = this.selectedStatus() || undefined;

          return this.courseService
            .getAdminCourses({ keyword: this.searchQuery() || undefined, categoryIds, levels, status, page, size: this.pageSize })
            .pipe(
              catchError(() => {
                this.errorMessage.set('Failed to load courses');
                this.isLoading.set(false);
                return EMPTY;
              }),
            );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((response: CoursePagedResponse) => {
        this.pagination.applyPagedResponse(response, (items) => this.courses.set(items));
        this.isLoading.set(false);
      });

    this.isLoading.set(true);
    this.filter$.next();
  }

  private buildColumns(): void {
    const stickyLeft: 'left' | undefined = this.isMobile() ? undefined : 'left';
    const stickyRight: 'right' | undefined = this.isMobile() ? undefined : 'right';
    const idWidth = '90px';
    const titleWidth = '260px';

    this.columns = [
      { key: 'id', header: 'ID', template: this.idTpl, sortable: false, width: idWidth, align: 'left', sticky: stickyLeft, stickyOffset: stickyLeft ? '0px' : undefined },
      { key: 'title', header: 'Title', template: this.titleTpl, sortable: false, width: titleWidth, sticky: stickyLeft, stickyOffset: stickyLeft ? idWidth : undefined },
      { key: 'categoryName', header: 'Category', sortable: false },
      { key: 'instructorName', header: 'Instructor', sortable: false },
      { key: 'price', header: 'Pricing', template: this.priceTpl, sortable: false },
      { key: 'level', header: 'Level', template: this.levelTpl },
      { key: 'status', header: 'Status', template: this.statusTpl },
      { key: 'totalStudents', header: 'Students', sortable: false },
      { key: 'averageRating', header: 'Rating', sortable: false },
      { key: 'createdAt', header: 'Created', sortable: false, template: this.createdTpl },
    ];

    this.actionsSticky.set(stickyRight);
  }

  loadCategories(): void {
    this.categoryService
      .getAllCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const options: SelectOption[] = res.map((cat) => ({ value: cat.id, label: cat.name }));
          this.categoriesOptions.set(options);
        },
        error: () => {
          this.categoriesOptions.set([]);
        },
      });
  }

  onSearch(query: string): void {
    this.searchQuery.set(query);
    this.pagination.resetPage();
    this.filter$.next();
  }

  onCategoriesChange(values: (string | number)[]): void {
    this.selectedCategories.set(values.map(Number));
    this.pagination.resetPage();
    this.filter$.next();
  }

  onLevelsChange(values: (string | number)[]): void {
    this.selectedLevels.set(values.map(String));
    this.pagination.resetPage();
    this.filter$.next();
  }

  onStatusChange(value: string | number): void {
    this.selectedStatus.set(String(value));
    this.pagination.resetPage();
    this.filter$.next();
  }

  onPageChange(page: number): void {
    this.pagination.goToPage(page);
    this.filter$.next();
  }

  openArchiveModal(course: CourseRow): void {
    this.archiveErrorMessage.set('');
    this.archiveReason.set('');
    this.archiveReasonError.set('');
    this.archiveErrorMessage.set('');
    this.archiveModal.open(course);
  }

  closeArchiveModal(): void {
    this.archiveModal.close();
    this.archiveReason.set('');
    this.archiveReasonError.set('');
  }

  archiveCourse(): void {
    const course = this.selectedCourse();
    if (!course) return;
    const reason = this.archiveReason().trim();
    if (!reason) {
      this.archiveReasonError.set('Archive reason is required');
      return;
    }

    this.async.execute(
      this.courseService.archiveCourse(course.id, reason),
      {
        submitting: true,
        successMsg: 'Course archived successfully',
        errorMsg: 'Failed to archive course',
        errorTarget: this.archiveErrorMessage,
        onSuccess: () => {
          this.closeArchiveModal();
          this.filter$.next();
        },
      },
    );
  }
}
