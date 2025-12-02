import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '@admin/core/services/auth.service';
import { getPrimaryRole } from '@edumind/shared-utils';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  badge?: number;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.css'],
})
export class MainLayoutComponent {
  isSidebarOpen = signal(true);
  isUserMenuOpen = signal(false);
  isNotificationOpen = signal(false);

  navItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { label: 'Teachers', path: '/teachers', icon: 'people', badge: 5 },
    { label: 'Students', path: '/students', icon: 'school' },
    { label: 'Courses', path: '/courses', icon: 'book' },
    { label: 'Payments', path: '/payments', icon: 'payment' },
    { label: 'Reports', path: '/reports', icon: 'analytics' },
    { label: 'Settings', path: '/settings', icon: 'settings' },
  ];

  constructor(
    public authService: AuthService
  ) {}

  toggleSidebar(): void {
    this.isSidebarOpen.update((value) => !value);
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen.update((value) => !value);
    if (this.isUserMenuOpen()) {
      this.isNotificationOpen.set(false);
    }
  }

  toggleNotifications(): void {
    this.isNotificationOpen.update((value) => !value);
    if (this.isNotificationOpen()) {
      this.isUserMenuOpen.set(false);
    }
  }

  closeMenus(): void {
    this.isUserMenuOpen.set(false);
    this.isNotificationOpen.set(false);
  }

  logout(): void {
    this.authService.logout();
  }

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  get userInitials(): string {
    const user = this.currentUser;
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.firstName) {
      return user.firstName[0].toUpperCase();
    }
    if (user?.username) {
      return user.username[0].toUpperCase();
    }
    return 'A';
  }

  get userDisplayName(): string {
    const user = this.currentUser;
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user?.username || 'Admin';
  }

  get role(): string | undefined {
    const user = this.currentUser;
    return user ? getPrimaryRole(user) : undefined;
  }
}