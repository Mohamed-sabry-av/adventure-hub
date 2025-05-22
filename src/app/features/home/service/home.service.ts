import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { Observable, map, catchError, of, shareReplay, BehaviorSubject } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { CacheService } from '../../../core/services/cashing.service';
import { environment } from '../../../../environments/environment';
import { isPlatformBrowser } from '@angular/common';

interface BannerImage {
  large: string;
  small: string;
}

@Injectable({ providedIn: 'root' })
export class HomeService {
  // Cache TTL settings (in milliseconds)
  private readonly PRODUCTS_CACHE_TTL = 3600000; // 1 hour
  private readonly CATEGORIES_CACHE_TTL = 7200000; // 2 hours
  private readonly BANNERS_CACHE_TTL = 3600000; // 1 hour
  private readonly BRANDS_CACHE_TTL = 7200000; // 2 hours
  
  // Local storage keys
  private readonly LS_NEW_ARRIVALS_KEY = 'home_new_arrivals';
  private readonly LS_FEATURED_PRODUCTS_KEY = 'home_featured_products';
  private readonly LS_SALE_PRODUCTS_KEY = 'home_sale_products';
  
  // Subject for products
  private newArrivalsSubject = new BehaviorSubject<any[]>([]);
  private featuredProductsSubject = new BehaviorSubject<any[]>([]);
  private saleProductsSubject = new BehaviorSubject<any[]>([]);
  
  // Flag to track if data is already being loaded
  private loadingNewArrivals = false;
  private loadingFeaturedProducts = false;
  private loadingSaleProducts = false;

  private platformId = inject(PLATFORM_ID);
  
  constructor(
    private wooApi: ApiService,
    private cachingService: CacheService,
    private http: HttpClient
  ) {
    this.loadCachedDataFromLocalStorage();
  }
  
  /**
   * Load cached data from localStorage on service instantiation
   */
  private loadCachedDataFromLocalStorage(): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        // Load new arrivals
        const cachedNewArrivals = localStorage.getItem(this.LS_NEW_ARRIVALS_KEY);
        if (cachedNewArrivals) {
          const data = JSON.parse(cachedNewArrivals);
          if (data && data.timestamp && (Date.now() - data.timestamp < this.PRODUCTS_CACHE_TTL)) {
            this.newArrivalsSubject.next(data.products);
          }
        }
        
        // Load featured products
        const cachedFeaturedProducts = localStorage.getItem(this.LS_FEATURED_PRODUCTS_KEY);
        if (cachedFeaturedProducts) {
          const data = JSON.parse(cachedFeaturedProducts);
          if (data && data.timestamp && (Date.now() - data.timestamp < this.PRODUCTS_CACHE_TTL)) {
            this.featuredProductsSubject.next(data.products);
          }
        }
        
