import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { NgApexchartsModule } from 'ng-apexcharts';
import {
  AlertComponent,
  type BadgeVariant,
} from '@edumind/admin-ui';
import { AdminDashboardService } from '../../core/services/admin-dashboard.service';
import { AdminUserService } from '../../core/services/admin-user.service';
import { AdminEnrollmentService } from '../../core/services/admin-enrollment.service';
import {
  DashboardStats,
  EnrollmentReportResponse,
  TeacherApplicationResponse,
} from '@edumind/shared-types';
import { ADMIN_ROUTES } from '@edumind/shared-utils';
import type { ApexOptions } from 'apexcharts';
import { GetInitialsPipe } from './get-initials.pipe';
import { injectAsyncState, getStatusVariant } from '../../core/utils';

type ReportRow = EnrollmentReportResponse;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, NgApexchartsModule, AlertComponent, GetInitialsPipe],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(AdminDashboardService);
  private adminUserService = inject(AdminUserService);
  private adminEnrollmentService = inject(AdminEnrollmentService);

  // ── Utilities ────────────────────────────────────────────────────────────
  private async = injectAsyncState();
  isLoading = this.async.isLoading;
  errorMessage = this.async.errorMessage;

  // ── Data ─────────────────────────────────────────────────────────────────
  stats = signal<DashboardStats | null>(null);
  totalStudents = signal(0);
  totalTeachers = signal(0);
  pendingAppsCount = signal(0);
  recentReports = signal<ReportRow[]>([]);
  recentApplications = signal<TeacherApplicationResponse[]>([]);
  lastUpdated = signal<Date>(new Date());

  // ── Derived metrics ───────────────────────────────────────────────────────
  completionRate = computed(() => {
    const s = this.stats();
    if (!s || s.totalEnrollments === 0) return 0;
    return (s.completedEnrollments / s.totalEnrollments) * 100;
  });

  coursePublishRate = computed(() => {
    const s = this.stats();
    if (!s || s.totalCourses === 0) return 0;
    return (s.publishedCourses / s.totalCourses) * 100;
  });

  avgRevenuePerEnrollment = computed(() => {
    const s = this.stats();
    if (!s || s.totalEnrollments === 0) return 0;
    return s.totalRevenue / s.totalEnrollments;
  });

  pendingTasksCount = computed(() => {
    const stats = this.stats();
    if (!stats) return 0;
    return stats.pendingEnrollmentReports + stats.pendingRefunds + this.pendingAppsCount();
  });

  revenueChange = computed<{ value: number; isPositive: boolean }>(() => {
    const stats = this.stats();
    if (!stats || stats.revenueLastMonth === 0) return { value: 0, isPositive: true };
    const change = ((stats.revenueThisMonth - stats.revenueLastMonth) / stats.revenueLastMonth) * 100;
    return { value: Math.abs(change), isPositive: change >= 0 };
  });

  enrollmentChange = computed<{ value: number; isPositive: boolean }>(() => {
    const s = this.stats();
    if (!s || s.monthlyEnrollments.length < 2) return { value: 0, isPositive: true };
    const last = s.monthlyEnrollments[s.monthlyEnrollments.length - 1]?.count ?? 0;
    const prev = s.monthlyEnrollments[s.monthlyEnrollments.length - 2]?.count ?? 0;
    if (prev === 0) return { value: 0, isPositive: true };
    const change = ((last - prev) / prev) * 100;
    return { value: Math.abs(change), isPositive: change >= 0 };
  });

  // ── Chart options ──────────────────────────────────────────────────────────
  enrollmentChartOptions = computed<ApexOptions>(() => {
    const s = this.stats();
    if (!s) return this.getEmptyChartOptions();
    return {
      chart: { type: 'area' as const, height: 280, toolbar: { show: false }, zoom: { enabled: false } },
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 2 },
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 90, 100] } },
      colors: ['#6366f1'],
      series: [{ name: 'Enrollments', data: s.monthlyEnrollments.map((m) => m.count ?? 0) }],
      xaxis: { categories: s.monthlyEnrollments.map((m) => m.month), labels: { style: { colors: '#9ca3af', fontSize: '12px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
      yaxis: { labels: { style: { colors: '#9ca3af', fontSize: '12px' } } },
      grid: { borderColor: '#f3f4f6', strokeDashArray: 4, padding: { left: 0, right: 0 } },
      tooltip: { theme: 'light' },
    };
  });

  revenueChartOptions = computed<ApexOptions>(() => {
    const s = this.stats();
    if (!s) return this.getEmptyChartOptions();
    return {
      chart: { type: 'bar' as const, height: 280, toolbar: { show: false } },
      plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
      dataLabels: { enabled: false },
      colors: ['#10b981'],
      series: [{ name: 'Revenue ($)', data: s.monthlyRevenue.map((m) => Number(m.amount ?? 0)) }],
      xaxis: { categories: s.monthlyRevenue.map((m) => m.month), labels: { style: { colors: '#9ca3af', fontSize: '12px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
      yaxis: { labels: { style: { colors: '#9ca3af', fontSize: '12px' }, formatter: (val: number) => `$${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}` } },
      grid: { borderColor: '#f3f4f6', strokeDashArray: 4, padding: { left: 0, right: 0 } },
      tooltip: { theme: 'light', y: { formatter: (val: number) => `$${val.toLocaleString()}` } },
    };
  });

  courseStatusChartOptions = computed<ApexOptions>(() => {
    const s = this.stats();
    if (!s) return this.getEmptyChartOptions();
    return {
      chart: { type: 'donut' as const, height: 280 },
      colors: ['#10b981', '#f59e0b', '#6366f1', '#9ca3af'],
      labels: ['Published', 'Pending Review', 'Draft', 'Archived'],
      series: [s.publishedCourses, s.pendingReviewCourses, s.draftCourses, s.archivedCourses],
      legend: { position: 'bottom', labels: { colors: '#6b7280' } },
      dataLabels: { enabled: true, formatter: (val: number) => `${Math.round(val)}%` },
      plotOptions: { pie: { donut: { size: '65%' } } },
      tooltip: { theme: 'light' },
    };
  });

  categoryChartOptions = computed<ApexOptions>(() => {
    const s = this.stats();
    if (!s) return this.getEmptyChartOptions();
    const categories = s.coursesByCategory.slice(0, 8);
    return {
      chart: { type: 'bar' as const, height: 280, toolbar: { show: false } },
      plotOptions: { bar: { horizontal: true, borderRadius: 3, barHeight: '60%' } },
      colors: ['#6366f1'],
      dataLabels: { enabled: true, style: { fontSize: '11px' } },
      series: [{ name: 'Courses', data: categories.map((c) => c.courseCount) }],
      xaxis: { categories: categories.map((c) => c.categoryName), labels: { style: { colors: '#9ca3af', fontSize: '11px' } } },
      yaxis: { labels: { style: { colors: '#6b7280', fontSize: '12px' } } },
      grid: { borderColor: '#f3f4f6', strokeDashArray: 4 },
      tooltip: { theme: 'light' },
    };
  });

  readonly ADMIN_ROUTES = ADMIN_ROUTES;
  readonly skeletonItems = [1, 2, 3, 4, 5, 6];
  readonly skeletonHealthItems = [1, 2, 3, 4];
  readonly skeletonChartItems = [1, 2];

  private readonly currencyFmt = new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0,
  });

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.errorMessage.set('');

    this.async.execute(
      forkJoin({
        stats: this.dashboardService.getDashboardStats(),
        students: this.adminUserService.getUsersByRole('ROLE_STUDENT', { page: 0, size: 1 }),
        teachers: this.adminUserService.getUsersByRole('ROLE_TEACHER', { page: 0, size: 1 }),
        pendingApps: this.adminUserService.getApplications({ status: 'PENDING', page: 0, size: 1 }),
        pendingReports: this.adminEnrollmentService.getReports({ status: 'PENDING', page: 0, size: 5 }),
      }),
      {
        errorMsg: 'Failed to load dashboard data. Please try again.',
        onSuccess: ({ stats, students, teachers, pendingApps, pendingReports }) => {
          this.stats.set(stats);
          this.totalStudents.set(students.pagination?.totalElements ?? 0);
          this.totalTeachers.set(teachers.pagination?.totalElements ?? 0);
          this.pendingAppsCount.set(pendingApps.pagination?.totalElements ?? 0);
          this.recentReports.set(pendingReports.data ?? []);
          this.recentApplications.set(pendingApps.data ?? []);
          this.lastUpdated.set(new Date());
        },
      },
    );
  }

  formatCurrency(value: number): string {
    return this.currencyFmt.format(value);
  }

  getStatusVariant(status: string): BadgeVariant {
    return getStatusVariant(status);
  }

  private getEmptyChartOptions(): ApexOptions {
    return {
      chart: { type: 'line' as const, height: 280 },
      series: [{ name: '', data: [] }],
      xaxis: { categories: [] },
      dataLabels: { enabled: false },
      colors: [],
      grid: { borderColor: '#f3f4f6' },
      tooltip: { theme: 'light' },
    };
  }
}
