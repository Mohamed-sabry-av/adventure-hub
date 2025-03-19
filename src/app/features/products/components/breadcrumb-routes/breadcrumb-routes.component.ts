import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CategoriesService } from '../../../../core/services/categories.service';
import { ProductService } from '../../../../core/services/product.service';
import { CacheService } from '../../../../core/services/cashing.service';
import { Category } from '../../../../interfaces/category.model';

@Component({
  selector: 'app-breadcrumb-routes',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <ul class="space-y-4 border-b border-gray-200 pb-6 text-sm font-medium text-gray-900">
      @defer (when isDataFullyLoaded) {
        <li *ngFor="let subCat of subcategories">
          <a
            [routerLink]="getSubCategoryRoute(subCat.category)"
            (click)="onSubcategoryClick(subCat.category)"
            class="block"
          >
            {{ subCat.category.name }} ({{ subCat.productCount }})
          </a>
        </li>
      } @placeholder {
        <li *ngFor="let item of [].constructor(3)" class="skeleton">
          <div class="h-4 bg-gray-200 rounded w-3/4"></div>
        </li>
      }
    </ul>
  `,
  styleUrls: ['./breadcrumb-routes.component.css'],
})
export class BreadcrumbRoutesComponent implements OnInit {
  @Input() categoryId: number | null = null;
  subcategories: { category: Category; productCount: number }[] = [];
  isDataFullyLoaded = false;
  private totalSubcategories = 0;
  private loadedCounts = 0;

  constructor(
    private categoryService: CategoriesService,
    private productService: ProductService,
    private cacheService: CacheService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.loadSubCategories();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['categoryId'] && !changes['categoryId'].firstChange && this.categoryId !== null) {
      this.subcategories = [];
      this.isDataFullyLoaded = false;
      this.loadedCounts = 0;
      this.loadSubCategories();
    }
  }

  private loadSubCategories(): void {
    if (this.categoryId === null || this.categoryId === undefined) {
      this.isDataFullyLoaded = true;
      return;
    }

    this.categoryService.getAllCategories().subscribe((allCategories) => {
      const subCats = allCategories.filter((cat) => cat.parent === this.categoryId);
      this.subcategories = subCats.map((cat) => ({ category: cat, productCount: 0 }));
      this.totalSubcategories = subCats.length;

      if (subCats.length === 0) {
        this.isDataFullyLoaded = true;
        return;
      }

      subCats.forEach((subcat) => {
        const cacheKey = `total_products_category_${subcat.id}`;
        const cachedCount :any= this.cacheService.get(cacheKey);

        if (cachedCount !== undefined) {
          this.updateSubcategoryCount(subcat.id, cachedCount);
          this.loadedCounts++;
          this.checkLoadingComplete();
        } else {
          this.productService.getTotalProductsByCategoryId(subcat.id).subscribe({
            next: (count) => {
              this.updateSubcategoryCount(subcat.id, count);
              this.cacheService.set(cacheKey, count); // Cache the result
              this.loadedCounts++;
              this.checkLoadingComplete();
            },
            error: (error) => {
              console.error(`Error fetching product count for category ${subcat.id}:`, error);
              this.updateSubcategoryCount(subcat.id, 0);
              this.loadedCounts++;
              this.checkLoadingComplete();
            },
          });
        }
      });
    });
  }

  private updateSubcategoryCount(categoryId: number, count: number): void {
    const index = this.subcategories.findIndex((sub) => sub.category.id === categoryId);
    if (index !== -1) {
      this.subcategories[index].productCount = count;
    }
  }

  private checkLoadingComplete(): void {
    if (this.loadedCounts === this.totalSubcategories) {
      this.isDataFullyLoaded = true;
    }
  }

  getSubCategoryRoute(category: Category): string[] {
    const currentUrl = this.route.snapshot.url.map((segment) => segment.path).join('/');
    const currentSegments = currentUrl.split('/').filter((segment) => segment && segment !== 'products');
    const newSegments = [...currentSegments, category.slug].filter(
      (item, index, self) => index === self.lastIndexOf(item)
    );
    return ['/', ...newSegments];
  }

  onSubcategoryClick(category: Category) {
    const newPath = this.getSubCategoryRoute(category);
    this.router.navigate(newPath).then(() => {
      console.log('Navigated to subcategory:', newPath);
    });
  }
}