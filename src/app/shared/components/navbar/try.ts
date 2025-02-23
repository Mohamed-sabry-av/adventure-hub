import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Product } from '../../interfaces/product';
import { HandleErrorsService } from './handel-errors.service';
import { SessionStorageService } from './session-storage.service';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  constructor(
    private http: HttpClient,
    private WooAPI: ApiService,
    private sessionStorageService: SessionStorageService,
    private handleErrorsService: HandleErrorsService
  ) {}

  // GET ALL PRODUCTS
  getAllProducts(): Observable<Product[]> {
    const cacheKey = 'products';
    const cachedProducts = this.sessionStorageService.getItem<Product[]>(cacheKey);

    if (cachedProducts) {
      console.log(`[ProductService] Returning products from sessionStorage for key: ${cacheKey}`);
      return of(cachedProducts);
    }

    return this.fetchProducts('products', new HttpParams().set('_fields', 'id,name,price,images,categories,description').set('per_page', '16')).pipe(
      tap((products) => {
        this.sessionStorageService.setItem(cacheKey, products);
      })
    );
  }

  // GET A SINGLE PRODUCT BY ID
  getProductById(id: number): Observable<Product> {
    const cacheKey = `product_${id}`;
    const cachedProduct = this.sessionStorageService.getItem<Product>(cacheKey);

    if (cachedProduct) {
      console.log(`[ProductService] Returning product from sessionStorage for key: ${cacheKey}`);
      return of(cachedProduct);
    }

    return this.WooAPI.getRequest<Product>(`products/${id}`).pipe(
      tap((product) => {
        this.sessionStorageService.setItem(cacheKey, product);
      })
    );
  }

  // GET PRODUCTS BY CATEGORY ID
  getProductsByCategoryId(categoryId: number): Observable<Product[]> {
    const cacheKey = `products_category_${categoryId}`;
    const cachedProducts = this.sessionStorageService.getItem<Product[]>(cacheKey);

    if (cachedProducts) {
      console.log(`[ProductService] Returning products from sessionStorage for key: ${cacheKey}`);
      return of(cachedProducts);
    }

    return this.fetchProducts('products', new HttpParams()
      .set('category', categoryId.toString())
      .set('_fields', 'id,name,price,images,categories,description')
      .set('per_page', '18')).pipe(
      tap((products) => {
        this.sessionStorageService.setItem(cacheKey, products);
      })
    );
  }

  // Helper method to fetch products with custom params
  private fetchProducts(endpoint: string, params: HttpParams): Observable<Product[]> {
    return this.WooAPI.getRequest<Product[]>(endpoint, { params }).pipe(
      map((products: any) =>
        products.map((product: any) => ({
          ...product,
          images: product.images.slice(0, 3) || [],
        }))
      ),
      catchError((error) => this.handleErrorsService.handelError(error))
    );
  }
}