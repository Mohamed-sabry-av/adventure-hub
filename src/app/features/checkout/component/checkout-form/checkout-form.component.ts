import {
  Component,
  DestroyRef,
  ElementRef,
  inject,
  ViewChild,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Select } from 'primeng/select';
import { RouterLink } from '@angular/router';
import { RadioButtonModule } from 'primeng/radiobutton';
import { FormValidationService } from '../../../../shared/services/form-validation.service';
import { CheckoutService } from '../../services/checkout.service';
import { AsyncPipe, NgClass } from '@angular/common';
import {
  loadStripe,
  Stripe,
  StripeElements,
  StripeCardElement,
  StripeCardCvcElement,
  StripeCardExpiryElement,
  StripeCardNumberElement,
  StripePaymentRequestButtonElement,
} from '@stripe/stripe-js';
import { CheckoutSummaryComponent } from '../checkout-summary/checkout-summary.component';
import { BehaviorSubject, Observable } from 'rxjs';
import { StripeService } from 'ngx-stripe';
import { HttpClient } from '@angular/common/http';
import { trigger, transition, style, animate } from '@angular/animations';
import { UIService } from '../../../../shared/services/ui.service';

declare var TabbyCheckout: any; // Declare TabbyCheckout for TypeScript

@Component({
  selector: 'app-checkout-form',
  imports: [
    ReactiveFormsModule,
    RadioButtonModule,
    RouterLink,
    Select,
    NgClass,
    CheckoutSummaryComponent,
    AsyncPipe,
  ],
  templateUrl: './checkout-form.component.html',
  styleUrl: './checkout-form.component.css',
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateY(-20px)', opacity: '0' }),
        animate(
          '200ms ease-in',
          style({ transform: 'translateY(0)', opacity: '1' })
        ),
      ]),
      transition(':leave', [
        animate(
          '50ms ease-out',
          style({ transform: 'translateY(-20px)', opacity: '0' })
        ),
      ]),
    ]),
  ],
})
export class CheckoutFormComponent {
  private destroyRef = inject(DestroyRef);
  private formValidationService = inject(FormValidationService);
  private checkoutService = inject(CheckoutService);
  private uiService = inject(UIService);

  billingForm!: FormGroup;
  shippingForm!: FormGroup;
  isShippingDifferent = false;
  summaryIsVisible$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(
    false
  );
  isOrderLoading$: Observable<boolean> = this.uiService.isOrderLoading$;
  isVisible: boolean = false;
  paymentRadiosValue: string = 'cod';

  private createAddressForm(includeContactInfo: boolean): FormGroup {
    const formControls: { [key: string]: FormControl } = {
      countrySelect: new FormControl('', [Validators.required]),
      firstName: new FormControl('', [
        Validators.maxLength(30),
        Validators.required,
      ]),
      lastName: new FormControl('', [
        Validators.maxLength(30),
        Validators.required,
      ]),
      address: new FormControl('', [
        Validators.maxLength(30),
        Validators.required,
      ]),
      apartment: new FormControl('', [Validators.maxLength(30)]),
      city: new FormControl('', [
        Validators.maxLength(30),
        Validators.required,
      ]),
      state: new FormControl('', [
        Validators.maxLength(30),
        Validators.required,
      ]),
      paymentMethod: new FormControl('cod'),
      shippingMethod: new FormControl('same'),
    };

    if (includeContactInfo) {
      formControls['email'] = new FormControl('', [
        Validators.email,
        Validators.required,
      ]);
      formControls['phone'] = new FormControl('', [
        Validators.maxLength(30),
        Validators.required,
      ]);
      formControls['postCode'] = new FormControl('', [
        Validators.maxLength(30),
        Validators.required,
      ]);
    }

    return new FormGroup(formControls);
  }

  ngOnInit() {
    this.billingForm = this.createAddressForm(true);
    this.shippingForm = this.createAddressForm(false);

    this.resetFormState();

    const subscribtion3 = this.billingForm
      .get('shippingMethod')
      ?.valueChanges.subscribe((method) => {
        if (method === 'different') {
          this.isShippingDifferent = true;
        } else {
          this.isShippingDifferent = false;
          this.billingForm
            .get('countrySelect')
            ?.setValue(this.billingForm.controls?.['countrySelect'].value);
        }
        this.toggleShippingForm();
      });

    const subscribtion = this.billingForm
      .get('paymentMethod')
      ?.valueChanges.subscribe((method) => {
        this.toggleCreditCardValidators(method!);
      });

    const subscribtion2 = this.billingForm
      .get('countrySelect')
      ?.valueChanges.subscribe((value) => {
        if (!this.isShippingDifferent) {
          this.onGetSelectedCountry(value);
        }
      });

    const subscribtion4 = this.shippingForm
      ?.get('countrySelect')
      ?.valueChanges.subscribe((value) => {
        if (this.isShippingDifferent) {
          this.onGetSelectedCountry(value);
        }
      });

    this.destroyRef.onDestroy(() => {
      subscribtion?.unsubscribe();
      subscribtion2?.unsubscribe();
      subscribtion3?.unsubscribe();
      subscribtion4?.unsubscribe();
    });
    const emailValue = this.emailFieldValue;
    if (emailValue) {
      this.billingForm.get('email')?.setValue(emailValue);
    }
  }

