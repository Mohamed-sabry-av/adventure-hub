import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Category } from '../../../interfaces/category.model';
import { CategoriesService } from '../../../core/services/categories.service';
import { ProductService } from '../../../core/services/product.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CacheService } from '../../../core/services/cashing.service';

@Component({
  selector: 'app-breadcrumb-routes',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <ul>
      @defer (when isDataFullyLoaded) {
        <li class="list-group-item subrouteA" *ngFor="let subCat of subcategories">
          <a class="subrouteA" 
             [routerLink]="getSubCategoryRoute(subCat.category)" 
             (click)="onSubcategoryClick(subCat.category)">
            {{ subCat.category.name }} ({{ subCat.productCount }})
          </a>
        </li>
      } @placeholder {
        <li class="skeleton" *ngFor="let item of [].constructor(3)">
          <div class="skeleton-loader">
            <span class="skeleton-name"></span>
            <span class="skeleton-count"></span>
          </div>
        </li>
      }
    </ul>
  `,
  styleUrls: ['./breadcrumb-routes.component.css'],
})
export class BreadcrumbRoutesComponent {
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
    if (this.categoryId) {
      this.loadSubCategories(this.categoryId);
    } else {
      console.log('No Category ID provided.');
      this.isDataFullyLoaded = true;
    }
  }

  private loadSubCategories(categoryId: number): void {
    this.categoryService.getAllCategories().subscribe((allCategories) => {
      const subCats = allCategories.filter((cat) => cat.parent === categoryId);
      this.subcategories = subCats.map((cat) => ({ category: cat, productCount: 0 }));
      this.totalSubcategories = subCats.length;

      if (subCats.length === 0) {
        this.isDataFullyLoaded = true;
        console.log('No subcategories found.');
        return;
      }

      subCats.forEach((subcat) => {
        const cacheKey = `total_products_category_${subcat.id}`;
        const cachedCount :any= this.cacheService.get(cacheKey);

        if (cachedCount !== undefined) {
          this.updateSubcategoryCount(subcat.id, cachedCount);
          this.loadedCounts++;
          console.log(`Used cache for category ${subcat.id}: ${cachedCount}`);
          this.checkLoadingComplete();
        } else {
          this.productService.getTotalProductsByCategoryId(subcat.id).subscribe({
            next: (count) => {
              this.updateSubcategoryCount(subcat.id, count);
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
      console.log('All data has finished loading.');
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