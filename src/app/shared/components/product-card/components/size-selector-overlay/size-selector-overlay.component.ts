import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-mobile-size-selector-overlay',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,

  template: `
    <div class="mobile-size-selector-overlay" [@slideInOut]>
      <div class="mobile-size-heading">Select Size</div>
      <div class="mobile-size-scroll-container">
        <button
          *ngFor="let size of uniqueSizes"
          class="mobile-size-btn"
          [class.selected]="selectedSize === size.size"
          [class.out-of-stock]="!size.inStock"
          [disabled]="!size.inStock"
          (click)="selectSize.emit(size.size)"
        >
          {{ size.size }}
        </button>
      </div>
      <button
        class="mobile-add-to-cart-btn"
        [disabled]="isAddToCartDisabled"
        (click)="addToCart.emit()"
      >
        Add to Cart
      </button>
    </div>
  `,
  styles: [
    `
      .mobile-size-selector-overlay {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 10000; /* قيمة عالية جدًا */
        background-color: white;
        border-radius: 8px;
        padding: 16px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
        border: 1px solid #f0f0f0;
        width: 90vw;
        max-width: 400px;
        animation: slideIn 200ms ease-out;
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translate(-50%, -40%);
        }
        to {
          opacity: 1;
          transform: translate(-50%, -50%);
        }
      }

      .mobile-size-heading {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 12px;
        color: #1f2937;
        text-align: center;
      }

      .mobile-size-scroll-container {
        display: flex;
        overflow-x: auto;
        scroll-behavior: smooth;
        gap: 8px;
        padding-bottom: 12px;
        margin-bottom: 12px;
      }

      .mobile-size-btn {
        flex: 0 0 auto;
        min-width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: white;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        font-size: 14px;
        font-weight: 500;
      }

      .mobile-size-btn.selected {
        background-color: #16a34a;
        border-color: #16a34a;
        color: white;
      }

      .mobile-size-btn.out-of-stock {
        opacity: 0.5;
        position: relative;
      }

      .mobile-size-btn.out-of-stock::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 0;
        width: 100%;
        height: 1px;
        background-color: #9ca3af;
        transform: rotate(45deg);
      }

      .mobile-add-to-cart-btn {
        width: 100%;
        margin-top: 12px;
        color: white;
        background: linear-gradient(to right, #22c55e, #16a34a);
        font-weight: 600;
        border-radius: 4px;
        font-size: 14px;
        padding: 12px 16px;
        border: none;
        box-shadow: 0 2px 4px rgba(22, 163, 74, 0.2);
        text-transform: uppercase;
      }
    `,
  ],
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translate(-50%, -40%)' }),
        animate(
          '200ms ease-out',
          style({ opacity: 1, transform: 'translate(-50%, -50%)' })
        ),
      ]),
      transition(':leave', [
        animate(
          '150ms ease-in',
          style({ opacity: 0, transform: 'translate(-50%, -40%)' })
        ),
      ]),
    ]),
  ],
})
export class MobileSizeSelectorOverlayComponent {
  @Input() uniqueSizes: { size: string; inStock: boolean }[] = [];
  @Input() selectedSize: string | null = null;
  @Input() isAddToCartDisabled: boolean = false;
  @Output() selectSize = new EventEmitter<string>();
  @Output() addToCart = new EventEmitter<void>();
}
