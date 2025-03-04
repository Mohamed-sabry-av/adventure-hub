// src/app/components/navbar/navbar.component.ts
import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Category } from '../../../interfaces/category.model';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})
export class NavbarComponent {
  @Input() mainCategories: Category[] = [];
  @Input() allCategories: Category[] = [];

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