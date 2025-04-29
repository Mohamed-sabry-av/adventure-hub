import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class HandleErrorsService {
  handelError(errorResponse?: HttpErrorResponse): Observable<any> {
    if (errorResponse?.status === 0) {
    } else {
     
    }
    return throwError(
      () => new Error('Something bad happened. please try again later.')
    );
  }
}
