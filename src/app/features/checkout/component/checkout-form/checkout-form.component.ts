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
    false
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
    const fields = ['cardNumber', 'expDate', 'securityCode', 'nameOnCard'];

    fields.forEach((fieldName) => {
      const control = this.form.get(fieldName);

      if (method === 'creditCard') {
        control?.setValidators([Validators.required, Validators.maxLength(30)]);
        this.paymentRadiosValue = 'creditCard';
      } else {
        this.paymentRadiosValue = 'cod';
        control?.clearValidators();
      }

      control?.updateValueAndValidity();
    });
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

  async ngAfterViewInit() {
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
    // Google Pay
    this.paymentRequest = this.stripe!.paymentRequest({
      country: 'US', // غيّر حسب بلدك
      currency: 'usd', // غيّر حسب العملة
      total: {
        label: 'إجمالي الطلب',
        amount: 1000, // المبلغ بالسنت (مثال: 10 دولار = 1000)
      },
      requestPayerName: true,
      requestPayerEmail: true,
      requestShipping: true,
    });

    const result = await this.paymentRequest.canMakePayment();

    // const result = await paymentRequest.canMakePayment();
    console.log(result);
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
}
