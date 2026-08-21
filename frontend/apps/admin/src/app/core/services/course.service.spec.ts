import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../environments/environment';
import { CourseService } from './course.service';

describe('CourseService lifecycle operations', () => {
  let service: CourseService;
  let httpMock: HttpTestingController;

  const archivedCourse = {
    id: 42,
    title: 'Lifecycle course',
    slug: 'lifecycle-course',
    description: 'Description',
    instructorId: 7,
    instructorName: 'Teacher',
    categoryId: 3,
    categoryName: 'Development',
    price: 0,
    currency: 'USD',
    level: 'BEGINNER',
    language: 'en',
    status: 'ARCHIVED',
    archivedAt: '2026-08-21T05:00:00Z',
    archivedBy: 1,
    archiveReason: 'Outdated curriculum',
    hasCertificate: false,
    hasSubtitles: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-08-21T05:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(CourseService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it('archives through the lifecycle endpoint with the required reason payload', () => {
    service.archiveCourse(42, 'Outdated curriculum').subscribe((course) => {
      expect(course.status).toBe('ARCHIVED');
      expect(course.archiveReason).toBe('Outdated curriculum');
    });

    const request = httpMock.expectOne(`${environment.apiUrl}/api/courses/42/archive`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ reason: 'Outdated curriculum' });
    request.flush(archivedCourse);
  });

  it('uses the admin list endpoint and sends lifecycle filters', () => {
    service.getAdminCourses({
      keyword: 'angular',
      categoryIds: [3],
      levels: ['ADVANCED'],
      status: 'ARCHIVED',
      page: 1,
      size: 20,
    }).subscribe((response) => expect(response.data).toEqual([]));

    const request = httpMock.expectOne((req) => req.url === `${environment.apiUrl}/api/admin/courses`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('keyword')).toBe('angular');
    expect(request.request.params.getAll('categoryIds')).toEqual(['3']);
    expect(request.request.params.getAll('levels')).toEqual(['ADVANCED']);
    expect(request.request.params.get('status')).toBe('ARCHIVED');
    expect(request.request.params.get('page')).toBe('1');
    expect(request.request.params.get('size')).toBe('20');
    request.flush({
      status: 200,
      success: true,
      data: [],
      pagination: { page: 1, size: 20, totalElements: 0, totalPages: 0 },
    });
  });
});
