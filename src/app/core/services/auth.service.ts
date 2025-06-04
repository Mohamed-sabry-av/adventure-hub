import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { HandleErrorsService } from './handel-errors.service';
import { catchError, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private consumerKey = environment.wooCommerce.consumerKey;
  private consumerSecret = environment.wooCommerce.consumerSecret;

  http = inject(HttpClient);
  handelErrorService = inject(HandleErrorsService);

  getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization:
        'Basic ' + btoa(`${this.consumerKey}:${this.consumerSecret}`),
      'Content-Type': 'application/json',
    });
  }
}
