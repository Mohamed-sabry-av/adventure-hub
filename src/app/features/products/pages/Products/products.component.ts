import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostListener,
  OnInit,
  OnDestroy,
  ViewChild,
  TransferState,
  makeStateKey,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { ProductService } from '../../../../core/services/product.service';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { CategoriesService } from '../../../../core/services/categories.service';
import { FilterService } from '../../../../core/services/filter.service';
import { FilterSidebarComponent } from '../../components/filter-sidebar/filter-sidebar.component';
import { BreadcrumbComponent } from '../../components/breadcrumb/breadcrumb.component';
import { FilterDrawerComponent } from '../../components/filter-drawer/filter-drawer.component';
import { SortMenuComponent } from '../../components/sort-menu/sort-menu.component';
import { ProductsGridComponent } from '../../components/products-grid/products-grid.component';
import { SeoService } from '../../../../core/services/seo.service';
import { catchError, finalize, of, Subject, throwError, filter } from 'rxjs';
import { debounceTime, tap, takeUntil } from 'rxjs/operators';
import isEqual from 'lodash/isEqual';
import { UIService } from '../../../../shared/services/ui.service';
import { KlaviyoTrackingService } from '../../../../shared/services/klaviyo-tracking.service';

const PRODUCTS_KEY = makeStateKey<any[]>('products');

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [
    CommonModule,
    FilterSidebarComponent,
    BreadcrumbComponent,
    FilterDrawerComponent,
    SortMenuComponent,
    ProductsGridComponent,
  ],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.css'],
  providers: [ProductService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsComponent implements OnInit, OnDestroy {
  products: any[] = [];
  isLoading = false;
  isLoadingMore = false;
  isFetching = false;
  isCategorySwitching = false;
  currentCategoryId: number | null = null;
  currentPage = 1;
  currentCategory: any = null;
  itemsPerPage = 8;
  private initialLoadItemsPerPage = 8; // عدد المنتجات في التحميل الأولي
  private loadMoreItemsPerPage = 16;
  showSkeleton = true; // افتراضي true لضمان ظهور الـ skeleton
  showEmptyState = false; // إضافة متغير لإدارة حالة "No products found"
  totalProducts = 0;
  filterDrawerOpen = false;
  selectedOrderby: string = 'date';
  selectedOrder: 'asc' | 'desc' = 'desc';
  schemaData: any;
  isInitialLoadComplete: boolean = false;
  private scrollSubject = new Subject<void>();
  private destroy$ = new Subject<void>();
  private categoryCache: Map<string, any> = new Map();

  @ViewChild(FilterSidebarComponent) filterSidebar!: FilterSidebarComponent;
  @ViewChild(FilterDrawerComponent) filterDrawer!: FilterDrawerComponent;
  @ViewChild(ProductsGridComponent) productsGrid!: ProductsGridComponent;

  constructor(
    private productService: ProductService,
    private categoriesService: CategoriesService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private filterService: FilterService,
    private seoService: SeoService,
    private transferState: TransferState,
    private uiService: UIService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private klaviyoTracking: KlaviyoTrackingService
  ) {
    this.showSkeleton = true; // ضمان ظهور الـ skeleton فورًا
    this.scrollSubject.pipe(debounceTime(50), takeUntil(this.destroy$)).subscribe(() => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;

      if (
        scrollTop + windowHeight >= documentHeight - 900 &&
        !this.isLoading &&
        !this.isLoadingMore &&
        !this.isFetching &&
        this.currentPage * this.itemsPerPage < this.totalProducts
      ) {
        this.loadMoreProducts();
      }
    });
  }

  async ngOnInit() {
    try {
      // Initial setup for SEO
      const slugs = this.getUrlSegments();
      const deepestSlug = slugs.length > 0 ? slugs[slugs.length - 1] : null;

      if (deepestSlug) {
        this.schemaData = this.seoService.applySeoTags(null, {
          title: deepestSlug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        });
      } else {
        this.schemaData = this.seoService.applySeoTags(null, {
          title: 'All Products',
        });
      }
    } catch (error) {
      console.error('Error in ngOnInit:', error);
      this.schemaData = this.seoService.applySeoTags(null, {
        title: 'All Products',
      });
    }

    this.showSkeleton = true;
    this.cdr.markForCheck();

    // Load initial data
    await this.loadInitialData();
    
    // Subscribe to route changes to handle client-side navigation
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe(async () => {
      // Only reload data if we're not in the initial load
      if (this.isInitialLoadComplete) {
        this.showSkeleton = true;
        this.isInitialLoadComplete = false;
        this.products = [];
        this.cdr.detectChanges(); // Force update to show loading state
        await this.loadInitialData();
      // Track category view after data is loaded
      this.trackCategoryView();
      }
    });
    
    // Track category view after data is loaded
    this.trackCategoryView();
  }

  ngAfterViewInit() {
    // Only set up filter sidebar subscription, don't reload data here
    if (this.filterSidebar) {
      this.filterSidebar.filtersChanges.pipe(
        takeUntil(this.destroy$)
      ).subscribe((filters: any) => {
        this.currentPage = 1;
        this.products = [];
        this.isInitialLoadComplete = false;
        this.showSkeleton = true;
        this.showEmptyState = false; // Hide empty state when changing filters
        this.loadProducts(true, filters);
      });
    }
  }

  private getUrlSegments(): string[] {
    // Get the path portion of the URL without query parameters
    const urlPath = this.router.url.split(/[?#]/)[0];
    // Split the path into segments and filter out empty segments and 'category'
    return urlPath.split('/').filter(segment => segment !== '' && segment !== 'category');
  }

  async loadInitialData() {
    const cachedProducts = this.transferState.get(PRODUCTS_KEY, null);
    if (cachedProducts) {
      this.products = cachedProducts;
      this.isInitialLoadComplete = true;
      this.showSkeleton = false;
      this.showEmptyState = this.products.length === 0; // Update empty state
      this.cdr.markForCheck();
      return;
    }

    try {
      // Get all URL segments, filtering out 'category' if present
      const slugs = this.getUrlSegments();
      const deepestSlug = slugs.length > 0 ? slugs[slugs.length - 1] : null;

      if (deepestSlug) {
        this.isLoading = true;
        this.cdr.detectChanges(); // Force update to show loading state
        
        // Check if we have this category in cache
        let categoryResponse = this.categoryCache.get(deepestSlug);
        
        if (!categoryResponse) {
          // Try to get the category directly by slug
          categoryResponse = await this.categoriesService
            .getCategoryBySlugDirect(deepestSlug)
          .pipe(
            catchError((error) => {
                console.error(`Error getting category by slug ${deepestSlug}:`, error);
                return of(null);
            })
          )
          .toPromise();

          // If direct lookup fails, try the standard API endpoint
          if (!categoryResponse) {
            categoryResponse = await this.categoriesService
              .getCategoryBySlug(deepestSlug)
              .pipe(
                catchError((error) => {
                  console.error(`Error getting category by slug ${deepestSlug} (fallback):`, error);
                  return of(null);
                })
              )
              .toPromise();
          }
          
          // Cache the category response if valid
          if (categoryResponse) {
            this.categoryCache.set(deepestSlug, categoryResponse);
          }
        }

        // If category still not found, navigate to 404
        if (!categoryResponse) {
          console.error(`Category not found for slug: ${deepestSlug}`);
          this.router.navigate(['/page-not-found'], { skipLocationChange: true });
          return;
        }

        this.currentCategory = categoryResponse;
        this.currentCategoryId = this.currentCategory?.id ?? null;

        // If category ID is invalid, navigate to 404
        if (!this.currentCategoryId) {
          this.router.navigate(['/page-not-found'], { skipLocationChange: true });
          return;
        }

        // Use Yoast SEO title if available
        let pageTitle = 'All Products';
        if (this.currentCategory?.yoast_head_json?.title) {
          pageTitle = this.currentCategory.yoast_head_json.title;
        } else {
          pageTitle = this.currentCategory?.name || 'Products';
        }
        
        this.schemaData = this.seoService.applySeoTags(this.currentCategory, {
          title: pageTitle,
          description: this.currentCategory?.description || '',
        });
      } else {
        this.currentCategory = null;
        this.currentCategoryId = null;
      }

      await this.loadProducts(true);
      await this.loadTotalProducts();
    } catch (error) {
      // Check if the error is because category not found, and navigate to 404
      if (String(error).includes('Category not found')) {
        this.router.navigate(['/page-not-found'], { skipLocationChange: true });
        return;
      }
      this.schemaData = this.seoService.applySeoTags(null, {
        title: 'All Products',
      });
    } finally {
      this.isLoading = false;
      this.isInitialLoadComplete = true;
      this.showSkeleton = this.products.length === 0;
      this.showEmptyState = this.products.length === 0; // Update empty state
      this.cdr.markForCheck();
    }
  }

  loadProducts(isInitialLoad = false, filters?: { [key: string]: string[] }) {
    if (this.isFetching) return;

    this.isFetching = true;
    this.isLoading = isInitialLoad || this.isCategorySwitching;
    this.isLoadingMore = !isInitialLoad && !this.isCategorySwitching;
    
    // Clear products array when loading initial data (not when loading more)
    if (isInitialLoad || this.isCategorySwitching) {
      this.products = [];
      this.isInitialLoadComplete = false;
      this.showSkeleton = true;
    }
    
    this.showEmptyState = false;
    this.cdr.markForCheck();

    const currentItemsPerPage = isInitialLoad ? this.initialLoadItemsPerPage : this.loadMoreItemsPerPage;
    const effectiveFilters = filters ?? this.filterSidebar?.selectedFilters ?? {};
    this.filterService
      .getFilteredProductsByCategory(
        this.currentCategoryId,
        effectiveFilters,
        isInitialLoad ? 1 : this.currentPage,
        currentItemsPerPage,
        this.selectedOrderby,
        this.selectedOrder
      )
      .pipe(
        catchError((error) => {
          
          return of([]);
        }),
        finalize(() => {
          this.isFetching = false;
          this.isLoading = false;
          this.isLoadingMore = false;
          this.isCategorySwitching = false;
          this.isInitialLoadComplete = true;
          this.cdr.markForCheck();
        })
      )
      .subscribe((products) => {
        this.products = isInitialLoad
          ? products
          : [...this.products, ...products];
        if (isInitialLoad) this.currentPage = 1;
        this.showSkeleton = this.products.length === 0;
        this.showEmptyState = this.products.length === 0;
        this.transferState.set(PRODUCTS_KEY, this.products);
        this.cdr.markForCheck();
      });
  }

  private async loadMoreProducts() {
    this.currentPage++;
    this.itemsPerPage = this.loadMoreItemsPerPage;
    await this.loadProducts(false);
  }

  private async loadTotalProducts() {
    try {
      if (this.currentCategoryId && this.currentCategory) {
        this.totalProducts = this.currentCategory.count ?? 0;
      } else {
        const total = await this.productService.getTotalProducts().toPromise();
        this.totalProducts = total ?? 0;
      }
      this.cdr.markForCheck();
    } catch (error) {
      
      this.totalProducts = 0;
      this.cdr.markForCheck();
    }
  }

  getcategoryName(): string {
    return this.currentCategory?.name ?? '';
  }

  getCategoryDescription(): string {
    return this.currentCategory?.description ?? '';
  }

  getCurrentPath(): string[] {
    return this.getUrlSegments();
  }

  async onCategoryIdChange(categoryId: number | null) {
    this.isLoading = true;
    this.isInitialLoadComplete = false;
    this.currentCategoryId = categoryId;
    this.currentPage = 1;
    this.products = []; // Clear products immediately
    this.isCategorySwitching = true;
    this.showSkeleton = true; // Show skeleton when changing category
    this.showEmptyState = false;
    // Force change detection to immediately show the skeleton and hide old products
    this.cdr.detectChanges();

    if (this.filterSidebar) {
      this.filterSidebar.selectedFilters = {};
      this.filterSidebar.filtersChanges.emit({});
      localStorage.removeItem(`filters_${this.currentCategoryId}`);
    }

    try {
      if (categoryId) {
        // Check if we have this category in cache by ID
        let categoryResponse = null;
        
        // Look through cache for matching ID
        for (const [, category] of this.categoryCache.entries()) {
          if (category.id === categoryId) {
            categoryResponse = category;
            break;
          }
        }
        
        // If not in cache, fetch from API
        if (!categoryResponse) {
          categoryResponse = await this.categoriesService
          .getCategoryById(categoryId)
          .pipe(
            catchError((error) => {
                console.error(`Error getting category by ID ${categoryId}:`, error);
                return of(null);
            })
          )
          .toPromise();

          // Cache the response if valid
          if (categoryResponse) {
            this.categoryCache.set(categoryResponse.slug, categoryResponse);
          }
        }

        // If category still not found, navigate to 404
        if (!categoryResponse) {
          console.error(`Category not found for ID: ${categoryId}`);
          this.router.navigate(['/page-not-found'], { skipLocationChange: true });
          return;
        }

        this.currentCategory = categoryResponse;

        // Use Yoast SEO title if available
        let pageTitle = 'All Products';
        if (this.currentCategory?.yoast_head_json?.title) {
          pageTitle = this.currentCategory.yoast_head_json.title;

        } else {
          console.warn('Yoast SEO title not found (onCategoryIdChange), using category name:', this.currentCategory?.name);
          pageTitle = this.currentCategory?.name || 'Products';
        }
        
        this.schemaData = this.seoService.applySeoTags(this.currentCategory, {
          title: pageTitle,
          description: this.currentCategory?.description || '',
        });
      } else {
        this.currentCategory = null;
        this.schemaData = this.seoService.applySeoTags(null, {
          title: 'All Products',
        });
      }

      await this.loadProducts(true);
      await this.loadTotalProducts();
      
      // Track new category view after category change
      this.trackCategoryView();
    } catch (error) {
      
      // تحقق ما إذا كان الخطأ بسبب عدم وجود الفئة، وفي هذه الحالة انتقل إلى صفحة 404
      if (String(error).includes('Category not found')) {
        this.router.navigate(['/page-not-found'], { skipLocationChange: true });
        return;
      }
      this.schemaData = this.seoService.applySeoTags(null, {
        title: 'All Products',
      });
    } finally {
      this.isLoading = false;
      this.isCategorySwitching = false;
      this.isInitialLoadComplete = true;
      this.showSkeleton = this.products.length === 0;
      this.showEmptyState = this.products.length === 0;
      this.cdr.markForCheck();
    }
  }

  async onSortChange(sortValue: string) {
    switch (sortValue) {
      case 'popular':
        this.selectedOrderby = 'popularity';
        this.selectedOrder = 'desc';
        break;
      case 'rating':
        this.selectedOrderby = 'rating';
        this.selectedOrder = 'desc';
        break;
      case 'newest':
        this.selectedOrderby = 'date';
        this.selectedOrder = 'desc';
        break;
      case 'price-asc':
        this.selectedOrderby = 'price';
        this.selectedOrder = 'asc';
        break;
      case 'price-desc':
        this.selectedOrderby = 'price';
        this.selectedOrder = 'desc';
        break;
      default:
        this.selectedOrderby = 'date';
        this.selectedOrder = 'desc';
    }
    this.isInitialLoadComplete = false;
    this.showSkeleton = true;
    this.showEmptyState = false; // إخفاء الحالة الفارغة عند تغيير الترتيب
    await this.loadProducts(true);
  }

  openFilterDrawer() {
    this.filterDrawerOpen = true;
    this.cdr.markForCheck();
  }

  closeFilterDrawer() {
    this.filterDrawerOpen = false;
    this.cdr.markForCheck();
  }

  ngOnDestroy() {
    this.scrollSubject.complete();
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('window:scroll', ['$event'])
  onScroll(event: Event) {
    this.scrollSubject.next();
  }

  onFiltersChange(filters: { [key: string]: string[] }) {
    if (isEqual(filters, this.filterSidebar?.selectedFilters)) {
      return;
    }
    this.currentPage = 1;
    this.products = [];
    this.isInitialLoadComplete = false;
    this.showSkeleton = true;
    this.showEmptyState = false; // إخفاء الحالة الفارغة عند تغيير الفلاتر
    this.loadProducts(true, filters);
  }

  /**
   * Track category view in Klaviyo
   */
  private trackCategoryView(): void {
    if (isPlatformBrowser(this.platformId) && this.currentCategory) {
      this.klaviyoTracking.trackViewedCategory({
        id: this.currentCategory.id,
        name: this.currentCategory.name,
        url: window.location.href,
        productCount: this.totalProducts
      });
    }
  }
}

