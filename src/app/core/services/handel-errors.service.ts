import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root',
})
export class HandleErrorsService {
  private toastService = inject(ToastService);

  handelError(error: any): Observable<never> {
    let errorMessage = 'Something bad happened. Please try again later.';
    let detailedError = '';
    
    if (error instanceof HttpErrorResponse) {
      // Format error message for display
      errorMessage = this.getReadableErrorMessage(error);
      
      // Keep detailed error for console
      detailedError = `HTTP Error ${error.status}: ${error.statusText}`;
      if (error.error) {
        detailedError += ` - Details: ${JSON.stringify(error.error)}`;
      }
    } else if (error.message) {
      errorMessage = error.message;
      detailedError = `Error: ${error.message}`;
    }
    
    // Log detailed error to console for debugging
    
    
    // Show user-friendly message as a toast notification
    this.toastService.error(errorMessage);
    
    return throwError(() => new Error(errorMessage));
  }

  /**
   * Convert HTTP errors to user-friendly messages
   */
  private getReadableErrorMessage(error: HttpErrorResponse): string {
    // Default message
    let message = 'An error occurred. Please try again.';
    
    // Handle different HTTP status codes
    switch (error.status) {
      case 0:
        message = 'No internet connection. Please check your network.';
        break;
      case 400:
        message = 'Invalid request. Please check your information.';
        break;
      case 401:
        message = 'Please log in to continue.';
        break;
      case 403:
        message = 'You do not have permission to access this resource.';
        break;
      case 404:
        message = 'The requested resource was not found.';
        break;
      case 408:
        message = 'Request timed out. Please try again.';
        break;
      case 429:
        message = 'Too many requests. Please try again later.';
        break;
      case 500:
        message = 'Server error. Our team has been notified.';
        break;
      case 503:
        message = 'Service unavailable. Please try again later.';
        break;
    }
    
    // Try to extract specific error message from response if available
    try {
      if (error.error && typeof error.error === 'object') {
        if (error.error.message) {
          message = error.error.message;
        } else if (error.error.error) {
          message = error.error.error;
        }
      }
    } catch (e) {
      // If parsing fails, use the default message
    }
    
    return message;
  }
}
