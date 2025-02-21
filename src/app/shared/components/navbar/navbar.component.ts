import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Category } from '../../../interfaces/category.model';
import { CategoriesService } from '../../../core/services/categories.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})
export class NavbarComponent {
  @Input() mainCategories: Category[] = [];
  @Input() subCategories: { [key: string]: Category[] } = {};
  @Input() allCategories: Category[] = [];

constructor(private categoriesService: CategoriesService) {}

  getCategoryRoute(category: Category): string[] {
    const pathSegments: string[] = [];
    this.buildFullPath(category, pathSegments);
    return pathSegments;
  }

  private buildFullPath(category: Category, path: string[]): void {
    if (category.parent !== 0) {
      const parentCategory = this.allCategories.find(
        (c) => c.id === category.parent
      );
      if (parentCategory) {
        this.buildFullPath(parentCategory, path);
      }
    }
    path.push(category.slug);
  }


  fetchSubCategories(categoryId: number): void {
    if (!this.subCategories[categoryId]) {
      this.categoriesService.getSubCategories(categoryId).subscribe({
        next: (subCategories) => {
          // تخزين الفئات الفرعية
          this.subCategories[categoryId] = subCategories;
          this.allCategories.push(...subCategories);

          // جلب الفئات الفرعية الفرعية لكل فئة فرعية
          subCategories.forEach((sub) => {
            this.categoriesService.getSubCategories(sub.id).subscribe({
              next: (subSubCategories) => {
                this.subCategories[sub.id] = subSubCategories;
                this.allCategories.push(...subSubCategories);
              },
              error: (err) => console.error(`Error fetching sub-sub categories for ${sub.id}:`, err),
            });
          });
        },
        error: (err) => console.error(`Error fetching subcategories for ${categoryId}:`, err),
      });
    }
  }

  hasSubCategories(categoryId: number): boolean {
    return this.subCategories[categoryId] && this.subCategories[categoryId].length > 0;
}
}
