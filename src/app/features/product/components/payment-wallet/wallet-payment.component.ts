import { Component, Input, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { WalletPaymentService } from '../../services/wallets.service';

@Component({
  selector: 'app-wallet-payment',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="wallet-payment-container">
      <div class="wallet-payment-header">
        <p class="wallet-payment-label">أو الدفع السريع باستخدام</p>
      </div>

      <div #walletButtonElement class="wallet-button-container">
        <!-- Fallback أثناء التحميل أو لو المحفظة مش متاحة -->
        <div *ngIf="!walletButtonMounted && initializing" class="wallet-button-fallback">
          <div class="wallet-loading-spinner"></div>
        </div>

        <!-- عرض زر المحفظة الافتراضي لو الزر مش متوصل -->
        <button
          *ngIf="!walletButtonMounted && !initializing && !error"
          class="wallet-button-mock"
          (click)="mockWalletClick()"
        >
          <div class="wallet-button-icon">
            <svg viewBox="0 0 24 16" width="20" height="20" fill="#ffffff">
              <path d="M22.5,0H1.5C0.7,0,0,0.7,0,1.5v13C0,15.3,0.7,16,1.5,16h21c0.8,0,1.5-0.7,1.5-1.5v-13C24,0.7,23.3,0,22.5,0z M22,13 c0,0.6-0.4,1-1,1H3c-0.6,0-1-0.4-1-1V3c0-0.6,0.4-1,1-1h18c0.6,0,1,0.4,1,1V13z M9,6c0,1.1-0.9,2-2,2S5,7.1,5,6s0.9-2,2-2 S9,4.9,9,6z M19,10.5c0,0.8-0.7,1.5-1.5,1.5h-2c-0.8,0-1.5-0.7-1.5-1.5v-3C14,6.7,14.7,6,15.5,6h2C18.3,6,19,6.7,19,7.5V10.5z"/>
            </svg>
          </div>
          <span class="wallet-button-text">الدفع بالمحفظة</span>
        </button>
      </div>

      <div *ngIf="error" class="wallet-error">{{ error }}</div>
    </div>
  `,
  styles: [`
    .wallet-payment-container {
      width: 100%;
      margin-bottom: 15px;
    }

    .wallet-payment-header {
      margin-bottom: 10px;
      text-align: center;
    }

    .wallet-payment-label {
      font-size: 14px;
      color: #666;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .wallet-payment-label::before,
    .wallet-payment-label::after {
      content: "";
      height: 1px;
      background-color: #e5e7eb;
      flex-grow: 1;
    }

    .wallet-payment-label::before {
      margin-right: 15px;
    }

    .wallet-payment-label::after {
      margin-left: 15px;
    }

    .wallet-button-container {
      width: 100%;
      height: 44px;
      min-height: 44px;
      display: block;
      margin: 0 auto;
    }

    .wallet-button-fallback {
      width: 100%;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #f8f8f8;
      border-radius: 4px;
    }

    .wallet-loading-spinner {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(0, 0, 0, 0.1);
      border-radius: 50%;
      border-top-color: #444;
      animation: spin 0.8s linear infinite;
    }

    .wallet-button-mock {
      width: 100%;
      height: 44px;
      background-color: #000;
      color: #fff;
      border-radius: 4px;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-weight: 500;
      font-size: 14px;
      gap: 8px;
    }

    .wallet-button-icon {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .wallet-error {
      margin-top: 8px;
      color: #e53e3e;
      font-size: 14px;
      text-align: center;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `]
})
export class WalletPaymentComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() amount: number = 0;
  @Input() currency: string = 'aed';
  @Input() productName: string = 'Product';

  @Output() paymentSuccess = new EventEmitter<any>();
  @Output() paymentError = new EventEmitter<string>();
  @Output() walletAvailableChange = new EventEmitter<boolean>();

  @ViewChild('walletButtonElement') walletButtonElement!: ElementRef;

  error: string = '';
  initializing: boolean = true;
  walletButtonMounted: boolean = false;
  private walletAvailable: boolean = false;
  private destroy$ = new Subject<void>();
  
  constructor(private walletService: WalletPaymentService) {}
  
  ngOnInit(): void {
    // الاشتراك في تغييرات توفر المحفظة
    this.walletService.walletAvailability$
      .pipe(takeUntil(this.destroy$))
      .subscribe(availability => {
        this.walletAvailable = availability.googlePay || availability.applePay;
        this.walletAvailableChange.emit(this.walletAvailable);
      });
  }

  async ngAfterViewInit(): Promise<void> {
    setTimeout(async () => {
      try {
        console.log('Initializing wallet payment with amount:', this.amount);

        const paymentInitialized = await this.walletService.initPaymentRequest(
          this.amount,
          this.currency,
          this.productName
        );

        console.log('Payment request initialized:', paymentInitialized);

        if (paymentInitialized && this.walletButtonElement) {
          const mounted = this.walletService.mountWalletButton(this.walletButtonElement.nativeElement);
          console.log('Wallet button mounted:', mounted);
          this.walletButtonMounted = mounted;

          if (mounted) {
            this.walletService.setupPaymentRequestListeners(
              (result) => {
                console.log('Payment successful', result);
                this.paymentSuccess.emit(result);
              },
              (error) => {
                console.error('Payment error', error);
                this.error = error.message || 'Payment failed';
                this.paymentError.emit(this.error);
              }
            );
          }
        }

        this.initializing = false;
      } catch (err: any) {
        console.error('Error in wallet payment initialization:', err);
        this.error = err.message || 'Failed to initialize wallet payment';
        this.initializing = false;
      }
    }, 500);
  }

  mockWalletClick(): void {
    alert('Google Pay أو Apple Pay غير متاح على جهازك أو متصفحك');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.walletService.destroyPaymentRequest();
  }
}