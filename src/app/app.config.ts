import { ApplicationConfig, isDevMode } from '@angular/core';
import { 
  provideRouter, 
  withComponentInputBinding, 
  withInMemoryScrolling, 
  withPreloading, 
  PreloadAllModules,
  withViewTransitions
} from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';
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
      withViewTransitions()
    ),
    provideHttpClient(
      withFetch(),
      withInterceptors([
        performanceInterceptor
      ])
    ),
    provideAnimations(),
    provideClientHydration(
      withHttpTransferCacheOptions({
        includePostRequests: false,
        filter: (req) => {
          // Only cache GET requests that don't include auth headers
          if (req.method !== 'GET') return false;
          if (req.headers.has('Authorization')) return false;
          // Don't cache user-specific data
          if (req.url.includes('/user/') || req.url.includes('/checkout/')) return false;
          return true;
        }
      })
    ),
    provideToastr({
      timeOut: 3000,
      positionClass: 'toast-top-right',
      preventDuplicates: true,
    }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideStore(reducers),
    provideEffects([CartEffect, CheckoutEffect]),
  ],
};