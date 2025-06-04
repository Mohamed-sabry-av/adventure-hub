import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { loadStripe, Stripe, StripeElements, StripePaymentElement } from '@stripe/stripe-js';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment'; // Add environment file

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.css']
})
export class PaymentComponent implements OnInit, OnChanges {
  @Input() clientSecret: string | null = null;
  @Input() amount: number = 0;
  @Input() currency: string = 'aed';
  @Input() orderData: any = null;
  @Input() processing: boolean = false;
  @Output() paymentSuccess = new EventEmitter<{paymentIntentId: string, orderId?: string}>();
  @Output() paymentError = new EventEmitter<string>();
  @Output() processingChange = new EventEmitter<boolean>();

  stripe: Stripe | null = null;
  elements: StripeElements | null = null;
  paymentElement: StripePaymentElement | null = null;
  error: any | null = null;
  paymentStatus: 'initial' | 'processing' | 'success' | 'error' = 'initial';
  paymentIntentId: string | null = null;

  // Use demo mode for testing (set to false in production)
  useDemoMode = false; // Change to false for production

  private readonly STRIPE_PUBLISHABLE_KEY = environment.stripe.publishableKey;
  private readonly BACKEND_URL = environment.apiUrl;

  @ViewChild('paymentElement', { static: true }) paymentElementRef!: ElementRef;

  private isPaymentInProgress = false; // إضافة متغير لتتبع حالة الدفع

  constructor(private http: HttpClient) {}

  async ngOnInit() {
    this.stripe = await loadStripe(this.STRIPE_PUBLISHABLE_KEY);

    if (!this.stripe) {
      console.error("Stripe couldn't be loaded");
      this.error = "Failed to load payment processor";
      this.paymentError.emit(this.error);
      return;
    }

    if (this.clientSecret && !this.useDemoMode) {
      await this.setupStripeElements();
    }
  }

  async ngOnChanges(changes: SimpleChanges) {
    if (changes['clientSecret'] && this.clientSecret && this.stripe && !this.useDemoMode) {
      console.log('Client secret received:', this.clientSecret);
      await this.setupStripeElements();
    }

    if (changes['processing']) {
      this.paymentStatus = this.processing ? 'processing' : this.paymentStatus;
    }
  }

  async setupStripeElements() {
    if (!this.stripe || !this.clientSecret) {
      console.error('Stripe or clientSecret not initialized');
      this.error = 'Payment system not initialized';
      this.paymentError.emit(this.error);
      return;
    }

    try {
      this.elements = this.stripe.elements({
        clientSecret: this.clientSecret,
        appearance: {
          theme: 'stripe',
          variables: { colorPrimary: '#0066cc' }
        }
      });

      this.paymentElement = this.elements.create('payment', {
        layout: { type: 'tabs', defaultCollapsed: false },
        paymentMethodOrder: ['card', 'apple_pay', 'google_pay']
      });
      this.paymentElement.mount(this.paymentElementRef.nativeElement);

      // Listen for payment element ready event
      this.paymentElement.on('ready', () => {
        console.log('Payment element is ready for input');
      });

      // Listen for change events
      this.paymentElement.on('change', (event) => {
        if (event.complete) {
          console.log('Payment details complete');
        } else if (event) {
          this.error = event || 'Please check your payment details';
        }
      });
    } catch (error: any) {
      console.error('Error setting up Stripe Elements:', error);
      this.error = 'Failed to initialize payment form';
      this.paymentError.emit(this.error);
    }
  }

