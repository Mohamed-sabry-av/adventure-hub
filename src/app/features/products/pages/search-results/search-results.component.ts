import {
  Component,
  OnInit,
  HostListener,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BreadcrumbComponent } from '../../components/breadcrumb/breadcrumb.component';
import { ProductsGridComponent } from '../../components/products-grid/products-grid.component';
import { FilterSidebarComponent } from '../../components/filter-sidebar/filter-sidebar.component';
import { FilterDrawerComponent } from '../../components/filter-drawer/filter-drawer.component';
import { SortMenuComponent } from '../../components/sort-menu/sort-menu.component';
import { finalize, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { SeoService } from '../../../../core/services/seo.service';
import { SearchBarService } from '../../../../shared/services/search-bar.service';

@Component({
  selector: 'app-search-results',
  templateUrl: './search-results.component.html',
  styleUrls: ['./search-results.component.css'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,

  imports: [
    CommonModule,
    RouterModule,
    BreadcrumbComponent,
    ProductsGridComponent,
    FilterSidebarComponent,
    FilterDrawerComponent,
    SortMenuComponent,
  ],
})
export class SearchResultsComponent implements OnInit {
  searchQuery: string = '';
  products: any[] = [];
  isLoading = false;
  isLoadingMore = false;
  isInitialLoadComplete = false;
  showSkeleton = true;
  showEmptyState = false;
  currentPage: number = 1;
  itemsPerPage: number = 12;
  totalProducts: number = 0;
  filterDrawerOpen = false;
  selectedOrderby: string = 'date';
  selectedOrder: 'asc' | 'desc' = 'desc';
  attributes: { [key: string]: { name: string; terms: { id: number; name: string }[] } } = {};
  schemaData: any;

  @ViewChild(FilterSidebarComponent) filterSidebar!: FilterSidebarComponent;
  @ViewChild(FilterDrawerComponent) filterDrawer!: FilterDrawerComponent;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private searchService: SearchBarService,
    private seoService: SeoService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.searchQuery = params['query'] || '';
      this.currentPage = parseInt(params['page'] || '1', 10);

      if (this.searchQuery) {
        this.resetSearch();
        this.loadSearchResults();

        // Apply SEO
        this.schemaData = this.seoService.applySeoTags(null, {
          title: `Search results for "${this.searchQuery}"`,
          description: `Browse search results for "${this.searchQuery}" - Find products that match your search`,
        });
      } else {
        this.isLoading = false;
        this.products = [];
        this.showEmptyState = true;
        this.cdr.markForCheck();
      }
    });
  }

  ngAfterViewInit() {
    if (this.filterSidebar) {
      this.filterSidebar.filtersChanges.subscribe((filters: any) => {
        this.currentPage = 1;
        this.products = [];
        this.isInitialLoadComplete = false;
        this.showSkeleton = true;
        this.showEmptyState = false;
        this.loadSearchResultsWithFilters(filters);
        this.cdr.markForCheck();
      });
    }
  }

  resetSearch(): void {
    this.products = [];
    this.currentPage = 1;
    this.isInitialLoadComplete = false;
    this.showSkeleton = true;
    this.showEmptyState = false;
  }

  async loadSearchResults(): Promise<void> {
    this.isLoading = true;
    this.showSkeleton = true;

    try {
      // Load basic search results first
      const products = await this.searchService
        .SearchProductsPage(this.searchQuery, this.currentPage, this.itemsPerPage)
        .toPromise();

      // Add products to display while loading filters
      this.products = products || [];
      this.showEmptyState = this.products.length === 0;
      this.cdr.markForCheck();

      // Load initial filters for the search term to populate FilterSidebar
      try {
        const attributesData = await this.searchService
          .getInitialSearchFilters(this.searchQuery)
          .toPromise();

        this.attributes = attributesData || {};
        this.cdr.markForCheck();
      } catch (filterError) {
        console.error('Error loading search filters:', filterError);
        // Continue with at least the products displayed
      }
    } catch (error) {
      console.error('Error loading search results:', error);
      this.showEmptyState = true;
    } finally {
      this.isLoading = false;
      this.isInitialLoadComplete = true;
      this.showSkeleton = false;
      this.cdr.markForCheck();
    }
  }

  async loadSearchResultsWithFilters(filters: { [key: string]: string[] }): Promise<void> {
    this.isLoading = true;

    try {
      console.log('Loading filtered search results with:', {
        query: this.searchQuery,
        filters: filters,
        page: this.currentPage,
        perPage: this.itemsPerPage,
        orderby: this.selectedOrderby,
        order: this.selectedOrder
      });

      const products = await this.searchService
        .searchProductsWithFilters(
          this.searchQuery,
          filters,
          this.currentPage,
          this.itemsPerPage,
          this.selectedOrderby,
          this.selectedOrder
        )
        .toPromise();

      console.log('Received products:', products?.length || 0);
      this.products = products || [];
      this.showEmptyState = this.products.length === 0;

      // Update URL with search parameters
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {
          query: this.searchQuery,
          page: this.currentPage
        },
        queryParamsHandling: 'merge',
      });
    } catch (error) {
      console.error('Error loading filtered search results:', error);
      this.products = [];
      this.showEmptyState = true;
    } finally {
      this.isLoading = false;
      this.isInitialLoadComplete = true;
      this.showSkeleton = false;
      this.cdr.markForCheck();
    }
  }

  async loadMoreResults(): Promise<void> {
    if (this.isLoading || this.isLoadingMore) {
      return;
    }

    this.isLoadingMore = true;
    this.currentPage++;

    try {
      const filters = this.filterSidebar?.selectedFilters || {};
      const products = await this.searchService
        .searchProductsWithFilters(
          this.searchQuery,
          filters,
          this.currentPage,
          this.itemsPerPage,
          this.selectedOrderby,
          this.selectedOrder
        )
        .toPromise();

      this.products = [...this.products, ...(products || [])];

      // Update URL with new page number
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { page: this.currentPage },
        queryParamsHandling: 'merge',
      });
    } catch (error) {
      console.error('Error loading more search results:', error);
    } finally {
      this.isLoadingMore = false;
      this.cdr.markForCheck();
    }
  }

  async onSortChange(sortValue: string): Promise<void> {
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

    await this.loadSearchResultsWithFilters(
      this.filterSidebar?.selectedFilters || {}
    );

    this.cdr.markForCheck();
  }

  openFilterDrawer(): void {
    this.filterDrawerOpen = true;
    this.cdr.markForCheck();
  }

  closeFilterDrawer(): void {
    this.filterDrawerOpen = false;
    this.cdr.markForCheck();
  }

  // Listen for scroll events
  @HostListener('window:scroll', ['$event'])
  onScroll(): void {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;

    if (
      scrollTop + windowHeight >= documentHeight - 500 &&
      !this.isLoading &&
      !this.isLoadingMore &&
      this.products.length >= this.itemsPerPage
    ) {
      this.loadMoreResults();
    }
  }
}
