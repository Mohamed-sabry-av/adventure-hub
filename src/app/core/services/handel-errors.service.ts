import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { UIService } from '../../shared/services/ui.service';

@Injectable({
  providedIn: 'root',
})
export class HandleErrorsService {
  private uiService = inject(UIService);
  handelError(errorResponse?: HttpErrorResponse): Observable<any> {
    this.uiService
      .showError(`Something went wrong fetching the available data 💥💥. Please try again
                  later.`);
    if (errorResponse?.status === 0) {
      console.log(`an error occured ${errorResponse?.error}`);
    } else {
      console.log(
        `backend returned code ${errorResponse?.status}, body was: ${errorResponse?.error}`
      );
    }
    return throwError(
      () => new Error('Something bad happened💥💥. please try again later.')
    );
  }
}
