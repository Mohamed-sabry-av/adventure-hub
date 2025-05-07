import { Injectable } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { Observable, catchError, forkJoin, map, of, tap } from 'rxjs';
import { HttpParams } from '@angular/common/http';
import { CacheService } from '../../core/services/cashing.service';

@Injectable({
  providedIn: 'root',
})
export class SearchBarService {
  constructor(
    private wooApi: ApiService,
    private cacheService: CacheService
  ) {}

  /**
   * Search for products with expanded options
   * @param searchTerm Search query
   * @returns Observable with enhanced product data
   */
  SearchProducts(searchTerm: string): Observable<any[]> {
    if (!searchTerm.trim()) {
      return of([]);
    }

    return this.wooApi
      .getRequest<any[]>(`products?search=${searchTerm}&_embed=true&status=publish`)
      .pipe(
        map((products: any[]) => {
          return products.map((product) => ({
            ...product,
            onSale:
              product.sale_price &&
              parseFloat(product.sale_price) < parseFloat(product.regular_price),
            discountPercentage:
              product.sale_price && product.regular_price
                ? Math.round(
                    ((parseFloat(product.regular_price) -
                      parseFloat(product.sale_price)) /
                      parseFloat(product.regular_price)) *
                      100
                  )
                : 0,
          }));
        })
      );
  }

  /**
   * Search for products with pagination
   * @param searchTerm Search query
   * @param page Page number (starts at 1)
   * @param perPage Number of items per page
   * @returns Observable with product data
   */
  SearchProductsPage(
    searchTerm: string,
    page: number = 1,
    perPage: number = 16
  ): Observable<any[]> {
    if (!searchTerm.trim()) {
      return of([]);
    }

    return this.wooApi
      .getRequest<any[]>(`products?search=${searchTerm}&_embed=true&status=publish&page=${page}&per_page=${perPage}`)
      .pipe(
        map((products: any[]) => {
          return products.map((product) => ({
            ...product,
            onSale:
              product.sale_price &&
              parseFloat(product.sale_price) < parseFloat(product.regular_price),
            discountPercentage:
              product.sale_price && product.regular_price
                ? Math.round(
                    ((parseFloat(product.regular_price) -
                      parseFloat(product.sale_price)) /
                      parseFloat(product.regular_price)) *
                      100
                  )
                : 0,
          }));
        })
      );
  }

  /**
   * Search for categories
   * @param searchTerm Search query
   * @returns Observable with categories data
   */
  SearchCategories(searchTerm: string): Observable<any> {
    if (!searchTerm.trim()) {
      return of([]);
    }

    return this.wooApi.getRequest(`products/categories?search=${searchTerm}`);
  }

  /**
   * Search for categories with pagination
   * @param searchTerm Search query
   * @param page Page number (starts at 1)
   * @param perPage Number of items per page
   * @returns Observable with categories data
   */
  SearchCategoriesPage(
    searchTerm: string,
    page: number = 1,
    perPage: number = 16
  ): Observable<any[]> {
    if (!searchTerm.trim()) {
      return of([]);
    }

    return this.wooApi.getRequest(`products/categories?search=${searchTerm}&page=${page}&per_page=${perPage}`);
  }

  /**
   * Comprehensive search for both products and categories
   * @param searchTerm Search query
   * @returns Combined results
   */
  ComprehensiveSearch(searchTerm: string): Observable<any> {
    if (!searchTerm.trim()) {
      return of({ products: [], categories: [] });
    }

    return forkJoin({
      products: this.SearchProducts(searchTerm),
      categories: this.SearchCategories(searchTerm),
    });
  }

  /**
   * Comprehensive search with pagination
   * @param searchTerm Search query
   * @param page Page number for both products and categories
   * @param perPage Number of items per page
   * @returns Combined results with pagination
   */
  ComprehensiveSearchPage(
    searchTerm: string,
    page: number = 1,
    perPage: number = 16
  ): Observable<{
    products: any[],
    categories: any[]
  }> {
    if (!searchTerm.trim()) {
      return of({
        products: [],
        categories: []
      });
    }

    return forkJoin({
      products: this.SearchProductsPage(searchTerm, page, perPage),
      categories: this.SearchCategoriesPage(searchTerm, page, perPage)
    });
  }

  /**
   * Get product categories by product ID
   * @param productId Product ID
   * @returns Observable with product categories
   */
  GetProductCategories(productId: number): Observable<any> {
    return this.wooApi.getRequest(`products/${productId}/categories`);
  }

