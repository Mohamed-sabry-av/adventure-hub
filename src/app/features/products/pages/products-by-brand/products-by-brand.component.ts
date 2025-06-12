import {
  Component,
  OnInit,
  ViewChild,
  HostListener,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  TransferState,
  makeStateKey,
  DestroyRef,
  OnDestroy
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FilterSidebarComponent } from '../../components/filter-sidebar/filter-sidebar.component';
import { FilterDrawerComponent } from '../../components/filter-drawer/filter-drawer.component';
import { SortMenuComponent } from '../../components/sort-menu/sort-menu.component';
import { ProductsGridComponent } from '../../components/products-grid/products-grid.component';
import { ProductsBrandService } from '../../services/products-brand.service';
import { SeoService } from '../../../../core/services/seo.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, of, throwError } from 'rxjs';
import { debounceTime, finalize } from 'rxjs/operators';
const BRAND_PRODUCTS_KEY = makeStateKey<any[]>('brand_products');
const BRAND_INFO_KEY = makeStateKey<any>('brand_info');
@Component({
  selector: 'app-brand-products',
  standalone: true,
  imports: [
    CommonModule,
    FilterSidebarComponent,
    FilterDrawerComponent,
    SortMenuComponent,
    ProductsGridComponent
  ],
  templateUrl: './products-by-brand.component.html',
  styleUrls: ['./products-by-brand.component.css'],
  providers: [ProductsBrandService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsByBrandComponent implements OnInit, OnDestroy {
  protected Object = Object;
  products: any[] = [];
  isLoading = false;
  isLoadingMore = false;
  isFetching = false;
  isInitialLoadComplete = false;
  showSkeleton = true;
  showEmptyState = false;
  currentBrandTermId: number | null = null;
  currentBrandSlug: string | null = null;
  brandName: string = 'Loading...';
  currentPage: number = 1;
  brandInfo: any = null;
  itemsPerPage: number = 8;
  totalProducts: number = 0;
  filterDrawerOpen = false;
  selectedOrderby: string = 'date';
  selectedOrder: 'asc' | 'desc' = 'desc';
  schemaData: any;
  attributes: { [key: string]: { name: string; terms: { id: number; name: string }[] } } = {};
  private scrollSubject = new Subject<void>();
  private destroyRef = inject(DestroyRef);
  private transferState = inject(TransferState);
  @ViewChild(FilterSidebarComponent) filterSidebar!: FilterSidebarComponent;
  @ViewChild(FilterDrawerComponent) filterDrawer!: FilterDrawerComponent;
  constructor(
    private productsBrandService: ProductsBrandService,
    private route: ActivatedRoute,
    private router: Router,
    private seoService: SeoService,
    private cdr: ChangeDetectorRef
  ) {
    this.showSkeleton = true;
    this.scrollSubject.pipe(
      debounceTime(50),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      
      // Use a larger threshold to load more products earlier
      const scrollThreshold = 900; 
      
      if (
        scrollTop + windowHeight >= documentHeight - scrollThreshold &&
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
    this.showSkeleton = true;
      this.cdr.markForCheck();
  }
  ngAfterViewInit() {
    this.loadInitialData();
    if (this.filterSidebar) {
      this.filterSidebar.filtersChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((filters: any) => {
        this.currentPage = 1;
        this.products = [];
        this.isInitialLoadComplete = false;
        this.showSkeleton = true;
        this.showEmptyState = false;
        this.loadProductsWithFilters(this.currentBrandTermId, filters);
        this.cdr.markForCheck();
      });
    } else {
      
    }
  }
  async loadInitialData() {
    this.isLoading = true;
    this.showSkeleton = true;
    this.cdr.markForCheck();
    try {
      this.currentBrandSlug = this.route.snapshot.paramMap.get('brandSlug');
      if (!this.currentBrandSlug) {
        this.router.navigate(['/page-not-found']);
        return;
      }
      // Try to get brand info from transfer state
      const cachedBrandInfo = this.transferState.get(BRAND_INFO_KEY, null);
      if (cachedBrandInfo) {
        this.brandInfo = cachedBrandInfo;
        this.currentBrandTermId = this.brandInfo.id;
        this.brandName = this.brandInfo.name;
        this.setupSEO();
      } else {
        await this.loadBrandInfo();
      }
      if (!this.currentBrandTermId) {
        this.router.navigate(['/page-not-found']);
        return;
      }
      // Load attributes for the brand first
      await this.loadBrandAttributes(this.currentBrandTermId);
      // Only after attributes are loaded, try to get products from transfer state
      const cachedProducts = this.transferState.get(BRAND_PRODUCTS_KEY, null);
      if (cachedProducts) {
        this.products = cachedProducts;
        this.isInitialLoadComplete = true;
        this.showSkeleton = false;
        this.showEmptyState = this.products.length === 0;
        this.cdr.markForCheck();
      } else {
        // Load products and total count in parallel
        await Promise.all([
          this.loadProducts(this.currentBrandTermId, this.currentPage),
          this.loadTotalProducts(this.currentBrandTermId)
        ]);
      }
    } catch (error) {
      
      this.schemaData = this.seoService.applySeoTags(null, {
        title: 'Brand Products - Adventures HUB Sports Shop',
        description: 'Explore products by brand at Adventures HUB Sports Shop.',
      });
      this.showEmptyState = true;
    } finally {
      this.isLoading = false;
      this.isInitialLoadComplete = true;
      this.showSkeleton = false;
      this.cdr.markForCheck();
    }
  }
  private async loadBrandInfo(): Promise<void> {
    try {
      this.brandInfo = await this.productsBrandService
        .getBrandInfoBySlug(this.currentBrandSlug!)
        .pipe(
          catchError((error) => {
            
            this.router.navigate(['/page-not-found']);
            return throwError(() => new Error('Brand not found'));
          })
        )
        .toPromise();
      if (this.brandInfo) {
        this.currentBrandTermId = this.brandInfo.id;
        this.brandName = this.brandInfo.name;
        this.transferState.set(BRAND_INFO_KEY, this.brandInfo);
        this.setupSEO();
      } else {
        this.router.navigate(['/page-not-found']);
      }
    } catch (error) {
      
      throw error;
    }
  }
  private setupSEO(): void {
    // Always prioritize brand name and description over Yoast data
    this.schemaData = this.seoService.applySeoTags(this.brandInfo, {
      title: this.brandInfo?.name || (this.brandInfo?.yoast_head_json?.title || `Brand - Adventures HUB Sports Shop`),
      description: this.brandInfo?.description || (this.brandInfo?.yoast_head_json?.description || `Explore products at Adventures HUB Sports Shop.`),
    });
  }
  private async loadBrandAttributes(brandTermId: number): Promise<void> {
    try {
      const attributesData = await this.productsBrandService
        .getAllAttributesAndTermsByBrand(brandTermId)
        .toPromise();
      this.attributes = attributesData || {};
      this.cdr.markForCheck();
    } catch (error) {
      
    }
  }
  private async loadProducts(brandTermId: number, page: number) {
    const isInitialLoad = page === 1;
    if (isInitialLoad) {
      this.isFetching = true;
      this.isLoading = true;
      this.showSkeleton = true;
      this.showEmptyState = false;
    } else {
      this.isLoadingMore = true;
    }
    try {
      const filters = this.filterSidebar?.selectedFilters || {};
      const products = await this.productsBrandService
        .getProductsByBrandTermId(
          brandTermId,
          page,
          this.itemsPerPage,
          this.selectedOrderby,
          this.selectedOrder,
          filters
        )
        .toPromise();
      if (isInitialLoad) {
        this.products = products || [];
        this.transferState.set(BRAND_PRODUCTS_KEY, this.products);
      } else {
        // Improve handling of new products to prevent duplicates
        if (products && products.length > 0) {
          // Get existing product IDs for deduplication
          const existingIds = new Set(this.products.map(p => p.id));
          // Only add products that aren't already in the array
          const uniqueNewProducts = products.filter(p => !existingIds.has(p.id));
          this.products = [...this.products, ...uniqueNewProducts];
        }
      }
      this.showEmptyState = this.products.length === 0;
    } catch (error) {
      
      if (isInitialLoad) this.products = [];
      this.showEmptyState = this.products.length === 0;
    } finally {
      this.isFetching = false;
      this.isLoading = false;
      this.isLoadingMore = false;
      this.isInitialLoadComplete = true;
      this.showSkeleton = this.products.length === 0;
      this.cdr.markForCheck();
    }
  }
  private async loadMoreProducts() {
    this.currentPage++;
    await this.loadProducts(this.currentBrandTermId!, this.currentPage);
  }
  private async loadTotalProducts(brandTermId: number) {
    try {
      const filters = this.filterSidebar?.selectedFilters || {};
      const total = await this.productsBrandService
        .getTotalProductsByBrandTermId(brandTermId, filters)
        .toPromise();
      this.totalProducts = total ?? 0;
      this.cdr.markForCheck();
    } catch (error) {
      
      this.totalProducts = 0;
      this.cdr.markForCheck();
    }
  }
   async loadProductsWithFilters(
    brandTermId: number | null,
    filters: { [key: string]: string[] }
  ): Promise<void> {
    this.currentPage = 1;
    this.isLoading = true;
    this.showSkeleton = true;
    this.showEmptyState = false;
    this.cdr.markForCheck();

    try {
      if (!brandTermId) {
        throw new Error('Brand term ID is required');
      }

      const products = await this.productsBrandService
        .getProductsByBrandTermId(
          brandTermId,
          this.currentPage,
          this.itemsPerPage,
          this.selectedOrderby,
          this.selectedOrder,
          filters
        )
        .toPromise();

      this.products = products || [];
      await this.loadTotalProducts(brandTermId);
    } catch (error) {
      
      this.products = [];
    } finally {
      this.isLoading = false;
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
      this.showEmptyState = false;
    this.currentPage = 1;
    this.products = [];
    const filters = this.filterSidebar?.selectedFilters || {};
    await this.loadProducts(this.currentBrandTermId!, this.currentPage);
  }
  openFilterDrawer() {
    this.filterDrawerOpen = true;
    this.cdr.markForCheck();
  }
  closeFilterDrawer() {
    this.filterDrawerOpen = false;
    this.cdr.markForCheck();
  }
  @HostListener('window:scroll', ['$event'])
  onScroll() {
    this.scrollSubject.next();
  }
  ngOnDestroy() {
    // Cleanup logic if needed
  }
}

