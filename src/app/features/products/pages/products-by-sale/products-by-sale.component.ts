import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnInit,
  ViewChild,
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
})
export class ProductsBySaleComponent implements OnInit {
  products: any[] = [];
  isLoading = true;
  isLoadingMore = false;
  currentPage: number = 1;
  itemPerPage: number = 12;
  totalProducts: any = 0;
  filterDrawerOpen = false;
  selectedOrderby: string = 'date';
  selectedOrder: 'asc' | 'desc' = 'desc';
  schemaData: any;

  @ViewChild(FilterSidebarComponent) filterSidebar!: FilterSidebarComponent;
  @ViewChild(FilterDrawerComponent) filterDrawer!: FilterDrawerComponent;

  constructor(
    private filterService: FilterService,
    private seoService: SeoService
  ) {}

  async ngOnInit() {
    this.isLoading = true;
    try {
      this.schemaData = this.seoService.applySeoTags(null, {
        title: 'On Sale Products - Adventures HUB Sports Shop',
        description:
          'Discover discounted diving equipment, outdoor gear, and sports accessories at Adventures HUB Sports Shop. Shop now and save on premium products!',
      });

      await this.loadProductsWithFilters(this.currentPage);
      await this.loadTotalProductsOnSale();
      this.loadAvailableAttributes();
    } catch (error) {
      console.error('Error in ngOnInit:', error);
      // Fallback SEO tags in case of error
      this.schemaData = this.seoService.applySeoTags(null, {
        title: 'On Sale Products - Adventures HUB Sports Shop',
      });
    } finally {
      this.isLoading = false;
    }
  }

  ngAfterViewInit() {
    if (this.filterSidebar) {
      this.filterSidebar.filtersChanges.subscribe((filters: any) => {
        this.currentPage = 1;
        this.products = [];
        this.loadProductsWithFilters(this.currentPage, filters);
        this.loadAvailableAttributes(); // تحديث السمات بناءً على الفلاتر الجديدة
      });
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
      this.loadMoreProducts();
    }
  }

  private async loadProductsWithFilters(
    page: number,
    filters: { [key: string]: string[] } = {}
  ) {
    const isInitialLoad = page === 1;
    if (isInitialLoad) {
      this.isLoading = true;
    } else {
      this.isLoadingMore = true;
    }

    try {
      const products = await this.filterService
        .getFilteredProductsByCategory(
          null, 
          { ...filters, on_sale: ['true'] }, // إضافة فلتر on_sale
          page,
          this.itemPerPage,
          this.selectedOrderby,
          this.selectedOrder
        )
        .toPromise();
      console.log('Loaded products for page', page, ':', products);
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

  private async loadMoreProducts(): Promise<void> {
    this.currentPage++;
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
      this.totalProducts =1000; 
    } catch (error) {
      console.error('Error loading total products:', error);
      this.totalProducts = 0;
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
    await this.loadProductsWithFilters(
      this.currentPage,
      this.filterSidebar?.selectedFilters || {}
    );
  }

  private async loadAvailableAttributes() {
    // try {
    //   const attributes = await this.filterService
    //     .getAvailableAttributesAndTerms(null, { on_sale: ['true'] })
    //     .toPromise();
    //   console.log('Available attributes for on-sale products:', attributes);
    //   // يمكنكِ تمرير هذه السمات إلى FilterSidebar أو FilterDrawer إذا لزم الأمر
    // } catch (error) {
    //   console.error('Error loading attributes:', error);
    // }
  }

  openFilterDrawer() {
    this.filterDrawerOpen = true;
  }

  closeFilterDrawer() {
    this.filterDrawerOpen = false;
  }
}