  private resetFormState() {
    this.billingForm.reset({
      countrySelect: '',
      firstName: '',
      lastName: '',
      address: '',
      apartment: '',
      city: '',
      state: '',
      paymentMethod: 'cod',
      shippingMethod: 'same',
      email: '',
      phone: '',
      postCode: '',
    });

    this.shippingForm.reset({
      countrySelect: '',
      firstName: '',
      lastName: '',
      address: '',
      apartment: '',
      city: '',
      state: '',
    });

    this.paymentRadiosValue = 'cod';
    this.isShippingDifferent = false;
    this.isVisible = false;
    this.summaryIsVisible$.next(false);

    this.toggleCreditCardValidators('cod');
    this.toggleShippingForm();
  }

  avaliableCountries(): any[] {
    const countries = [
      { country: 'Bahrain' },
      { country: 'Egypt' },
      { country: 'Kuwait' },
      { country: 'Oman' },
      { country: 'Saudi Arabia' },
      { country: 'Qatar' },
      { country: 'Singapore' },
      { country: 'United Arab Emirates' },
    ];

    return countries.sort((a, b) => a.country.localeCompare(b.country));
  }

  onShowSummary() {
    this.isVisible = !this.isVisible;
    this.summaryIsVisible$.next(this.isVisible);
  }

  toggleCreditCardValidators(method: string) {
    switch (method) {
      case 'stripe':
        this.paymentRadiosValue = 'stripe';
        break;

      case 'tabby':
        this.paymentRadiosValue = 'tabby';
        break;

      case 'googlePay':
        this.paymentRadiosValue = 'googlePay';
        break;

      case 'applePay':
        this.paymentRadiosValue = 'applePay';
        break;

      default:
        this.paymentRadiosValue = 'cod';
        break;
    }
  }

  toggleShippingForm() {
    if (this.isShippingDifferent) {
      this.shippingForm.enable();
    } else {
      this.shippingForm.disable();
    }
  }

  isFormValid(): boolean {
    if (this.isShippingDifferent) {
      return this.billingForm.valid && this.shippingForm.valid;
    }
    return this.billingForm.valid;
  }

  get emailIsInvalid() {
    return this.formValidationService.controlFieldIsInvalid(
      this.billingForm,
      'email'
    );
  }

  get emailFieldValue() {
    let loadedUserData: any = localStorage.getItem('auth_user');
    loadedUserData = loadedUserData ? JSON.parse(loadedUserData) : null;
    return loadedUserData?.value?.email || '';
  }

  get firstNameIsInvalid() {
    return this.formValidationService.controlFieldIsInvalid(
      this.billingForm,
      'firstName'
    );
  }

  get lastNameIsInvalid() {
    return this.formValidationService.controlFieldIsInvalid(
      this.billingForm,
      'lastName'
    );
  }

  get addressIsInvalid() {
    return this.formValidationService.controlFieldIsInvalid(
      this.billingForm,
      'address'
    );
  }

  get cityIsInvalid() {
    return this.formValidationService.controlFieldIsInvalid(
      this.billingForm,
      'city'
    );
  }

  get stateIsInvalid() {
    return this.formValidationService.controlFieldIsInvalid(
      this.billingForm,
      'state'
    );
  }

  get phoneIsInvalid() {
    return this.formValidationService.controlFieldIsInvalid(
      this.billingForm,
      'phone'
    );
  }

  get postCodeIsInvalid() {
    return this.formValidationService.controlFieldIsInvalid(
      this.billingForm,
      'postCode'
    );
  }

  onGetSelectedCountry(selectedCountry: any) {
    this.checkoutService.getSelectedCountry(selectedCountry);
  }

  // ------------------------- Stripe & Wallet Payments -------------------------
  @ViewChild('cardNumberElement') cardNumberElementRef!: ElementRef;
  @ViewChild('cardExpiryElement') cardExpiryElementRef!: ElementRef;
  @ViewChild('cardCvcElement') cardCvcElementRef!: ElementRef;
  @ViewChild('googlePayButtonElement') googlePayButtonRef!: ElementRef;

