import {
  Component,
  OnInit,
  HostListener,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewChild,
  inject,
  DestroyRef,
  TransferState,
  makeStateKey
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BreadcrumbComponent } from '../../components/breadcrumb/breadcrumb.component';
import { ProductsGridComponent } from '../../components/products-grid/products-grid.component';
import { FilterSidebarComponent } from '../../components/filter-sidebar/filter-sidebar.component';
import { FilterDrawerComponent } from '../../components/filter-drawer/filter-drawer.component';
import { SortMenuComponent } from '../../components/sort-menu/sort-menu.component';
import { finalize, catchError, tap, debounceTime } from 'rxjs/operators';
import { of, Subject } from 'rxjs';
import { SeoService } from '../../../../core/services/seo.service';
import { FilterService } from '../../../../core/services/filter.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import isEqual from 'lodash/isEqual';
import { DialogErrorComponent } from '../../../../shared/components/dialog-error/dialog-error.component';

// Define the state keys at the top level
const SEARCH_RESULTS_KEY = makeStateKey<any>('search_results');
const SEARCH_FILTERS_KEY = makeStateKey<any>('search_filters');

@Component({
  selector: 'app-search-results',
  templateUrl: './search-results.component.html',
  styleUrls: ['./search-results.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    BreadcrumbComponent,
    ProductsGridComponent,
    FilterSidebarComponent,
    FilterDrawerComponent,
    SortMenuComponent,
    DialogErrorComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchResultsComponent implements OnInit {
  searchQuery: string = '';
  products: any[] = [];
  isLoading = false;
  isLoadingMore = false;
  isFetching = false;
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
  selectedFilters: { [key: string]: string[] } = {};
  schemaData: any;
  private scrollSubject = new Subject<void>();
  private destroyRef = inject(DestroyRef);
  private transferState = inject(TransferState);

  @ViewChild(FilterSidebarComponent) filterSidebar!: FilterSidebarComponent;
  @ViewChild(FilterDrawerComponent) filterDrawer!: FilterDrawerComponent;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private filterService: FilterService,
    private seoService: SeoService,
    private cdr: ChangeDetectorRef
  ) {
    this.scrollSubject.pipe(
      debounceTime(50),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
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
        this.loadMoreResults();
      }
    });
  }

  ngOnInit(): void {
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const newQuery = params['query'] || '';
        const newPage = parseInt(params['page'] || '1', 10);
        
        // Only reload if query changes
        if (newQuery !== this.searchQuery || newPage !== this.currentPage) {
          this.searchQuery = newQuery;
          this.currentPage = newPage;

      if (this.searchQuery) {
        this.resetSearch();
            this.loadInitialData();
      } else {
        this.isLoading = false;
        this.products = [];
        this.showEmptyState = true;
        this.cdr.markForCheck();
          }
      }
    });
  }

  ngAfterViewInit() {
    if (this.filterSidebar) {
      this.filterSidebar.filtersChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((filters: any) => {
        if (!isEqual(filters, this.selectedFilters)) {
          this.currentPage = 1;
          this.products = [];
          this.isInitialLoadComplete = false;
          this.showSkeleton = true;
          this.showEmptyState = false;
            this.selectedFilters = filters;
          this.loadSearchResultsWithFilters(filters);
          this.cdr.markForCheck();
        }
      });
    }
  }

  resetSearch(): void {
    this.products = [];
    this.currentPage = 1;
    this.isInitialLoadComplete = false;
    this.showSkeleton = true;
    this.showEmptyState = false;
    this.selectedFilters = {};
  }

  async loadInitialData(): Promise<void> {
    this.isLoading = true;
    this.showSkeleton = true;
    this.setupSEO();
    this.cdr.markForCheck();

    try {
      // First, load search filters regardless of cache
      await this.loadSearchFilters();
      
      // Then check for cached results
      const cacheKey = `${SEARCH_RESULTS_KEY.toString()}_${this.searchQuery}`;
      const cachedResults = this.transferState.get(makeStateKey(cacheKey), null);
      
      if (cachedResults) {
        this.products = cachedResults;
        this.isInitialLoadComplete = true;
        this.showSkeleton = false;
        this.showEmptyState = this.products.length === 0;
      } else {
        await this.loadSearchResults();
      }
    } catch (error) {
      console.error('Error in loadInitialData:', error);
      this.showEmptyState = true;
    } finally {
      this.isLoading = false;
      this.isInitialLoadComplete = true;
      this.showSkeleton = false;
      this.cdr.markForCheck();
    }
  }

  private setupSEO(): void {
    this.schemaData = this.seoService.applySeoTags(null, {
      title: `Search results for "${this.searchQuery}"`,
      description: `Browse search results for "${this.searchQuery}" - Find products that match your search`,
      robots: 'noindex, follow' // Search results shouldn't be indexed
    });
  }

  private async loadSearchFilters(): Promise<void> {
    try {
      const attributesData = await this.filterService
        .getSearchFilters(this.searchQuery)
        .toPromise();

      this.attributes = attributesData || {};
      this.transferState.set(SEARCH_FILTERS_KEY, this.attributes);
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error loading search filters:', error);
      this.attributes = {};
    }
  }

  async loadSearchResults(): Promise<void> {
    this.isFetching = true;
    this.isLoading = true;
    this.showSkeleton = true;
    this.cdr.markForCheck();

    try {
      const products = await this.filterService
        .getFilteredProductsByCategory(
          null,
          this.selectedFilters,
          this.currentPage,
          this.itemsPerPage,
          this.selectedOrderby,
          this.selectedOrder,
          this.searchQuery
        )
        .toPromise();

      this.products = products || [];
      
      // Cache the results in transfer state
      const cacheKey = `${SEARCH_RESULTS_KEY.toString()}_${this.searchQuery}`;
      this.transferState.set(makeStateKey<any>(cacheKey), this.products);
      
      this.showEmptyState = this.products.length === 0;
    } catch (error) {
      console.error('Error loading search results:', error);
      this.products = [];
      this.showEmptyState = true;
    } finally {
      this.isFetching = false;
      this.isLoading = false;
      this.isInitialLoadComplete = true;
      this.showSkeleton = false;
      this.cdr.markForCheck();
    }
  }

  async loadSearchResultsWithFilters(filters: { [key: string]: string[] }): Promise<void> {
    this.isFetching = true;
    this.isLoading = true;
    this.cdr.markForCheck();

    this.filterService
      .getFilteredProductsByCategory(
        null,
        filters,
        this.currentPage,
        this.itemsPerPage,
        this.selectedOrderby,
        this.selectedOrder,
        this.searchQuery
      )
      .pipe(
        catchError((error) => {
          console.error('Error in search with filters:', error);
          return of([]);
        }),
        finalize(() => {
          this.isFetching = false;
          this.isLoading = false;
          this.isInitialLoadComplete = true;
          this.showSkeleton = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe((products) => {
        this.products = products || [];
        this.showEmptyState = this.products.length === 0;

        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { query: this.searchQuery, page: this.currentPage },
          queryParamsHandling: 'merge',
        });
        this.cdr.markForCheck();
      });
  }

  async loadMoreResults(): Promise<void> {
    if (this.isLoading || this.isLoadingMore || this.isFetching) {
      return;
    }

    this.isLoadingMore = true;
    this.cdr.markForCheck();

    try {
      this.currentPage++;
      const products = await this.filterService
        .getFilteredProductsByCategory(
          null,
          this.selectedFilters,
          this.currentPage,
          this.itemsPerPage,
          this.selectedOrderby,
          this.selectedOrder,
          this.searchQuery
        )
        .toPromise();

      // Only append new products if we got results
      if (products && products.length > 0) {
        this.products = [...this.products, ...products];
      }
    } catch (error) {
      console.error('Error loading more results:', error);
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
    }

    this.currentPage = 1;
    this.products = [];
    this.isInitialLoadComplete = false;
    this.showSkeleton = true;
    this.showEmptyState = false;
    await this.loadSearchResults();
    
    // Update URL with sort parameter
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { 
        query: this.searchQuery, 
        page: this.currentPage,
        sort: sortValue 
      },
      queryParamsHandling: 'merge',
    });
  }

  openFilterDrawer(): void {
    this.filterDrawerOpen = true;
    this.cdr.markForCheck();
  }

  closeFilterDrawer(): void {
    this.filterDrawerOpen = false;
    this.cdr.markForCheck();
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrollSubject.next();
  }
}