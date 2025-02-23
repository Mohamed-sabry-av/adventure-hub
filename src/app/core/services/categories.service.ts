import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { CacheService } from './cashing.service';
import { HandleErrorsService } from './handel-errors.service';
import { Category } from '../../interfaces/category.model';
import { LocalStorageService } from './local-storage.service';

@Injectable({
  providedIn: 'root',
})
export class CategoriesService {
  private readonly LOCAL_STORAGE_KEY = 'categories';
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 Hours

  constructor(
    private WooAPI: ApiService,
    private cachingService: CacheService,
    private handleErrorsService: HandleErrorsService,
    private localStorageService: LocalStorageService
  ) {}

  /**
   * Retrieves all categories from WooCommerce API or localStorage with pagination handling.
   * @returns Observable<Category[]> containing all categories (main, sub, and sub-sub).
   */
  getAllCategories(): Observable<Category[]> {
    const cachedCategories = this.localStorageService.getItem<Category[]>(
      this.LOCAL_STORAGE_KEY,
      this.CACHE_TTL
    );

    if (cachedCategories) {
      console.log('Categories loaded from localStorage:', cachedCategories);
      return of(cachedCategories);
    }

    console.log('Fetching categories from API...');
    return this.fetchAllCategories().pipe(
      map((categories) => {
        this.localStorageService.setItem(this.LOCAL_STORAGE_KEY, categories);
        return categories;
      })
    );
  }

  /**
   * Helper method to fetch all categories page by page from the API.
   * @param page The current page number (default: 1).
   * @param accumulatedCategories Accumulated categories from previous pages (default: []).
   * @returns Observable<Category[]> containing all fetched categories.
   */
  private fetchAllCategories(page: number = 1, accumulatedCategories: Category[] = []): Observable<Category[]> {
    return this.WooAPI.getRequest<Category[]>('products/categories', {
      params: new HttpParams()
        .set('_fields', 'id,name,slug,parent,display')
        .set('per_page', '100')
        .set('page', page.toString()),
    }).pipe(
      switchMap((categories: Category[]) => {
        console.log(`Page ${page} fetched with ${categories.length} categories`);
        const updatedCategories = accumulatedCategories.concat(categories);

        if (categories.length < 100) {
          console.log('All categories fetched. Total:', updatedCategories.length);
          return of(updatedCategories);
        }

        return this.fetchAllCategories(page + 1, updatedCategories);
      }),
      catchError((error) => {
        console.error(`Error fetching categories at page ${page}:`, error);
        return this.handleErrorsService.handelError(error);
      })
    );
  }

  /**
   * Retrieves a category by its slug from cached categories.
   * @param slug The slug of the category to find.
   * @returns Observable<Category | null>
   */
  getCategoryBySlug(slug: string): Observable<Category | null> {
    return this.getAllCategories().pipe(
      map((categories) => {
        const category = categories.find((cat) => cat.slug === slug);
        console.log(`Category for slug "${slug}":`, category || 'Not found');
        return category || null;
      }),
      catchError((error) => {
        console.error(`Error finding category by slug "${slug}":`, error);
        return of(null);
      })
    );
  }
}