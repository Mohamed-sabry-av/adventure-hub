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
import { BehaviorSubject } from 'rxjs';
import { StripeService } from 'ngx-stripe';
import { HttpClient } from '@angular/common/http';
import { trigger, transition, style, animate } from '@angular/animations';

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

  form = new FormGroup({
    email: new FormControl('', {
      validators: [Validators.email, Validators.required],
    }),
    countrySelect: new FormControl('', {
      validators: [Validators.required],
    }),
    firstName: new FormControl('', {
      validators: [Validators.maxLength(30), Validators.required],
    }),
    lastName: new FormControl('', {
      validators: [Validators.maxLength(30), Validators.required],
    }),
    address: new FormControl('', {
      validators: [Validators.maxLength(30), Validators.required],
    }),
    apartment: new FormControl('', {
      validators: [Validators.maxLength(30)],
    }),
    city: new FormControl('', {
      validators: [Validators.maxLength(30), Validators.required],
    }),
    state: new FormControl('', {
      validators: [Validators.maxLength(30), Validators.required],
    }),
    phone: new FormControl('', {
      validators: [Validators.maxLength(30), Validators.required],
    }),
    postCode: new FormControl('', {
      validators: [Validators.maxLength(30), Validators.required],
    }),

    paymentMethod: new FormControl('creditCard'),

    // cardNumber: new FormControl('', {
    //   validators: [Validators.maxLength(30), Validators.required],
    // }),
    // expDate: new FormControl('', {
    //   validators: [Validators.maxLength(30), Validators.required],
    // }),
    // securityCode: new FormControl('', {
    //   validators: [Validators.maxLength(30), Validators.required],
    // }),
    // nameOnCard: new FormControl('', {
    //   validators: [Validators.maxLength(30), Validators.required],
    // }),
  });

  paymentRadiosValue: string = 'creditCard';
  summaryIsVisible$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(
    true
  );
  isVisible: boolean = false;

  ngOnInit() {
    const subscribtion = this.form
      .get('paymentMethod')
      ?.valueChanges.subscribe((method) => {
        this.toggleCreditCardValidators(method!);
      });

    this.destroyRef.onDestroy(() => subscribtion?.unsubscribe());
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
    if (method === 'creditCard') {
      this.paymentRadiosValue = 'creditCard';
    } else if (method === 'tabby') {
      this.paymentRadiosValue = 'tabby';
    } else {
      this.paymentRadiosValue = 'cod';
    }
  }

  onSubmit(stripeToken?: string) {
    const billingAddress = {
      first_name: this.form.value.firstName,
      last_name: this.form.value.lastName,
      address_1: this.form.value.address,
      city: this.form.value.city,
      state: this.form.value.state,
      postcode: `${this.form.value.postCode}`,
      country: this.form.value.countrySelect,
      email: this.form.value.email,
      phone: `${this.form.value.phone}`,
    };
    const shippingAddress = {
      first_name: this.form.value.firstName,
      last_name: this.form.value.lastName,
      address_1: this.form.value.address,
      city: this.form.value.city,
      state: this.form.value.state,
      postcode: `${this.form.value.postCode}`,
      country: this.form.value.countrySelect,
    };
    let paymentGateway: {
      payment_method: string;
      payment_method_title: string;
    } = { payment_method: '', payment_method_title: '' };
    if (this.paymentRadiosValue === 'creditCard') {
      paymentGateway.payment_method = 'stripe';
      paymentGateway.payment_method_title = 'Credit / Debit Card';
    } else {
      paymentGateway.payment_method = 'cod';
      paymentGateway.payment_method_title = 'Cash on delivery';
    }
    this.checkoutService.createOrder(
      {
        billing: billingAddress,
        shipping: shippingAddress,
      },
      paymentGateway,
      stripeToken
    );
  }

  get emailIsInvalid() {
    return this.formValidationService.controlFieldIsInvalid(this.form, 'email');
  }

  get firstNameIsInvalid() {
    return this.formValidationService.controlFieldIsInvalid(
      this.form,
      'firstName'
    );
  }

  get lastNameIsInvalid() {
    return this.formValidationService.controlFieldIsInvalid(
      this.form,
      'lastName'
    );
  }

  get addressIsInvalid() {
    return this.formValidationService.controlFieldIsInvalid(
      this.form,
      'address'
    );
  }

  get cityIsInvalid() {
    return this.formValidationService.controlFieldIsInvalid(this.form, 'city');
  }

  get stateIsInvalid() {
    return this.formValidationService.controlFieldIsInvalid(this.form, 'state');
  }

  get phoneIsInvalid() {
    return this.formValidationService.controlFieldIsInvalid(this.form, 'phone');
  }

  get postCodeIsInvalid() {
    return this.formValidationService.controlFieldIsInvalid(
      this.form,
      'postCode'
    );
  }

  // --------------------------------------------------------

  @ViewChild('cardNumberElement') cardNumberElementRef!: ElementRef;
  @ViewChild('cardExpiryElement') cardExpiryElementRef!: ElementRef;
  @ViewChild('cardCvcElement') cardCvcElementRef!: ElementRef;

  stripe: Stripe | null = null;
  elements: StripeElements | null = null;
  cardNumber: StripeCardNumberElement | null = null;
  cardExpiry: StripeCardExpiryElement | null = null;
  cardCvc: StripeCardCvcElement | null = null;

  // Google pay
  paymentRequest: any;
  prButton!: StripePaymentRequestButtonElement;
  @ViewChild('googlePayButton', { static: true })
  googlePayButtonRef!: ElementRef;
  private stripeService = inject(StripeService);

  ngAfterViewInit() {
    this.initStripe();
    // Google Pay
    // this.paymentRequest = this.stripe!.paymentRequest({
    //   country: 'US', // غيّر حسب بلدك
    //   currency: 'usd', // غيّر حسب العملة
    //   total: {
    //     label: 'إجمالي الطلب',
    //     amount: 1000, // المبلغ بالسنت (مثال: 10 دولار = 1000)
    //   },
    //   requestPayerName: true,
    //   requestPayerEmail: true,
    //   requestShipping: true,
    // });

    // const result = await this.paymentRequest.canMakePayment();

    // const result = await paymentRequest.canMakePayment();
    // console.log(result);
    // if (result) {
    //   console.log('PAAAY', result);
    //   const elements = this.stripe!.elements();
    //   this.prButton = elements.create('paymentRequestButton', {
    //     paymentRequest: paymentRequest,
    //     style: {
    //       paymentRequestButton: {
    //         type: 'default',
    //         theme: 'dark',
    //         height: '40px',
    //       },
    //     },
    //   });
    //   this.prButton.mount(this.googlePayButtonRef.nativeElement);
    // }
  }

  async initStripe() {
    this.stripe = await loadStripe(
      'pk_test_51RD3yPIPLmPtcaOkAPNrNJV5j2bFeHAdAzwZa2Rif9dG6C8psDSow39N3QE66a0F6gbQONj3bb3IeoPFRHOXxMqX00Aw6qKltl'
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
    }
  }

  async payNow() {
    if (this.stripe && this.cardNumber) {
      // نستخدم cardNumber كمثال للتحقق
      const result = await this.stripe.createToken(this.cardNumber);
      if (result.error) {
        console.error(result.error.message);
        alert('فشل الدفع: ' + result.error.message);
      } else if (result.token) {
        console.log('الـ Token: ', result.token.id);

        this.onSubmit(result.token.id);
        // هنا هنضيف منطق إرسال الـ Token لـ WooCommerce لاحقًا
      }
    } else {
      console.error('Stripe أو حقل البطاقة غير جاهز');
    }
  }

  // ------------------------------------------------------------------------------------
  // TABBBY

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
