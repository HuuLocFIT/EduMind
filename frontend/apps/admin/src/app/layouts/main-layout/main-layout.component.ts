import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ADMIN_ROUTES } from '@edumind/shared-utils';

interface NavItem {
  label: string;
  path?: string;
  icon: string;
  badge?: number;
  children?: NavItem[];
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.css'],
})
export class MainLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  isSidebarOpen = signal(true);
  isUserMenuOpen = signal(false);
  isNotificationOpen = signal(false);
  expandedItems = signal<Set<string>>(new Set());

  navItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    {
      label: 'Teachers',
      icon: 'people',
      children: [
        { label: 'Applications', path: ADMIN_ROUTES.TEACHER_APPLICATIONS, icon: 'description' },
        { label: 'Trial Teachers', path: ADMIN_ROUTES.TRIAL_TEACHERS, icon: 'schedule' },
      ],
    },
    { label: 'Students', path: '/students', icon: 'school' },
    { label: 'Courses', path: ADMIN_ROUTES.COURSES, icon: 'book' },
    { label: 'Categories', path: ADMIN_ROUTES.CATEGORIES, icon: 'category' },
    { label: 'Payments', path: '/payments', icon: 'payment' },
    { label: 'Reports', path: '/reports', icon: 'analytics' },
    { label: 'Settings', path: '/settings', icon: 'settings' },
  ];

  constructor() {
    // Auto-expand parent items when child routes are active
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.checkAndExpandActiveParents();
      });
    
    // Initial check
    this.checkAndExpandActiveParents();
  }

  private checkAndExpandActiveParents(): void {
    const currentPath = this.router.url;
    const expanded = new Set(this.expandedItems());
    
    this.navItems.forEach(item => {
      if (item.children) {
        const hasActiveChild = item.children.some(child => {
          if (child.path) {
            return currentPath === child.path || currentPath.startsWith(child.path + '/');
          }
          return false;
        });
        
        if (hasActiveChild) {
          expanded.add(item.label);
        }
      }
    });
    
    this.expandedItems.set(expanded);
  }

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

  toggleExpanded(itemLabel: string): void {
    const expanded = new Set(this.expandedItems());
    if (expanded.has(itemLabel)) {
      expanded.delete(itemLabel);
    } else {
      expanded.add(itemLabel);
    }
    this.expandedItems.set(expanded);
  }

  isExpanded(itemLabel: string): boolean {
    return this.expandedItems().has(itemLabel);
  }

  isChildActive(item: NavItem): boolean {
    if (!item.children) return false;
    return item.children.some(child => {
      if (child.path) {
        const currentPath = window.location.pathname;
        return currentPath === child.path || currentPath.startsWith(child.path + '/');
      }
      return false;
    });
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
    return user ? "Admin" : undefined;
  }
}