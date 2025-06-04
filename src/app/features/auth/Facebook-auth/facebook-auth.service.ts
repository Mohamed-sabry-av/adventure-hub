import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, Observable, tap } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { LocalStorageService } from '../../../core/services/local-storage.service';
import { environment } from '../../../../environments/environment';

interface LoginResponse {
  token: string;
  user_username: string;
  user_email: string;
}

@Injectable({
  providedIn: 'root',
})
export class FacebookAuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';
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
          if (response.token) {
            this.localStorageService.setItem(this.TOKEN_KEY, response.token);
            this.localStorageService.setItem(this.USER_KEY, {
              username: response.user_username || '',
              email: response.user_email || '',
            });
            this.isLoggedInSubject.next(true);
          }
        }),
        catchError((error) => {
          console.error('Facebook login failed:', error);
          throw error;
        })
      );
  }
}