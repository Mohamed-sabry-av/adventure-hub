import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Category } from '../../../interfaces/category.model';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})
export class NavbarComponent {
  @Input() mainCategories: Category[] = [];
  @Input() allCategories: Category[] = [];

  /**
   * Builds the full route path for a given category based on its parent hierarchy.
   * @param category The category to build the route for.
   * @returns Array of path segments.
   */
  getCategoryRoute(category: Category): string[] {
    const pathSegments: string[] = [];
    this.buildFullPath(category, pathSegments);
    return pathSegments;
  }

  /**
   * Recursively builds the path segments for a category by traversing its parents.
   * @param category The current category.
   * @param path The array to store path segments.
   */
  private buildFullPath(category: Category, path: string[]): void {
    if (category.parent !== 0) {
      const parentCategory = this.allCategories.find((c) => c.id === category.parent);
      if (parentCategory) {
        this.buildFullPath(parentCategory, path);
      }
    }
    path.push(category.slug);
  }

  /**
   * Gets subcategories for a given category ID from allCategories.
   * @param categoryId The ID of the parent category.
   * @returns Array of subcategories.
   */
  getSubCategories(categoryId: number): Category[] {
    return this.allCategories.filter((cat) => cat.parent === categoryId);
  }

}