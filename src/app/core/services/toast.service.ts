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
  private readonly MAX_TOASTS = 2;
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
    const currentToasts = this.toasts.getValue();
    
    // Check for duplicate message
    const isDuplicate = currentToasts.some(toast => 
      toast.message === message && toast.type === type
    );
    
    if (isDuplicate) {
      return; // Don't add duplicate toast
    }
    
    const id = ++this.toastCounter;
    const toast: Toast = { id, message, type, duration };
    
    // Limit to MAX_TOASTS by removing oldest if needed
    let newToasts = [...currentToasts, toast];
    if (newToasts.length > this.MAX_TOASTS) {
      newToasts = newToasts.slice(newToasts.length - this.MAX_TOASTS);
    }
    
    this.toasts.next(newToasts);
    
    // Auto-remove the toast after its duration
    setTimeout(() => {
      this.remove(id);
    }, duration);
  }
}
