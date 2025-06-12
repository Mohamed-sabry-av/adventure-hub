import { ApplicationConfig, isDevMode, APP_INITIALIZER } from '@angular/core';
import { 
  provideRouter, 
  withComponentInputBinding, 
  withInMemoryScrolling, 
  withPreloading, 
  PreloadAllModules,
  withViewTransitions,
  withRouterConfig,
  UrlSerializer
} from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';
import { 
  provideClientHydration, 
  withHttpTransferCacheOptions 
} from '@angular/platform-browser';
import { provideServiceWorker } from '@angular/service-worker';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { CartEffect } from './Store/effects/cart.effect';
import { CheckoutEffect } from './Store/effects/checkout.effect';
import { reducers } from './Store/store';
import { performanceInterceptor } from './core/interceptors/performance.interceptor';
import { LocationStrategy, PathLocationStrategy } from '@angular/common';
import { GeoLocationService } from './shared/services/geo-location.service';
import { ConfigService } from './core/services/config.service';
import { ApiService } from './core/services/api.service';

// Function to initialize config before app starts
export function initializeApp(configService: ConfigService) {
  return () => {
    console.log('Initializing application configuration...');
    return configService.loadConfig()
      .catch(error => {
        console.error('Failed to initialize app with config:', error);
        // Still return a resolved promise to allow app to start
        // The app should handle fallback mechanisms
        return Promise.resolve();
      });
  };
}

// Function to preload critical resources after config is loaded
export function preloadCriticalResources(apiService: ApiService) {
  return () => {
    // Wait a bit to ensure config is fully loaded
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        apiService.preloadCriticalResources();
        resolve();
      }, 1000);
    });
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    // APP_INITIALIZER for loading config before app starts
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [ConfigService],
      multi: true
    },
    // APP_INITIALIZER for preloading critical resources
    {
      provide: APP_INITIALIZER,
      useFactory: preloadCriticalResources,
      deps: [ApiService],
      multi: true
    },
    provideRouter(
      routes,
      withPreloading(PreloadAllModules),
      withComponentInputBinding(),
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled',
      }),
      withViewTransitions(),
      withRouterConfig({
        onSameUrlNavigation: 'reload',
        paramsInheritanceStrategy: 'always',
        urlUpdateStrategy: 'eager'
      })
    ),
    { provide: LocationStrategy, useClass: PathLocationStrategy },
    provideHttpClient(
      withFetch(),
      withInterceptors([
        performanceInterceptor
      ])
    ),
    provideAnimations(),
    provideClientHydration(
      withHttpTransferCacheOptions({
        includePostRequests: true,
        filter: (req) => {
          if (req.method === 'GET') {
            return !req.url.includes('/user/') && !req.url.includes('/checkout/');
          }
          if (req.method === 'POST') {
            return req.url.includes('/api/products') || req.url.includes('/api/categories');
          }
          return false;
        }
      })
    ),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideStore(reducers),
    provideEffects([CartEffect, CheckoutEffect]),
    // Only geo location service
    GeoLocationService,
  ],
}; 