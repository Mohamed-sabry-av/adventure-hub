import { HttpInterceptorFn } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject, isDevMode } from '@angular/core';

/**
 * Performance interceptor to track API response times
 * This helps with monitoring and optimizing API requests
 */
export const performanceInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 15);

  // Add request ID for tracing only for internal requests, not for WooCommerce API
  // to avoid CORS issues with external APIs
  const isWooCommerceRequest = req.url.includes('wp-json/wc') || req.url.includes('adventures-hub.com');
  
  const requestToUse = isWooCommerceRequest 
    ? req 
    : req.clone({
        setHeaders: {
          'X-Request-ID': requestId
        }
      });

  return next(requestToUse).pipe(
    tap({
      next: (event) => {
        const timeElapsed = Date.now() - startTime;
        
        // Only log in browser environment to avoid cluttering server logs
        if (isPlatformBrowser(platformId)) {
          // Only log slow requests (over 300ms) in production
          const shouldLog = timeElapsed > 300 || isDevMode();
          if (shouldLog) {
           
          }

          // Track very slow requests for analytics
          if (timeElapsed > 1000 && typeof window !== 'undefined' && window.dataLayer) {
            window.dataLayer.push({
              event: 'slow_api_request',
              request_url: req.url.split('?')[0],
              request_method: req.method,
              response_time: timeElapsed
            });
          }
        }
      },
      error: (error) => {
        const timeElapsed = Date.now() - startTime;
        if (isPlatformBrowser(platformId)) {
        
        }
      }
    })
  );
}; 