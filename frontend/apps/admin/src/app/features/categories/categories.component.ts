import { Component, OnInit, TemplateRef, ViewChild, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ButtonComponent,
  CardComponent,
  SearchBarComponent,
  BadgeComponent,
  type BadgeVariant,
  AlertComponent,
  ModalComponent,
  InputComponent,
  TextareaComponent,
  ConfirmDialogComponent,
  DataTableComponent,
  type TableColumn,
  DropdownMenuComponent,
  type DropdownMenuItem,
  ImageUploadComponent,
} from '@edumind/admin-ui';
import {
  CategoryResponse,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '@edumind/shared-types';
import { CategoryService } from '../../core/services/category.service';
import { FileUploadService } from '../../core/services/file-upload.service';
import { injectAsyncState, injectMediaQuery, injectModal, getActiveBadgeVariant } from '../../core/utils';
import { CloudinaryUrlPipe } from '../../shared/pipes/cloudinary-url.pipe';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonComponent,
    CardComponent,
    SearchBarComponent,
    BadgeComponent,
    AlertComponent,
    ModalComponent,
    InputComponent,
    TextareaComponent,
    ConfirmDialogComponent,
    DataTableComponent,
    DropdownMenuComponent,
    CloudinaryUrlPipe,
    ImageUploadComponent,
  ],
  templateUrl: './categories.component.html',
})
export class CategoriesComponent implements OnInit {
  private categoryService = inject(CategoryService);
  private fileUploadService = inject(FileUploadService);

  // ── Utilities ────────────────────────────────────────────────────────────
  private async = injectAsyncState();
  isLoading = this.async.isLoading;
  isSubmitting = this.async.isSubmitting;
  errorMessage = this.async.errorMessage;
  successMessage = this.async.successMessage;

  private createModal = injectModal<CategoryResponse>();
  private editModal = injectModal<CategoryResponse>();
  private deleteModal = injectModal<CategoryResponse>();
  showCreateModal = this.createModal.isOpen;
  showEditModal = this.editModal.isOpen;
  showDeleteModal = this.deleteModal.isOpen;
  selectedCategory = signal<CategoryResponse | null>(null);

  // ── Data ─────────────────────────────────────────────────────────────────
  categories = signal<CategoryResponse[]>([]);
  searchQuery = signal('');

