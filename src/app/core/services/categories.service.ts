import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, Injectable, makeStateKey, PLATFORM_ID, TransferState } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, switchMap, shareReplay, tap } from 'rxjs/operators';
import { isPlatformServer } from '@angular/common';
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
  private readonly EXCLUDED_SLUGS = ['home', 'men', 'women', 'uncategorized'];

  constructor(
    private WooAPI: ApiService,
    private cachingService: CacheService,
    private handleErrorsService: HandleErrorsService,
    private localStorageService: LocalStorageService,
    private transferState: TransferState,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  /**
   * Retrieves all categories as an observable, filtering by display if needed.
   */
  getAllCategories(displayFilter?: string[]): Observable<Category[]> {
    const CATEGORIES_KEY = makeStateKey<Category[]>('all_categories');

    // Check TransferState for SSR
    if (this.transferState.hasKey(CATEGORIES_KEY)) {
      const cachedCategories = this.transferState.get(CATEGORIES_KEY, null);
      if (cachedCategories) {
        this.categoriesSubject.next(cachedCategories);
        return of(cachedCategories);
      }
    }

    // Check LocalStorage for client-side
    const cachedCategories = this.localStorageService.getItem<Category[]>(
      this.LOCAL_STORAGE_KEY,
      this.CACHE_TTL
    );

    if (cachedCategories && !this.categoriesSubject.value) {
      const filteredCategories = this.excludeUnwantedCategories(cachedCategories);
      this.categoriesSubject.next(filteredCategories);
    }

    if (this.categoriesSubject.value) {
      return of(this.categoriesSubject.value);
    }

    if (!this.categories$) {
      this.categories$ = this.fetchAllCategories().pipe(
        map((categories) => this.excludeUnwantedCategories(categories)),
        tap((filteredCategories) => {
          this.localStorageService.setItem(this.LOCAL_STORAGE_KEY, filteredCategories);
          this.categoriesSubject.next(filteredCategories);
          if (isPlatformServer(this.platformId)) {
            this.transferState.set(CATEGORIES_KEY, filteredCategories);
          }
        }),
        catchError((error) => {
          console.error('Error fetching categories:', error);
          return this.handleErrorsService.handelError(error);
        }),
        shareReplay(1)
      );
    }

    return this.categories$;
  }

  /**
   * Fetches all categories page by page from the API.
   */
  private fetchAllCategories(page: number = 1, accumulatedCategories: Category[] = []): Observable<Category[]> {
    return this.WooAPI.getRequest<Category[]>('products/categories', {
      params: new HttpParams()
        .set('_fields', 'id,name,slug,parent,description,display,image,menu_order,count,yoast_head,yoast_head_json')
        .set('per_page', '100')
        .set('page', page.toString()),
    }).pipe(
      switchMap((categories: Category[]) => {
        const updatedCategories = accumulatedCategories.concat(categories);

        if (categories.length < 100) {
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
   * Retrieves a category by its slug directly from the API.
   */
  getCategoryBySlugDirect(slug: string): Observable<Category | null> {
    const CATEGORY_KEY = makeStateKey<Category>(`category_${slug}`);

    // Check TransferState for SSR
    if (this.transferState.hasKey(CATEGORY_KEY)) {
      const cachedCategory = this.transferState.get(CATEGORY_KEY, null);
      if (cachedCategory) {
        return of(cachedCategory);
      }
    }

    // First, try to get from cached categories to avoid unnecessary API calls
    return this.getAllCategories().pipe(
      switchMap((categories) => {
        const category = categories.find((cat) => cat.slug === slug);
        if (category) {
          return of(category);
        }

        // If not found in cache or excluded, fetch directly from API
        return this.WooAPI.getRequest<Category[]>('products/categories', {
          params: new HttpParams()
            .set('slug', slug)
            .set('_fields', 'id,name,slug,parent,description,display,image,menu_order,count,yoast_head,yoast_head_json,count'),
        }).pipe(
          map((categories) => (categories && categories.length > 0 ? categories[0] : null)),
          tap((category) => {
            if (isPlatformServer(this.platformId) && category) {
              this.transferState.set(CATEGORY_KEY, category);
            }
          }),
          catchError((error) => {
            console.error(`Error fetching category by slug "${slug}":`, error);
            return this.handleErrorsService.handelError(error);
          })
        );
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
        return category || null;
      }),
      catchError((error) => {
        console.error(`Error finding category by slug "${slug}":`, error);
        return this.handleErrorsService.handelError(error);
      })
    );
  }

  /**
   * Filters categories based on the display field.
   */
  private excludeUnwantedCategories(categories: Category[]): Category[] {
    return categories.filter(
      (category:Category) => !this.EXCLUDED_SLUGS.includes(category.slug) && category.count > 0
    );
  }

  /**
   * Retrieves a category by its ID from cached categories.
   */
  getCategoryById(id: number): Observable<Category | null> {
    return this.getAllCategories().pipe(
      map((categories) => {
        const category = categories.find((cat) => cat.id === id);
        return category || null;
      }),
      catchError((error) => {
        console.error(`Error finding category by id "${id}":`, error);
        return this.handleErrorsService.handelError(error);
      })
    );
  }
}