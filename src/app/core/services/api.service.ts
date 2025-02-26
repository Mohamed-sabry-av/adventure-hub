import {Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';
import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
  HttpResponse,
} from '@angular/common/http';

import { HandleErrorsService } from './handel-errors.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private baseUrl = 'https://adventures-hub.com/wp-json/wc/v3/';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private handelErrorsService: HandleErrorsService
  ) {}

  getRequest<T>(endpoint: string, options: { params?: HttpParams } = {}): Observable<T> {
    return this.http
      .get<T>(`${this.baseUrl}${endpoint}`, {
        headers: this.authService.getAuthHeaders(),
        ...options, 
      })
      .pipe(catchError(this.handelErrorsService.handelError));
  }

  getRequestProducts<T>(
    endpoint: string,
    options: { 
      params?: HttpParams;
      observe?: 'body' | 'response' | 'events';
    } = {}
  ): Observable<T | HttpResponse<T>> {
    const httpOptions: Object = {
      headers: this.authService.getAuthHeaders(),
      ...options,
      observe: options.observe || 'body'
    };

    return this.http.get<T>(
      `${this.baseUrl}${endpoint}`,
      httpOptions as Object // Type assertion هنا
    ).pipe(
      catchError((error: HttpErrorResponse) => 
        this.handelErrorsService.handelError(error)
    ))
  }
  

  postRequest<T>(endpoint: string, body: any): Observable<T> {
    return this.http
      .post<T>(`${this.baseUrl}${endpoint}`, body, {
        headers: this.authService.getAuthHeaders(),
      })
      .pipe(catchError(this.handelErrorsService.handelError));
  }
}
