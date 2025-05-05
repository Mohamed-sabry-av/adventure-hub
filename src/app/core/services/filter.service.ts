import { HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { forkJoin, Observable, of, shareReplay } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { HandleErrorsService } from './handel-errors.service';
import { Product } from '../../interfaces/product';
import { CacheService } from './cashing.service';

@Injectable({
  providedIn: 'root',
})
export class FilterService {
  constructor(
    private wooAPI: ApiService,
    private handleErrorsService: HandleErrorsService,
    private cachingService: CacheService
  ) {}

  /**
   * Fetch initial attributes and terms for a category using the custom endpoint.
   */
  getAllAttributesAndTermsByCategory(categoryId: number): Observable<{ [key: string]: { name: string; terms: { id: number; name: string }[] } }> {
    const cacheKey = `attributes_terms_category_${categoryId}`;
    return this.cachingService.cacheObservable(
      cacheKey,
      this.wooAPI.getRequest<any>(`categories/${categoryId}/filters`).pipe(
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
        }),
        catchError((error) => {
          console.error(`Error fetching attributes for category ${categoryId}:`, error);
          this.handleErrorsService.handelError(error);
          return of({});
        }),
        shareReplay(1)
      ),
      300000 // Cache for 5 minutes
    );
  }

  /**
   * Fetch products and filters together.
   */
  getProductsAndFilters(
    categoryId: number,
    filters: { [key: string]: string[] },
    page: number = 1,
    perPage: number = 6,
    orderby: string = 'date',
    order: 'asc' | 'desc' = 'desc'
  ): Observable<{
    products: Product[];
    attributes: { [key: string]: { name: string; terms: { id: number; name: string }[] } };
    availableAttributes: { [key: string]: { name: string; terms: { id: number; name: string }[] } };
  }> {
    return forkJoin({
      products: this.getFilteredProductsByCategory(categoryId, filters, page, perPage, orderby, order),
      attributes: this.getAllAttributesAndTermsByCategory(categoryId),
      availableAttributes: this.getAvailableAttributesAndTerms(categoryId, filters),
    }).pipe(
      catchError((error) => {
        console.error('Error fetching products and filters:', error);
        return of({ products: [], attributes: {}, availableAttributes: {} });
      })
    );
  }

  /**
   * Fetch available attributes and terms based on selected filters using the custom endpoint.
   */
  getAvailableAttributesAndTerms(
    categoryId: number,
    filters: { [key: string]: string[] }
  ): Observable<{ [key: string]: { name: string; terms: { id: number; name: string }[] } }> {
    const cacheKey = `available_attributes_terms_category_${categoryId}_filters_${JSON.stringify(filters)}`;
    const params = new HttpParams().set('filters', JSON.stringify(filters));

    return this.cachingService.cacheObservable(
      cacheKey,
      this.wooAPI.getRequest<any>(`categories/${categoryId}/available-filters`, { params }).pipe(
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
        }),
        catchError((error) => {
          console.error(`Error fetching available attributes for category ${categoryId}:`, error);
          this.handleErrorsService.handelError(error);
          return of({});
        }),
        shareReplay(1)
      ),
      300000 // Cache for 5 minutes
    );
  }

  /**
   * Fetch filtered products based on selected attributes and terms.
   */
  getFilteredProductsByCategory(
    categoryId: number | null,
    filters: { [key: string]: string[] },
    page: number = 1,
    perPage: number = 6,
    orderby: string = 'date',
    order: 'asc' | 'desc' = 'desc'
  ): Observable<Product[]> {
    const cacheKey = `filtered_products_category_${categoryId || 'all'}_filters_${JSON.stringify(filters)}_page_${page}_orderby_${orderby}_order_${order}`;
    return this.cachingService.cacheObservable(
      cacheKey,
      this.wooAPI
        .getRequestProducts<any>('products', {
          params: this.buildFilterParams(categoryId, filters, page, perPage, orderby, order),
          observe: 'response',
        })
        .pipe(
          map((response: HttpResponse<any>) => {
            console.log('API Request URL:', `${response.url}`);
            return (response.body || []).map((product: any) => ({
              ...product,
              images: product.images?.slice(0, 3) || [], // Load only the first image
            }));
          }),
          catchError((error) => {
            console.error('Error fetching filtered products:', error);
            this.handleErrorsService.handelError(error);
            return of([]);
          }),
          shareReplay(1)
        ),
      300000
    );
  }

  /**
   * Build HTTP params for filtering products.
   */
  private buildFilterParams(
    categoryId: number | null,
    filters: { [key: string]: string[] },
    page: number,
    perPage: number,
    orderby: string,
    order: 'asc' | 'desc'
  ): HttpParams {
    let params = new HttpParams()
      .set('orderby', orderby)
      .set('order', order)
      .set('page', page.toString())
      .set('status', 'publish')
      .set('stock_status', 'instock')
      .set('per_page', perPage.toString())
      .set('_fields', 'default_attributes,id,name,price,images,categories,description,attributes,quantity_limits,yoast_head,slug,yoast_head_json,quantity_limits,tags,meta_data,stock_status,stock_quantity,date_created,status,type');

    if (categoryId) {
      params = params.set('category', categoryId.toString());
    }

    if (filters['on_sale'] && filters['on_sale'].includes('true')) {
      params = params.set('on_sale', 'true');
    }

    const attributeFilters = { ...filters };
    delete attributeFilters['on_sale'];
    if (Object.keys(attributeFilters).length > 0) {
      const formattedFilters = Object.fromEntries(
        Object.entries(attributeFilters).map(([key, values]) => [
          key === 'brand' ? 'pa_brand' : `pa_${key}`,
          values,
        ])
      );
      params = params.set('attributes', JSON.stringify(formattedFilters));
    }

    console.log('Generated Params:', params.toString());
    return params;
  }
}