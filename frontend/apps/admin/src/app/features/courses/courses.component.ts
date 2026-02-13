import { Component, OnDestroy, OnInit, TemplateRef, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  AlertComponent,
  BadgeComponent,
  ButtonComponent,
  CardComponent,
  ConfirmDialogComponent,
  DataTableComponent,
  type TableColumn,
  SearchBarComponent,
  SelectComponent,
  type SelectOption,
} from '@edumind/admin-ui';
import { CourseService, type CoursePagedResponse } from '../../core/services/course.service';
import { CategoryService } from '../../core/services/category.service';
import { CourseResponse } from '@edumind/shared-types';
import { CourseLevel, CourseStatus } from '@edumind/shared-constants';
import { type BadgeVariant } from '@edumind/admin-ui';

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
    ConfirmDialogComponent,
  ],
  templateUrl: './courses.component.html',
})
export class CoursesComponent implements OnInit, OnDestroy {
  private courseService = inject(CourseService);
  private categoryService = inject(CategoryService);

  courses = signal<CourseRow[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');
  successMessage = signal('');

  searchQuery = signal('');
  selectedCategory = signal<string>('');
  selectedLevel = signal<string>('');

  categoriesOptions = signal<SelectOption[]>([]);
  levelOptions: SelectOption[] = Object.values(CourseLevel).map((level) => ({
    value: level,
    label: level.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
  }));

  pageSize = 10;
  currentPage = signal(1);
  totalItems = signal(0);

  columns: TableColumn<CourseRow>[] = [];
  actionsSticky = signal<'left' | 'right' | undefined>('right');
  isMobile = signal(false);
  private mediaQuery: MediaQueryList | null = null;
  private mediaQueryHandler = (e: MediaQueryListEvent) => {
    this.isMobile.set(e.matches);
    this.buildColumns();
  };

  @ViewChild('titleTpl', { static: true })
  titleTpl!: TemplateRef<{ $implicit: CourseRow; row: CourseRow; index: number }>;
  @ViewChild('priceTpl', { static: true })
  priceTpl!: TemplateRef<{ $implicit: CourseRow; row: CourseRow; index: number }>;
  @ViewChild('statusTpl', { static: true })
  statusTpl!: TemplateRef<{ $implicit: CourseRow; row: CourseRow; index: number }>;
  @ViewChild('levelTpl', { static: true })
  levelTpl!: TemplateRef<{ $implicit: CourseRow; row: CourseRow; index: number }>;
  @ViewChild('createdTpl', { static: true })
  createdTpl!: TemplateRef<{ $implicit: CourseRow; row: CourseRow; index: number }>;
  @ViewChild('idTpl', { static: true })
  idTpl!: TemplateRef<{ $implicit: CourseRow; row: CourseRow; index: number }>;

  // Delete modal
  showDeleteModal = signal(false);
  selectedCourse = signal<CourseRow | null>(null);
  isSubmitting = signal(false);

  ngOnInit(): void {
    this.mediaQuery = window.matchMedia('(max-width: 768px)');
    this.isMobile.set(this.mediaQuery.matches);
    this.mediaQuery.addEventListener('change', this.mediaQueryHandler);

    this.buildColumns();
    this.loadCategories();
    this.loadCourses();
  }

  ngOnDestroy(): void {
    if (this.mediaQuery) {
      this.mediaQuery.removeEventListener('change', this.mediaQueryHandler);
    }
  }

  private buildColumns(): void {
    const stickyLeft: 'left' | undefined = this.isMobile() ? undefined : 'left';
    const stickyRight: 'right' | undefined = this.isMobile() ? undefined : 'right';

    const idWidth = '90px';
    const titleWidth = '260px';

    this.columns = [
      {
        key: 'id',
        header: 'ID',
        template: this.idTpl,
        sortable: true,
        width: idWidth,
        align: 'left',
        sticky: stickyLeft,
        stickyOffset: stickyLeft ? '0px' : undefined,
      },
      {
        key: 'title',
        header: 'Title',
        template: this.titleTpl,
        sortable: true,
        width: titleWidth,
        sticky: stickyLeft,
        stickyOffset: stickyLeft ? idWidth : undefined,
      },
      { key: 'categoryName', header: 'Category', sortable: true },
      { key: 'instructorName', header: 'Instructor', sortable: true },
      { key: 'price', header: 'Pricing', template: this.priceTpl, sortable: true },
      { key: 'level', header: 'Level', template: this.levelTpl },
      { key: 'status', header: 'Status', template: this.statusTpl },
      { key: 'totalStudents', header: 'Students', sortable: true},
      { key: 'averageRating', header: 'Rating', sortable: true },
      { key: 'createdAt', header: 'Created', sortable: true, template: this.createdTpl },
    ];

    this.actionsSticky.set(stickyRight);
  }

  loadCategories(): void {
    this.categoryService.getAllCategories().subscribe({
      next: (res) => {
        const options: SelectOption[] = [{ value: '', label: 'All categories' }];
        res.forEach((cat) => options.push({ value: cat.id, label: cat.name }));
        this.categoriesOptions.set(options);
      },
      error: () => {
        this.categoriesOptions.set([{ value: '', label: 'All categories' }]);
      },
    });
  }

  loadCourses(): void {
    this.isLoading.set(true);
    const page = this.currentPage() - 1;
    const categoryId =
      this.selectedCategory() !== '' ? Number(this.selectedCategory()) : undefined;
    const level = this.selectedLevel() || undefined;

    this.courseService
      .filterCourses({
        keyword: this.searchQuery() || undefined,
        categoryId,
        level,
        page,
        size: this.pageSize,
      })
      .subscribe({
        next: (response: CoursePagedResponse) => {
          const items = response.data ?? [];
          this.courses.set(items);
          const total = response.pagination?.totalElements ?? items.length;
          const pageIndex = response.pagination?.page ?? page;
          this.totalItems.set(total);
          this.currentPage.set(pageIndex + 1);
          this.isLoading.set(false);
        },
        error: () => {
          this.errorMessage.set('Failed to load courses');
          this.isLoading.set(false);
        },
      });
  }

  onSearch(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);
    this.loadCourses();
  }

  onCategoryChange(value: string | number): void {
    this.selectedCategory.set(String(value));
    this.currentPage.set(1);
    this.loadCourses();
  }

  onLevelChange(value: string | number): void {
    this.selectedLevel.set(String(value));
    this.currentPage.set(1);
    this.loadCourses();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadCourses();
  }

  openDeleteModal(course: CourseRow): void {
    this.selectedCourse.set(course);
    this.showDeleteModal.set(true);
  }

  deleteCourse(): void {
    const course = this.selectedCourse();
    if (!course) return;
    this.isSubmitting.set(true);
    this.courseService.deleteCourse(course.id).subscribe({
      next: () => {
        this.successMessage.set('Course deleted successfully');
        this.showDeleteModal.set(false);
        this.loadCourses();
        this.isSubmitting.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to delete course');
        this.isSubmitting.set(false);
      },
    });
  }

  getStatusVariant(status: CourseResponse['status']): BadgeVariant {
    const mapping: Record<(typeof CourseStatus)[keyof typeof CourseStatus], BadgeVariant> = {
      DRAFT: 'secondary',
      PENDING_REVIEW: 'warning',
      PUBLISHED: 'success',
      ARCHIVED: 'secondary',
    };
    return mapping[status] ?? 'secondary';
  }
}

