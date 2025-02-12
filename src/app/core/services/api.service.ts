import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

import { HandelErrorsService } from './handel-errors.service';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  http = inject(HttpClient);
  handelErrorsService = inject(HandelErrorsService);


  getRequest<T>(name: string): Observable<T> {
    return this.http.get<T>(`http://localhost:3000/${name}`)
    //.pipe(
    //   catchError(this.handelErrorsService.handelError)
    // );
  }
}
