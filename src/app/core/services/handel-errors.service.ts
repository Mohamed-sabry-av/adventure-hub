import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class HandleErrorsService {
  handelError(error: any): Observable<never> {
    console.error('Raw error:', error);
    let errorMessage = 'Something bad happened. Please try again later.';
    
    if (error instanceof HttpErrorResponse) {
      errorMessage = `HTTP Error ${error.status}: ${error.statusText}`;
      if (error.error) {
        errorMessage += ` - Details: ${JSON.stringify(error.error)}`;
      }
    } else if (error.message) {
      errorMessage = `Error: ${error.message}`;
    }
    
    console.error('Processed error message:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
