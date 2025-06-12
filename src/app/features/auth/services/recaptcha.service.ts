import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RecaptchaService {
  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  /**
   * Verify reCAPTCHA token with our server API
   * @param token The token received from the client-side reCAPTCHA
   * @returns Observable with verification result
   */
  verifyToken(token: string): Observable<any> {
    if (!isPlatformBrowser(this.platformId)) {
      // Skip verification on server side
      return of({ success: true });
    }

    return this.http.post('/api/verify-recaptcha', { token }).pipe(
      catchError(error => {
        
        return of({ success: false, error });
      })
    );
  }
} 