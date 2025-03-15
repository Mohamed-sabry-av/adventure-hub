import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable, of } from 'rxjs';
import { CacheService } from './cashing.service';
import { catchError, map, shareReplay, switchMap } from 'rxjs/operators';
import { Product, Variation } from '../../interfaces/product';
import { HandleErrorsService } from './handel-errors.service';
import { error } from 'console';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  constructor(
    private http: HttpClient,
    private WooAPI: ApiService,
    private cachingService: CacheService,
    private handleErrorsService: HandleErrorsService
  ) {}

  // GET ALL PRODUCTS WITH PAGINATION
  getAllProducts(
    page: number = 1,
    perPage: number = 16
  ): Observable<Product[]> {
    const cacheKey = `products_page_${page}_per_${perPage}`;
    return this.cachingService.cacheObservable(
      cacheKey,
      this.WooAPI.getRequestProducts<any>('products', {
        params: new HttpParams()
          .set('_fields', 'id,name,price,images,categories,description')
          .set('per_page', perPage.toString())
          .set('page', page.toString())
          .set('stock_status', 'instock'),
        observe: 'response',
      }).pipe(
        map((response: HttpResponse<any>) => {
          // console.log(
          //   `API response for all products (page ${page}, perPage ${perPage}):`,
          //   response.body.length
          // );
          const products = this.getUniqueProducts(
            response.body.map((product: any) => ({
              ...product,
              images: product.images.slice(0, 3) || [],
            }))
          );
          return products;
        }),
        catchError((error) => {
          console.error('Error fetching all products:', error);
          return of([]); // إرجاع مصفوفة فريدة فارغة في حالة الخطأ
        }),
        shareReplay(1)
      ),
      300000 // TTL 5 دقائق
    );
  }

  // getProductByID() {
  //   this.WooAPI.getRequestProducts();
  // }

  // GET TOTAL PRODUCTS FOR PAGINATION
  getTotalProducts(): Observable<number> {
    const cacheKey = `total_products`;
    return this.cachingService.cacheObservable(
      cacheKey,
      this.WooAPI.getRequestProducts<any>('products', {
        params: new HttpParams()
          .set('_fields', 'id')
          .set('per_page', '1')
          .set('page', '1')
          .set('stock_status', 'instock'),
        observe: 'response',
      }).pipe(
        map((response: HttpResponse<any>) => {
          const total = parseInt(response.headers.get('X-WP-Total') || '0', 10);
          if (isNaN(total)) {
            console.warn(
              'X-WP-Total header not found or invalid, defaulting to 0'
            );
            return 0;
          }
          console.log('Total products fetched:', total);
          return total;
        }),
        catchError((error) => {
          console.error('Error fetching total products:', error);
          return of(0); // إرجاع 0 كقيمة افتراضية
        })
      ),
      300000 // TTL 5 دقائق
    );
  }

  // GET PRODUCTS BY CATEGORY ID WITH PAGINATION
  getProductsByCategoryId(
    categoryId: number,
    page: number = 1,
    perPage: number = 18
  ): Observable<Product[]> {
    const cacheKey = `products_category_${categoryId}_page_${page}_per_${perPage}`;
    return this.cachingService.cacheObservable(
      cacheKey,
      this.WooAPI.getRequestProducts<any>('products', {
        params: new HttpParams()
          .set('category', categoryId.toString())
          .set('_fields', 'id,name,price,images,categories,description,attributes')
          .set('per_page', perPage.toString())
          .set('page', page.toString())
          .set('stock_status', 'instock'),
        observe: 'response',
      }).pipe(
        map((response: HttpResponse<any>) => {
          // console.log(
          //   `API response for category ${categoryId} (page ${page}, perPage ${perPage}):`,
          //   response.body.length
          // );
          const products = this.getUniqueProducts(
            response.body.map((product: any) => ({
              ...product,
              images: product.images.slice(0, 3) || [],
            }))
          );
          return products;
        }),
        catchError((error) => {
          // console.error(
          //   `Error fetching products for category ${categoryId}:`,
          //   error
          // );
          return of([]); // إرجاع مصفوفة فريدة فارغة في حالة الخطأ
        }),
        shareReplay(1)
      ),
      300000 // TTL 5 دقائق
    );
  }

  // GET TOTAL PRODUCTS BY CATEGORY ID FOR PAGINATION
  getTotalProductsByCategoryId(categoryId: number): Observable<number> {
    const cacheKey = `total_products_category_${categoryId}`;
    return this.cachingService.cacheObservable(
      cacheKey,
      this.WooAPI.getRequestProducts<any>('products', {
        params: new HttpParams()
          .set('category', categoryId.toString())
          .set('_fields', 'id')
          .set('per_page', '1')
          .set('page', '1')
          .set('stock_status', 'instock'),
        observe: 'response',
      }).pipe(
        map((response: HttpResponse<any>) => {
          const total = parseInt(response.headers.get('X-WP-Total') || '0', 10);
          if (isNaN(total)) {
            console.warn(
              'X-WP-Total header not found or invalid for category, defaulting to 0'
            );
            return 0;
          }
          // console.log(
          //   `Total products for category ${categoryId} fetched:`,
          //   total
          // );
          return total;
        }),
        catchError((error) => {
          console.error(
            `Error fetching total products for category ${categoryId}:`,
            error
          );
          return of(0); // إرجاع 0 كقيمة افتراضية
        })
      ),
      300000 // TTL 5 دقائق
    );
  }

  // GET A SINGLE PRODUCT BY ID
  getProductById(id: number): Observable<Product> {
    const cacheKey = `product_${id}`;
    return this.cachingService.cacheObservable(
      cacheKey,
      this.WooAPI.getRequestProducts<any>(`products/${id}`, {
        observe: 'response',
      }).pipe(
        map((response: HttpResponse<any>) => {
          console.log(`API response for product ${id}:`, response.body);
          return response.body as Product;
        }),
        catchError((error) => {
          console.error(`Error fetching product ${id}:`, error);
          return this.handleErrorsService.handelError(error);
        }),
        shareReplay(1)
      ),
      300000
    );
  }

  // productID(id: number): Observable<Product> {
  //   this.WooAPI.getRequestProducts(`products/${id}`, {});
  // }

  getUniqueProducts(products: any[]): any[] {
    const uniqueProducts = [];
    const seenIds = new Set();
    for (const product of products) {
      if (!seenIds.has(product.id)) {
        seenIds.add(product.id);
        uniqueProducts.push(product);
      }
    }
    return uniqueProducts;
  }

  getProductVariations(productId: number): Observable<Variation[]> {
    const cacheKey = `product_variations_${productId}`;
    return this.cachingService.cacheObservable(
      cacheKey,
      this.WooAPI.getRequestProducts<Variation[]>(
        `products/${productId}/variations`
      )
    );
  }

  getImageById(mediaId: number): Observable<any> {
    const cacheKey = `media_${mediaId}`;
    return this.cachingService.cacheObservable(
      cacheKey,
      this.WooAPI.getRequestProducts<any>(`media/${mediaId}`).pipe(
        map((media) => ({
          src: media.source_url,
          alt: media.alt_text || '',
        })),
        catchError((error) => {
          console.error(`Error fetching media ${mediaId}:`, error);
          return of(null);
        })
      ),
      300000 // 5 minutes TTL
    );
  }

  // ============================================Attributes===============================================
}
