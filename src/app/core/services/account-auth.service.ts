import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { BehaviorSubject, catchError, Observable, tap } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { LocalStorageService } from './local-storage.service';
import { response } from 'express';
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
    private WooApi:ApiService,
    private http:HttpClient,
    private localStorageService: LocalStorageService
  ) {
    // check whether user already logged in or not ?
    const token = this.localStorageService.getItem<string>(this.TOKEN_KEY);
    this.isLoggedInSubject .next(!!token)
  }



  login(credentials: { email?: string; username?: string; password: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.Api_Url}/wp-json/jwt-auth/v1/token`, credentials).pipe(
      tap((response) => {
        if (response.token) {
          this.localStorageService.setItem(this.TOKEN_KEY, response.token);
          this.localStorageService.setItem(this.USER_KEY, {
            username: response.user_username || credentials.username || credentials.email || '',
            email: response.user_email || '',
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

  signup(userData:{username:string,email:string,password:string}): Observable<any> {
   return this.WooApi.postRequest('customers',userData).pipe(
    tap((response)=>{
      console.log('SignUp successfully')
    })
   )
  }

  logout(): void {
    console.log('logout');
  }


  getToken():string | null{
    return this.localStorageService.getItem<string>(this.TOKEN_KEY)
  }
  
  getUser():User | null {
    return this.localStorageService.getItem<User>(this.USER_KEY);
  }

  isLoggedIn():boolean{
    return this.isLoggedInSubject.value;
  }

}
