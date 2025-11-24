import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-dashboard",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div>
      <h1 class="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-sm font-medium text-gray-500">Total Students</h3>
          <p class="text-3xl font-bold text-gray-900 mt-2">1,234</p>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-sm font-medium text-gray-500">Active Teachers</h3>
          <p class="text-3xl font-bold text-gray-900 mt-2">56</p>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-sm font-medium text-gray-500">Total Courses</h3>
          <p class="text-3xl font-bold text-gray-900 mt-2">89</p>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-sm font-medium text-gray-500">
            Revenue (This Month)
          </h3>
          <p class="text-3xl font-bold text-gray-900 mt-2">$12,345</p>
        </div>
      </div>

      <!-- Recent Activities -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-bold text-gray-900 mb-4">Recent Activities</h2>
        <p class="text-gray-500">No recent activities</p>
      </div>
    </div>
  `,
})
export class DashboardComponent {}
