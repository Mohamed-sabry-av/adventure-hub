import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnInit,
  ViewChild,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FilterSidebarComponent } from '../../components/filter-sidebar/filter-sidebar.component';
import { BreadcrumbComponent } from '../../components/breadcrumb/breadcrumb.component';
import { FilterDrawerComponent } from '../../components/filter-drawer/filter-drawer.component';
import { SortMenuComponent } from '../../components/sort-menu/sort-menu.component';
import { ProductsGridComponent } from '../../components/products-grid/products-grid.component';
import { FilterService } from '../../../../core/services/filter.service';
import { SeoService } from '../../../../core/services/seo.service';
@Component({
  selector: 'app-products-by-sale',
  standalone: true,
  imports: [
    CommonModule,
    BreadcrumbComponent,
    FilterDrawerComponent,
    SortMenuComponent,
    ProductsGridComponent,
  ],
  templateUrl: './products-by-sale.component.html',
  styleUrls: ['./products-by-sale.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsBySaleComponent implements OnInit {
  products: any[] = [];
  isLoading = false;
  isLoadingMore = false;
  isInitialLoadComplete = false;
  showSkeleton = true; // لإظهار الـ skeleton أثناء التحميل
  showEmptyState = false; // لإدارة حالة "No products found"
  currentPage: number = 1;
  itemPerPage: number = 8; // تقليل العدد لتحسين التحميل الأولي
  totalProducts: number = 0;
  filterDrawerOpen = false;
  selectedOrderby: string = 'date';
  selectedOrder: 'asc' | 'desc' = 'desc';
  schemaData: any;
  @ViewChild(FilterSidebarComponent) filterSidebar!: FilterSidebarComponent;
  @ViewChild(FilterDrawerComponent) filterDrawer!: FilterDrawerComponent;
  private scrollTimeout: any;
  constructor(
    private filterService: FilterService,
    private seoService: SeoService,
    private cdr: ChangeDetectorRef
  ) {}
  async ngOnInit() {
    this.showSkeleton = true;
    this.isLoading = true;
    try {
      this.schemaData = this.seoService.applySeoTags(null, {
        title: 'On Sale Products - Adventures HUB Sports Shop',
        description:
          'Discover discounted diving equipment, outdoor gear, and sports accessories at Adventures HUB Sports Shop. Shop now and save on premium products!',
      });
      // تحميل المنتجات وعدد المنتجات بشكل متزامن
      await Promise.all([
        this.loadProductsWithFilters(this.currentPage),
        this.loadTotalProductsOnSale(),
      ]);
      this.loadAvailableAttributes();
    } catch (error) {
      console.error('Error in ngOnInit:', error);
      this.schemaData = this.seoService.applySeoTags(null, {
        title: 'On Sale Products - Adventures HUB Sports Shop',
      });
    } finally {
      this.isLoading = false;
      this.isInitialLoadComplete = true;
      this.showSkeleton = this.products.length === 0;
      this.showEmptyState = this.products.length === 0;
      this.cdr.markForCheck();
    }
  }
  ngAfterViewInit() {
    if (this.filterSidebar) {
      this.filterSidebar.filtersChanges.subscribe((filters: any) => {
        this.currentPage = 1;
        this.products = [];
        this.isInitialLoadComplete = false;
        this.showSkeleton = true;
        this.showEmptyState = false;
        this.loadProductsWithFilters(this.currentPage, filters);
        this.loadAvailableAttributes();
        this.cdr.markForCheck();
      });
    }
  }
  @HostListener('window:scroll', ['$event'])
  onScroll(event: Event) {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    
    // Use a scroll threshold that triggers loading earlier
    const scrollThreshold = 800; // Increased from 500 to 800 for earlier loading
    
    if (
      scrollTop + windowHeight >= documentHeight - scrollThreshold &&
      !this.isLoading &&
      !this.isLoadingMore &&
      this.currentPage * this.itemPerPage < this.totalProducts
    ) {
      // Debounce scroll handling to prevent multiple rapid calls
      if (this.scrollTimeout) {
        clearTimeout(this.scrollTimeout);
      }
      
      this.scrollTimeout = setTimeout(() => {
        this.loadMoreProducts();
      }, 100); // Small timeout to debounce scroll events
    }
  }
  private async loadProductsWithFilters(
    page: number,
    filters: { [key: string]: string[] } = {}
  ) {
    const isInitialLoad = page === 1;
    
    // Don't set isLoading to true when adding more products during scroll
    if (isInitialLoad) {
      this.isLoading = true;
      this.showSkeleton = true;
      this.showEmptyState = false;
    } else {
      this.isLoadingMore = true;
    }
    
    try {
      const products = await this.filterService
        .getFilteredProductsByCategory(
          null,
          { ...filters, on_sale: ['true'] },
          page,
          this.itemPerPage,
          this.selectedOrderby,
          this.selectedOrder
        )
        .toPromise();
        
      // For initial load, replace products array
      // For additional loads (scrolling), append to existing products
      if (isInitialLoad) {
        this.products = products || [];
      } else {
        // When appending, make sure we're not duplicating products
        const newProducts = products || [];
        if (newProducts.length > 0) {
          // Get existing product IDs for deduplication
          const existingIds = new Set(this.products.map(p => p.id));
          // Only add products that aren't already in the array
          const uniqueNewProducts = newProducts.filter(p => !existingIds.has(p.id));
          this.products = [...this.products, ...uniqueNewProducts];
        }
      }
    } catch (error) {
      console.error('Error loading products:', error);
      if (isInitialLoad) this.products = [];
    } finally {
      this.isLoading = false;
      this.isLoadingMore = false;
      this.isInitialLoadComplete = true;
      this.showSkeleton = this.products.length === 0;
      this.showEmptyState = this.products.length === 0;
      this.cdr.markForCheck();
    }
  }
  private async loadMoreProducts(): Promise<void> {
    this.currentPage++;
    this.itemPerPage = 16; // زيادة عدد المنتجات للتحميل الإضافي
    await this.loadProductsWithFilters(
      this.currentPage,
      this.filterSidebar?.selectedFilters || {}
    );
  }
  private async loadTotalProductsOnSale(): Promise<void> {
    try {
      const response = await this.filterService
        .getFilteredProductsByCategory(null, { on_sale: ['true'] }, 1, 1)
        .toPromise();
      this.totalProducts = response?.length ? 1000 : 0; // استبدل بقيمة ديناميكية إذا كان الـ API يدعم ذلك
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error loading total products:', error);
      this.totalProducts = 0;
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
        break;
    }
    this.currentPage = 1;
    this.products = [];
    this.isInitialLoadComplete = false;
    this.showSkeleton = true;
    this.showEmptyState = false;
    await this.loadProductsWithFilters(
      this.currentPage,
      this.filterSidebar?.selectedFilters || {}
    );
    this.cdr.markForCheck();
  }
  private async loadAvailableAttributes() {
    // try {
    //   const attributes = await this.filterService
    //     .getAvailableAttributesAndTerms(null, { on_sale: ['true'] })
    //     .toPromise();
    //   
    // } catch (error) {
    //   console.error('Error loading attributes:', error);
    // }
  }
  openFilterDrawer() {
    this.filterDrawerOpen = true;
    this.cdr.markForCheck();
  }
  closeFilterDrawer() {
    this.filterDrawerOpen = false;
    this.cdr.markForCheck();
  }
}
