import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { loadStripe, Stripe, StripeElements, StripePaymentRequestButtonElement } from '@stripe/stripe-js';

@Component({
  selector: 'app-payment',
  imports: [CommonModule, FormsModule],
  templateUrl: './payment.component.html',
  styleUrl: './payment.component.css'
})
export class PaymentComponent implements OnInit {
  stripe: Stripe | null = null;
  elements: StripeElements | null = null;
  card: any;
  paymentRequest: any;
  prButton: StripePaymentRequestButtonElement | null = null;
  error: string | null = null;
  googlePaySupported = false;
  applePaySupported = false;

  @Output() paymentTokenGenerated = new EventEmitter<string>();
  @Output() paymentTypeSelected = new EventEmitter<string>();

  @ViewChild('cardElement', { static: true }) cardElementRef!: ElementRef;
  @ViewChild('paymentRequestButtonElement', { static: true }) paymentRequestButtonElementRef!: ElementRef;

  constructor() {}

  async ngOnInit() {
    // تحميل Stripe باستخدام أحدث إصدار
    this.stripe = await loadStripe('pk_test_51RGe55G0IhgrvppwwIADEDYdoX8XFiOhi4hHHl9pztg3JjECc5QHfQOn7N0Wjyyrw6n6BZJtNF7GFXtakPSvwHkx00vBmKZw45');

    if (!this.stripe) {
      console.log("stripe is not loaded yet");
      return;
    }

    this.elements = this.stripe.elements();

    // تهيئة حقل البطاقة العادي
    this.card = this.elements.create('card', {
      style: {
        base: {
          fontSize: '16px',
          color: '#32325d',
        }
      }
    });

    this.card.mount(this.cardElementRef.nativeElement);

    // تهيئة PaymentRequest لدعم Google Pay و Apple Pay
    this.initPaymentRequest();
  }

  async initPaymentRequest() {
    if (!this.stripe || !this.elements) return;

    // إنشاء payment request مع معلومات الدفع
    this.paymentRequest = this.stripe.paymentRequest({
      country: 'AE', // United Arab Emirates
      currency: 'aed',
      total: {
        label: 'طلبك',
        amount: 1000, // المبلغ بالفلس (10 AED)
      },
      requestPayerName: true,
      requestPayerEmail: true,
      requestPayerPhone: true,
      // إضافة دعم للشحن إذا كان مطلوبًا
      // requestShipping: true,
    });

    // التحقق من دعم المتصفح لـ Google Pay أو Apple Pay
    const result = await this.paymentRequest.canMakePayment();

    if (result) {
      // تحديد نوع الدفع المدعوم
      if (result.applePay) {
        this.applePaySupported = true;
        console.log("Apple Pay is supported");
      }

      if (result.googlePay) {
        this.googlePaySupported = true;
        console.log("Google Pay is supported");
      }

      // إذا كان أي منهما مدعومًا، أنشئ زر الدفع
      this.prButton = this.elements.create('paymentRequestButton', {
        paymentRequest: this.paymentRequest,
        style: {
          paymentRequestButton: {
            type: 'default', // 'default', 'donate', or 'buy'
            theme: 'dark', // 'dark', 'light', or 'light-outline'
            height: '40px',
          },
        },
      });

      // ربط زر الدفع بالـDOM
      this.prButton.mount(this.paymentRequestButtonElementRef.nativeElement);

      // معالجة حدث الدفع
      this.paymentRequest.on('paymentmethod', async (event: any) => {
        console.log('Payment method received:', event.paymentMethod);

        // إرسال token الدفع إلى المكون الأب
        const paymentType = event.paymentMethod.card.wallet?.type || 'walletPayment';
        this.paymentTypeSelected.emit(paymentType === 'google_pay' ? 'googlePay' :
                                       paymentType === 'apple_pay' ? 'applePay' :
                                       'walletPayment');
        this.paymentTokenGenerated.emit(event.paymentMethod.id);

        // في الحالة الطبيعية، ستقوم بإرسال هذا الـtoken إلى الخادم الخلفي
        // وإكمال عملية الدفع هناك
        event.complete('success');
      });
    } else {
      console.log("No supported payment methods found");
    }
  }

  pay(amount: number) {
    if (!this.stripe || !this.card) {
      console.error("Stripe or card element not initialized");
      return;
    }

    this.stripe.createPaymentMethod({
      type: 'card',
      card: this.card
    }).then((result: any) => {
      if (result.error) {
        this.error = result.error.message;
        console.log('Error:', result.error);
      } else {
        this.error = null;
        console.log('Payment Method:', result.paymentMethod);
        // إرسال token إلى المكون الأب
        this.paymentTypeSelected.emit('stripe');
        this.paymentTokenGenerated.emit(result.paymentMethod.id);
      }
    });
  }
}
