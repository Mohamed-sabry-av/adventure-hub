import { Injectable } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { CacheService } from '../../../core/services/cashing.service';
import { catchError, map, Observable, of, shareReplay } from 'rxjs';
import { Product } from '../../../interfaces/product';
import { HttpParams, HttpResponse } from '@angular/common/http';
import { ProductService } from '../../../core/services/product.service';

@Injectable({
  providedIn: 'root',
})
export class SaleProductsService {
  constructor(
    private WooAPI: ApiService,
    private cachingService: CacheService,
    private productsService: ProductService
  ) {}

  getProductsOnSale(
    page: number = 1,
    perPage: number = 20
  ): Observable<Product[]> {
    const cacheKey = `products_on_sale_page_${page}_per_${perPage}`;
    return this.cachingService.cacheObservable(
      cacheKey,
      this.WooAPI.getRequestProducts<any>('products', {
        params: new HttpParams()
          .set('on_sale', 'true')
          .set(
            '_fields',
            'default_attributes,id,name,price,images,categories,description,attributes,quantity_limits,yoast_head,yoast_head_json,quantity_limits'
          ) 
          .set('page', page.toString())
          .set('stock_status', 'instock'),
        observe: 'response',
      }).pipe(
        map((response: HttpResponse<any>) => {
          const products = this.productsService.getUniqueProducts(
            response.body.map((product: any) => ({
              ...product,
              images: product.images.slice(0, 3) || [],
            }))
          );
          return products;
        }),
        catchError((error) => {
          console.error('Error fetching products on sale:', error);
          return of([]);
        }),
        shareReplay(1)
      ),
      3000000 
    );
  }
}
