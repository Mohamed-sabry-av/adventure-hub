import { ApplicationConfig, isDevMode } from '@angular/core';
import { 
  provideRouter, 
  withComponentInputBinding, 
  withInMemoryScrolling, 
  withPreloading, 
  PreloadAllModules,
  withViewTransitions,
  withRouterConfig
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
import { LocationStrategy, PathLocationStrategy } from '@angular/common'; // أضف ده
import { CurrencyService } from './shared/services/currency.service';
import { GeoLocationService } from './shared/services/geo-location.service';

export const appConfig: ApplicationConfig = {
  providers: [
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
        onSameUrlNavigation: 'reload' // خلّي ده بس، وشيل useHash
      })
    ),
    { provide: LocationStrategy, useClass: PathLocationStrategy }, // أضف ده عشان تفعّل PathLocationStrategy
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
    // إضافة خدمات العملات والموقع الجغرافي
    CurrencyService,
    GeoLocationService,
  ],
};