import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface ToastMessage {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastSubject = new Subject<ToastMessage>();
  public toast$ = this.toastSubject.asObservable();

  constructor() {}

  /**
   * Shows a success toast message
   * @param message The success message to display
   * @param duration Duration in milliseconds (default 3000ms)
   */
  success(message: string, duration: number = 3000): void {
    this.show({ message, type: 'success', duration });
  }

  /**
   * Shows an error toast message
   * @param message The error message to display
   * @param duration Duration in milliseconds (default 5000ms)
   */
  error(message: string, duration: number = 5000): void {
    this.show({ message, type: 'error', duration });
  }

  /**
   * Shows an info toast message
   * @param message The info message to display
   * @param duration Duration in milliseconds (default 3000ms)
   */
  info(message: string, duration: number = 3000): void {
    this.show({ message, type: 'info', duration });
  }

  /**
   * Shows a warning toast message
   * @param message The warning message to display
   * @param duration Duration in milliseconds (default 4000ms)
   */
  warning(message: string, duration: number = 4000): void {
    this.show({ message, type: 'warning', duration });
  }

  /**
   * Shows a toast message with the specified parameters
   * @param toast The toast message configuration
   */
  private show(toast: ToastMessage): void {
    this.toastSubject.next(toast);
  }
}