  /**
   * Fetch initial filters for a search term
   * @param searchTerm Search query
   * @returns Observable with all possible attributes and terms for the search results
   */
  getInitialSearchFilters(searchTerm: string): Observable<{ [key: string]: { name: string; terms: { id: number; name: string }[] } }> {
    if (!searchTerm.trim()) {
      return of({});
    }

    const cacheKey = `search_filters_${searchTerm}`;

    return this.cacheService.cacheObservable(
      cacheKey,
      this.wooApi.getRequest<any>(`search/filters?search=${searchTerm}`).pipe(
        map((response: any) => {
          // Transform the response to match the expected format
          const attributesMap = response.filters?.reduce((acc: any, attr: any) => {
            acc[attr.slug] = {
              name: attr.name,
              terms: attr.terms?.map((term: any) => ({
                id: term.id,
                name: term.name,
              })) || [],
            };
            return acc;
          }, {}) || {};

          return attributesMap;
        })
      ),
      300000 // Cache for 5 minutes
    );
  }

  /**
   * Fetch available filters based on current selection for a search term
   * @param searchTerm Search query
   * @param filters Currently selected filters
   * @returns Observable with available attributes and terms
   */
  getAvailableSearchFilters(
    searchTerm: string,
    filters: { [key: string]: string[] }
  ): Observable<{ [key: string]: { name: string; terms: { id: number; name: string }[] } }> {
    if (!searchTerm.trim()) {
      return of({});
    }

    const cacheKey = `available_search_filters_${searchTerm}_${JSON.stringify(filters)}`;
    const params = new HttpParams().set('search', searchTerm).set('filters', JSON.stringify(filters));

    return this.cacheService.cacheObservable(
      cacheKey,
      this.wooApi.getRequest<any>('search/available-filters', { params }).pipe(
        map((response: any) => {
          // Transform the response to match the expected format
          const attributesMap = response.filters?.reduce((acc: any, attr: any) => {
            acc[attr.slug] = {
              name: attr.name,
              terms: attr.terms?.map((term: any) => ({
                id: term.id,
                name: term.name,
              })) || [],
            };
            return acc;
          }, {}) || {};

          return attributesMap;
        })
      ),
      300000 // Cache for 5 minutes
    );
  }

  /**
   * Search products with filters
   * @param searchTerm Search query
   * @param filters Selected filters
   * @param page Page number
   * @param perPage Number of items per page
   * @param orderby Sort field
   * @param order Sort direction
   * @returns Observable with filtered products
   */
  searchProductsWithFilters(
    searchTerm: string,
    filters: { [key: string]: string[] } = {},
    page: number = 1,
    perPage: number = 12,
    orderby: string = 'date',
    order: 'asc' | 'desc' = 'desc'
  ): Observable<any[]> {
    if (!searchTerm.trim()) {
      return of([]);
    }
  
    const cacheKey = `search_products_filters_${searchTerm}_${JSON.stringify(filters)}_page_${page}_per_${perPage}_orderby_${orderby}_order_${order}`;
  
    let params = new HttpParams()
      .set('search', searchTerm)
      .set('page', page.toString())
      .set('per_page', perPage.toString())
      .set('orderby', orderby)
      .set('order', order)
      .set('status', 'publish')
      .set('stock_status', 'instock');
  
    if (Object.keys(filters).length > 0) {
      const formattedFilters = Object.fromEntries(
        Object.entries(filters).map(([key, values]) => [
          key === 'brand' ? 'pa_brand' : `pa_${key}`,
          values.length === 1 ? values[0] : values, // لو في قيمة واحدة، رجعها كـ string
        ])
      );
      params = params.set('attributes', JSON.stringify(formattedFilters));
    }
  
    console.log('Generated API URL:', `https://adventures-hub.com/wp-json/wc/v3/products?${params.toString()}`);
  
    return this.cacheService.cacheObservable(
      cacheKey,
      this.wooApi.getRequest<any[]>(`products`, { params }).pipe(
        tap((response) => console.log('API Response:', response)),
        map((products: any[]) => {
          return products.map((product) => ({
            ...product,
            onSale:
              product.sale_price &&
              parseFloat(product.sale_price) < parseFloat(product.regular_price),
            discountPercentage:
              product.sale_price && product.regular_price
                ? Math.round(
                    ((parseFloat(product.regular_price) -
                      parseFloat(product.sale_price)) /
                      parseFloat(product.regular_price)) *
                      100
                  )
                : 0,
          }));
        }),
        catchError((error) => {
          console.error('API Error:', error);
          return of([]);
        })
      ),
      300000
    );
  }}
