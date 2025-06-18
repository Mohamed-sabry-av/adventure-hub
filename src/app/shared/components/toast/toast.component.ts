import { 
  Component, 
  OnInit, 
  OnDestroy, 
  ChangeDetectionStrategy, 
  ChangeDetectorRef,
  PLATFORM_ID,
  Inject
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { 
  trigger, 
  state, 
  style, 
  animate, 
  transition 
} from '@angular/animations';
import { Toast, ToastService } from '../../../core/services/toast.service';
@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast-container" *ngIf="visibleToasts.length > 0" role="alert" aria-live="polite">
      <div
        *ngFor="let toast of visibleToasts"
        class="toast-message"
        [ngClass]="toast.type"
        [@toastAnimation]="'visible'"
      >
        <div class="toast-icon">
          <ng-container [ngSwitch]="toast.type">
            <span *ngSwitchCase="'success'" aria-hidden="true">✓</span>
            <span *ngSwitchCase="'error'" aria-hidden="true">✕</span>
            <span *ngSwitchCase="'info'" aria-hidden="true">ℹ</span>
            <span *ngSwitchCase="'warning'" aria-hidden="true">⚠</span>
          </ng-container>
        </div>
        <div class="toast-content">{{ toast.message }}</div>
        <button 
          class="toast-close" 
          (click)="removeToast(toast.id); $event.stopPropagation()" 
          aria-label="Close notification"
        >
          ✕
        </button>
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
      padding: 14px 18px;
      border-radius: 8px;
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
      color: white;
      margin-bottom: 8px;
      position: relative;
      overflow: hidden;
    }
    .toast-message::before {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      width: 100%;
      background-color: rgba(255, 255, 255, 0.3);
    }
    .toast-icon {
      margin-right: 12px;
      font-size: 18px;
      display: flex;
      justify-content: center;
      align-items: center;
      width: 24px;
      height: 24px;
      background-color: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
    }
    .toast-content {
      flex: 1;
      font-size: 14px;
      font-weight: 500;
    }
    .toast-close {
      background: transparent;
      border: none;
      color: white;
      font-size: 16px;
      cursor: pointer;
      opacity: 0.7;
      transition: opacity 0.2s;
      padding: 0 4px;
      line-height: 1;
      height: 20px;
      width: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-left: 8px;
    }
    .toast-close:hover {
      opacity: 1;
    }
    /* Toast types */
    .success {
      background-color: #10b981;
      border-left: 4px solid #059669;
    }
    .error {
      background-color: #ef4444;
      border-left: 4px solid #dc2626;
    }
    .info {
      background-color: #3b82f6;
      border-left: 4px solid #2563eb;
    }
    .warning {
      background-color: #f59e0b;
      border-left: 4px solid #d97706;
    }
    /* Responsive */
    @media (max-width: 480px) {
      .toast-container {
        top: auto;
        bottom: 20px;
        right: 10px;
        left: 10px;
        max-width: calc(100% - 20px);
      }
    }
  `],
  animations: [
    trigger('toastAnimation', [
      state('visible', style({
        transform: 'translateX(0)',
        opacity: 1
      })),
      transition(':enter', [
        style({
          transform: 'translateX(100%)',
          opacity: 0
        }),
        animate('300ms ease-out')
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({
          transform: 'translateX(100%)',
          opacity: 0
        }))
      ])
    ])
  ]
})
export class ToastComponent implements OnInit, OnDestroy {
  visibleToasts: Toast[] = [];
  private destroy$ = new Subject<void>();
  constructor(
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}
  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.toastService.toasts$
        .pipe(takeUntil(this.destroy$))
        .subscribe(toasts => {
          this.visibleToasts = toasts;
          this.cdr.markForCheck();
        });
    }
  }
  removeToast(id: number): void {
    this.toastService.remove(id);
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
