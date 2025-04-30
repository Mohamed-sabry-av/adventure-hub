import { ChangeDetectionStrategy, Component, DestroyRef, inject, Input } from '@angular/core';
import { Category } from '../../../interfaces/category.model';
import { Observable } from 'rxjs';
import { animate, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

// Component for displaying sub-categories in the navbar
@Component({
  selector: 'app-navbar-sub-categories',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './navbar-sub-categories.component.html',
  styleUrls: ['./navbar-sub-categories.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('visible', [
      transition(':enter', [
        style({ opacity: 0, height: '0px', overflow: 'hidden' }),
        animate('0.3s ease-out', style({ opacity: 1, height: '*' })),
      ]),
      transition(':leave', [
        animate('0.3s ease-in', style({ opacity: 0, height: '0px' })),
      ]),
    ]),
  ],
})
export class NavbarSubCategoriesComponent {
  private destroyRef = inject(DestroyRef);
  @Input() allCategoriesData: Category[] = [];
  @Input({ required: true }) subCategories$!: Observable<Category[]>;

  categoriesData: Category[] = [];
  keepOpen: boolean = false;
  selectedCategoryId: number | null = null;

  ngOnInit() {
    const subscription = this.subCategories$.subscribe((data) => {
      this.categoriesData = data;
      this.keepOpen = data.length > 0;
    });
    this.destroyRef.onDestroy(() => subscription.unsubscribe());
  }

  // Handle mouse leave event
  onLeave() {
    this.keepOpen = false;
    this.selectedCategoryId = null;
  }

  // Handle mouse enter event
  onEnter() {
    this.keepOpen = true;
  }

  // Get sub-categories for a given category
  getSubCategories(categoryId: number | null): Category[] {
    return this.allCategoriesData.filter((cat) => cat.parent === categoryId);
  }

  // Build category route for navigation
  getCategoryRoute(category: Category): string[] {
    const pathSegments: string[] = ['category'];
    this.buildFullPath(category, pathSegments);
    return pathSegments;
  }

  // Recursively build the full path for a category
  private buildFullPath(category: Category, path: string[]): void {
    if (category.parent !== 0) {
      const parentCategory = this.allCategoriesData.find((c) => c.id === category.parent);
      if (parentCategory) {
        this.buildFullPath(parentCategory, path);
      }
    }
    path.push(category.slug);
  }
}