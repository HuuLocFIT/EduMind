import { Component, OnInit, inject, signal, computed } from '@angular/core';
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
} from '@edumind/admin-ui';
import {
  CategoryResponse,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '@edumind/shared-types';
import { CategoryService } from '../../core/services/category.service';

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
  ],
  templateUrl: './categories.component.html',
})
export class CategoriesComponent implements OnInit {
  private categoryService = inject(CategoryService);

  // State
  categories = signal<CategoryResponse[]>([]);
  isLoading = signal(true);
  searchQuery = signal('');
  visibleCategories = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return this.categories();
    return this.categories().filter(
      (cat) =>
        cat.name.toLowerCase().includes(query) ||
        cat.slug.toLowerCase().includes(query) ||
        (cat.description?.toLowerCase().includes(query) ?? false)
    );
  });

  // Modals
  showCreateModal = signal(false);
  showEditModal = signal(false);
  showDeleteModal = signal(false);
  selectedCategory = signal<CategoryResponse | null>(null);

  // Form - using regular properties for ngModel binding
  formName = '';
  formSlug = '';
  formDescription: string | null = null;
  formIconUrl: string | null = null;

  formErrors = signal<Partial<Record<keyof CreateCategoryRequest, string>>>({});
  isSubmitting = signal(false);

  successMessage = signal('');
  errorMessage = signal('');

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.isLoading.set(true);
    this.categoryService.getAllCategories().subscribe({
      next: (response) => {
        this.categories.set(response);
        this.isLoading.set(false);
      },
      error: (error: any) => {
        console.log(error);
        this.errorMessage.set('Failed to load categories');
        this.isLoading.set(false);
      },
    });
  }

  onSearch(query: string): void {
    this.searchQuery.set(query);
  }

  getStatusVariant(isActive: boolean | undefined): BadgeVariant {
    return isActive ? 'success' : 'error';
  }

  openCreateModal(): void {
    this.formName = '';
    this.formSlug = '';
    this.formDescription = null;
    this.formIconUrl = null;
    this.formErrors.set({});
    this.showCreateModal.set(true);
  }

  openEditModal(category: CategoryResponse): void {
    this.selectedCategory.set(category);
    this.formName = category.name;
    this.formSlug = category.slug;
    this.formDescription = category.description ?? null;
    this.formIconUrl = category.iconUrl ?? null;
    this.formErrors.set({});
    this.showEditModal.set(true);
  }

  openDeleteModal(category: CategoryResponse): void {
    this.selectedCategory.set(category);
    this.showDeleteModal.set(true);
  }

  generateSlug(name: string): void {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    this.formSlug = slug;
  }

  createCategory(): void {
    if (!this.validateForm()) {
      return;
    }

    this.isSubmitting.set(true);
    const payload: CreateCategoryRequest = {
      name: this.formName,
      slug: this.formSlug,
      description: this.formDescription,
      iconUrl: this.formIconUrl,
    };

    this.categoryService.createCategory(payload).subscribe({
      next: () => {
        this.successMessage.set('Category created successfully');
        this.showCreateModal.set(false);
        this.loadCategories();
        this.isSubmitting.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Failed to create category');
        this.isSubmitting.set(false);
      },
    });
  }

  updateCategory(): void {
    const category = this.selectedCategory();
    if (!category || !this.validateForm()) {
      return;
    }

    this.isSubmitting.set(true);
    const updateData: UpdateCategoryRequest = {
      name: this.formName,
      slug: this.formSlug,
      description: this.formDescription,
      iconUrl: this.formIconUrl,
    };

    this.categoryService.updateCategory(category.id, updateData).subscribe({
      next: () => {
        this.successMessage.set('Category updated successfully');
        this.showEditModal.set(false);
        this.loadCategories();
        this.isSubmitting.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Failed to update category');
        this.isSubmitting.set(false);
      },
    });
  }

  deleteCategory(): void {
    const category = this.selectedCategory();
    if (!category) return;

    this.isSubmitting.set(true);
    this.categoryService.deleteCategory(category.id).subscribe({
      next: () => {
        this.successMessage.set('Category deleted successfully');
        this.showDeleteModal.set(false);
        this.loadCategories();
        this.isSubmitting.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Failed to delete category');
        this.isSubmitting.set(false);
      },
    });
  }

  toggleCategoryStatus(category: CategoryResponse): void {
    this.isSubmitting.set(true);
    this.categoryService.toggleCategoryStatus(category.id).subscribe({
      next: () => {
        this.successMessage.set('Category status updated successfully');
        this.loadCategories();
        this.isSubmitting.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Failed to toggle category status');
        this.isSubmitting.set(false);
      },
    });
  }

  private validateForm(): boolean {
    const errors: Partial<Record<keyof CreateCategoryRequest, string>> = {};
    const name = this.formName;
    const slug = this.formSlug;

    if (!name || name.trim().length === 0) {
      errors.name = 'Category name is required';
    } else if (name.length > 100) {
      errors.name = 'Category name must not exceed 100 characters';
    }

    if (!slug || slug.trim().length === 0) {
      errors.slug = 'Slug is required';
    } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      errors.slug = 'Slug must be lowercase with hyphens';
    } else if (slug.length > 100) {
      errors.slug = 'Slug must not exceed 100 characters';
    }

    this.formErrors.set(errors);
    return Object.keys(errors).length === 0;
  }
}

