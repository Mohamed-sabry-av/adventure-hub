import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toasts = new BehaviorSubject<Toast[]>([]);
  private toastCounter = 0;

  constructor() {}

  get toasts$(): Observable<Toast[]> {
    return this.toasts.asObservable();
  }

  /**
   * Show a success toast message
   * @param message Message to display
   * @param duration Duration in milliseconds (default: 3000ms)
   */
  success(message: string, duration = 3000): void {
    this.show(message, 'success', duration);
  }

  /**
   * Show an error toast message
   * @param message Message to display
   * @param duration Duration in milliseconds (default: 5000ms)
   */
  error(message: string, duration = 5000): void {
    this.show(message, 'error', duration);
  }

  /**
   * Show an info toast message
   * @param message Message to display
   * @param duration Duration in milliseconds (default: 3000ms)
   */
  info(message: string, duration = 3000): void {
    this.show(message, 'info', duration);
  }

  /**
   * Show a warning toast message
   * @param message Message to display
   * @param duration Duration in milliseconds (default: 4000ms)
   */
  warning(message: string, duration = 4000): void {
    this.show(message, 'warning', duration);
  }

  /**
   * Remove a toast by its ID
   * @param id ID of the toast to remove
   */
  remove(id: number): void {
    const currentToasts = this.toasts.getValue();
    this.toasts.next(currentToasts.filter(toast => toast.id !== id));
  }

  /**
   * Create and show a new toast notification
   * @param message Message to display
   * @param type Type of toast (success, error, info, warning)
   * @param duration Duration in milliseconds
   */
  private show(message: string, type: 'success' | 'error' | 'info' | 'warning', duration: number): void {
    const id = ++this.toastCounter;
    const toast: Toast = { id, message, type, duration };
    
    const currentToasts = this.toasts.getValue();
    this.toasts.next([...currentToasts, toast]);
    
    // Auto-remove the toast after its duration
    setTimeout(() => {
      this.remove(id);
    }, duration);
  }
}