import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, catchError, Observable, of, shareReplay, tap } from 'rxjs';
import { CacheService } from './cashing.service';
import { map, timeout } from 'rxjs';
import { HandleErrorsService } from './handel-errors.service';
import { Category } from '../../interfaces/category.model';




@Injectable({
  providedIn: 'root',
})
export class CategoriesService {
  private categoriesCache: Category[] | null = null;
  private categoriesSubject = new BehaviorSubject<Category[]>([]);

  constructor(
    private http: HttpClient,
    private WooAPI: ApiService,
    private cachingService: CacheService,
    private handelErrorsService: HandleErrorsService
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
          .set('per_page', '50'),
      }),
      300000 // Cache for 5 minutes (300000 milliseconds)
    );
  }

  getSubCategories(parentId: number): Observable<any[]> {
    return this.WooAPI.getRequest<any[]>('products/categories', {
      params: new HttpParams()
        .set('_fields', 'id,name,slug,parent,display')
        .set('parent', parentId.toString())
        .set('per_page', '50'),
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
          .set('per_page', '50'),
      }).pipe(
        catchError(error => {
          console.error(`[CategoriesService] Error fetching sub-subcategories for parent ${parentId}:`, error);
          return of([]); // إرجاع مصفوفة فارغة في حالة الخطأ
        })
      ),
      300000 // Cache for 5 minutes
    );
  }
  
getCategoryBySlug(slug: string): Observable<Category | null> {
  const cacheKey = `category_slug_${slug}`;
  return this.cachingService.cacheObservable(
    cacheKey,
    this.WooAPI.getRequest<Category[]>('products/categories', {
      params: new HttpParams()
        .set('slug', slug)
        .set('_fields', 'id,name,slug,parent,display')
    }).pipe(
      map(response => response.length > 0 ? response[0] : null),
      catchError(error => {
        console.error(`Error fetching category by slug ${slug}:`, error);
        return of(null);
      })
    ),
    300000
  ).pipe(
    // Add a timeout or immediate fallback if it takes too long
    timeout(5000), // Timeout after 5 seconds
    catchError(() => of(null))
  );
}

}