  stripe: Stripe | null = null;
  elements: StripeElements | null = null;
  cardNumber: StripeCardNumberElement | null = null;
  cardExpiry: StripeCardExpiryElement | null = null;
  cardCvc: StripeCardCvcElement | null = null;
  paymentRequest: any;
  prButton: StripePaymentRequestButtonElement | null = null;
  googlePaySupported = false;
  applePaySupported = false;

  ngAfterViewInit() {
    this.initStripe();
  }

  async initStripe() {
    this.stripe = await loadStripe(
      'pk_live_51QIucCEaH7ud4cFjcc3wunqaKKEC8LQd45RLJu1GWpDsnmCGHaDmSUYzNp9lfLpkW77Sl5B2NBFW1rjcIdDlFPrM00nCKMENoU'
    );
    if (this.stripe) {
      this.elements = this.stripe.elements();

      const style = {
        base: {
          fontSize: '16px',
          color: '#32325d',
          '::placeholder': {
            color: '#aab7c4',
          },
        },
      };

      this.cardNumber = this.elements.create('cardNumber', { style });
      this.cardExpiry = this.elements.create('cardExpiry', { style });
      this.cardCvc = this.elements.create('cardCvc', { style });

      this.cardNumber.mount(this.cardNumberElementRef.nativeElement);
      this.cardExpiry.mount(this.cardExpiryElementRef.nativeElement);
      this.cardCvc.mount(this.cardCvcElementRef.nativeElement);

      // تهيئة Google Pay و Apple Pay
      this.initWalletPayments();
    }
  }

  async initWalletPayments() {
    if (!this.stripe || !this.elements || !this.googlePayButtonRef) return;

    try {
      // تهيئة payment request
      this.paymentRequest = this.stripe.paymentRequest({
        country: 'AE', // تغيير حسب البلد المطلوب
        currency: 'aed', // تغيير حسب العملة المطلوبة
        total: {
          label: 'إجمالي الطلب',
          amount: 1000, // سيتم استبداله بقيمة الطلب الفعلية
        },
        requestPayerName: true,
        requestPayerEmail: true,
        requestPayerPhone: true,
      });

      // التحقق مما إذا كان المتصفح يدعم Google Pay أو Apple Pay
      const result = await this.paymentRequest.canMakePayment();

      if (result) {
        // تحديد طرق الدفع المدعومة
        if (result.applePay) {
          this.applePaySupported = true;
          console.log("Apple Pay is supported");
        }

        if (result.googlePay) {
          this.googlePaySupported = true;
          console.log("Google Pay is supported");

          // إضافة Google Pay كخيار في قائمة طرق الدفع
          const paymentMethodControl = this.billingForm.get('paymentMethod');
          if (paymentMethodControl) {
            paymentMethodControl.patchValue('googlePay');
          }
        }

        // إنشاء زر الدفع
        this.prButton = this.elements.create('paymentRequestButton', {
          paymentRequest: this.paymentRequest,
          style: {
            paymentRequestButton: {
              type: 'default',
              theme: 'dark',
              height: '40px',
            },
          },
        });

        // تثبيت زر الدفع في واجهة المستخدم
        this.prButton.mount(this.googlePayButtonRef.nativeElement);

        // معالجة أحداث الدفع
        this.paymentRequest.on('paymentmethod', async (event: any) => {
          console.log('Payment method received:', event.paymentMethod);

          const paymentType = event.paymentMethod.card.wallet?.type || 'walletPayment';

          // تحديث طريقة الدفع في النموذج
          const paymentMethodControl = this.billingForm.get('paymentMethod');
          if (paymentMethodControl) {
            paymentMethodControl.patchValue(paymentType === 'google_pay' ? 'googlePay' :
                                            paymentType === 'apple_pay' ? 'applePay' :
                                            'walletPayment');
          }

          // إرسال الطلب مع رمز الدفع
          this.onSubmit(event.paymentMethod.id);

          // إكمال عملية الدفع
          event.complete('success');
        });
      } else {
        console.log("No supported wallet payment methods found");
      }
    } catch (error) {
      console.error('Error initializing wallet payments:', error);
    }
  }

