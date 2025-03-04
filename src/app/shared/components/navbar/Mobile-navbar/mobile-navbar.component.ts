// src/app/components/navbar/mobile-navbar/mobile-navbar.component.ts
import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Category } from '../../../../interfaces/category.model';

@Component({
  selector: 'app-mobile-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './mobile-navbar.component.html',
  styleUrls: ['./mobile-navbar.component.css'],
})
export class MobileNavbarComponent {
  @Input() mainCategories: Category[] = [];
  @Input() allCategories: Category[] = [];
  sidebarOpen = false;
  showSubcategories = false;
  currentSubcategories: Category[] = [];
  currentMenuTitle = 'Menu';
  showBackButton = false;

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  showSubcategoriesFor(category: Category) {
    this.currentSubcategories = this.getSubCategories(category.id);
    this.showSubcategories = true;
    this.currentMenuTitle = category.name;
    this.showBackButton = true;
  }

  goBack() {
    this.showSubcategories = false;
    this.currentMenuTitle = 'Menu';
    this.showBackButton = false;
    this.currentSubcategories = [];
  }

  closeSidebar() {
    this.sidebarOpen = false;
    this.showSubcategories = false;
    this.currentMenuTitle = 'Menu';
    this.showBackButton = false;
    this.currentSubcategories = [];
  }

  getCategoryRoute(category: Category): string[] {
    const pathSegments: string[] = [];
    this.buildFullPath(category, pathSegments);
    return pathSegments;
  }

  private buildFullPath(category: Category, path: string[]): void {
    if (category.parent !== 0) {
      const parentCategory = this.allCategories.find((c) => c.id === category.parent);
      if (parentCategory) {
        this.buildFullPath(parentCategory, path);
      }
    }
    path.push(category.slug);
  }

  getSubCategories(categoryId: number): Category[] {
    return this.allCategories.filter((cat) => cat.parent === categoryId);
  }
}