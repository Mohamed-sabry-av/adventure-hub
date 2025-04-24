import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostListener,
  OnInit,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { ProductService } from '../../../../core/services/product.service';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CategoriesService } from '../../../../core/services/categories.service';
import { FilterService } from '../../../../core/services/filter.service';
import { FilterSidebarComponent } from '../../components/filter-sidebar/filter-sidebar.component';
import { BreadcrumbComponent } from '../../components/breadcrumb/breadcrumb.component';
import { FilterDrawerComponent } from '../../components/filter-drawer/filter-drawer.component';
import { SortMenuComponent } from '../../components/sort-menu/sort-menu.component';
import { ProductsGridComponent } from '../../components/products-grid/products-grid.component';
import { SeoService } from '../../../../core/services/seo.service';
import { catchError, finalize, of, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { isEqual } from 'lodash';
import { DialogErrorComponent } from '../../../../shared/components/dialog-error/dialog-error.component';

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
  currentCategoryId: number | null = null;
  currentPage = 1;
  currentCategory: any = null;
  itemsPerPage = 16;
  totalProducts = 0;
  filterDrawerOpen = false;
  selectedOrderby: string = 'date';
  selectedOrder: 'asc' | 'desc' = 'desc';
  schemaData: any;
  private scrollSubject = new Subject<void>();

  @ViewChild(FilterSidebarComponent) filterSidebar!: FilterSidebarComponent;
  @ViewChild(FilterDrawerComponent) filterDrawer!: FilterDrawerComponent;

  constructor(
    private productService: ProductService,
    private categoriesService: CategoriesService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private filterService: FilterService,
    private seoService: SeoService
  ) {
    this.scrollSubject.pipe(debounceTime(200)).subscribe(() => {
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
    this.isLoading = true;
    this.cdr.markForCheck();

    try {
      const slugs = this.route.snapshot.url
        .map((segment) => segment.path)
        .filter((path) => path !== 'category');
      const deepestSlug = slugs[slugs.length - 1];

      if (deepestSlug) {
        this.currentCategory = await this.categoriesService
          .getCategoryBySlug(deepestSlug)
          .toPromise();
        this.currentCategoryId = this.currentCategory?.id ?? null;
        this.schemaData = this.seoService.applySeoTags(this.currentCategory, {
          title: this.currentCategory?.name,
          description: this.currentCategory?.description,
        });
      } else {
        this.currentCategory = null;
        this.currentCategoryId = null;
        this.schemaData = this.seoService.applySeoTags(null, {
          title: 'All Products',
        });
      }

      await this.loadProducts(true);
      await this.loadTotalProducts();
    } catch (error) {
      console.error('Error in ngOnInit:', error);
      this.schemaData = this.seoService.applySeoTags(null, {
        title: 'All Products',
      });
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  ngAfterViewInit() {
    if (this.filterSidebar) {
      this.filterSidebar.filtersChanges
        .pipe(distinctUntilChanged((prev, curr) => isEqual(prev, curr)))
        .subscribe((filters: any) => {
          this.currentPage = 1;
          this.products = [];
          this.loadProducts(true, filters);
        });
    } else {
      console.warn('FilterSidebarComponent not initialized');
    }
  }

  ngOnDestroy() {
    this.scrollSubject.complete();
  }

  @HostListener('window:scroll', ['$event'])
  onScroll(event: Event) {
    this.scrollSubject.next();
  }

  onFiltersChange(filters: { [key: string]: string[] }) {
    // منع الطلب لو الفلاتر فاضية أو ما اتغيرتش
    if (isEqual(filters, this.filterSidebar?.selectedFilters)) {
      return;
    }
    console.log('Filters changed in ProductsComponent:', filters);
    this.currentPage = 1;
    this.products = [];
    this.loadProducts(true, filters);
  }

  loadProducts(isInitialLoad = false, filters?: { [key: string]: string[] }) {
    if (this.isFetching) return;

    this.isFetching = true;
    this.isLoading = isInitialLoad;
    this.isLoadingMore = !isInitialLoad;
    this.cdr.markForCheck();

    const effectiveFilters =
      filters ?? this.filterSidebar?.selectedFilters ?? {};
    this.filterService
      .getFilteredProductsByCategory(
        this.currentCategoryId,
        effectiveFilters,
        isInitialLoad ? 1 : this.currentPage,
        this.itemsPerPage,
        this.selectedOrderby,
        this.selectedOrder
      )
      .pipe(
        catchError((error) => {
          console.error('Error loading products:', error);
          this.isLoading = false;
          this.isLoadingMore = false;
          this.isFetching = false;
          this.cdr.markForCheck();
          return of([]);
        }),
        finalize(() => {
          this.isLoading = false;
          this.isLoadingMore = false;
          this.isFetching = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe((products) => {
        this.products = isInitialLoad
          ? products
          : [...this.products, ...products];
        if (isInitialLoad) this.currentPage = 1;
        this.cdr.markForCheck();
      });
  }

  private async loadMoreProducts() {
    this.currentPage++;
    await this.loadProducts(false);
  }

  private async loadTotalProducts() {
    try {
      const total = this.currentCategoryId
        ? await this.productService
            .getTotalProductsByCategoryId(this.currentCategoryId)
            .toPromise()
        : await this.productService.getTotalProducts().toPromise();
      this.totalProducts = total ?? 0;
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
    this.currentCategoryId = categoryId;
    this.currentPage = 1;
    this.products = [];
    this.cdr.markForCheck();

    try {
      if (categoryId) {
        this.currentCategory = await this.categoriesService
          .getCategoryById(categoryId)
          .toPromise();
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
}