  async payNow() {
    if (this.stripe && this.cardNumber) {
      try {
        const result = await this.stripe.createPaymentMethod({
          type: 'card',
          card: this.cardNumber,
          billing_details: {
            name: `${this.billingForm.get('firstName')?.value} ${this.billingForm.get('lastName')?.value}`,
            email: this.billingForm.get('email')?.value,
            phone: this.billingForm.get('phone')?.value,
            address: {
              line1: this.billingForm.get('address')?.value,
              city: this.billingForm.get('city')?.value,
              state: this.billingForm.get('state')?.value,
              postal_code: this.billingForm.get('postCode')?.value,
              country: this.billingForm.get('countrySelect')?.value,
            }
          }
        });

        if (result.error) {
          console.error(result.error.message);
          alert('فشل الدفع: ' + result.error.message);
        } else if (result.paymentMethod) {
          console.log('Payment Method:', result.paymentMethod.id);
          this.onSubmit(result.paymentMethod.id);
        }
      } catch (error) {
        console.error('Error processing payment:', error);
        alert('حدث خطأ أثناء معالجة الدفع. يرجى المحاولة مرة أخرى.');
      }
    } else {
      console.error('Stripe أو حقل البطاقة غير جاهز');
    }
  }

  onSubmit(paymentToken?: string) {
    if (!this.isFormValid()) {
      return;
    }
    this.checkoutService.createOrder({
      billingForm: this.billingForm,
      shippingForm: this.shippingForm,
      isShippingDifferent: this.isShippingDifferent,
    }, paymentToken);
  }

  // ------------------------- Tabby Installments -------------------------

  private httpClient = inject(HttpClient);
  orderId: number | null = null; // Store WooCommerce order ID
  tabbyPublicKey = 'pk_660ceea8-66e4-4c15-85d2-1c2887765112'; // Replace with your Tabby Public Key
  wooCommerceApiUrl =
    'https://adventures-hub.com/wp-json/wc/v3/orders?consumer_key=ck_74222275d064648b8c9f21284e42ed37f8595da5&consumer_secret=cs_4c9f3b5fd41a135d862e973fc65d5c049e05fee4'; // WooCommerce API URL
  tabbyApiUrl = 'https://adventures-hub.com/wp-json/tabby/v1/create-payment'; // Custom Tabby endpoint

  createWooCommerceOrder(): void {
    const orderData = {
      payment_method: 'tabby',
      payment_method_title: 'Tabby - Pay Later',
      set_paid: false,
      billing: {
        first_name: 'Customer',
        last_name: 'Name',
        email: 'customer@example.com',
        phone: '+971123456789',
      },
      shipping: {
        first_name: 'Customer',
        last_name: 'Name',
        email: 'customer@example.com',
        phone: '+971123456789',
      },
      line_items: [
        {
          product_id: 123, // Replace with actual product ID
          quantity: 1,
        },
      ],
    };

    this.httpClient.post(this.wooCommerceApiUrl, orderData, {}).subscribe(
      (response: any) => {
        this.orderId = response.id;
        console.log('Order created:', this.orderId);
      },
      (error) => {
        console.error('Error creating order:', error);
      }
    );
  }

  initiateTabbyPayment(): void {
    if (!this.orderId) {
      console.error('No order ID available');
      return;
    }

    // Fetch order details for Tabby
    this.httpClient
      .post(this.tabbyApiUrl, { order_id: this.orderId })
      .subscribe(
        (response: any) => {
          console.log('SUCCCCCCCCCCCCCCCCCCCCES', response);
          this.setupTabbyCheckout(response);
        },
        (error) => {
          console.error('Error fetching order details:', error);
        }
      );
  }

  setupTabbyCheckout(orderData: any): void {
    if (typeof TabbyCheckout === 'undefined') {
      console.error(
        'TabbyCheckout is not loaded. Please check the SDK script.'
      );
      return;
    }

    TabbyCheckout({
      public_key: this.tabbyPublicKey,
      selector: '#tabby-checkout', // ID of the container element
      lang: 'ar', // Arabic language
      amount: orderData.amount,
      currency: orderData.currency,
      buyer: orderData.buyer,
      items: orderData.items,
      success: (response: any) => {
        console.log('Payment created:', response);
        // Update WooCommerce order status
        // this.updateOrderStatus(this.orderId!, 'pending');
        // Redirect to Tabby payment page
        window.location.href = response.payment.url;
      },
      failure: (error: any) => {
        console.error('Payment failed:', error);
        // Optionally update order status to failed
        // this.updateOrderStatus(this.orderId!, 'failed');
      },
    });
  }

  updateOrderStatus(orderId: number, status: string): void {
    this.httpClient
      .put(
        `${this.wooCommerceApiUrl}/${orderId}`,
        { status: status },
        {
          headers: {
            Authorization:
              'Basic ' + btoa('YOUR_CONSUMER_KEY:YOUR_CONSUMER_SECRET'),
          },
        }
      )
      .subscribe(
        (response) => {
          console.log('Order status updated:', response);
        },
        (error) => {
          console.error('Error updating order status:', error);
        }
      );
  }
}
