import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable, of } from 'rxjs';
import { CacheService } from './cashing.service';
import { catchError, map } from 'rxjs/operators';


interface Product {
  id: number;
  name: string;
  price: number;
  images: { src: string }[]; // تحديد نوع الصور
  categories: string[];
  description: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  constructor(
    private http: HttpClient,
    private WooAPI: ApiService,
    private cachingService: CacheService
  ) {}

  getAllProducts(): Observable<any> {
    const cacheKey = 'products';
    return this.cachingService.cacheObservable(
      cacheKey,
      this.WooAPI.getRequest('products', {
        params: new HttpParams()
          .set('_fields', 'id,name,price,images,categories,description')
          .set('per_page', '16'),
      }).pipe(
        map((products:any) =>
          products.map((product: any) => ({
            ...product,
            images: product.images.slice(0, 3) || [], // تحديد أول 3 صور فقط
          }))
        ),
        catchError((error) => {
          console.error('Error fetching products:', error);
          return of([]);
        })
      ),
      300000
    );
  }

  getProductById(id: number): Observable<any> {
    return this.WooAPI.getRequest(`products/${id}`);
  }

  getProductByCategory(categoryID: string): Observable<any> {
    return this.WooAPI.getRequest(`products?category=${categoryID}`);
  }
}
