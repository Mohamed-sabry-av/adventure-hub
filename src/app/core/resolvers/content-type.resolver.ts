import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn, Router } from '@angular/router';
import { Observable, catchError, map, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { PLATFORM_ID, Inject, Optional, InjectionToken } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { environment } from '../../../environments/environment';

// Create a proper injection token for content type
export const CONTENT_TYPE = new InjectionToken<string>('CONTENT_TYPE');

export const contentTypeResolver: ResolveFn<string> = (
  route: ActivatedRouteSnapshot
): Observable<string> => {
  const router = inject(Router);
  const http = inject(HttpClient);
  const platformId = inject(PLATFORM_ID);
  const slug = route.paramMap.get('slug');
  
  // Try to get server-provided content type (SSR mode)
  const contentType = inject(CONTENT_TYPE, { optional: true });
  
  if (!slug) {
    router.navigate(['/page-not-found']);
    return of('not_found');
  }
  
  // If we're on the server and have the content type, use it
  if (isPlatformServer(platformId) && contentType) {
    return of(contentType);
  }

  // Otherwise make a request to determine the content type
  return http.get<{ type: string }>(`${environment.apiUrl}/api/v1/content-type/${slug}`)
    .pipe(
      map(response => {
        return response.type;
      }),
      catchError((error) => {
        console.error('Error resolving content type:', error);
        router.navigate(['/page-not-found']);
        return of('not_found');
      })
    );
}; 