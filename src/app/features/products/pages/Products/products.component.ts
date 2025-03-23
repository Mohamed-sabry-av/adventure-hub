import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { ProductService } from '../../../../core/services/product.service';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProductCardComponent } from '../../../../shared/components/product-card/page/product-card.component';
import { CategoriesService } from '../../../../core/services/categories.service';
import { map, of, switchMap } from 'rxjs';
import { FilterSidebarComponent } from '../../components/filter-sidebar/filter-sidebar.component';
import { BreadcrumbComponent } from '../../components/breadcrumb/breadcrumb.component';
import { FilterDrawerComponent } from '../../components/filter-drawer/filter-drawer.component';
import { SortMenuComponent } from '../../components/sort-menu/sort-menu.component';
import { ProductsGridComponent } from '../../components/products-grid/products-grid.component';
import { FilterService } from '../../../../core/services/filter.service';

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
  ],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.css'],
  providers: [ProductService],
})
export class ProductsComponent implements OnInit {
  products: any[] = [];
  isLoading = true;
isLoadingMore = false;
currentCategoryId: number | null = null;
currentPage: number = 1;
itemPerPage: number = 20;
totalProducts: number = 0;
filterDrawerOpen = false;
selectedOrderby: string = 'date';
  selectedOrder: 'asc' | 'desc' = 'desc';

@ViewChild(FilterSidebarComponent) filterSidebar!: FilterSidebarComponent;
@ViewChild(FilterDrawerComponent) filterDrawer!: FilterDrawerComponent;

constructor(
  private productService: ProductService,
  private categoriesService: CategoriesService,
  private route: ActivatedRoute,
  private filterService: FilterService
) {}

async ngOnInit() {
  try {
    this.isLoading = true;
    const params = this.route.snapshot.params; // نستخدم snapshot بدل params observable عشان نسهل الـ async/await
    const slugs = [
      params['mainCategorySlug'],
      params['subCategorySlug'],
      params['subSubCategorySlug'],
      params['subSubSubCategorySlug'],
      params['subSubSubSubCategorySlug'],
    ].filter((s) => s);
    const deepestSlug = slugs.pop();

    if (deepestSlug) {
      const category = await this.categoriesService.getCategoryBySlug(deepestSlug).toPromise();
      this.currentCategoryId = category ? category.id : null;
    } else {
      this.currentCategoryId = null;
    }

    this.currentPage = 1;
    this.products = [];
    await this.loadProducts(this.currentCategoryId, this.currentPage);
    await this.loadTotalProducts(this.currentCategoryId);
  } catch (error) {
    console.error('Error in ngOnInit:', error);
  } finally {
    this.isLoading = false;
  }
}

ngAfterViewInit() {
  if (this.filterSidebar) {
    this.filterSidebar.filtersChanges.subscribe((filters: any) => {
      this.loadProductsWithFilters(this.currentCategoryId, filters);
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
    this.currentPage * this.itemPerPage < this.totalProducts
  ) {
    this.loadMoreProducts();
  }
}

private async loadProducts(categoryId: number | null, page: number) {
  const isInitialLoad = page === 1;
  if (isInitialLoad) {
    this.isLoading = true;
  } else {
    this.isLoadingMore = true;
  }

  try {
    const filters = this.filterSidebar?.selectedFilters || {};
    const products = await this.filterService
      .getFilteredProductsByCategory(
        categoryId,
        filters,
        page,
        this.itemPerPage,
        this.selectedOrderby,
        this.selectedOrder
      )
      .toPromise();
      this.products = isInitialLoad ? (products || []) : [...this.products, ...(products || [])];    }
       catch (error) {
    console.error('Error loading products:', error);
    if (isInitialLoad) this.products = [];
  } finally {
    this.isLoading = false;
    this.isLoadingMore = false;
  }
}

private async loadMoreProducts(): Promise<void> {
  this.currentPage++;
  await this.loadProducts(this.currentCategoryId, this.currentPage);
}

private async loadTotalProducts(categoryId: number | null): Promise<void> {
  try {
    if (categoryId !== null) {
      const total = await this.productService.getTotalProductsByCategoryId(categoryId).toPromise();
      this.totalProducts = total ?? 0;
          } else {
            const total = await this.productService.getTotalProducts().toPromise();
            this.totalProducts = total ?? 0;
                }
  } catch (error) {
    console.error('Error loading total products:', error);
    this.totalProducts = 0;
  }
}


private async loadProductsWithFilters(categoryId: number | null, filters: { [key: string]: string[] }): Promise<void> {
  this.isLoading = true;
  this.currentPage = 1;
  this.products = [];

  try {
    const products = await this.filterService
      .getFilteredProductsByCategory(
        categoryId,
        filters,
        this.currentPage,
        this.itemPerPage,
        this.selectedOrderby,
        this.selectedOrder
      )
      .toPromise();
    this.products = products || [];
  } catch (error) {
    console.error('Error loading filtered products:', error);
    this.products = [];
  } finally {
    this.isLoading = false;
  }
}

getCurrentPath(): string[] {
  const params = this.route.snapshot.params;
  return Object.keys(params)
    .filter((key) => key.includes('CategorySlug'))
    .map((key) => params[key])
    .filter((s) => s);
}

async onCategoryIdChange(categoryId: number | null) {
  this.currentCategoryId = categoryId;
  this.currentPage = 1;
  this.products = [];
  this.isLoading = true;
  console.log(
    'Category ID updated from Breadcrumb/Filter:',
    this.currentCategoryId
  );
  try{

    if (categoryId !== null) {
      this.loadProducts(categoryId, this.currentPage);
      this.loadTotalProducts(categoryId);
    }
  }catch(error){
    console.error('Error in onCategoryIdChange:', error);
  }finally{
    this.isLoading= false
  }
}

async onSortChange(sortValue: string) {
  console.log('Sort value received:', sortValue); // اطبع الـ sortValue
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
  console.log(
    'New orderby:',
    this.selectedOrderby,
    'New order:',
    this.selectedOrder
  ); // اطبع القيم الجديدة
  await this.loadProductsWithFilters(
    this.currentCategoryId,
    this.filterSidebar?.selectedFilters || {}
  );
}

openFilterDrawer() {
  this.filterDrawer['drawer'].open();
}

closeFilterDrawer() {
  this.filterDrawerOpen = false;
}
}
