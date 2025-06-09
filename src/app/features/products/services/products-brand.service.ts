import { Injectable } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { catchError, map, Observable, of, shareReplay } from 'rxjs';
import { Product } from '../../../interfaces/product';
import { HttpParams, HttpResponse } from '@angular/common/http';
import { HandleErrorsService } from '../../../core/services/handel-errors.service';
import { CacheService } from '../../../core/services/cashing.service';
@Injectable({
  providedIn: 'root',
})
export class ProductsBrandService {
  constructor(
    private apiService: ApiService,
    private cacheService: CacheService,
    private handleErrorService: HandleErrorsService
  ) {}
  getProductsByBrandTermId(
    brandTermId: number,
    page: number = 1,
    perPage: number = 12,
    orderby: string = 'date',
    order: 'asc' | 'desc' = 'desc',
    filters: { [key: string]: string[] } = {}
  ): Observable<Product[]> {
    const cacheKey = `products_brand_term_${brandTermId}_page_${page}_per_${perPage}_orderby_${orderby}_order_${order}_filters_${JSON.stringify(filters)}`;
    let params = new HttpParams()
      .set('attribute', 'pa_brand')
      .set('attribute_term', brandTermId.toString())
      .set('_fields', 'default_attributes,id,name,price,images,categories,description,attributes,quantity_limits,yoast_head,slug,yoast_head_json,quantity_limits,tags,meta_data,stock_status,stock_quantity,date_created,status,type')   
      .set('per_page', perPage.toString())
      .set('page', page.toString())
      .set('stock_status', 'instock')
      .set('orderby', orderby)
      .set('order', order);
    if (Object.keys(filters).length > 0) {
      const formattedFilters = Object.fromEntries(
        Object.entries(filters).map(([key, values]) => [
          key === 'brand' ? 'pa_brand' : `pa_${key}`,
          values,
        ])
      );
      params = params.set('attributes', JSON.stringify(formattedFilters));
    }
    return this.cacheService.cacheObservable(
      cacheKey,
      this.apiService
        .getRequestProducts<any>('products', {
          params,
          observe: 'response',
        })
        .pipe(
          map((response) => {
            return (response.body || []).map((product: any) => ({
              ...product,
              images: product.images?.slice(0, 3) || [],
            }));
          }),
          catchError((error) => {
            console.error(`Error fetching products for brand term ${brandTermId}:`, error);
            this.handleErrorService.handelError(error);
            return of([]);
          }),
          shareReplay(1)
        ),
      300000
    );
  }
  getTotalProductsByBrandTermId(
    brandTermId: number,
    filters: { [key: string]: string[] } = {}
  ): Observable<number> {
    const cacheKey = `total_products_brand_term_${brandTermId}_filters_${JSON.stringify(filters)}`;
    let params = new HttpParams()
      .set('attribute', 'pa_brand')
      .set('attribute_term', brandTermId.toString())
      .set('_fields', 'id')
      .set('per_page', '1')
      .set('page', '1')
      .set('stock_status', 'instock');
    if (Object.keys(filters).length > 0) {
      const formattedFilters = Object.fromEntries(
        Object.entries(filters).map(([key, values]) => [
          key === 'brand' ? 'pa_brand' : `pa_${key}`,
          values,
        ])
      );
      params = params.set('attributes', JSON.stringify(formattedFilters));
    }
    return this.cacheService.cacheObservable(
      cacheKey,
      this.apiService
        .getRequestProducts<any>('products', {
          params,
          observe: 'response',
        })
        .pipe(
          map((response) => {
            const total = parseInt(response.headers.get('X-WP-Total') || '0', 10);
            return isNaN(total) ? 0 : total;
          }),
          catchError((error) => {
            console.error(`Error fetching total products for brand term ${brandTermId}:`, error);
            this.handleErrorService.handelError(error);
            return of(0);
          })
        ),
      300000
    );
  }
  getBrandInfoBySlug(
    brandSlug: string
  ): Observable<{ id: number; name: string; slug: string } | null> {
    const cacheKey = `brand_info_${brandSlug}`;
    return this.cacheService.cacheObservable(
      cacheKey,
      this.apiService
        .getRequest<any>('products/attributes/3/terms', {
          params: new HttpParams().set('slug', brandSlug).set('_fields', 'id,name,slug,count,image'),
        })
        .pipe(
          map((response) => {
            const term = Array.isArray(response) && response.length > 0 ? response[0] : null;

            return term ? { id: term.id, name: term.name, slug: term.slug } : null;
          }),
          catchError((error) => {
            console.error(`Error fetching brand info for slug ${brandSlug}:`, error);
            this.handleErrorService.handelError(error);
            return of(null);
          }),
          shareReplay(1)
        ),
      300000
    );
  }
  getAllAttributesAndTermsByBrand(
    brandTermId: number
  ): Observable<{ [key: string]: { name: string; terms: { id: number; name: string }[] } }> {
    const cacheKey = `attributes_terms_brand_${brandTermId}`;
    return this.cacheService.cacheObservable(
      cacheKey,
      this.apiService.getRequest<any>(`brands/${brandTermId}/filters`).pipe(
        map((response: any) => {
          return response.filters.reduce((acc: any, attr: any) => {
            acc[attr.slug] = {
              name: attr.name,
              terms: attr.terms.map((term: any) => ({
                id: term.id,
                name: term.name,
              })),
            };
            return acc;
          }, {});
        }),
        catchError((error) => {
          console.error(`Error fetching attributes for brand ${brandTermId}:`, error);
          this.handleErrorService.handelError(error);
          return of({});
        }),
        shareReplay(1)
      ),
      300000
    );
  }
  getAvailableAttributesAndTermsByBrand(
    brandTermId: number,
    filters: { [key: string]: string[] }
  ): Observable<{ [key: string]: { name: string; terms: { id: number; name: string }[] } }> {
    const cacheKey = `available_attributes_terms_brand_${brandTermId}_filters_${JSON.stringify(filters)}`;
    const params = new HttpParams().set('filters', JSON.stringify(filters));
    return this.cacheService.cacheObservable(
      cacheKey,
      this.apiService.getRequest<any>(`brands/${brandTermId}/available-filters`, { params }).pipe(
        map((response: any) => {
          return response.filters.reduce((acc: any, attr: any) => {
            acc[attr.slug] = {
              name: attr.name,
              terms: attr.terms.map((term: any) => ({
                id: term.id,
                name: term.name,
              })),
            };
            return acc;
          }, {});
        }),
        catchError((error) => {
          console.error(`Error fetching available attributes for brand ${brandTermId}:`, error);
          this.handleErrorService.handelError(error);
          return of({});
        }),
        shareReplay(1)
      ),
      300000
    );
  }
}
