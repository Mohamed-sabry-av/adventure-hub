import { Injectable } from '@angular/core';
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

  getRequest<T>(
    endpoint: string,
    options: { params?: HttpParams } = {}
  ): Observable<T> {
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
      observe: options.observe || 'body',
    };

    console.log();

    return this.http
      .get<T>(
        `${this.baseUrl}${endpoint}`,
        httpOptions as Object // Type assertion هنا
      )
      .pipe(
        catchError((error: HttpErrorResponse) =>
          this.handelErrorsService.handelError(error)
        )
      );
  }

  postRequest<T>(endpoint: string, body: any): Observable<T> {
    return this.http
      .post<T>(`${this.baseUrl}${endpoint}`, body, {
        headers: this.authService.getAuthHeaders(),
      })
      .pipe(catchError(this.handelErrorsService.handelError));
  }

  putRequest<T>(endpoint:string,body:any):Observable<T>{
    return this.http.put<T>(`${this.baseUrl}${endpoint}`,body,{
      headers:this.authService.getAuthHeaders(),
    })
  }

  deleteRequest<T>(endpoint: string, body: any): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${endpoint}`, {
      headers: this.authService.getAuthHeaders(),
      body: body 
    });
  }
  

  getExternalRequest<T>(
    fullUrl: string,
    options: {
      params?: HttpParams;
      withCredentials?: boolean;
    } = {}
  ): Observable<T> {
    return this.http
      .get<T>(fullUrl, {
        params: options.params,
        withCredentials: options.withCredentials || false,
      })
      .pipe(catchError(this.handelErrorsService.handelError));
  }

  postExternalRequest<T>(
    fullUrl: string,
    body: any,
    options: {
      headers?: { [key: string]: string };
      withCredentials?: boolean;
    } = {}
  ): Observable<T> {
    return this.http
      .post<T>(fullUrl, body, {
        withCredentials: options.withCredentials || false,
      })
      .pipe(catchError(this.handelErrorsService.handelError));
  }

  putExternalRequest<T>(
    fullUrl: string,
    body: any,
    options: {
      params?: HttpParams;
      headers?: { [key: string]: string };
      withCredentials?: boolean;
    } = {}
  ): Observable<T> {
    return this.http
      .put<T>(fullUrl, body, {
        headers: { ...this.authService.getAuthHeaders(), ...options.headers },
        params: options.params,
        withCredentials: options.withCredentials || false,
      })
      .pipe(catchError(this.handelErrorsService.handelError));
  }

  deleteExternalRequest<T>(
    fullUrl: string,
    options: {
      params?: HttpParams;
      headers?: { [key: string]: string };
      withCredentials?: boolean;
      body?: any;
    } = {}
  ): Observable<T> {
    return this.http
      .delete<T>(fullUrl, {
        params: options.params,
        withCredentials: options.withCredentials || false,
        body: options.body,
      })
      .pipe(catchError(this.handelErrorsService.handelError));
  }
}
