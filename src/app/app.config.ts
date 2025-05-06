import { ApplicationConfig, isDevMode } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling, withPreloading, PreloadAllModules } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';
import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { provideServiceWorker } from '@angular/service-worker';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { CartEffect } from './Store/effects/cart.effect';
import { CheckoutEffect } from './Store/effects/checkout.effect';
import { reducers } from './Store/store';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      // Add important features for SEO and UX
      withPreloading(PreloadAllModules), // Preload all modules for better performance
      withComponentInputBinding(), // Enable route param binding
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled',
      }), // Better scrolling experience
    ),
    provideHttpClient(
      // Add interceptors if needed
      // withInterceptors([apiKeyInterceptor])
    ),
    provideAnimations(),
    provideClientHydration(), // For SSR hydration
    provideToastr({
      timeOut: 3000,
      positionClass: 'toast-top-right',
      preventDuplicates: true,
    }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    }),
    // Add NgRx Store providers
    provideStore(reducers),
    provideEffects([CartEffect, CheckoutEffect])
  ]
};
