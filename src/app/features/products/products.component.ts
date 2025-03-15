import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { ProductService } from '../../core/services/product.service';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import { CategoriesService } from '../../core/services/categories.service';
import { map, of, switchMap } from 'rxjs';
import { BreadcrumbComponent } from './breadcrumb/breadcrumb.component';
import { FilterSidebarComponent } from './filter-sidebar/filter-sidebar.component';
import { FilterService } from '../../core/services/filter.service';

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
    private route: ActivatedRoute,
    private filterService: FilterService
  ) {}

  ngOnInit() {
    this.route.params
      .pipe(
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
      )
      .subscribe({
        next: (categoryId) => {
          this.currentCategoryId = categoryId;
          this.currentPage = 1;
          this.products = [];
          this.loadProducts(categoryId, this.currentPage); // تحميل المنتجات بدون فلاتر أول مرة
          this.loadTotalProducts(categoryId);
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
    if (this.filterSidebar) {
      this.filterSidebar.filtersChanges.subscribe((filters) => {
        this.loadProductsWithFilters(this.currentCategoryId, filters); // لما الفلاتر تتغير، جيب المنتجات المفلترة
      });
    } else {
      console.warn('FilterSidebarComponent not initialized in ngAfterViewInit');
    }
  }

  @HostListener('window:scroll', ['$event'])
  onScroll(event: Event) {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;

    if (
      scrollTop + windowHeight >= documentHeight - 500 &&
      !this.isLoading &&
      !this.isLoadingMore &&
      this.currentPage * this.itemPerPage < this.totalProducts
    ) {
      this.loadMoreProducts(); // تحميل المزيد من المنتجات مع الفلاتر الحالية
    }
  }

  private loadProducts(categoryId: number | null, page: number) {
    const isInitialLoad = page === 1;
    if (isInitialLoad) {
      this.isLoading = true;
    } else {
      this.isLoadingMore = true;
    }

    const filters = this.filterSidebar?.selectedFilters || {}; // جيب الفلاتر الحالية من الـ Sidebar
    this.filterService
      .getFilteredProductsByCategory(categoryId, filters, page, this.itemPerPage)
      .subscribe({
        next: (products) => {
          this.products = isInitialLoad ? products : [...this.products, ...products];
        },
        error: (error) => {
          console.error('Error loading products:', error);
        },
        complete: () => {
          this.isLoading = false;
          this.isLoadingMore = false;
        },
      });
  }

  private loadMoreProducts() {
    this.currentPage++;
    this.loadProducts(this.currentCategoryId, this.currentPage);
  }

  private loadTotalProducts(categoryId: number | null) {
    if (categoryId !== null) {
      this.productService.getTotalProductsByCategoryId(categoryId).subscribe({
        next: (total) => {
          this.totalProducts = total;
        },
        error: (error) => {
          console.error('Error loading total products:', error);
          this.totalProducts = 0;
        },
      });
    } else {
      this.productService.getTotalProducts().subscribe({
        next: (total) => {
          this.totalProducts = total;
        },
        error: (error) => {
          console.error('Error loading total all products:', error);
          this.totalProducts = 0;
        },
      });
    }
  }

  private loadProductsWithFilters(categoryId: number | null, filters: { [key: string]: string[] }) {
    this.isLoading = true;
    this.currentPage = 1;
    this.products = [];

    this.filterService
      .getFilteredProductsByCategory(categoryId, filters, this.currentPage, this.itemPerPage)
      .subscribe({
        next: (products) => {
          this.products = products;
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

  getCurrentPath(): string[] {
    const params = this.route.snapshot.params;
    return Object.keys(params)
      .filter((key) => key.includes('CategorySlug'))
      .map((key) => params[key])
      .filter((s) => s);
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
    } 
  }
}