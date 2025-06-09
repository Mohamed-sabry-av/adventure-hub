import { Component, Input, OnInit, SimpleChanges, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CategoriesService } from '../../../../core/services/categories.service';
import { Category } from '../../../../interfaces/category.model';
import { SafeHtmlPipe } from "../../../../shared/pipes/safeHtml.pipe";
@Component({
  selector: 'app-breadcrumb-routes',
  standalone: true,
  imports: [CommonModule, RouterLink, SafeHtmlPipe],
  template: `
    <nav aria-label="Subcategory navigation" class="border-b border-gray-200">
      <ol class="space-y-1 text-sm font-medium text-gray-900">
        @defer (when isDataFullyLoaded) {
          @for (subCat of subcategories; track subCat.category.id) {
            <li>
              <a
                [routerLink]="getSubCategoryRoute(subCat.category)"
                (click)="onSubcategoryClick(subCat.category)"
                class="flex items-center hover:text-blue-600"
                aria-current="page"
                [innerHTML]="subCat.category.name | safeHtml"
              >
                {{ subCat.category.name }} ({{ subCat.productCount }})
              </a>
            </li>
          } @empty {
          }
        } @placeholder {
          <li *ngFor="let item of skeletonArray; let i = index" class="animate-pulse">
            <div class="h-4 bg-gray-200 rounded w-3/4"></div>
          </li>
        }
      </ol>
    </nav>
  `,
  styleUrls: ['./breadcrumb-routes.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreadcrumbRoutesComponent implements OnInit {
  @Input() categoryId: number | null = null;
  subcategories: { category: Category; productCount: number }[] = [];
  isDataFullyLoaded = false;
  skeletonArray = Array(3).fill(0);
  constructor(
    private categoryService: CategoriesService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute
  ) {}
  async ngOnInit() {
    await this.loadSubCategories();
  }
  async ngOnChanges(changes: SimpleChanges) {
    if (changes['categoryId'] && !changes['categoryId'].firstChange && this.categoryId !== null) {
      this.subcategories = [];
      this.isDataFullyLoaded = false;
      this.cdr.markForCheck();
      await this.loadSubCategories();
    }
  }
  private async loadSubCategories(): Promise<void> {

    if (this.categoryId === null || this.categoryId === undefined) {

      this.isDataFullyLoaded = true;
      this.cdr.markForCheck();
      return;
    }
    try {
      const allCategories = (await this.categoryService.getAllCategories().toPromise()) || [];

      const subCats = allCategories.filter((cat) => cat.parent === this.categoryId);

      this.subcategories = subCats.map((cat) => ({
        category: cat,
        productCount: cat.count ?? 0,
      }));

      this.isDataFullyLoaded = true;
    } catch (error) {
      console.error('Error loading subcategories:', error);
      this.subcategories = [];
      this.isDataFullyLoaded = true;
    }
    this.cdr.markForCheck();
  }
  getSubCategoryRoute(category: Category): string[] {
    const currentUrl = this.route.snapshot.url
      .map((segment) => segment.path)
      .join('/');
    const currentSegments = currentUrl
      .split('/')
      .filter((segment) => segment && segment !== 'products');
    const newSegments = ['category', ...currentSegments, category.slug].filter(
      (item, index, self) => index === self.lastIndexOf(item)
    );
    return ['/', ...newSegments];
  }
  async onSubcategoryClick(category: Category): Promise<void> {
    const newPath = this.getSubCategoryRoute(category);
    try {
      await this.router.navigate(newPath);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }
}
