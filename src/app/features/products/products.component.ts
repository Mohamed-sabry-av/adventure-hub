import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { ProductService } from '../../core/services/product.service';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import { CategoriesService } from '../../core/services/categories.service';
import { map, of, switchMap } from 'rxjs';
import { BreadcrumbComponent } from './breadcrumb/breadcrumb.component';
import { FilterSidebarComponent } from './filter-sidebar/filter-sidebar.component';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [
    CommonModule,
    ProductCardComponent,
    FilterSidebarComponent,
    BreadcrumbComponent,
  ],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.css'],
  providers: [ProductService],
})
export class ProductsComponent implements OnInit {
  products: any[] = [];
  isLoading = true;
  isLoadingMore = false;
  currentCategoryId: number | null = null;
  currentPage: number = 1;
  itemPerPage: number = 20; 
  totalProducts: number = 0;
  @ViewChild(FilterSidebarComponent) filterSidebar!: FilterSidebarComponent;

  constructor(
    private productService: ProductService,
    private categoriesService: CategoriesService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.params.pipe(
      switchMap((params) => {
        const slugs = [
          params['mainCategorySlug'],
          params['subCategorySlug'],
          params['subSubCategorySlug'],
          params['subSubSubCategorySlug'],
          params['subSubSubSubCategorySlug'],
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
    ).subscribe({
      next: (categoryId) => {
        console.log('Received categoryId from route:', categoryId);
        this.currentCategoryId = categoryId;
        this.currentPage = 1;
        this.products = [];
        if (categoryId !== null) {
          this.loadProducts(categoryId, this.currentPage);
          this.loadTotalProducts(categoryId);
        } else {
          this.loadAllProducts(this.currentPage);
          this.loadTotalAllProducts();
        }
      },
      error: (error) => {
        console.error('Error fetching category ID:', error);
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }



ngAfterViewInit() {
  this.filterSidebar.filtersChanges.subscribe((filters) => {
    console.log('Received filters in ProductsComponent:', filters);
    this.loadProductsWithFilters(this.currentCategoryId, filters);
  });
}

  onCategoryIdChange(categoryId: number | null) {
    this.currentCategoryId = categoryId;
    this.currentPage = 1;
    this.products = [];
    this.isLoading = true;
    console.log('Category ID updated from Breadcrumb/Filter:', this.currentCategoryId);
    if (categoryId !== null) {
      this.loadProducts(categoryId, this.currentPage);
      this.loadTotalProducts(categoryId);
    } else {
      this.loadAllProducts(this.currentPage);
      this.loadTotalAllProducts();
    }
  }

  @HostListener('window:scroll', ['$event'])
  onScroll(event: Event) {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    
    // Check if we're near the bottom (within 200px)
    if (scrollTop + windowHeight >= documentHeight - 500 && !this.isLoading && !this.isLoadingMore) {
      this.loadMoreProducts();
    }
  }

  private loadProducts(categoryId: number, page: number) {
    const isInitialLoad = page === 1;
    if (isInitialLoad) {
      this.isLoading = true;
    } else {
      this.isLoadingMore = true;
    }
    const filters = this.filterSidebar?.selectedFilters || {};
    this.productService.getFilteredProductsByCategory(categoryId, filters, page, this.itemPerPage).subscribe({
      next: (products) => {
        console.log(`Loaded ${products.length} products for page ${page}`);
        console.log(products);
        // Only append new products, don't duplicate
        this.products = isInitialLoad ? products : [...this.products, ...products];
      },
      error: (error) => {
        console.error('Error loading products:', error);
      },
      complete: () => {
        this.isLoading = false;
        this.isLoadingMore = false;
      }
    });
  }

  private loadAllProducts(page: number) {
    const isInitialLoad = page === 1;
    if (isInitialLoad) {
      this.isLoading = true;
    } else {
      this.isLoadingMore = true;
    }

    const filters = this.filterSidebar?.selectedFilters || {};
    this.productService.getFilteredProductsByCategory(null, filters, page, this.itemPerPage).subscribe({
      next: (products) => {
        console.log(`Loaded ${products.length} all products for page ${page}`);
        this.products = isInitialLoad ? products : [...this.products, ...products];
      },
      error: (error) => {
        console.error('Error loading all products:', error);
      },
      complete: () => {
        this.isLoading = false;
        this.isLoadingMore = false;
      }
    });
  }

  private loadMoreProducts() {
    if (this.currentPage * this.itemPerPage >= this.totalProducts) {
      console.log('All products loaded:', this.totalProducts);
      return;
    }

    if (!this.isLoading && !this.isLoadingMore) {
      this.currentPage++;
      console.log('Fetching page:', this.currentPage);
      
      if (this.currentCategoryId !== null) {
        this.loadProducts(this.currentCategoryId, this.currentPage);
      } else {
        this.loadAllProducts(this.currentPage);
      }
    }
  }

  private loadTotalProducts(categoryId: number) {
    this.productService.getTotalProductsByCategoryId(categoryId).subscribe({
      next: (total) => {
        console.log('Total products for category loaded:', total);
        this.totalProducts = total;
      },
      error: (error) => {
        console.error('Error loading total products:', error);
        this.totalProducts = 0; // تعيين قيمة افتراضية
      },
    });
  }

  private loadTotalAllProducts() {
    this.productService.getTotalProducts().subscribe({
      next: (total) => {
        console.log('Total all products loaded:', total);
        this.totalProducts = total;
      },
      error: (error) => {
        console.error('Error loading total all products:', error);
        this.totalProducts = 0; // تعيين قيمة افتراضية
      },
    });
  }

  getCurrentPath(): string[] {
    const params = this.route.snapshot.params;
    return Object.keys(params)
      .filter((key) => key.includes('CategorySlug'))
      .map((key) => params[key])
      .filter((s) => s);
  }


// ===========================================FilterSide===============================================

private loadProductsWithFilters(categoryId: number | null, filters: { [key: string]: string[] }) {
  this.isLoading = true;
  this.currentPage = 1;
  this.products = [];

  this.productService.getFilteredProductsByCategory(categoryId, filters, this.currentPage, this.itemPerPage).subscribe({
    next: (products) => {
      this.products = products;
      console.log('Filtered products loaded:', products);
    },
    error: (error) => {
      console.error('Error loading filtered products:', error);
      this.products = [];
    },
    complete: () => {
      this.isLoading = false;
    },
  });
}

}