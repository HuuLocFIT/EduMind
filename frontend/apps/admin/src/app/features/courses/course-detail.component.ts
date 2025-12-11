import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AlertComponent,
  BadgeComponent,
  ButtonComponent,
  CardComponent,
} from '@edumind/admin-ui';
import { CourseService } from '../../core/services/course.service';
import { CourseDetailResponse } from '@edumind/shared-types';
import { CourseStatus, CourseLevel } from '@edumind/shared-constants';
import { ADMIN_ROUTES } from '@edumind/shared-utils';

type CourseStatusValue = (typeof CourseStatus)[keyof typeof CourseStatus];
type CourseLevelValue = (typeof CourseLevel)[keyof typeof CourseLevel];

@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [
    CommonModule,
    CardComponent,
    ButtonComponent,
    BadgeComponent,
    AlertComponent,
  ],
  templateUrl: './course-detail.component.html',
})
export class CourseDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private courseService = inject(CourseService);

  course = signal<CourseDetailResponse | null>(null);
  isLoading = signal(true);
  errorMessage = signal('');

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : NaN;
    if (Number.isNaN(id)) {
      this.errorMessage.set('Invalid course id');
      this.isLoading.set(false);
      return;
    }

    this.fetchCourse(id);
  }

  fetchCourse(id: number): void {
    this.isLoading.set(true);
    this.courseService.getCourseById(id).subscribe({
      next: (res) => {
        this.course.set(res);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load course details');
        this.isLoading.set(false);
      },
    });
  }

  goBack(): void {
    this.router.navigate([ADMIN_ROUTES.COURSES]);
  }

  getStatusVariant(status: CourseStatusValue): 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'default' {
    const mapping: Record<CourseStatusValue, 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'default'> = {
      DRAFT: 'secondary',
      PENDING_REVIEW: 'warning',
      PUBLISHED: 'success',
      ARCHIVED: 'secondary',
    };
    return mapping[status] ?? 'secondary';
  }

  getLevelLabel(level: CourseLevelValue): string {
    return level.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