  async pay() {
    // تحقق من أن العملية غير جارية بالفعل لمنع النقر المزدوج
    if (this.isPaymentInProgress) {
      console.log('Payment is already in progress, ignoring additional clicks');
      return;
    }

    this.isPaymentInProgress = true; // تعيين حالة الدفع كجارية

    if (this.useDemoMode) {
      this.setPaymentProcessing(true);
      this.error = null;

      setTimeout(() => {
        this.paymentStatus = 'success';
        this.paymentIntentId = 'pi_' + Math.random().toString(36).substring(2, 15);
        this.checkOrderStatus(this.paymentIntentId);
        this.setPaymentProcessing(false);
        this.isPaymentInProgress = false; // إعادة تعيين الحالة بعد الانتهاء
      }, 2000);
      return;
    }

    if (!this.stripe || !this.elements || !this.clientSecret) {
      console.error('Stripe, elements, or clientSecret not initialized');
      this.error = 'Payment system not initialized';
      this.paymentStatus = 'error';
      this.paymentError.emit(this.error);
      this.isPaymentInProgress = false; // إعادة تعيين الحالة عند حدوث خطأ
      return;
    }

    this.setPaymentProcessing(true);
    this.error = null;

    try {
      const { error, paymentIntent } = await this.stripe.confirmPayment({
        elements: this.elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/complete`, // Used only if redirect is required
        },
        redirect: 'if_required' // Avoid redirect unless necessary
      });

      if (error) {
        this.error = error.message || 'Payment failed';
        this.paymentStatus = 'error';
        this.paymentError.emit(this.error);
        console.error('Payment error:', error);
        this.setPaymentProcessing(false);
        this.isPaymentInProgress = false; // إعادة تعيين الحالة عند حدوث خطأ
      } else if (paymentIntent) {
        this.paymentStatus = 'success';
        this.paymentIntentId = paymentIntent.id;
        console.log('Payment successful, paymentIntentId:', paymentIntent.id);
        this.checkOrderStatus(paymentIntent.id);
      }
    } catch (e: any) {
      this.error = e.message || 'Payment failed';
      this.paymentStatus = 'error';
      this.paymentError.emit(this.error);
      console.error('Payment exception:', e);
      this.setPaymentProcessing(false);
      this.isPaymentInProgress = false; // إعادة تعيين الحالة عند حدوث خطأ
    }
  }

  checkOrderStatus(paymentIntentId: string) {
    if (!paymentIntentId) {
      this.error = 'Missing payment intent ID';
      this.paymentStatus = 'error';
      this.setPaymentProcessing(false);
      this.paymentError.emit(this.error);
      this.isPaymentInProgress = false; // إعادة تعيين الحالة عند حدوث خطأ
      return;
    }

    const checkStatus = () => {
      this.http.get(`${this.BACKEND_URL}/api/order/status/${paymentIntentId}`).subscribe(
        (response: any) => {
          if (response.success && response.orderId) {
            console.log('Order created successfully:', response.orderId);
            this.setPaymentProcessing(false);
            this.paymentSuccess.emit({
              paymentIntentId: paymentIntentId,
              orderId: response.orderId
            });
            this.isPaymentInProgress = false; // إعادة تعيين الحالة بعد النجاح

            if (!this.useDemoMode) {
              window.location.href = `/checkout/complete?order_id=${response.orderId}`;
            }
          } else {
            // Order is not yet created, retry after delay
            setTimeout(checkStatus, 2000);
          }
        },
        (error) => {
          console.error('Error checking order status:', error);
          if (this.useDemoMode) {
            const fakeOrderId = Math.floor(Math.random() * 10000) + 1;
            console.log('Demo mode: Simulating successful order despite error');
            console.log('Order created successfully:', fakeOrderId);
            this.setPaymentProcessing(false);
            this.paymentSuccess.emit({
              paymentIntentId: paymentIntentId,
              orderId: String(fakeOrderId)
            });
            this.isPaymentInProgress = false; // إعادة تعيين الحالة في حالة الوضع التجريبي
          } else {
            setTimeout(checkStatus, 3000);
          }
        }
      );
    };

    checkStatus();
  }

  private setPaymentProcessing(isProcessing: boolean) {
    this.processing = isProcessing;
    this.processingChange.emit(isProcessing);
  }
}
