import {
  ApplicationConfig,
  provideZoneChangeDetection,
  isDevMode,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { provideAnimations } from '@angular/platform-browser/animations';

import Aura from '@primeng/themes/aura';

import { routes } from './app.routes';
import {
  provideClientHydration,
  withEventReplay,
  withIncrementalHydration,
} from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import { provideEffects } from '@ngrx/effects';
import { provideStore } from '@ngrx/store';
import { CartEffect } from './Store/effects/cart.effect';
import { reducers } from './Store/store';
import { CheckoutEffect } from './Store/effects/checkout.effect';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideClientHydration(withIncrementalHydration()),
    provideHttpClient(withFetch()),
    provideAnimations(),

    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          cssLayer: {
            name: 'primeng',
            order: 'tailwind-base, tailwind-utilities, primeng',
          },
        },
      },
    }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(), // يشتغل في الـ production بس
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideStore(reducers),
    provideEffects([CartEffect, CheckoutEffect]),
  ],
};
