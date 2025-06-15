import { HttpClient } from '@angular/common/http';
import { Injectable, inject, PLATFORM_ID, Inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, firstValueFrom, of, tap, throwError } from 'rxjs';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { environment } from '../../../environments/environment';

// الفصل بين البيانات العامة والحساسة
export interface PublicAppConfig {
  apiUrl: string;
  stripePublishableKey: string;
  tabbyPublicKey: string;
  tabbyMerchantCode: string;
  gtmId: string;
  fbAppId: string;
  googleClientId: string;
  klaviyoPublicKey: string;
}

// الواجهة الكاملة بما فيها البيانات الحساسة (للاستخدام الداخلي فقط)
export interface AppConfig extends PublicAppConfig {
  consumerKey: string;
  consumerSecret: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private http = inject(HttpClient);
  // Use dynamic origin based on current location
  private get configUrl(): string {
    if (isPlatformBrowser(this.platformId)) {
      const origin = window.location.origin;
      return `${origin}/api/config`;
    }
    return 'http://localhost:3000/api/config'; // For server-side
  }
  
  private configSubject = new BehaviorSubject<AppConfig | null>(null);
  private loadingSubject = new BehaviorSubject<boolean>(true);
  
  // تخزين مؤقت في الذاكرة فقط - لا يستخدم localStorage
  private configCache: PublicAppConfig | null = null;
  private configExpiry: number = 0;
  private readonly CACHE_DURATION = 3600000; // 1 hour in milliseconds
  
  config$ = this.configSubject.asObservable();
  loading$ = this.loadingSubject.asObservable();
  
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    // لم نعد نحتاج لتحميل البيانات من localStorage
  }
  
  // Public getter for current config value
  get currentConfig(): AppConfig | null {
    return this.configSubject.value;
  }
  
  // Made public for APP_INITIALIZER
  public loadConfig(): Promise<AppConfig> {
    // If running on server, use environment variables
    if (isPlatformServer(this.platformId)) {
      return this.loadServerConfig();
    }
    
    this.loadingSubject.next(true);
    console.log(`Fetching config from: ${this.configUrl}`);
    
    const request = this.http.get<AppConfig>(this.configUrl).pipe(
      tap(config => {
        this.configSubject.next(config);
        this.loadingSubject.next(false);
        this.configCache = this.extractPublicConfig(config);
        this.configExpiry = Date.now() + this.CACHE_DURATION;
        console.log('Config loaded from server');
      }),
      catchError(error => {
        console.error('Failed to load configuration from API', error);
        console.error('Error status:', error.status);
        console.error('Error message:', error.message);
        
        this.loadingSubject.next(false);
        
        // إذا كان لدينا تكوين عام سابق، استخدمه كبديل للبيانات العامة فقط
        if (this.configCache && this.configExpiry > Date.now()) {
          console.warn('Using cached public config as fallback');
          
          // دمج البيانات العامة المخزنة مع قيم فارغة للبيانات الحساسة
          const safeConfig: AppConfig = {
            ...this.configCache,
            consumerKey: '',
            consumerSecret: '',
            stripeSecretKey: '',
            stripeWebhookSecret: ''
          };
          
          this.configSubject.next(safeConfig);
          return of(safeConfig);
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
        this.configCache = this.extractPublicConfig(fallbackConfig);
        this.configExpiry = Date.now() + this.CACHE_DURATION;
        return of(fallbackConfig);
      })
    );
    
    // Return as Promise for APP_INITIALIZER
    return firstValueFrom(request);
  }
  
  // استخراج البيانات العامة فقط من التكوين
  private extractPublicConfig(config: AppConfig): PublicAppConfig {
    return {
      apiUrl: config.apiUrl,
      stripePublishableKey: config.stripePublishableKey,
      tabbyPublicKey: config.tabbyPublicKey,
      tabbyMerchantCode: config.tabbyMerchantCode,
      gtmId: config.gtmId,
      fbAppId: config.fbAppId,
      googleClientId: config.googleClientId,
      klaviyoPublicKey: config.klaviyoPublicKey
    };
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