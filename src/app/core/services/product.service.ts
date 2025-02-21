import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable, of } from 'rxjs';
import { CacheService } from './cashing.service';
import { catchError, map } from 'rxjs/operators';
import { shareReplay } from 'rxjs/operators';
import { Product } from '../../interfaces/product';
import { HandleErrorsService } from './handel-errors.service';

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

  // GET ALL PRODUCTS
  getAllProducts(): Observable<Product[]> {
    const cacheKey = 'products';
    return this.cachingService.cacheObservable(
      cacheKey,
      this.WooAPI.getRequest('products', {
        params: new HttpParams()
          .set('_fields', 'id,name,price,images,categories,description')
          .set('per_page', '16'),
      }).pipe(
        map((products: any) =>
          products.map((product: any) => ({
            ...product,
            images: product.images.slice(0, 3),
          }))
        ),
        catchError((error) => this.handleErrorsService.handelError(error)),

        shareReplay(1)
      ),
      300000
    );
  }

  

  // GET A SINGLE PRODUCT BY ID
  getProductById(id: number): Observable<Product> {
    return this.WooAPI.getRequest(`products/${id}`);
  }




  // GET PRODUCTS BY CATEGORY ID
  getProductsByCategoryId(categoryId: number): Observable<Product[]> {
    const cacheKey = `products_category_${categoryId}`;
    return this.cachingService.cacheObservable(
      cacheKey,
      this.WooAPI.getRequest(`products`, {
        params: new HttpParams()
          .set('category', categoryId.toString()) // استخدام معرّف الفئة
          .set('_fields', 'id,name,price,images,categories,description')
          .set('per_page', '18'),
      }).pipe(
        map((products: any) =>
          products.map((product: any) => ({
            ...product,
            images: product.images.slice(0, 3) || [],
          }))
        ),
        catchError((error) => this.handleErrorsService.handelError(error)),

        shareReplay(1)
      ),
      300000
    );
  }
}
