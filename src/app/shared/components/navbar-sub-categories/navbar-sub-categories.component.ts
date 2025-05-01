import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  Input,
  ChangeDetectorRef,
} from '@angular/core';
import { Category } from '../../../interfaces/category.model';
import { Observable } from 'rxjs';
import { animate, transition, trigger, style } from '@angular/animations';
import { AsyncPipe, CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

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
        style({ transform: 'translateY(-10px)', opacity: 0 }),
        animate(
          '300ms cubic-bezier(0.25, 0.8, 0.25, 1)',
          style({ transform: 'translateY(0)', opacity: 1 })
        ),
      ]),
      transition(':leave', [
        style({ transform: 'translateY(0)', opacity: 1 }),
        animate(
          '300ms cubic-bezier(0.25, 0.8, 0.25, 1)',
          style({ transform: 'translateY(-10px)', opacity: 0 })
        ),
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

  ngOnInit() {
    const subscription = this.subCategories$.subscribe((data) => {
      this.categoriesData = data;
      this.keepOpen = data.length > 0;
      this.cdr.markForCheck();
    });
    this.destroyRef.onDestroy(() => {
      subscription.unsubscribe();
    });
  }

  onLeave() {
    this.keepOpen = false;
    this.cdr.markForCheck();
  }

  onEnter() {
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