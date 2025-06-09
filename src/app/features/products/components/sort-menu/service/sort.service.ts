import { Injectable } from '@angular/core';
import { ApiService } from '../../../../../core/services/api.service';
import { CacheService } from '../../../../../core/services/cashing.service';
import { catchError, map, Observable, of, shareReplay } from 'rxjs';
import { Product } from '../../../../../interfaces/product';
import { HttpParams, HttpResponse } from '@angular/common/http';
@Injectable({
  providedIn: 'root',
})
export class SortServiceService {
  constructor(
    private wooApi: ApiService,
    private cachingService: CacheService
  ) {}
  getSortedProducts(
    categoryId: number | null,
    filters: { [key: string]: string[] } = {},
    orderby: string = 'date', //Default,
    order: 'asc' | 'desc' = 'desc',
    page: number = 1,
    perPage: number = 18
  ): Observable<Product[]> {
    const cacheKey = `sorted_products_category_${
      categoryId || 'all'
    }_filters_${JSON.stringify(
      filters
    )}_orderby_${orderby}_order_${order}_page_${page}`;
    return this.cachingService.cacheObservable(
      cacheKey,
      this.wooApi
        .getRequestProducts<any>('products', {
          params: this.buildSortParams(
            categoryId,
            filters,
            orderby,
            order,
            page,
            perPage
          ),
          observe: 'response',
        })
        .pipe(
          map((response: HttpResponse<any>) => {
            const fullUrl = `${response.url}`;
            return response.body.map((product: any) => ({
              ...product,
              images: product.images.slice(0, 3) || [],
            }));
          }),
          catchError((error) => {
            return of([]);
          }),
          shareReplay(1)
        ),
      3000000
    );
  }
  private buildSortParams(
    categoryId: number | null,
    filters: { [key: string]: string[] },
    orderby: string,
    order: 'asc' | 'desc',
    page: number,
    perPage: number
  ): HttpParams {
    let params = new HttpParams()
      .set('per_page', perPage.toString())
      .set('page', perPage.toString())
      .set('orderby', orderby)
      .set('order', order)
      .set(
        '_fields',
        'id,name,price,images,categories,description,sale_price,regular_price,on_sale,variations,currency,attributes'
      );
    if (categoryId) {
      params = params.set('category', categoryId.toString());
    }
    if (Object.keys(filters).length > 0) {
      const attributesJson = JSON.stringify(filters);
      params = params.set('attributes', attributesJson);
    }
    return params;
  }
}

