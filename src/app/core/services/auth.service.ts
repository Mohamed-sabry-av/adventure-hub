import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { HandleErrorsService } from './handel-errors.service';
import { catchError, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private consumerKey = 'ck_74222275d064648b8c9f21284e42ed37f8595da5';
  private consumerSecret = 'cs_4c9f3b5fd41a135d862e973fc65d5c049e05fee4';

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
