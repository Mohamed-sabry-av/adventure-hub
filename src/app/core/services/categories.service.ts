

import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, switchMap, shareReplay, tap } from 'rxjs/operators';
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
  private categoriesSubject = new BehaviorSubject<Category[] | null>(null);
  private categories$: Observable<Category[]> | null = null;
  private readonly EXCLUDED_SLUGS = [
    'home',
    'men',
    'women',
    'uncategorized'
  ];

  constructor(
    private WooAPI: ApiService,
    private cachingService: CacheService,
    private handleErrorsService: HandleErrorsService,
    private localStorageService: LocalStorageService
  ) {}

  /**
   * Retrieves all categories as an observable, filtering by display if needed.
   * @param displayFilter Optional filter to include only categories with specific display values.
   * @returns Observable<Category[]> containing filtered categories.
   */
  getAllCategories(displayFilter?: string[]): Observable<Category[]> {
     const cachedCategories = this.localStorageService.getItem<Category[]>(
          this.LOCAL_STORAGE_KEY,
          this.CACHE_TTL
        );
    
        if (cachedCategories && !this.categoriesSubject.value) {
          // console.log('Categories initialized from localStorage:', cachedCategories);
          const filteredCategories = this.excludeUnwantedCategories(cachedCategories);
          this.categoriesSubject.next(filteredCategories);
        }
    
        if (this.categoriesSubject.value) {
          // console.log('Returning cached categories from subject:', this.categoriesSubject.value);
          return of(this.categoriesSubject.value);
        }

        if (!this.categories$) {
          // console.log('Initializing shared categories observable...');
          this.categories$ = this.fetchAllCategories().pipe(
            map((categories) => this.excludeUnwantedCategories(categories)),
            tap((filteredCategories) => {
              this.localStorageService.setItem(this.LOCAL_STORAGE_KEY, filteredCategories);
              this.categoriesSubject.next(filteredCategories);
            }),
        catchError((error) => {
          console.error('Error fetching categories:', error);
          return of([]); // لا داعي لاستدعاء next هنا
        }),
        tap((filteredCategories) => {
          this.categoriesSubject.next(filteredCategories);
        }),
        shareReplay(1)
      );
    }

    // console.log('Subscribing to shared categories observable...');
    return this.categories$;
  }

  /**
   * Fetches all categories page by page from the API.
   */
  private fetchAllCategories(page: number = 1, accumulatedCategories: Category[] = []): Observable<Category[]> {
    return this.WooAPI.getRequest<Category[]>('products/categories', {
      params: new HttpParams()
        .set('_fields', 'id,name,slug,parent,display')
        .set('per_page', '100')
        .set('page', page.toString()),
    }).pipe(
      switchMap((categories: Category[]) => {
        // console.log(`Page ${page} fetched with ${categories.length} categories`);
        const updatedCategories = accumulatedCategories.concat(categories);

        if (categories.length < 100) {
          // console.log('All categories fetched. Total:', updatedCategories.length);
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
   */
  getCategoryBySlug(slug: string): Observable<Category | null> {
    return this.getAllCategories().pipe(
      map((categories) => {
        const category = categories.find((cat) => cat.slug === slug);
        // console.log(`Category for slug "${slug}":`, category || 'Not found');
        return category || null;
      }),
      catchError((error) => {
        console.error(`Error finding category by slug "${slug}":`, error);
        return of(null);
      })
    );
  }

  /**
   * Filters categories based on the display field.
   * @param categories The categories to filter.
   * @param displayFilter Optional array of display values to include (e.g., ['default', 'both']).
   * @returns Filtered array of categories.
   */
  private excludeUnwantedCategories(categories: Category[]): Category[] {
     const filtered = categories.filter((category) => !this.EXCLUDED_SLUGS.includes(category.slug));
    //  console.log(`Filtered categories. Original: ${categories.length}, After exclusion: ${filtered.length}`);
     return filtered;
   }
}