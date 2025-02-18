import {Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';
import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
} from '@angular/common/http';

import { HandelErrorsService } from './handel-errors.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private baseUrl = 'https://adventures-hub.com/wp-json/wc/v3/';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private handelErrorsService: HandelErrorsService
  ) {}

  getRequest<T>(endpoint: string, options: { params?: HttpParams } = {}): Observable<T> {
    return this.http
      .get<T>(`${this.baseUrl}${endpoint}`, {
        headers: this.authService.getAuthHeaders(),
        ...options, // هنا نضيف `params` لو موجود
      })
      .pipe(catchError(this.handelErrorsService.handelError));
  }
  

  postRequest<T>(endpoint: string, body: any): Observable<T> {
    return this.http
      .post<T>(`${this.baseUrl}${endpoint}`, body, {
        headers: this.authService.getAuthHeaders(),
      })
      .pipe(catchError(this.handelErrorsService.handelError));
  }
}
