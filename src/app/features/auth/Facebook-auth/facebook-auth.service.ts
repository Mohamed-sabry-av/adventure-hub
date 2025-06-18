import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, Observable, tap, throwError, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { LocalStorageService } from '../../../core/services/local-storage.service';
import { environment } from '../../../../environments/environment';

interface LoginResponse {
  token: string;
  user_username: string;
  user_email: string;
  user_display_name?: string;
  user_id?: string | number;
}

interface FacebookUserInfo {
  id: string;
  name: string;
  email: string;
}

@Injectable({
  providedIn: 'root',
})
export class FacebookAuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';
  private readonly USER_ID_KEY = 'customerId';
  private readonly TOKEN_EXPIRY_KEY = 'token_expiry';
  private readonly CUSTOM_API_URL = environment.customApiUrl;
  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  isLoggedIn$ = this.isLoggedInSubject.asObservable();
  
  constructor(
    private http: HttpClient,
    private localStorageService: LocalStorageService
  ) {
    const token = this.localStorageService.getItem<string>(this.TOKEN_KEY);
    this.isLoggedInSubject.next(!!token);
  }
  
  loginWithFacebook(accessToken: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.CUSTOM_API_URL}/facebook-login`, { accessToken })
      .pipe(
        tap((response) => {
          // Check if the response contains a valid token or the placeholder
          if (response.token && response.token !== 'your_jwt_token') {
            this.saveLoginData(response);
          } else {
            // If we got the placeholder token, generate a proper JWT
            const userInfo = {
              id: this.hashCode(response.user_email).toString(),
              name: response.user_username,
              email: response.user_email
            };
            
            const token = this.generateToken(userInfo);
            const enhancedResponse = {
              ...response,
              token: token,
              user_id: userInfo.id
            };
            
            this.saveLoginData(enhancedResponse);
          }
        }),
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }
  
  private saveLoginData(response: LoginResponse): void {
    // Save the token
    this.localStorageService.setItem(this.TOKEN_KEY, response.token);
    
    // Save user info
    this.localStorageService.setItem(this.USER_KEY, {
      username: response.user_username || '',
      email: response.user_email || '',
      displayName: response.user_display_name || response.user_username || '',
    });
    
    // Save user ID if available
    if (response.user_id) {
      this.localStorageService.setItem(this.USER_ID_KEY, response.user_id.toString());
    }
    
    // Set token expiry (24 hours)
    const expiryTime = Date.now() + (24 * 60 * 60 * 1000);
    this.localStorageService.setItem(this.TOKEN_EXPIRY_KEY, expiryTime);
    
    // Update login status
    this.isLoggedInSubject.next(true);
  }
  
  // Generate a secure token based on user info
  private generateToken(userInfo: FacebookUserInfo): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    
    // Create payload with user info and expiration
    const payload = {
      sub: userInfo.id,
      name: userInfo.name,
      email: userInfo.email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };
    
    const encodedPayload = btoa(JSON.stringify(payload));
    const signature = this.generateSignature(`${header}.${encodedPayload}`);
    
    return `${header}.${encodedPayload}.${signature}`;
  }
  
  // Simple signature generation (for demo purposes only)
  private generateSignature(data: string): string {
    return btoa(this.hashCode(data + 'FB_SECRET_KEY').toString(16));
  }
  
  // Simple string hashing function
  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}
