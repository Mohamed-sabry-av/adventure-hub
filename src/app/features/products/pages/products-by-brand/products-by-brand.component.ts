import { Component, OnInit, ViewChild, HostListener } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FilterSidebarComponent } from '../../components/filter-sidebar/filter-sidebar.component';
import { BreadcrumbComponent } from '../../components/breadcrumb/breadcrumb.component';
import { FilterDrawerComponent } from '../../components/filter-drawer/filter-drawer.component';
import { SortMenuComponent } from '../../components/sort-menu/sort-menu.component';
import { ProductsGridComponent } from '../../components/products-grid/products-grid.component';
import { ProductsBrandService } from '../../services/products-brand.service';

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
  providers: [ProductsBrandService], // استخدام ProductsBrandService مباشرة
})
export class ProductsByBrandComponent implements OnInit {
  products: any[] = [];
  isLoading = true;
  isLoadingMore = false;
  currentBrandTermId: any | null = null;
  currentBrandSlug: string | null = null;
  brandName: string = 'Loading...';
  currentPage: number = 1;
  itemPerPage: number = 20;
  totalProducts: number = 0;
  filterDrawerOpen = false;
  selectedOrderby: string = 'date';
  selectedOrder: 'asc' | 'desc' = 'desc';

  @ViewChild(FilterSidebarComponent) filterSidebar!: FilterSidebarComponent;
  @ViewChild(FilterDrawerComponent) filterDrawer!: FilterDrawerComponent;

  constructor(
    private productsBrandService: ProductsBrandService,
    private route: ActivatedRoute
  ) {}

  async ngOnInit() {
    try {
      this.isLoading = true;
      this.currentBrandSlug = this.route.snapshot.paramMap.get('brandSlug');
  
      if (this.currentBrandSlug) {
        const brandInfo = await this.productsBrandService
          .getBrandInfoBySlug(this.currentBrandSlug)
          .toPromise();
  
        if (brandInfo) {
          this.currentBrandTermId = brandInfo.id;
          this.brandName = brandInfo.name;
          // يمكنك استخدام brandInfo.slug إذا أردت لاحقًا
          await this.loadProducts(this.currentBrandTermId, this.currentPage);
          await this.loadTotalProducts(this.currentBrandTermId);
        } else {
          this.brandName = 'Unknown Brand';
        }
      }
    } catch (error) {
      console.error('Error in ngOnInit:', error);
      this.brandName = 'Unknown Brand';
    } finally {
      this.isLoading = false;
    }
  }

  ngAfterViewInit() {
    console.log('FilterSidebar:', this.filterSidebar);
    if (this.filterSidebar) {
      this.filterSidebar.filtersChanges.subscribe((filters: any) => {
        console.log('Filters changed:', filters);
        this.loadProductsWithFilters(this.currentBrandTermId, filters);
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

  private async loadProducts(brandTermId: number, page: number) {
    const isInitialLoad = page === 1;
    if (isInitialLoad) this.isLoading = true;
    else this.isLoadingMore = true;

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
      this.products = isInitialLoad
        ? products || []
        : [...this.products, ...(products || [])];
    } catch (error) {
      console.error('Error loading products:', error);
      if (isInitialLoad) this.products = [];
    } finally {
      this.isLoading = false;
      this.isLoadingMore = false;
    }
  }

  private async loadTotalProducts(brandTermId: number) {
    try {
      const filters = this.filterSidebar?.selectedFilters || {};
      const total = await this.productsBrandService
        .getTotalProductsByBrandTermId(brandTermId, filters)
        .toPromise();
      this.totalProducts = total ?? 0;
    } catch (error) {
      console.error('Error loading total products:', error);
      this.totalProducts = 0;
    }
  }

  private async loadProductsWithFilters(
    brandTermId: number | null,
    filters: { [key: string]: string[] }
  ): Promise<void> {
    this.isLoading = true;
    this.currentPage = 1;
    this.products = [];

    try {
      if (brandTermId) {
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
        this.products = products || [];
        await this.loadTotalProducts(brandTermId);
      }
    } catch (error) {
      console.error('Error loading filtered products:', error);
      this.products = [];
    } finally {
      this.isLoading = false;
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
    if (this.currentBrandTermId) {
      await this.loadProductsWithFilters(
        this.currentBrandTermId,
        this.filterSidebar?.selectedFilters || {}
      );
    }
  }

  openFilterDrawer() {
    this.filterDrawer['drawer'].open();
  }

  closeFilterDrawer() {
    this.filterDrawerOpen = false;
  }

  onCategoryIdChange(categoryId: number | null) {
    // لا حاجة لهذا في صفحة الـ Brand
  }
}