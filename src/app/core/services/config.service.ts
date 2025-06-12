import { HttpClient } from '@angular/common/http';
import { Injectable, inject, PLATFORM_ID, Inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, firstValueFrom, of, tap, throwError } from 'rxjs';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { environment } from '../../../environments/environment';

export interface AppConfig {
  consumerKey: string;
  consumerSecret: string;
  apiUrl: string;
  stripePublishableKey: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  tabbyPublicKey: string;
  tabbyMerchantCode: string;
  gtmId: string;
  fbAppId: string;
  googleClientId: string;
  klaviyoPublicKey: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private http = inject(HttpClient);
  // Use dynamic origin based on current location instead of hardcoded localhost
  private get configUrl(): string {
    if (isPlatformBrowser(this.platformId)) {
      // const origin = window.location.origin;
      return `http://localhost:3000/api/config`;
    }
    return 'http://localhost:3000/api/config'; // For server-side
  }
  
  private configSubject = new BehaviorSubject<AppConfig | null>(null);
  private loadingSubject = new BehaviorSubject<boolean>(true);
  
  // Cache control
  private configCache: AppConfig | null = null;
  private configExpiry: number = 0;
  private readonly CACHE_DURATION = 3600000; // 1 hour in milliseconds
  
  config$ = this.configSubject.asObservable();
  loading$ = this.loadingSubject.asObservable();
  
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    // Config now loaded via APP_INITIALIZER
    // Try to load from localStorage on init if in browser
    if (isPlatformBrowser(this.platformId)) {
      this.loadFromLocalStorage();
    }
  }
  
  // Load config from localStorage if available
  private loadFromLocalStorage(): void {
    try {
      const cachedData = localStorage.getItem('app_config');
      if (cachedData) {
        const { config, expiry } = JSON.parse(cachedData);
        if (expiry > Date.now()) {
          this.configCache = config;
          this.configExpiry = expiry;
          this.configSubject.next(config);
          this.loadingSubject.next(false);
          console.log('Config loaded from localStorage');
        }
      }
    } catch (e) {
      console.error('Error loading config from localStorage', e);
    }
  }
  
  // Save config to localStorage
  private saveToLocalStorage(config: AppConfig): void {
    if (!isPlatformBrowser(this.platformId)) return;
    
    try {
      const expiry = Date.now() + this.CACHE_DURATION;
      localStorage.setItem('app_config', JSON.stringify({ config, expiry }));
      this.configCache = config;
      this.configExpiry = expiry;
    } catch (e) {
      console.error('Error saving config to localStorage', e);
    }
  }
  
  // Public getter for current config value
  get currentConfig(): AppConfig | null {
    return this.configSubject.value || this.configCache;
  }
  
  // Made public for APP_INITIALIZER
  public loadConfig(): Promise<AppConfig> {
    // If running on server, use environment variables
    if (isPlatformServer(this.platformId)) {
      return this.loadServerConfig();
    }
    
    // If we have valid cached config, use it
    if (this.configCache && this.configExpiry > Date.now()) {
      this.configSubject.next(this.configCache);
      this.loadingSubject.next(false);
      return Promise.resolve(this.configCache);
    }
    
    this.loadingSubject.next(true);
    console.log(`Fetching config from: ${this.configUrl}`);
    
    const request = this.http.get<AppConfig>(this.configUrl).pipe(
      tap(config => {
        this.configSubject.next(config);
        this.loadingSubject.next(false);
        this.saveToLocalStorage(config);
        console.log('Config loaded from server');
      }),
      catchError(error => {
        console.error('Failed to load configuration from API', error);
        console.error('Error status:', error.status);
        console.error('Error message:', error.message);
        
        this.loadingSubject.next(false);
        
        // إذا كان لدينا تكوين سابق، استخدمه كبديل
        if (this.configCache) {
          console.warn('Using cached config as fallback');
          this.configSubject.next(this.configCache);
          return of(this.configCache);
        }
        
        // إذا لم يكن لدينا تكوين سابق، استخدم بيانات environment كبديل
        console.warn('Using environment fallback config');
        const fallbackConfig: AppConfig = {
          consumerKey: '',
          consumerSecret: '',
          apiUrl: environment.apiUrl,
          stripePublishableKey: '',
          stripeSecretKey: '',
          stripeWebhookSecret: '',
          tabbyPublicKey: '',
          tabbyMerchantCode: '',
          gtmId: '',
          fbAppId: '',
          googleClientId: '',
          klaviyoPublicKey: ''
        };
        
        this.configSubject.next(fallbackConfig);
        this.saveToLocalStorage(fallbackConfig);
        return of(fallbackConfig);
      })
    );
    
    // Return as Promise for APP_INITIALIZER
    return firstValueFrom(request);
  }
  
  // Load config from server environment variables
  private loadServerConfig(): Promise<AppConfig> {
    // On server, use process.env directly
    // The actual values are injected via the server.ts endpoint
    const serverConfig: AppConfig = {
      consumerKey: process.env['WOOCOMMERCE_CONSUMER_KEY'] || '',
      consumerSecret: process.env['WOOCOMMERCE_CONSUMER_SECRET'] || '',
      apiUrl: process.env['WOOCOMMERCE_URL'] || environment.apiUrl,
      stripePublishableKey: process.env['STRIPE_PUBLISHABLE_KEY'] || '',
      stripeSecretKey: process.env['STRIPE_SECRET_KEY'] || '',
      stripeWebhookSecret: process.env['STRIPE_WEBHOOK_SECRET'] || '',
      tabbyPublicKey: process.env['TABBY_PUBLIC_KEY'] || '',
      tabbyMerchantCode: process.env['TABBY_MERCHANT_CODE'] || '',
      gtmId: process.env['GTM_ID'] || '',
      fbAppId: process.env['FB_APP_ID'] || '',
      googleClientId: process.env['GOOGLE_CLIENT_ID'] || '',
      klaviyoPublicKey: process.env['KLAVIYO_PUBLIC_KEY'] || ''
    };
    
    this.configSubject.next(serverConfig);
    this.loadingSubject.next(false);
    console.log('Config loaded from server environment');
    
    return Promise.resolve(serverConfig);
  }
  
  getConfig(): Observable<AppConfig | null> {
    return this.config$;
  }
  
  get isLoaded(): boolean {
    return !!this.configSubject.value || !!this.configCache;
  }
} 