import { Component, OnInit } from '@angular/core';
import { ProductService } from '../../core/services/product.service';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import { FilterSidebarComponent } from '../../shared/components/filter-sidebar/filter-sidebar.component';
import { CategoriesService } from '../../core/services/categories.service';
import { map, of, switchMap } from 'rxjs';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, ProductCardComponent, FilterSidebarComponent, BreadcrumbComponent],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.css'],
  providers: [ProductService, CategoriesService],
})
export class ProductsComponent implements OnInit {
  products: any[] = [];
  isLoading = true;

  constructor(
    private productService: ProductService,
    private categoriesService: CategoriesService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.params
      .pipe(
        switchMap((params) => {
          const slugs = [
            params['mainCategorySlug'],
            params['subCategorySlug'],
            params['subSubCategorySlug'],
          ].filter((s) => s);
          const deepestSlug = slugs.pop();
          if (deepestSlug) {
            this.isLoading = true;
            return this.categoriesService.getCategoryBySlug(deepestSlug).pipe(
              map((category) => (category ? category.id : null))
            );
          }
          return of(null);
        })
      )
      .subscribe({
        next: (categoryId) => {
          if (categoryId !== null) {
            this.loadProducts(categoryId);
          } else {
            this.loadAllProducts();
          }
        },
        error: () => (this.isLoading = false),
        complete: () => (this.isLoading = false),
      });
  }

  private loadProducts(categoryId: number) {
    this.productService.getProductsByCategoryId(categoryId).subscribe((products) => {
      this.products = products;
      this.isLoading = false;
    });
  }

  private loadAllProducts() {
    this.productService.getAllProducts().subscribe((products) => {
      this.products = products;
      this.isLoading = false;
    });
  }
}