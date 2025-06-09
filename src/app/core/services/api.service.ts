import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { catchError, Observable, of } from 'rxjs';
import { map, retry, shareReplay, tap } from 'rxjs/operators';
import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
  HttpResponse,
} from '@angular/common/http';
import { HandleErrorsService } from './handel-errors.service';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

interface CachedResponse {
  data: any;
  expiry: number;
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private baseUrl = environment.wordpressApiUrl;
  private cache = new Map<string, CachedResponse>();
  private pendingRequests = new Map<string, Observable<any>>();
  private static serverCache = new Map<string, any>();
  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private handelErrorsService: HandleErrorsService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  getRequest<T>(
    endpoint: string,
    options: { params?: HttpParams } = {}
  ): Observable<T> {
    const cacheKey = `ynaptic ${endpoint}_${options.params?.toString() || ''}`;

    // Check server-side cache first
    if (isPlatformServer(this.platformId) && ApiService.serverCache.has(cacheKey)) {
      return of(ApiService.serverCache.get(cacheKey));
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

    return this.http
      .get<T>(`${this.baseUrl}${endpoint}`, {
        headers: this.authService.getAuthHeaders(),
        ...options,
      })
      .pipe(
        retry(2),
        map((data) => {
          if (data && !(Array.isArray(data) && data.length === 0)) {
            this.cache.set(cacheKey, { data, expiry: Date.now() + 300000 });
            if (isPlatformServer(this.platformId)) {
              ApiService.serverCache.set(cacheKey, data); // Cache on server
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
      headers: this.authService.getAuthHeaders(),
      ...options,
      observe: options.observe || 'body',
    };

    // Create the request, share its response, and store it in pendingRequests
    const request = this.http
      .get<T>(`${this.baseUrl}${endpoint}`, httpOptions as Object)
      .pipe(
        retry(2),
        map((data:any) => {
          if (data && !(options.observe === 'response' && Array.isArray(data.body) && data.body.length === 0)) {
            // Cache the response for 5 minutes (300000 ms)
            this.cache.set(cacheKey, { data, expiry: Date.now() + 300000 });
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
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      if (!cached.data || (Array.isArray(cached.data) && cached.data.length === 0)) {
        this.cache.delete(cacheKey);
      } else {
        return of(cached.data);
      }
    }

    return this.http
      .post<T>(`${this.baseUrl}${endpoint}`, body, {
        headers: this.authService.getAuthHeaders(),
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

  putRequest<T>(endpoint: string, body: any): Observable<T> {
    if (isPlatformServer(this.platformId)) {
      return of(null as any);
    }

    const cacheKey = `${endpoint}_${JSON.stringify(body)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      if (!cached.data || (Array.isArray(cached.data) && cached.data.length === 0)) {
        this.cache.delete(cacheKey);
      } else {
        return of(cached.data);
      }
    }

    return this.http
      .put<T>(`${this.baseUrl}${endpoint}`, body, {
        headers: this.authService.getAuthHeaders(),
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

  deleteRequest<T>(endpoint: string, body: any): Observable<T> {
    if (isPlatformServer(this.platformId)) {
      return of(null as any);
    }

    const cacheKey = `${endpoint}_${JSON.stringify(body)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      if (!cached.data || (Array.isArray(cached.data) && cached.data.length === 0)) {
        this.cache.delete(cacheKey);
      } else {
        return of(cached.data);
      }
    }

    return this.http
      .delete<T>(`${this.baseUrl}${endpoint}`, {
        headers: this.authService.getAuthHeaders(),
        body: body,
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
