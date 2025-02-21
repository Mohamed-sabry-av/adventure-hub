import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class HandleErrorsService {
  handelError(errorResponse: HttpErrorResponse): Observable<any> {
    if (errorResponse.status === 0) {
      console.log(`an error occured ${errorResponse.error}`);
    } else {
      console.log(
        `backend returned code ${errorResponse.status}, body was: ${errorResponse.error}`
      );
    }
    return throwError(
      () => new Error('Something bad happened; please try again later.')
    );
  }
}


