import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
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

  @ViewChild('cardElement', { static: true }) cardElementRef!: ElementRef;
  @ViewChild('paymentRequestButtonElement', { static: true }) paymentRequestButtonElementRef!: ElementRef;

  constructor() {}

  async ngOnInit() {
    // تحميل Stripe باستخدام أحدث إصدار
    this.stripe = await loadStripe('pk_test_51RD3yPIPLmPtcaOkAPNrNJV5j2bFeHAdAzwZa2Rif9dG6C8psDSow39N3QE66a0F6gbQONj3bb3IeoPFRHOXxMqX00Aw6qKltl');

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

        // في الحالة الطبيعية، ستقوم بإرسال هذا الـtoken إلى الخادم الخلفي
        // وإكمال عملية الدفع هناك

        // هنا نقوم بالتأكيد على الدفع لتجربة الاختبار فقط
        event.complete('success');

        // إشعار المستخدم بنجاح الدفع
        alert('تم الدفع بنجاح باستخدام ' + (event.paymentMethod.card.wallet?.type || 'wallet payment'));
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

    this.stripe.createToken(this.card).then((result: any) => {
      if (result.error) {
        this.error = result.error.message;
        console.log('Error:', result.error);
      } else {
        this.error = null;
        console.log('Token:', result.token);
        // إرسال token إلى الخادم للتعامل مع الدفع
      }
    });
  }
}
