import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { catchError, Observable, of, filter, take, switchMap } from 'rxjs';
import { map, retry, shareReplay, tap } from 'rxjs/operators';
import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
  HttpResponse,
} from '@angular/common/http';
import { HandleErrorsService } from './handel-errors.service';
import { AuthService } from './auth.service';
import { ConfigService } from './config.service';

interface CachedResponse {
  data: any;
  expiry: number;
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private baseUrl: string = '';
  private cache = new Map<string, CachedResponse>();
  private pendingRequests = new Map<string, Observable<any>>();
  private static serverCache = new Map<string, any>();
  
  // Default cache durations
  private DEFAULT_CACHE_DURATION = 300000; // 5 minutes
  
  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private handelErrorsService: HandleErrorsService,
    private configService: ConfigService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Clean up expired cache entries periodically
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanExpiredCache(), 60000); // Clean every minute
    }
    
    // Get API URL from config
    this.configService.getConfig().subscribe(config => {
      if (config && config.apiUrl) {
        // استخدام نفس المضيف الحالي
        if (typeof window !== 'undefined') {
          const currentOrigin = window.location.origin;
          
          // في بيئة التطوير المحلية، استخدم المنفذ 3000 مباشرة
          if (currentOrigin.includes('localhost')) {
            this.baseUrl = `http://localhost:3000/api/wc/`;
          } else {
            // في بيئة الإنتاج، استخدم نفس المضيف
            this.baseUrl = `${currentOrigin}/api/wc/`;
          }
          console.log(`Using dynamic API URL: ${this.baseUrl}`);
        } else {
          // للتشغيل على الخادم (SSR)
          this.baseUrl = `http://localhost:3000/api/wc/`;
        }
      }
    });
  }

  // Helper method to clean expired cache entries
  private cleanExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (value.expiry < now) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * Preload critical resources to improve initial load time
   * Call this method after app initialization
   */
  preloadCriticalResources(): void {
    // Skip on server
    if (isPlatformServer(this.platformId)) {
      return;
    }
    
    // تأكد من أن baseUrl جاهز قبل تحميل الموارد
    if (!this.baseUrl) {
      console.log('Waiting for baseUrl before preloading resources');
      // انتظر حتى يتم تعيين baseUrl قبل تحميل الموارد
      this.configService.getConfig().subscribe(config => {
        if (config && config.apiUrl) {
          // استخدام نفس المضيف الحالي
          if (typeof window !== 'undefined') {
            const currentOrigin = window.location.origin;
            
            // في بيئة التطوير المحلية، استخدم المنفذ 3000 مباشرة
            if (currentOrigin.includes('localhost')) {
              this.baseUrl = `http://localhost:3000/api/wc/`;
            } else {
              // في بيئة الإنتاج، استخدم نفس المضيف
              this.baseUrl = `${currentOrigin}/api/wc/`;
            }
            console.log(`Using dynamic API URL: ${this.baseUrl}`);
          } else {
            // للتشغيل على الخادم (SSR)
            this.baseUrl = `http://localhost:3000/api/wc/`;
          }
          this.performPreloading();
        }
      });
      return;
    }
    
    this.performPreloading();
  }
  
  private performPreloading(): void {
    // List of critical endpoints to preload with مسارات صحيحة
    const criticalEndpoints = [
      'products?per_page=4',
      'products/categories?per_page=10',
      'coupons?per_page=5'
    ];
    
    // Preload each endpoint
    for (const endpoint of criticalEndpoints) {
      console.log(`Attempting to preload: ${endpoint}`);
      this.getRequest(endpoint)
        .subscribe({
          next: (data) => console.log(`Successfully preloaded: ${endpoint}`),
          error: (err) => console.log(`Error preloading ${endpoint}: ${err.message || 'Unknown error'}`)
        });
    }
  }

  getRequest<T>(
    endpoint: string,
    options: { params?: HttpParams } = {}
  ): Observable<T> {
    // تحقق من جاهزية المصادقة أولاً
    if (!this.authService.isAuthReady()) {
      console.log(`Auth not ready for request to ${endpoint}, waiting...`);
      return this.authService.isAuthReady().pipe(
        filter(ready => ready), // انتظر حتى تصبح المصادقة جاهزة
        take(1), // خذ أول قيمة true
        switchMap(() => this.getRequestImpl<T>(endpoint, options)) // ثم أرسل الطلب
      );
    }
    
    return this.getRequestImpl<T>(endpoint, options);
  }

  // نقل منطق الطلب الحالي إلى طريقة منفصلة
  private getRequestImpl<T>(
    endpoint: string,
    options: { params?: HttpParams } = {}
  ): Observable<T> {
    const cacheKey = `ynaptic ${endpoint}_${options.params?.toString() || ''}`;

    // Check server-side cache first
    if (isPlatformServer(this.platformId) && ApiService.serverCache.has(cacheKey)) {
      return of(ApiService.serverCache.get(cacheKey));
    }

    // Check if request is already pending
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey) as Observable<T>;
    }

    // Check client-side cache
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      if (!cached.data || (Array.isArray(cached.data) && cached.data.length === 0)) {
        this.cache.delete(cacheKey);
      } else {
        return of(cached.data);
      }
    }

    // Create new request
    const request = this.http
      .get<T>(`${this.baseUrl}${endpoint}`, {
        ...options,
      })
      .pipe(
        retry(2),
        map((data) => {
          if (data && !(Array.isArray(data) && data.length === 0)) {
            this.cache.set(cacheKey, { data, expiry: Date.now() + this.DEFAULT_CACHE_DURATION });
            if (isPlatformServer(this.platformId)) {
              ApiService.serverCache.set(cacheKey, data);
            }
          }
          // Remove from pending requests
          this.pendingRequests.delete(cacheKey);
          return data;
        }),
        shareReplay(1),
        catchError((error: HttpErrorResponse) => {
          // Remove from pending requests on error
          this.pendingRequests.delete(cacheKey);
          console.error(`API Error for ${endpoint}:`, error.status, error.message);
          return this.handelErrorsService.handelError(error);
        })
      );
      
    // Store pending request
    this.pendingRequests.set(cacheKey, request);
    return request;
  }

  getRequestProducts<T>(
    endpoint: string,
    options: {
      params?: HttpParams;
      observe?: 'body' | 'response' | 'events';
    } = {}
  ): Observable<T | HttpResponse<T>> {
    if (isPlatformServer(this.platformId)) {
      return of(
        options.observe === 'response'
          ? new HttpResponse({ body: null as any })
          : (null as any)
      );
    }

    const cacheKey = `${endpoint}_${options.params?.toString() || ''}_${
      options.observe || 'body'
    }`;
    
    // Check if this request is already in progress
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey) as Observable<T | HttpResponse<T>>;
    }
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      if (!cached.data || (Array.isArray(cached.data.body) && cached.data.body.length === 0)) {
        this.cache.delete(cacheKey);
      } else {
        return of(cached.data);
      }
    }

    const httpOptions: Object = {
      ...options,
      observe: options.observe || 'body',
    };

    // Create the request, share its response, and store it in pendingRequests
    const request = this.http
      .get<T>(`${this.baseUrl}${endpoint}`, httpOptions as Object)
      .pipe(
        retry(2),
        map((data:any) => {
          if (data && !(options.observe === 'response' && Array.isArray(data.body
          ) && data.body.length === 0)) {
            // Cache the response
            this.cache.set(cacheKey, { data, expiry: Date.now() + this.DEFAULT_CACHE_DURATION });
          }
          // Remove from pending requests once complete
          this.pendingRequests.delete(cacheKey);
          return data;
        }),
        catchError((error: HttpErrorResponse) => {
          // Remove from pending requests on error
          this.pendingRequests.delete(cacheKey);
          return this.handelErrorsService.handelError(error);
        }),
        shareReplay(1)
      );
    
    // Store the pending request
    this.pendingRequests.set(cacheKey, request);
    
    return request;
  }

  postRequest<T>(endpoint: string, body: any): Observable<T> {
    if (isPlatformServer(this.platformId)) {
      return of(null as any);
    }

    const cacheKey = `${endpoint}_${JSON.stringify(body)}`;
    
    // Check if request is already pending
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey) as Observable<T>;
    }
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      if (!cached.data || (Array.isArray(cached.data) && cached.data.length === 0)) {
        this.cache.delete(cacheKey);
      } else {
        return of(cached.data);
      }
    }

    const request = this.http
      .post<T>(`${this.baseUrl}${endpoint}`, body)
      .pipe(
        retry(2),
        map((data) => {
          this.cache.delete(cacheKey); // لأن البيانات قد تغيرت
          this.pendingRequests.delete(cacheKey);
          return data;
        }),
        catchError((error: HttpErrorResponse) => {
          this.pendingRequests.delete(cacheKey);
          console.error(`API Error for ${endpoint}:`, error.status, error.message);
          return this.handelErrorsService.handelError(error);
        })
      );
      
    this.pendingRequests.set(cacheKey, request);
    return request;
  }

  putRequest<T>(endpoint: string, body: any): Observable<T> {
    if (isPlatformServer(this.platformId)) {
      return of(null as any);
    }

    const cacheKey = `${endpoint}_${JSON.stringify(body)}`;
    
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey) as Observable<T>;
    }
    
    const request = this.http
      .put<T>(`${this.baseUrl}${endpoint}`, body)
      .pipe(
        retry(2),
        map((data) => {
          // تنظيف الكاش المرتبط بهذا الإندبوينت
          this.cleanRelatedCache(endpoint);
          this.pendingRequests.delete(cacheKey);
          return data;
        }),
        catchError((error: HttpErrorResponse) => {
          this.pendingRequests.delete(cacheKey);
          console.error(`API Error for ${endpoint}:`, error.status, error.message);
          return this.handelErrorsService.handelError(error);
        })
      );
    
    this.pendingRequests.set(cacheKey, request);
    return request;
  }

  deleteRequest<T>(endpoint: string, body: any): Observable<T> {
    if (isPlatformServer(this.platformId)) {
      return of(null as any);
    }

    const cacheKey = `${endpoint}_delete`;
    
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey) as Observable<T>;
    }
    
    const request = this.http
      .delete<T>(`${this.baseUrl}${endpoint}`, { body })
      .pipe(
        retry(2),
        map((data) => {
          // تنظيف الكاش المرتبط بهذا الإندبوينت
          this.cleanRelatedCache(endpoint);
          this.pendingRequests.delete(cacheKey);
          return data;
        }),
        catchError((error: HttpErrorResponse) => {
          this.pendingRequests.delete(cacheKey);
          console.error(`API Error for ${endpoint}:`, error.status, error.message);
          return this.handelErrorsService.handelError(error);
        })
      );
    
    this.pendingRequests.set(cacheKey, request);
    return request;
  }

  // Helper to clean related cache entries
  private cleanRelatedCache(endpoint: string): void {
    // استخراج الجزء الرئيسي من الإندبوينت
    const mainPart = endpoint.split('?')[0].split('/')[0];
    
    // مسح أي كاش مرتبط بنفس الإندبوينت
    for (const key of this.cache.keys()) {
      if (key.includes(mainPart)) {
        this.cache.delete(key);
      }
    }
  }

  getExternalRequest<T>(
    fullUrl: string,
    options: {
      params?: HttpParams;
      withCredentials?: boolean;
    } = {}
  ): Observable<T> {
    const cacheKey = `${fullUrl}_${options.params?.toString() || ''}`;
    const cached = this.cache.get(cacheKey);
    
    const cacheDuration = 1800000;
    
    if (cached && cached.expiry > Date.now()) {
      if (!cached.data || (Array.isArray(cached.data) && cached.data.length === 0)) {
        this.cache.delete(cacheKey);
      } else {
        return of(cached.data).pipe(shareReplay(1));
      }
    }

    return this.http
      .get<T>(fullUrl, {
        params: options.params,
        withCredentials: options.withCredentials || false,
      })
      .pipe(
        retry(2),
        map((data) => {
          if (data && !(Array.isArray(data) && data.length === 0)) {
            this.cache.set(cacheKey, { data, expiry: Date.now() + cacheDuration });
            
            if (isPlatformServer(this.platformId)) {
              ApiService.serverCache.set(cacheKey, data);
            }
          }
          return data;
        }),
        shareReplay(1),
        catchError((error: HttpErrorResponse) =>
          this.handelErrorsService.handelError(error)
        )
      );
  }

  postExternalRequest<T>(
    fullUrl: string,
    body: any,
    options: {
      headers?: { [key: string]: string };
      withCredentials?: boolean;
    } = {}
  ): Observable<T> {
    if (isPlatformServer(this.platformId)) {
      return of(null as any);
    }

    const cacheKey = `${fullUrl}_${JSON.stringify(body)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      if (!cached.data || (Array.isArray(cached.data) && cached.data.length === 0)) {
        this.cache.delete(cacheKey);
      } else {
        return of(cached.data);
      }
    }

    return this.http
      .post<T>(fullUrl, body, {
        headers: options.headers,
        withCredentials: options.withCredentials || false,
      })
      .pipe(
        retry(2),
        map((data) => {
          if (data && !(Array.isArray(data) && data.length === 0)) {
            this.cache.set(cacheKey, { data, expiry: Date.now() + 300000 });
          }
          return data;
        }),
        shareReplay(1),
        catchError((error: HttpErrorResponse) =>
          this.handelErrorsService.handelError(error)
        )
      );
  }

  putExternalRequest<T>(
    fullUrl: string,
    body: any,
    options: {
      params?: HttpParams;
      headers?: { [key: string]: string };
      withCredentials?: boolean;
    } = {}
  ): Observable<T> {
    if (isPlatformServer(this.platformId)) {
      return of(null as any);
    }

    const cacheKey = `${fullUrl}_${JSON.stringify(body)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      if (!cached.data || (Array.isArray(cached.data) && cached.data.length === 0)) {
        this.cache.delete(cacheKey);
      } else {
        return of(cached.data);
      }
    }

    return this.http
      .put<T>(fullUrl, body, {
        headers: { ...this.authService.getAuthHeaders(), ...options.headers },
        params: options.params,
        withCredentials: options.withCredentials || false,
      })
      .pipe(
        retry(2),
        map((data) => {
          if (data && !(Array.isArray(data) && data.length === 0)) {
            this.cache.set(cacheKey, { data, expiry: Date.now() + 300000 });
          }
          return data;
        }),
        shareReplay(1),
        catchError((error: HttpErrorResponse) =>
          this.handelErrorsService.handelError(error)
        )
      );
  }

  deleteExternalRequest<T>(
    fullUrl: string,
    options: {
      params?: HttpParams;
      headers?: { [key: string]: string };
      withCredentials?: boolean;
      body?: any;
    } = {}
  ): Observable<T> {
    if (isPlatformServer(this.platformId)) {
      return of(null as any);
    }

    const cacheKey = `${fullUrl}_${options.params?.toString() || ''}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      if (!cached.data || (Array.isArray(cached.data) && cached.data.length === 0)) {
        this.cache.delete(cacheKey);
      } else {
        return of(cached.data);
      }
    }

    return this.http
      .delete<T>(fullUrl, {
        headers: options.headers,
        params: options.params,
        withCredentials: options.withCredentials || false,
        body: options.body,
      })
      .pipe(
        retry(2),
        map((data) => {
          if (data && !(Array.isArray(data) && data.length === 0)) {
            this.cache.set(cacheKey, { data, expiry: Date.now() + 300000 });
          }
          return data;
        }),
        shareReplay(1),
        catchError((error: HttpErrorResponse) =>
          this.handelErrorsService.handelError(error)
        )
      );
  }
}
