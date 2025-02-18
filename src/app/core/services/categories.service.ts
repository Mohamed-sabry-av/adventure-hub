import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, catchError, Observable, of, shareReplay, tap } from 'rxjs';
import { CacheService } from './cashing.service';

interface Category {
  id: number;
  name: string;
  slug: string;
  parent: number;
  display: string;
}

@Injectable({
  providedIn: 'root',
})
export class CategoriesService {
  private categoriesCache: Category[] | null = null;
  private categoriesSubject = new BehaviorSubject<Category[]>([]);

  constructor(
    private http: HttpClient,
    private WooAPI: ApiService,
    private cachingService: CacheService
  ) {}

  getCategories(parentId: number): Observable<Category[]> {
    const cacheKey = `categories_${parentId}`;
    return this.cachingService.cacheObservable(
      cacheKey,
      this.WooAPI.getRequest<Category[]>('products/categories', {
        params: new HttpParams()
          .set('_fields', 'id,name,slug,parent,display')
          .set('parent', parentId.toString())
          .set('per_page', '100'),
      }),
      300000
    );
  }

  getCategoryById(id: number): Observable<Category> {
    const cacheKey = `category_${id}`;
    return this.cachingService.cacheObservable(
      cacheKey,
      this.WooAPI.getRequest<Category>(`products/categories/${id}`, {
        params: new HttpParams()
          .set('_fields', 'id,name,slug,parent,display')
          .set('per_page', '100'),
      }),
      300000 // Cache for 5 minutes (300000 milliseconds)
    );
  }

  getSubCategories(parentId: number): Observable<any[]> {
    return this.WooAPI.getRequest<any[]>('products/categories', {
      params: new HttpParams()
        .set('_fields', 'id,name,slug,parent,display')
        .set('parent', parentId.toString())
        .set('per_page', '100'),
    });
  }

  getSubSubCategories(parentId: number): Observable<Category[]> {
    const cacheKey = `subsubcategories_${parentId}`;
    return this.cachingService.cacheObservable(
      cacheKey,
      this.WooAPI.getRequest<Category[]>('products/categories', {
        params: new HttpParams()
          .set('_fields', 'id,name,slug,parent,display')
          .set('parent', parentId.toString())
          .set('per_page', '100'),
      }).pipe(
        catchError(error => {
          console.error(`[CategoriesService] Error fetching sub-subcategories for parent ${parentId}:`, error);
          return of([]); // إرجاع مصفوفة فارغة في حالة الخطأ
        })
      ),
      300000 // Cache for 5 minutes
    );
  }
}