        // Load sale products
        const cachedSaleProducts = localStorage.getItem(this.LS_SALE_PRODUCTS_KEY);
        if (cachedSaleProducts) {
          const data = JSON.parse(cachedSaleProducts);
          if (data && data.timestamp && (Date.now() - data.timestamp < this.PRODUCTS_CACHE_TTL)) {
            this.saleProductsSubject.next(data.products);
          }
        }
      } catch (error) {
        console.error('Error loading cached data from localStorage:', error);
      }
    }
  }
  
  /**
   * Save data to localStorage
   */
  private saveToLocalStorage(key: string, products: any[]): void {
    if (isPlatformBrowser(this.platformId) && products && products.length > 0) {
      try {
        localStorage.setItem(key, JSON.stringify({
          products,
          timestamp: Date.now()
        }));
      } catch (error) {
        console.error('Error saving data to localStorage:', error);
      }
    }
  }

  getNewArrivalsProducts(page: number = 1, perPage: number = 30): Observable<any> {
    // Return cached data if available
    if (this.newArrivalsSubject.value.length > 0) {
      return this.newArrivalsSubject.asObservable();
    }
    
    // Prevent multiple API calls
    if (this.loadingNewArrivals) {
      return this.newArrivalsSubject.asObservable();
    }
    
    this.loadingNewArrivals = true;
    
    const cacheKey = `new_arrivals_p${page}_size${perPage}`;
    const cachedData = this.cachingService.get(cacheKey);
    if (cachedData) {
      cachedData.subscribe(products => {
        if (products && products.length > 0) {
          this.newArrivalsSubject.next(products);
          this.loadingNewArrivals = false;
        }
      });
      return this.newArrivalsSubject.asObservable();
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const afterDate = thirtyDaysAgo.toISOString();

    return this.wooApi
      .getRequestProducts<any>('products', {
        params: new HttpParams()
          .set('after', afterDate)
          .set(
            '_fields',
            'id,name,price,images,categories,description,slug,sale_price,regular_price,on_sale,variations,currency,attributes,quantity_limits,tags,meta_data,stock_status,stock_quantity,date_created,status,type'
          )
          .set('page', page.toString())
          .set('per_page', perPage.toString())
          .set('stock_status', 'instock')
          .set('orderby', 'date')
          .set('order', 'desc'),
        observe: 'response',
      })
      .pipe(
        map((response: HttpResponse<any>) => {
          // Ensure all products have limited images (max 3)
          const products = response.body.map((product: any) => ({
            ...product,
            images: product.images?.slice(0, 3) || [],
          }));
          
          // Store in cache
          this.cachingService.set(cacheKey, products, this.PRODUCTS_CACHE_TTL);
          
          // Store in localStorage for persistent caching
          this.saveToLocalStorage(this.LS_NEW_ARRIVALS_KEY, products);
          
          // Update subject
          this.newArrivalsSubject.next(products);
          this.loadingNewArrivals = false;
          
          return products;
        }),
        catchError((error) => {
          console.error('Error fetching new arrivals products:', error);
          this.loadingNewArrivals = false;
          return of(this.newArrivalsSubject.value.length > 0 ? this.newArrivalsSubject.value : []);
        }),
        shareReplay(1)
      );
  }

  getFeaturedProducts(page: number = 1, perPage: number = 30): Observable<any> {
    // Return cached data if available
    if (this.featuredProductsSubject.value.length > 0) {
      return this.featuredProductsSubject.asObservable();
    }
    
    // Prevent multiple API calls
    if (this.loadingFeaturedProducts) {
      return this.featuredProductsSubject.asObservable();
    }
    
    this.loadingFeaturedProducts = true;
    
    const cacheKey = `featured_products_p${page}_size${perPage}`;
    const cachedData = this.cachingService.get(cacheKey);
    if (cachedData) {
      cachedData.subscribe(products => {
        if (products && products.length > 0) {
          this.featuredProductsSubject.next(products);
          this.loadingFeaturedProducts = false;
        }
      });
      return this.featuredProductsSubject.asObservable();
    }

    return this.wooApi
      .getRequestProducts<any>('products', {
        params: new HttpParams()
          .set('featured', 'true')
          .set(
            '_fields',
            'id,name,price,images,categories,description,slug,sale_price,regular_price,on_sale,default_attributes,attributes,quantity_limits,tags,meta_data,stock_status,stock_quantity,date_created,status,type'
          )
          .set('page', page.toString())
          .set('per_page', perPage.toString())
          .set('stock_status', 'instock')
          .set('orderby', 'date')
          .set('order', 'desc'),
        observe: 'response',
      })
      .pipe(
        map((response: HttpResponse<any>) => {
          const products = response.body.map((product: any) => ({
            ...product,
            images: product.images?.slice(0, 3) || [],
          }));
          
          // Store in cache
          this.cachingService.set(cacheKey, products, this.PRODUCTS_CACHE_TTL);
          
          // Store in localStorage for persistent caching
          this.saveToLocalStorage(this.LS_FEATURED_PRODUCTS_KEY, products);
          
          // Update subject
          this.featuredProductsSubject.next(products);
          this.loadingFeaturedProducts = false;
          
          return products;
        }),
        catchError((error) => {
          console.error('Error fetching featured products:', error);
          this.loadingFeaturedProducts = false;
          return of(this.featuredProductsSubject.value.length > 0 ? this.featuredProductsSubject.value : []);
        }),
        shareReplay(1)
      );
  }

  getSaleProducts(page: number = 1, perPage: number = 30): Observable<any> {
    // Return cached data if available
    if (this.saleProductsSubject.value.length > 0) {
      return this.saleProductsSubject.asObservable();
    }
    
    // Prevent multiple API calls
    if (this.loadingSaleProducts) {
      return this.saleProductsSubject.asObservable();
    }
    
    this.loadingSaleProducts = true;
    
    const cacheKey = `sale_products_p${page}_size${perPage}_order_date_desc`;
    const cachedData = this.cachingService.get(cacheKey);
    if (cachedData) {
      cachedData.subscribe(products => {
        if (products && products.length > 0) {
          this.saleProductsSubject.next(products);
          this.loadingSaleProducts = false;
        }
      });
      return this.saleProductsSubject.asObservable();
    }

    return this.wooApi
      .getRequestProducts<any>('products', {
        params: new HttpParams()
          .set('on_sale', 'true')
          .set(
            '_fields',
            'id,name,price,images,categories,description,slug,sale_price,regular_price,on_sale,variations,currency,attributes,quantity_limits,tags,meta_data,stock_status,stock_quantity,date_created,status,type'
          )
          .set('page', page.toString())
          .set('per_page', perPage.toString())
          .set('stock_status', 'instock')
          .set('orderby', 'date')
          .set('order', 'desc'),
        observe: 'response',
      })
      .pipe(
        map((response: HttpResponse<any>) => {
          // Ensure all products have limited images (max 3)
          const products = response.body.map((product: any) => ({
            ...product,
            images: product.images?.slice(0, 3) || [],
          }));
          
          // Store in cache
          this.cachingService.set(cacheKey, products, this.PRODUCTS_CACHE_TTL);
          
          // Store in localStorage for persistent caching
          this.saveToLocalStorage(this.LS_SALE_PRODUCTS_KEY, products);
          
          // Update subject
          this.saleProductsSubject.next(products);
          this.loadingSaleProducts = false;
          
          return products;
        }),
        catchError((error) => {
          console.error('Error fetching sale products:', error);
          this.loadingSaleProducts = false;
          return of(this.saleProductsSubject.value.length > 0 ? this.saleProductsSubject.value : []);
        }),
        shareReplay(1)
      );
  }

  getCategories(parent: number = 0, perPage: number = 10): Observable<any> {
    const cacheKey = `categories_parent${parent}_size${perPage}`;
    const cachedData = this.cachingService.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    return this.wooApi
      .getRequestProducts<any>('products/categories', {
        params: new HttpParams()
          .set('parent', parent.toString())
          .set('per_page', perPage.toString())
          .set('_fields', 'id,name,slug,image,count'),
        observe: 'response',
      })
      .pipe(
        map((response: HttpResponse<any>) => {
          const categories = response.body;
          // Store in cache
          this.cachingService.set(cacheKey, categories, this.CATEGORIES_CACHE_TTL);
          return categories;
        }),
        catchError((error) => {
          console.error('Error fetching categories:', error);
          return of([]);
        }),
        shareReplay(1)
      );
  }

  getBrandsByIds(brandIds: number[], perPage: number = 20): Observable<any> {
    const cacheKey = `brands_${brandIds.join('_')}`;
    const cachedData = this.cachingService.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    return this.wooApi
      .getRequestProducts<any>('products/attributes/3/terms', {
        params: new HttpParams()
          .set('per_page', perPage.toString())
          .set('_fields', 'id,name,slug,count,image'),
        observe: 'response',
      })
      .pipe(
        map((response: HttpResponse<any>) => {
          const filteredBrands = response.body
            .filter((brand: any) => brandIds.includes(brand.id))
            .map((brand: any) => ({
              id: brand.id,
              name: brand.name,
              slug: brand.slug,
              count: brand.count,
              image: brand.image || undefined,
            }));
          this.cachingService.set(cacheKey, filteredBrands, this.BRANDS_CACHE_TTL);
          return filteredBrands;
        }),
        catchError((error) => {
          console.error('Error fetching brands:', error);
          return of([]);
        }),
        shareReplay(1)
      );
  }

  getBrandById(termId: number): Observable<any> {
    const cacheKey = `brand_${termId}`;
    const cachedData = this.cachingService.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    return this.wooApi
      .getRequestProducts<any>(`products/attributes/3/terms/${termId}`, {
        params: new HttpParams().set('_fields', 'id,name,slug,count,image'),
        observe: 'response',
      })
      .pipe(
        map((response: HttpResponse<any>) => {
          const brand = response.body;
          const formattedBrand = {
            id: brand.id,
            name: brand.name,
            slug: brand.slug,
            count: brand.count,
            image: brand.image || undefined,
          };
          this.cachingService.set(cacheKey, formattedBrand, this.BRANDS_CACHE_TTL);
          return formattedBrand;
        }),
        catchError((error) => {
          console.error(`Error fetching brand with ID ${termId}:`, error);
          return of(null);
        }),
        shareReplay(1)
      );
  }

  getAllBrands(perPage: number = 100): Observable<any> {
    const cacheKey = `all_brands_${perPage}`;
    const cachedData = this.cachingService.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    return this.wooApi
      .getRequestProducts<any>('products/attributes/3/terms', {
        params: new HttpParams()
          .set('per_page', perPage.toString())
          .set('_fields', 'id,name,slug,count,image'),
        observe: 'response',
      })
      .pipe(
        map((response: HttpResponse<any>) => {
          const brands = response.body.map((brand: any) => ({
            id: brand.id,
            name: brand.name,
            slug: brand.slug,
            count: brand.count,
            image: brand.image || undefined,
          }));
          this.cachingService.set(cacheKey, brands, this.BRANDS_CACHE_TTL);
          return brands;
        }),
        catchError((error) => {
          console.error('Error fetching all brands:', error);
          return of([]);
        }),
        shareReplay(1)
      );
  }

  getBannerImages(): Observable<BannerImage[]> {
    const cacheKey = 'banner_images';
    const cachedData = this.cachingService.get(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }
    
    // Use the API service for the external request
    const url = 'https://adventures-hub.com/wp-json/custom/v1/banners';
    
    return this.http.get<{banner_images: BannerImage[]}>(url)
      .pipe(
        map(response => {
          // Validate response structure
          if (response && response.banner_images && Array.isArray(response.banner_images)) {
            // Validate each banner image has required properties
            const validBannerImages = response.banner_images.filter((banner: any) => 
              banner && typeof banner === 'object' && 
              typeof banner.large === 'string' && 
              typeof banner.small === 'string'
            );
            
            this.cachingService.set(cacheKey, validBannerImages, this.BANNERS_CACHE_TTL);
            return validBannerImages;
          } else if (response && Array.isArray(response)) {
            // Handle case where response is an array directly
            const validBannerImages = response.filter((banner: any) => 
              banner && typeof banner === 'object' && 
              typeof banner.large === 'string' && 
              typeof banner.small === 'string'
            );
            
            this.cachingService.set(cacheKey, validBannerImages, this.BANNERS_CACHE_TTL);
            return validBannerImages;
          }
          return [];
        }),
        catchError(error => {
          console.error('Error fetching banner images:', error);
          return of([]);
        }),
        shareReplay(1)
      );
  }
  
  /**
   * Clear all cached data (used for debugging or force-reload)
   */
  clearCache(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Clear subjects
      this.newArrivalsSubject.next([]);
      this.featuredProductsSubject.next([]);
      this.saleProductsSubject.next([]);
      
      // Clear localStorage
      localStorage.removeItem(this.LS_NEW_ARRIVALS_KEY);
      localStorage.removeItem(this.LS_FEATURED_PRODUCTS_KEY);
      localStorage.removeItem(this.LS_SALE_PRODUCTS_KEY);
      
      // Reset loading flags
      this.loadingNewArrivals = false;
      this.loadingFeaturedProducts = false;
      this.loadingSaleProducts = false;
    }
  }
}