  visibleCategories = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return this.categories();
    return this.categories().filter(
      (cat) =>
        cat.name.toLowerCase().includes(query) ||
        cat.slug.toLowerCase().includes(query) ||
        (cat.description?.toLowerCase().includes(query) ?? false),
    );
  });

  // ── Table ─────────────────────────────────────────────────────────────────
  isMobile = injectMediaQuery('(max-width: 768px)');
  columns: TableColumn<CategoryResponse>[] = [];
  actionsSticky = signal<'left' | 'right' | undefined>('right');

  @ViewChild('categoryTpl', { static: true }) categoryTpl!: TemplateRef<{ $implicit: CategoryResponse; row: CategoryResponse; index: number }>;
  @ViewChild('statusTpl', { static: true }) statusTpl!: TemplateRef<{ $implicit: CategoryResponse; row: CategoryResponse; index: number }>;
  @ViewChild('createdTpl', { static: true }) createdTpl!: TemplateRef<{ $implicit: CategoryResponse; row: CategoryResponse; index: number }>;

  // ── Form ─────────────────────────────────────────────────────────────────
  formName = '';
  formSlug = '';
  formDescription: string | null = null;
  formIconUrl: string | null = null;
  formErrors = signal<Partial<Record<keyof CreateCategoryRequest, string>>>({});
  isUploadingIcon = signal(false);
  iconUploadError = signal('');

  ngOnInit(): void {
    this.buildColumns();
    this.loadCategories();
  }

  private buildColumns(): void {
    const stickyRight: 'right' | undefined = this.isMobile() ? undefined : 'right';

    this.columns = [
      { key: 'name', header: 'Category', template: this.categoryTpl, sortable: false, width: '280px' },
      { key: 'slug', header: 'Slug' },
      { key: 'courseCount', header: 'Courses' },
      { key: 'isActive', header: 'Status', sortable: false, template: this.statusTpl },
      { key: 'createdAt', header: 'Created', sortable: false, template: this.createdTpl },
    ];

    this.actionsSticky.set(stickyRight);
  }

  loadCategories(): void {
    this.async.execute(this.categoryService.getAllCategories(), {
      errorMsg: 'Failed to load categories',
      onSuccess: (response) => this.categories.set(response),
    });
  }

  onSearch(query: string): void {
    this.searchQuery.set(query);
  }

  getStatusVariant(isActive: boolean | undefined): BadgeVariant {
    return getActiveBadgeVariant(isActive ?? false);
  }

  getRowActions(category: CategoryResponse): DropdownMenuItem[] {
    return [
      {
        id: 'toggle-status',
        label: category.isActive ? 'Deactivate' : 'Activate',
      },
      { id: 'divider', label: '', divider: true },
      {
        id: 'delete',
        label: 'Delete',
        danger: true,
      },
    ];
  }

  onRowAction(item: DropdownMenuItem, category: CategoryResponse): void {
    if (item.id === 'toggle-status') {
      this.toggleCategoryStatus(category);
    } else if (item.id === 'delete') {
      this.openDeleteModal(category);
    }
  }

  openCreateModal(): void {
    this.formName = '';
    this.formSlug = '';
    this.formDescription = null;
    this.formIconUrl = null;
    this.formErrors.set({});
    this.iconUploadError.set('');
    this.showCreateModal.set(true);
  }

  openEditModal(category: CategoryResponse): void {
    this.selectedCategory.set(category);
    this.formName = category.name;
    this.formSlug = category.slug;
    this.formDescription = category.description ?? null;
    this.formIconUrl = category.iconUrl ?? null;
    this.formErrors.set({});
    this.iconUploadError.set('');
    this.editModal.open(category);
  }

  onIconFileSelected(file: File): void {
    this.isUploadingIcon.set(true);
    this.iconUploadError.set('');

    this.fileUploadService.uploadImage(file, 'images/categories', 200, 200).subscribe({
      next: (result) => {
        this.formIconUrl = result.url;
        this.isUploadingIcon.set(false);
      },
      error: () => {
        this.iconUploadError.set('Failed to upload image');
        this.isUploadingIcon.set(false);
      },
    });
  }

  openDeleteModal(category: CategoryResponse): void {
    this.selectedCategory.set(category);
    this.deleteModal.open(category);
  }

  generateSlug(name: string): void {
    this.formSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  createCategory(): void {
    if (!this.validateForm()) return;

    const payload: CreateCategoryRequest = {
      name: this.formName,
      slug: this.formSlug,
      description: this.formDescription,
      iconUrl: this.formIconUrl,
    };

    this.async.execute(this.categoryService.createCategory(payload), {
      submitting: true,
      successMsg: 'Category created successfully',
      errorMsg: 'Failed to create category',
      onSuccess: () => {
        this.showCreateModal.set(false);
        this.loadCategories();
      },
    });
  }

  updateCategory(): void {
    const category = this.selectedCategory();
    if (!category || !this.validateForm()) return;

    const payload: UpdateCategoryRequest = {
      name: this.formName,
      slug: this.formSlug,
      description: this.formDescription,
      iconUrl: this.formIconUrl,
    };

    this.async.execute(this.categoryService.updateCategory(category.id, payload), {
      submitting: true,
      successMsg: 'Category updated successfully',
      errorMsg: 'Failed to update category',
      onSuccess: () => {
        this.showEditModal.set(false);
        this.loadCategories();
      },
    });
  }

  deleteCategory(): void {
    const category = this.selectedCategory();
    if (!category) return;

    this.async.execute(this.categoryService.deleteCategory(category.id), {
      submitting: true,
      successMsg: 'Category deleted successfully',
      errorMsg: 'Failed to delete category',
      onSuccess: () => {
        this.showDeleteModal.set(false);
        this.loadCategories();
      },
    });
  }

  toggleCategoryStatus(category: CategoryResponse): void {
    this.async.execute(this.categoryService.toggleCategoryStatus(category.id), {
      submitting: true,
      successMsg: 'Category status updated successfully',
      errorMsg: 'Failed to toggle category status',
      onSuccess: () => this.loadCategories(),
    });
  }

  private validateForm(): boolean {
    const errors: Partial<Record<keyof CreateCategoryRequest, string>> = {};

    if (!this.formName || this.formName.trim().length === 0) {
      errors.name = 'Category name is required';
    } else if (this.formName.length > 100) {
      errors.name = 'Category name must not exceed 100 characters';
    }

    if (!this.formSlug || this.formSlug.trim().length === 0) {
      errors.slug = 'Slug is required';
    } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(this.formSlug)) {
      errors.slug = 'Slug must be lowercase with hyphens';
    } else if (this.formSlug.length > 100) {
      errors.slug = 'Slug must not exceed 100 characters';
    }

    this.formErrors.set(errors);
    return Object.keys(errors).length === 0;
  }
}
