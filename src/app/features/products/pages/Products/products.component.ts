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
} from '@angular/core';
import { ProductService } from '../../../../core/services/product.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CategoriesService } from '../../../../core/services/categories.service';
import { FilterService } from '../../../../core/services/filter.service';
import { FilterSidebarComponent } from '../../components/filter-sidebar/filter-sidebar.component';
import { BreadcrumbComponent } from '../../components/breadcrumb/breadcrumb.component';
import { FilterDrawerComponent } from '../../components/filter-drawer/filter-drawer.component';
import { SortMenuComponent } from '../../components/sort-menu/sort-menu.component';
import { ProductsGridComponent } from '../../components/products-grid/products-grid.component';
import { SeoService } from '../../../../core/services/seo.service';
import { catchError, finalize, of, Subject, throwError } from 'rxjs';
import { debounceTime, tap } from 'rxjs/operators';
import isEqual from 'lodash/isEqual';
import { DialogErrorComponent } from '../../../../shared/components/dialog-error/dialog-error.component';

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
    DialogErrorComponent,
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
    private transferState: TransferState
  ) {
    this.showSkeleton = true; // ضمان ظهور الـ skeleton فورًا
    this.scrollSubject.pipe(debounceTime(50)).subscribe(() => {
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
      const slugs = this.route.snapshot.url
        .map((segment) => segment.path)
        .filter((path) => path !== 'category');
      const deepestSlug = slugs[slugs.length - 1];

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
  }

  ngAfterViewInit() {
    this.loadInitialData();
    if (this.filterSidebar) {
      this.filterSidebar.filtersChanges.subscribe((filters: any) => {
        this.currentPage = 1;
        this.products = [];
        this.isInitialLoadComplete = false;
        this.showSkeleton = true;
        this.showEmptyState = false; // إخفاء الحالة الفارغة عند تغيير الفلاتر
        this.loadProducts(true, filters);
      });
    } else {
      console.warn('FilterSidebarComponent not initialized');
    }
  }

  async loadInitialData() {
    const cachedProducts = this.transferState.get(PRODUCTS_KEY, null);
    if (cachedProducts) {
      this.products = cachedProducts;
      this.isInitialLoadComplete = true;
      this.showSkeleton = false;
      this.showEmptyState = this.products.length === 0; // تحديث الحالة الفارغة
      this.cdr.markForCheck();
      return;
    }

    try {
      const slugs = this.route.snapshot.url
        .map((segment) => segment.path)
        .filter((path) => path !== 'category');
      const deepestSlug = slugs[slugs.length - 1];

      if (deepestSlug) {
        const categoryResponse = await this.categoriesService
          .getCategoryBySlug(deepestSlug)
          .pipe(
            catchError((error) => {
              console.error('Category not found:', error);
              // إذا لم يتم العثور على الفئة، قم بتوجيه المستخدم إلى صفحة 404
              this.router.navigate(['/page-not-found']);
              return throwError(() => new Error('Category not found'));
            })
          )
          .toPromise();

        // إذا لم يتم العثور على فئة، انتقل إلى صفحة 404
        if (!categoryResponse) {
          this.router.navigate(['/page-not-found']);
          return;
        }

        this.currentCategory = categoryResponse;
        this.currentCategoryId = this.currentCategory?.id ?? null;

        // إذا كان معرف الفئة غير صالح، انتقل إلى صفحة 404
        if (!this.currentCategoryId) {
          this.router.navigate(['/page-not-found']);
          return;
        }

        this.schemaData = this.seoService.applySeoTags(this.currentCategory, {
          title: this.currentCategory?.name,
          description: this.currentCategory?.description,
        });
      } else {
        this.currentCategory = null;
        this.currentCategoryId = null;
      }

      await this.loadProducts(true);
      await this.loadTotalProducts();
    } catch (error) {
      console.error('Error in loadInitialData:', error);
      // تحقق ما إذا كان الخطأ بسبب عدم وجود الفئة، وفي هذه الحالة انتقل إلى صفحة 404
      if (String(error).includes('Category not found')) {
        this.router.navigate(['/page-not-found']);
        return;
      }
      this.schemaData = this.seoService.applySeoTags(null, {
        title: 'All Products',
      });
    } finally {
      this.isLoading = false;
      this.isInitialLoadComplete = true;
      this.showSkeleton = this.products.length === 0;
      this.showEmptyState = this.products.length === 0; // تحديث الحالة الفارغة
      this.cdr.markForCheck();
    }
  }

  loadProducts(isInitialLoad = false, filters?: { [key: string]: string[] }) {
    if (this.isFetching) return;

    this.isFetching = true;
    this.isLoading = isInitialLoad || this.isCategorySwitching;
    this.isLoadingMore = !isInitialLoad && !this.isCategorySwitching;
    this.isInitialLoadComplete = false;
    this.showSkeleton = isInitialLoad || this.isCategorySwitching || this.products.length === 0;
    this.showEmptyState = false; // إخفاء الحالة الفارغة أثناء التحميل
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
          console.error('Error loading products:', error);
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
        this.showEmptyState = this.products.length === 0; // تحديث الحالة الفارغة بعد تحميل المنتجات
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
      console.error('Error loading total products:', error);
      this.totalProducts = 0;
      this.cdr.markForCheck();
    }
  }

  getcategoryName(): string {
    return this.currentCategory?.name ?? '';
  }

  getCurrentPath(): string[] {
    return this.route.snapshot.url
      .map((segment) => segment.path)
      .filter((path) => path !== 'category');
  }

  async onCategoryIdChange(categoryId: number | null) {
    this.isLoading = true;
    this.isInitialLoadComplete = false;
    this.currentCategoryId = categoryId;
    this.currentPage = 1;
    this.products = [];
    this.isCategorySwitching = true;
    this.showSkeleton = true; // إظهار الـ skeleton عند تغيير الفئة
    this.showEmptyState = false; // إخفاء الحالة الفارغة صراحة
    this.cdr.markForCheck();

    if (this.filterSidebar) {
      this.filterSidebar.selectedFilters = {};
      this.filterSidebar.filtersChanges.emit({});
      localStorage.removeItem(`filters_${this.currentCategoryId}`);
    }

    try {
      if (categoryId) {
        const categoryResponse = await this.categoriesService
          .getCategoryById(categoryId)
          .pipe(
            catchError((error) => {
              console.error('Category not found by ID:', error);
              // إذا لم يتم العثور على الفئة، قم بتوجيه المستخدم إلى صفحة 404
              this.router.navigate(['/page-not-found']);
              return throwError(() => new Error('Category not found'));
            })
          )
          .toPromise();

        // إذا لم يتم العثور على فئة، انتقل إلى صفحة 404
        if (!categoryResponse) {
          this.router.navigate(['/page-not-found']);
          return;
        }

        this.currentCategory = categoryResponse;
        this.schemaData = this.seoService.applySeoTags(this.currentCategory, {
          title: this.currentCategory?.name,
          description: this.currentCategory?.description,
        });
      } else {
        this.currentCategory = null;
        this.schemaData = this.seoService.applySeoTags(null, {
          title: 'All Products',
        });
      }

      await this.loadProducts(true);
      await this.loadTotalProducts();
    } catch (error) {
      console.error('Error in onCategoryIdChange:', error);
      // تحقق ما إذا كان الخطأ بسبب عدم وجود الفئة، وفي هذه الحالة انتقل إلى صفحة 404
      if (String(error).includes('Category not found')) {
        this.router.navigate(['/page-not-found']);
        return;
      }
      this.schemaData = this.seoService.applySeoTags(null, {
        title: 'All Products',
      });
    } finally {
      this.isLoading = false;
      this.isCategorySwitching = false;
      this.isInitialLoadComplete = true;
      this.showSkeleton = this.products.length === 0; // إخفاء الـ skeleton إذا كانت هناك منتجات
      this.showEmptyState = this.products.length === 0; // تحديث الحالة الفارغة
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
}
