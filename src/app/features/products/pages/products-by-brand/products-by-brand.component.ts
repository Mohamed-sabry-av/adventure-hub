import {
  Component,
  OnInit,
  ViewChild,
  HostListener,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FilterSidebarComponent } from '../../components/filter-sidebar/filter-sidebar.component';
import { BreadcrumbComponent } from '../../components/breadcrumb/breadcrumb.component';
import { FilterDrawerComponent } from '../../components/filter-drawer/filter-drawer.component';
import { SortMenuComponent } from '../../components/sort-menu/sort-menu.component';
import { ProductsGridComponent } from '../../components/products-grid/products-grid.component';
import { ProductsBrandService } from '../../services/products-brand.service';
import { SeoService } from '../../../../core/services/seo.service';

@Component({
  selector: 'app-brand-products',
  standalone: true,
  imports: [
    CommonModule,
    FilterSidebarComponent,
    BreadcrumbComponent,
    FilterDrawerComponent,
    SortMenuComponent,
    ProductsGridComponent,
  ],
  templateUrl: './products-by-brand.component.html',
  styleUrls: ['./products-by-brand.component.css'],
  providers: [ProductsBrandService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsByBrandComponent implements OnInit {
  products: any[] = [];
  isLoading = false;
  isLoadingMore = false;
  isInitialLoadComplete = false;
  showSkeleton = true; // لإظهار الـ skeleton
  showEmptyState = false; // لإدارة حالة "No products found"
  currentBrandTermId: any | null = null;
  currentBrandSlug: string | null = null;
  brandName: string = 'Loading...';
  currentPage: number = 1;
  brandInfo: any = null;
  itemPerPage: number = 8; // تقليل العدد لتحسين التحميل الأولي
  totalProducts: number = 0;
  filterDrawerOpen = false;
  selectedOrderby: string = 'date';
  selectedOrder: 'asc' | 'desc' = 'desc';
  schemaData: any;
  attributes: { [key: string]: { name: string; terms: { id: number; name: string }[] } } = {};
  Object = Object; // إتاحة Object للاستخدام في القالب

  @ViewChild(FilterSidebarComponent) filterSidebar!: FilterSidebarComponent;
  @ViewChild(FilterDrawerComponent) filterDrawer!: FilterDrawerComponent;

  constructor(
    private productsBrandService: ProductsBrandService,
    private route: ActivatedRoute,
    private seoService: SeoService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    console.log('ProductsByBrandComponent initialized');
    this.showSkeleton = true;
    this.isLoading = true;
    try {
      this.currentBrandSlug = this.route.snapshot.paramMap.get('brandSlug');

      if (this.currentBrandSlug) {
        this.brandInfo = await this.productsBrandService
          .getBrandInfoBySlug(this.currentBrandSlug)
          .toPromise();

        if (this.brandInfo) {
          this.currentBrandTermId = this.brandInfo.id;
          this.brandName = this.brandInfo.name;

          this.schemaData = this.seoService.applySeoTags(this.brandInfo, {
            title:
              this.brandInfo?.name ||
              'Brand Products - Adventures HUB Sports Shop',
            description:
              this.brandInfo?.description ||
              `Explore products by ${this.brandInfo?.name} at Adventures HUB Sports Shop.`,
          });

          // Load attributes for the brand
          console.log('Loading brand attributes for brand ID:', this.currentBrandTermId);
          await this.loadBrandAttributes(this.currentBrandTermId);

          console.log('Loading initial products for brand ID:', this.currentBrandTermId);
          await Promise.all([
            this.loadProducts(this.currentBrandTermId, this.currentPage),
            this.loadTotalProducts(this.currentBrandTermId),
          ]);
        } else {
          console.warn('Brand info not found for slug:', this.currentBrandSlug);
          this.schemaData = this.seoService.applySeoTags(null, {
            title: 'Brand Products - Adventures HUB Sports Shop',
            description:
              'Explore products by brand at Adventures HUB Sports Shop.',
          });
        }
      } else {
        console.warn('No brand slug provided in URL');
        this.schemaData = this.seoService.applySeoTags(null, {
          title: 'Brand Products - Adventures HUB Sports Shop',
          description:
            'Explore products by brand at Adventures HUB Sports Shop.',
        });
      }
    } catch (error) {
      console.error('Error in ngOnInit:', error);
      this.schemaData = this.seoService.applySeoTags(null, {
        title: 'Brand Products - Adventures HUB Sports Shop',
        description: 'Explore products by brand at Adventures HUB Sports Shop.',
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
        console.log('Filters changed from sidebar:', filters);
        this.currentPage = 1;
        this.products = [];
        this.isInitialLoadComplete = false;
        this.showSkeleton = true;
        this.showEmptyState = false;
        this.loadProductsWithFilters(this.currentBrandTermId, filters);
        this.cdr.markForCheck();
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
      this.currentPage * this.itemPerPage < this.totalProducts &&
      this.currentBrandTermId
    ) {
      this.currentPage++;
      this.loadProducts(this.currentBrandTermId, this.currentPage);
    }
  }

  private async loadBrandAttributes(brandTermId: number): Promise<void> {
    console.log('loadBrandAttributes called with ID:', brandTermId);
    try {
      const attributesData = await this.productsBrandService
        .getAllAttributesAndTermsByBrand(brandTermId)
        .toPromise();

      console.log('Received brand attributes:', attributesData);
      this.attributes = attributesData || {};
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error loading brand attributes:', error);
    }
  }

  private async loadProducts(brandTermId: number, page: number) {
    console.log('loadProducts called with ID:', brandTermId, 'page:', page);
    const isInitialLoad = page === 1;
    if (isInitialLoad) {
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
          this.itemPerPage,
          this.selectedOrderby,
          this.selectedOrder,
          filters
        )
        .toPromise();

      console.log('Received products:', products?.length || 0);
      this.products = isInitialLoad
        ? products || []
        : [...this.products, ...(products || [])];
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

  private async loadTotalProducts(brandTermId: number) {
    try {
      const filters = this.filterSidebar?.selectedFilters || {};
      const total = await this.productsBrandService
        .getTotalProductsByBrandTermId(brandTermId, filters)
        .toPromise();
      this.totalProducts = total ?? 0;
      console.log('Total products count:', this.totalProducts);
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error loading total products:', error);
      this.totalProducts = 0;
      this.cdr.markForCheck();
    }
  }

   async loadProductsWithFilters(
    brandTermId: number | null,
    filters: { [key: string]: string[] }
  ): Promise<void> {
    console.log('loadProductsWithFilters called with ID:', brandTermId, 'filters:', filters);
    this.isLoading = true;
    this.currentPage = 1;
    this.products = [];
    this.isInitialLoadComplete = false;
    this.showSkeleton = true;
    this.showEmptyState = false;

    try {
      if (brandTermId) {
        // Get available attributes for the selected filters
        const availableAttrs = await this.productsBrandService
          .getAvailableAttributesAndTermsByBrand(brandTermId, filters)
          .toPromise();

        // Update attributes with available ones
        console.log('Received available attributes:', availableAttrs);
        this.attributes = availableAttrs || {};

        const products = await this.productsBrandService
          .getProductsByBrandTermId(
            brandTermId,
            this.currentPage,
            this.itemPerPage,
            this.selectedOrderby,
            this.selectedOrder,
            filters
          )
        .toPromise();

        console.log('Received filtered products:', products?.length || 0);
        this.products = products || [];
        await this.loadTotalProducts(brandTermId);
      }
    } catch (error) {
      console.error('Error loading filtered products:', error);
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
    console.log('Sort changed to:', sortValue);
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
    if (this.currentBrandTermId) {
      this.currentPage = 1;
      this.products = [];
      this.isInitialLoadComplete = false;
      this.showSkeleton = true;
      this.showEmptyState = false;
      await this.loadProductsWithFilters(
        this.currentBrandTermId,
        this.filterSidebar?.selectedFilters || {}
      );
      this.cdr.markForCheck();
    }
  }

  openFilterDrawer() {
    console.log('Opening filter drawer');
    this.filterDrawerOpen = true;
    this.cdr.markForCheck();
  }

  closeFilterDrawer() {
    console.log('Closing filter drawer');
    this.filterDrawerOpen = false;
    this.cdr.markForCheck();
  }
}
