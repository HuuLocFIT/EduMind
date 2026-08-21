import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AlertComponent,
  BadgeComponent,
  CardComponent,
} from '@edumind/admin-ui';
import { CourseService } from '../../core/services/course.service';
import { CourseDetailResponse } from '@edumind/shared-types';
import { CourseStatus, CourseLevel } from '@edumind/shared-constants';
import { ADMIN_ROUTES } from '@edumind/shared-utils';
import { CourseDescriptionViewerComponent } from './course-description-viewer.component';
import { CloudinaryUrlPipe } from '../../shared/pipes/cloudinary-url.pipe';

type CourseStatusValue = (typeof CourseStatus)[keyof typeof CourseStatus];
type CourseLevelValue = (typeof CourseLevel)[keyof typeof CourseLevel];

@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [
    CommonModule,
    CardComponent,
    BadgeComponent,
    AlertComponent,
    CourseDescriptionViewerComponent,
    CloudinaryUrlPipe,
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
      PUBLISHED: 'success',
      ARCHIVED: 'secondary',
    };
    return mapping[status] ?? 'secondary';
  }

  getStatusLabel(status: CourseStatusValue): string {
    return this.formatEnumLabel(status);
  }

  getLevelLabel(level: CourseLevelValue): string {
    return this.formatEnumLabel(level);
  }

  getDurationLabel(hours: number | null | undefined): string {
    if (hours == null || Number.isNaN(hours) || hours < 0) {
      return 'Not specified';
    }

    const totalMinutes = Math.round(hours * 60);
    const wholeHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    if (wholeHours > 0 && remainingMinutes > 0) {
      return `${wholeHours}h ${remainingMinutes}m`;
    }

    if (wholeHours > 0) {
      return `${wholeHours}h`;
    }

    return `${remainingMinutes}m`;
  }

  getSectionCount(course: CourseDetailResponse): number {
    return course.sections?.length ?? 0;
  }

  getLessonCount(course: CourseDetailResponse): number {
    if (typeof course.totalLessons === 'number') {
      return course.totalLessons;
    }

    return (course.sections ?? []).reduce(
      (total, section) => total + (section.lessonCount ?? section.lessons?.length ?? 0),
      0,
    );
  }

  getTotalDurationMinutes(course: CourseDetailResponse): number | null {
    if (typeof course.durationHours === 'number') {
      return Math.round(course.durationHours * 60);
    }

    const sectionMinutes = (course.sections ?? []).reduce(
      (total, section) => total + (section.totalDurationMinutes ?? 0),
      0,
    );

    return sectionMinutes > 0 ? sectionMinutes : null;
  }

  formatDurationMinutes(minutes: number | null | undefined): string {
    if (minutes == null || Number.isNaN(minutes) || minutes < 0) {
      return 'Not specified';
    }

    const wholeHours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (wholeHours > 0 && remainingMinutes > 0) {
      return `${wholeHours}h ${remainingMinutes}m`;
    }

    if (wholeHours > 0) {
      return `${wholeHours}h`;
    }

    return `${remainingMinutes}m`;
  }

  private formatEnumLabel(value: string): string {
    return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
  }
}
