import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, Observable, tap } from 'rxjs';
import { LoginResponse } from '../../../interfaces/user.model';
import { ApiService } from '../../../core/services/api.service';
import { HttpClient } from '@angular/common/http';
import { LocalStorageService } from '../../../core/services/local-storage.service';
import { environment } from '../../../../environments/environment';
@Injectable({
  providedIn: 'root',
})
export class GoogleAuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';
  private readonly Api_Url = environment.baseUrl;
  private readonly CUSTOM_API_URL = environment.customApiUrl;
  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  isLoggedIn$ = this.isLoggedInSubject.asObservable();
  constructor(
    private WooApi: ApiService,
    private http: HttpClient,
    private localStorageService: LocalStorageService
  ) {
    const token = this.localStorageService.getItem<string>(this.TOKEN_KEY);
    this.isLoggedInSubject.next(!!token);
  }
  loginWithGoogle(idToken: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.CUSTOM_API_URL}/google-login`, {
        idToken,
      })
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
          console.error('Google login failed:', error);
          throw error;
        })
      );
  }
}

