import { Injectable } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { BehaviorSubject, catchError, Observable, tap } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { LocalStorageService } from '../../core/services/local-storage.service';
import { LoginResponse, User } from '../../interfaces/user.model';

@Injectable({
  providedIn: 'root',
})
export class AccountAuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';
  private readonly Api_Url = 'https://adventures-hub.com';
  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  isLoggedIn$ = this.isLoggedInSubject.asObservable();

  constructor(
    private WooApi: ApiService,
    private http: HttpClient,
    private localStorageService: LocalStorageService
  ) {
    const token = this.localStorageService.getItem<string>(this.TOKEN_KEY);
    this.isLoggedInSubject.next(!!token);
    this.verifyTokenOnInit();
  }

  verifyToken(): Observable<any> {
    const token = this.getToken();
    if (!token) {
      this.isLoggedInSubject.next(false);
      return new Observable((observer) => {
        observer.error('No token found');
        observer.complete();
      });
    }

    return this.http
      .post(`${this.Api_Url}/wp-json/jwt-auth/v1/token/validate`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .pipe(
        tap((response: any) => {
          if (response.code === 'jwt_auth_valid_token') {
            this.isLoggedInSubject.next(true);
          } else {
            this.logout();
          }
        }),
        catchError((error) => {
          console.error('Token verification failed:', error);
          this.logout();
          throw error;
        })
      );
  }

  private verifyTokenOnInit(): void {
    const token = this.getToken();
    if (token) {
      this.verifyToken().subscribe({
        next: () => console.log('Token is valid'),
        error: () => {
          console.log('Token is invalid or expired');
          this.isLoggedInSubject.next(false);
        },
      });
    } else {
      this.isLoggedInSubject.next(false);
    }
  }


  login(credentials: { email?: string; username?: string; password: string }): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.Api_Url}/wp-json/jwt-auth/v1/token`, credentials, {
        observe: 'response'
      })
      .pipe(
        tap((response) => {
          console.log('Response Headers:', response.headers.keys().map(key => `${key}: ${response.headers.get(key)}`));
          console.log('Response Body:', response.body);

          if (response.body?.token) {
            this.localStorageService.setItem(this.TOKEN_KEY, response.body.token);
            this.localStorageService.setItem(this.USER_KEY, {
              username: response.body.user_username || credentials.username || credentials.email || '',
              email: response.body.user_email || '',
            });
            this.isLoggedInSubject.next(true);
          }
        }),
        catchError((error) => {
          console.error('Login failed:', error);
          throw error;
        })
      );
  }

  signup(userData: { username: string; email: string; password: string }): Observable<any> {
    return this.WooApi.postRequest('customers', userData).pipe(
      tap(() => console.log('SignUp successfully')),
      catchError((error) => {
        console.log('signUp failed', error);
        throw error;
      })
    );
  }

  logout(): void {
    this.localStorageService.removeItem(this.TOKEN_KEY);
    this.localStorageService.removeItem(this.USER_KEY);
    this.isLoggedInSubject.next(false);
  }

  getToken(): string | null {
    return this.localStorageService.getItem<string>(this.TOKEN_KEY);
  }

  getUser(): User | null {
    return this.localStorageService.getItem<User>(this.USER_KEY);
  }

  isLoggedIn(): boolean {
    return this.isLoggedInSubject.value;
  }

 }
