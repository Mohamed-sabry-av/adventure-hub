import { Injectable } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { catchError, map, Observable, of, shareReplay } from 'rxjs';
import { CacheService } from '../../../core/services/cashing.service';
import { Product } from '../../../interfaces/product';
import { HttpParams, HttpResponse } from '@angular/common/http';
import { ProductService } from '../../../core/services/product.service';
import { HandleErrorsService } from '../../../core/services/handel-errors.service';
import { response } from 'express';
import { orderBy } from 'lodash';
import { FilterService } from '../../../core/services/filter.service';

@Injectable({
  providedIn: 'root',
})
export class ProductsBrandService {
  constructor(
    private apiService: ApiService,
    private cacheService: CacheService,
    private productService: ProductService,
    private handelErrorService: HandleErrorsService,
    private filterService: FilterService
  ) {}

  getProductsByBrandTermId(
    brandTermId: number,
    page: number = 1,
    perPage: number = 20,
    orderby: string = 'date',
    order: 'asc' | 'desc' = 'desc',
    filters: { [key: string]: string[] } = {}
  ): Observable<Product[]> {
    const cacheKey = `products_brand_term_${brandTermId}_page_${page}_per_${perPage}_orderby_${orderby}_order_${order}`;
    let params = new HttpParams()
      .set('attribute', 'pa_brand')
      .set('attribute_term', brandTermId.toString())
      .set(
        '_fields',
        'default_attributes,id,name,price,images,categories,description,attributes,quantity_limits,yoast_head,yoast_head_json,quantity_limits'
      )
      .set('per_page', perPage.toString())
      .set('page', page.toString())
      .set('stock_status', 'instock')
      .set('orderby', orderby)
      .set('order', order);

    // إضافة الفلاتر إلى المعلمات
    for (const [key, values] of Object.entries(filters)) {
      if (values.length > 0) {
        params = params.set(key, values.join(','));
      }
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
            return response.body.map((product: any) => ({
              ...product,
              images: product.images.slice(0, 3) || [],
            }));
          }),
          catchError((error) => {
            console.error(
              `Error fetching products for brand term ${brandTermId}:`,
              error
            );
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
    const cacheKey = `total_products_brand_term_${brandTermId}`;
    let params = new HttpParams()
      .set('attribute', 'pa_brand')
      .set('attribute_term', brandTermId.toString())
      .set('_fields', 'id')
      .set('per_page', '1')
      .set('page', '1')
      .set('stock_status', 'instock');

    // إضافة الفلاتر إلى المعلمات
    for (const [key, values] of Object.entries(filters)) {
      if (values.length > 0) {
        params = params.set(key, values.join(','));
      }
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
            const total = parseInt(
              response.headers.get('X-WP-Total') || '0',
              10
            );
            return isNaN(total) ? 0 : total;
          }),
          catchError((error) => {
            console.error(
              `Error fetching total products for brand term ${brandTermId}:`,
              error
            );
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
        .getRequestProducts<any>('products/attributes/3/terms', {
          params: new HttpParams()
            .set('slug', brandSlug)
            .set('_fields', 'id,name,slug'),
        })
        .pipe(
          map((response) => {
            const term =
              Array.isArray(response) && response.length > 0
                ? response[0]
                : null;
            return term
              ? { id: term.id, name: term.name, slug: term.slug }
              : null;
          }),
          catchError((error) => {
            console.error(
              `Error fetching brand info for slug ${brandSlug}:`,
              error
            );
            return of(null);
          }),
          shareReplay(1)
        ),
      300000
    );
  }

  getAllAttributesAndTermsByBrand(
    brandTermId: any
  ): Observable<{
    [key: string]: { name: string; terms: { id: number; name: string }[] };
  }> {
    const cacheKey = `attributes_terms_brand_${brandTermId}_page_1`;
    return this.cacheService.cacheObservable(
      cacheKey,
      this.apiService
        .getRequestProducts<any>('products', {
          params: new HttpParams()
            .set('attribute', 'pa_brand')
            .set('attribute_term', brandTermId.toString())
            .set('_fields', 'id,attributes')
            .set('per_page', '100')
            .set('page', '1'),
          observe: 'response',
        })
        .pipe(
          map(
            (response: HttpResponse<any>) =>
              this.filterService.processAttributes(response).attributes
          ),
          catchError((error) => {
            console.error(
              `Error fetching attributes/terms for brand ${brandTermId}:`,
              error
            );
            return of({});
          }),
          shareReplay(1)
        ),
      300000
    );
  }

  getAvailableAttributesAndTermsByBrand(
    brandTermId: any,
    filters: { [key: string]: string[] }
  ): Observable<any> {
    let params = new HttpParams()
      .set('attribute', 'pa_brand')
      .set('attribute_term', brandTermId.toString());
    for (const [key, values] of Object.entries(filters)) {
      if (values.length > 0) {
        params = params.set(key, values.join(','));
      }
    }
    return this.apiService.getRequestProducts<any>('products/attributes', {
      params,
    });
  }
}
