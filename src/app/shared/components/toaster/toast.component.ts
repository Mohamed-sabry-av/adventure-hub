import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { ToastMessage, ToastService } from '../../../core/services/toaster.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container" *ngIf="toasts.length > 0" [@fadeInOut]>
      <div
        *ngFor="let toast of toasts; let i = index"
        class="toast-message"
        [class]="toast.type"
        [@slideInOut]
      >
        <div class="toast-icon">
          <i class="pi" [class.pi-check-circle]="toast.type === 'success'"
             [class.pi-exclamation-circle]="toast.type === 'error'"
             [class.pi-info-circle]="toast.type === 'info'"
             [class.pi-exclamation-triangle]="toast.type === 'warning'"></i>
        </div>
        <div class="toast-content">{{ toast.message }}</div>
        <button class="toast-close" (click)="removeToast(i)">×</button>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 350px;
    }

    .toast-message {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      color: white;
      margin-bottom: 8px;
      animation: slideIn 0.3s ease forwards;
    }

    .toast-icon {
      margin-right: 12px;
      font-size: 18px;
    }

    .toast-content {
      flex: 1;
      font-size: 14px;
    }

    .toast-close {
      background: transparent;
      border: none;
      color: white;
      font-size: 18px;
      cursor: pointer;
      opacity: 0.7;
      transition: opacity 0.2s;
    }

    .toast-close:hover {
      opacity: 1;
    }

    /* Toast types */
    .success {
      background-color: #10b981;
    }

    .error {
      background-color: #ef4444;
    }

    .info {
      background-color: #3b82f6;
    }

    .warning {
      background-color: #f59e0b;
    }

    /* Responsive */
    @media (max-width: 480px) {
      .toast-container {
        right: 10px;
        left: 10px;
        max-width: calc(100% - 20px);
      }
    }
  `],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms', style({ opacity: 0 }))
      ])
    ]),
    trigger('slideInOut', [
      state('void', style({
        transform: 'translateX(100%)',
        opacity: 0
      })),
      transition('void => *', [
        animate('300ms ease-out', style({
          transform: 'translateX(0)',
          opacity: 1
        }))
      ]),
      transition('* => void', [
        animate('300ms ease-in', style({
          transform: 'translateX(100%)',
          opacity: 0
        }))
      ])
    ])
  ]
})
export class ToastComponent implements OnInit, OnDestroy {
  toasts: (ToastMessage & { id?: number })[] = [];
  private subscription: Subscription = new Subscription();
  private autoCloseTimers: Map<number, any> = new Map();
  private counter = 0;

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    this.subscription = this.toastService.toast$.subscribe(toast => {
      this.showToast(toast);
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.clearAllTimers();
  }

  private showToast(toast: ToastMessage): void {
    const id = ++this.counter;
    const newToast = { ...toast, id };

    this.toasts.push(newToast);

    // Auto-close the toast after the specified duration
    const timer = setTimeout(() => {
      this.removeToastById(id);
    }, toast.duration || 3000);

    this.autoCloseTimers.set(id, timer);
  }

  removeToast(index: number): void {
    const toast = this.toasts[index];
    if (toast && toast.id) {
      this.clearTimerForToast(toast.id);
    }
    this.toasts.splice(index, 1);
  }

  private removeToastById(id: number): void {
    const index = this.toasts.findIndex(t => t.id === id);
    if (index !== -1) {
      this.toasts.splice(index, 1);
      this.clearTimerForToast(id);
    }
  }

  private clearTimerForToast(id: number): void {
    const timer = this.autoCloseTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.autoCloseTimers.delete(id);
    }
  }

  private clearAllTimers(): void {
    this.autoCloseTimers.forEach(timer => clearTimeout(timer));
    this.autoCloseTimers.clear();
  }
}
