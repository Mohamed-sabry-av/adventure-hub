import {
  Component,
  OnInit,
  HostListener,
  ChangeDetectionStrategy,
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
  categories: any[] = [];
  loading: boolean = true;
  error: string = '';

  // Infinite Scroll Properties
  currentPage: number = 1;
  itemsPerPage: number = 12;
  loadingMore: boolean = false;
  allProductsLoaded: boolean = false;
  allCategoriesLoaded: boolean = false;
  totalResults: number = 0;

  // Make Math available to the template
  Math = Math;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private searchService: SearchBarService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.searchQuery = params['query'] || '';
      this.currentPage = parseInt(params['page'] || '1', 10);

      if (this.searchQuery) {
        // Reset state when search query changes
        this.resetSearch();
        this.fetchSearchResults();
      } else {
        this.loading = false;
        this.products = [];
        this.categories = [];
      }
    });
  }

  resetSearch(): void {
    this.products = [];
    this.categories = [];
    this.currentPage = 1;
    this.allProductsLoaded = false;
    this.allCategoriesLoaded = false;
  }

  fetchSearchResults(): void {
    this.loading = true;
    this.error = '';

    this.searchService
      .ComprehensiveSearchPage(
        this.searchQuery,
        this.currentPage,
        this.itemsPerPage
      )
      .pipe(
        catchError((error) => {
          console.error('Error fetching search results', error);
          this.error = 'Failed to load search results. Please try again.';
          return of({
            products: [],
            categories: [],
          });
        }),
        finalize(() => {
          this.loading = false;
          this.loadingMore = false;
        })
      )
      .subscribe((results) => {
        // For first page, set the products and categories
        if (this.currentPage === 1) {
          this.products = results.products || [];
          this.categories = results.categories || [];
        } else {
          // For subsequent pages, append to existing arrays
          this.products = [...this.products, ...(results.products || [])];
          this.categories = [...this.categories, ...(results.categories || [])];
        }

        // Check if all items are loaded
        this.allProductsLoaded =
          (results.products || []).length < this.itemsPerPage;
        this.allCategoriesLoaded =
          (results.categories || []).length < this.itemsPerPage;

        // Update total results count
        this.totalResults = this.products.length + this.categories.length;
      });
  }

  // Load more results when scrolling to bottom
  loadMoreResults(): void {
    if (
      this.loading ||
      this.loadingMore ||
      (this.allProductsLoaded && this.allCategoriesLoaded)
    ) {
      return;
    }

    this.loadingMore = true;
    this.currentPage++;
    this.fetchSearchResults();
  }

  // Listen for scroll events
  @HostListener('window:scroll', ['$event'])
  onScroll(): void {
    // Check if user has scrolled to the bottom
    if (
      window.innerHeight + window.scrollY >=
      document.body.offsetHeight - 500
    ) {
      this.loadMoreResults();
    }
  }
}
