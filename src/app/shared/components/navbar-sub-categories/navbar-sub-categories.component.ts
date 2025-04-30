import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  Input,
  ChangeDetectorRef
} from '@angular/core';
import { Category } from '../../../interfaces/category.model';
import { filter, map, Observable } from 'rxjs';
import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { AsyncPipe, CommonModule, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-navbar-sub-categories',
  imports: [CommonModule, RouterLink, AsyncPipe],
  templateUrl: './navbar-sub-categories.component.html',
  styleUrl: './navbar-sub-categories.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,

  animations: [
    trigger('visible', [
      transition(':enter', [
        style({ opacity: 0, height: '0px', overflow: 'hidden' }),
        animate('0.3s cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, height: '*' })),
      ]),
      transition(':leave', [
        animate('0.3s cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 0, height: '0px' })),
      ]),
    ]),
  ],
})
export class NavbarSubCategoriesComponent {
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);

  @Input() allCategoriesData: Category[] = [];
  @Input({ required: true }) subCategories$!: Observable<Category[]>;

  categoriesData: Category[] = [];
  keepOpen: boolean = false;
  selectedCategoryId: number | null = null;
  hoverDelay: any = null;

  ngOnInit() {
    const subscription = this.subCategories$.subscribe((data) => {
      if (data.length > 0) {
        this.categoriesData = data;
        this.keepOpen = true;
        this.cdr.markForCheck();
      } else {
        // Don't close immediately, wait to see if it's a hover interaction
        if (!this.hoverDelay) {
          this.hoverDelay = setTimeout(() => {
            this.keepOpen = false;
            this.cdr.markForCheck();
            this.hoverDelay = null;
          }, 100);
        }
      }
    });
    this.destroyRef.onDestroy(() => {
      subscription.unsubscribe();
      if (this.hoverDelay) {
        clearTimeout(this.hoverDelay);
      }
    });
  }

  onLeave() {
    // Add a small delay before closing to allow smooth transitions between items
    setTimeout(() => {
      this.keepOpen = false;
      this.selectedCategoryId = null;
      this.cdr.markForCheck();
    }, 300);
  }

  onEnter() {
    // Clear any pending close operations
    if (this.hoverDelay) {
      clearTimeout(this.hoverDelay);
      this.hoverDelay = null;
    }

    this.keepOpen = true;
    this.cdr.markForCheck();
  }

  getSubCategories(categoryId: number | null): Category[] {
    return this.allCategoriesData.filter((cat) => cat.parent === categoryId);
  }

  getCategoryRoute(category: Category): string[] {
    const pathSegments: string[] = ['category'];
    this.buildFullPath(category, pathSegments);
    return pathSegments;
  }

  private buildFullPath(category: Category, path: string[]): void {
    if (category.parent !== 0) {
      const parentCategory = this.allCategoriesData.find(
        (c) => c.id === category.parent
      );
      if (parentCategory) {
        this.buildFullPath(parentCategory, path);
      }
    }
    path.push(category.slug);
  }
}
