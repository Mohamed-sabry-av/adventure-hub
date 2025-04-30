import {
  Component,
  DestroyRef,
  ElementRef,
  inject,
  ViewChild,
  PLATFORM_ID,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  FormGroup,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Select } from 'primeng/select';
import { Router, RouterLink } from '@angular/router';
import { RadioButtonModule } from 'primeng/radiobutton';
import { FormValidationService } from '../../../../shared/services/form-validation.service';
import { CheckoutService } from '../../services/checkout.service';
import { AsyncPipe, CommonModule, NgClass } from '@angular/common';
import {
  loadStripe,
  Stripe,
  StripeElements,
  StripeCardNumberElement,
  StripeCardExpiryElement,
  StripeCardCvcElement,
  StripePaymentRequestButtonElement,
} from '@stripe/stripe-js';
import { CheckoutSummaryComponent } from '../checkout-summary/checkout-summary.component';
import { BehaviorSubject, Observable, take } from 'rxjs';
import { trigger, transition, style, animate } from '@angular/animations';
import { UIService } from '../../../../shared/services/ui.service';
import { isPlatformBrowser } from '@angular/common';

interface CartItem {
  product_id: number;
  quantity: number;
  [key: string]: any;
}

interface CartTotal {
  total: number;
  currency: string;
}

interface PaymentIntentResponse {
  success: boolean;
  clientSecret: string;
  paymentIntentId: string;
}

@Component({
  selector: 'app-checkout-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RadioButtonModule,
    RouterLink,
    Select,
    NgClass,
    CheckoutSummaryComponent,
    AsyncPipe,
  ],
  templateUrl: './checkout-form.component.html',
  styleUrls: ['./checkout-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,

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
  public checkoutService = inject(CheckoutService);
  private uiService = inject(UIService);
  private platformId: Object = inject(PLATFORM_ID);
  private router = inject(Router);

  billingForm!: FormGroup;
  shippingForm!: FormGroup;
  isShippingDifferent = false;
  summaryIsVisible$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(
    false
  );
  isOrderLoading$: Observable<boolean> = this.uiService.isOrderLoading$;
  isVisible: boolean = false;
  paymentRadiosValue: string = 'stripe';
  selectedBillingCountry$: Observable<string> =
    this.checkoutService.selectedBillingCountry$;
  avaliableCountries$: Observable<any> =
    this.checkoutService.getAvaliableCountries();
  avaliablePaymentMethods$: Observable<any> =
    this.checkoutService.availablePaymentMethods$;
  isPaying: boolean = false;
  currentPaymentIntentId: string | null = null;

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

  // Initialize component and forms
  ngOnInit() {
    this.billingForm = this.createAddressForm(true);
    this.shippingForm = this.createAddressForm(false);
    this.resetFormState();

    const subscription3 = this.billingForm
      .get('shippingMethod')
      ?.valueChanges.subscribe((method) => {
        if (method === 'different') {
          this.isShippingDifferent = true;
        } else {
          this.isShippingDifferent = false;
          this.shippingForm
            .get('countrySelect')
            ?.setValue(this.billingForm.controls?.['countrySelect'].value);
        }
        this.toggleShippingForm();
      });

    const subscription = this.billingForm
      .get('paymentMethod')
      ?.valueChanges.subscribe((method) => {
        this.toggleCreditCardValidators(method!);
      });

    const subscription2 = this.billingForm
      .get('countrySelect')
      ?.valueChanges.subscribe((value) => {
        this.onGetSelectedBillingCountry(value);

        if (!this.isShippingDifferent) {
          this.onGetSelectedShippingCountry(value);
        }
      });

    const subscription4 = this.shippingForm
      ?.get('countrySelect')
      ?.valueChanges.subscribe((value) => {
        if (this.isShippingDifferent) {
          this.onGetSelectedShippingCountry(value);
        }
      });

    this.destroyRef.onDestroy(() => {
      subscription?.unsubscribe();
      subscription2?.unsubscribe();
      subscription3?.unsubscribe();
      subscription4?.unsubscribe();
    });

    const emailValue = this.emailFieldValue;
    if (emailValue) {
      this.billingForm.get('email')?.setValue(emailValue);
    }
  }

  // Initialize Stripe after view is rendered
  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.initStripe();
    }
  }

  // Load and initialize Stripe
  async initStripe() {
    this.stripe = await loadStripe(
      'pk_test_51RGe55G0IhgrvppwwIADEDYdoX8XFiOhi4hHHl9pztg3JjECc5QHfQOn7N0Wjyyrw6n6BZJtNF7GFXtakPSvwHkx00vBmKZw45'
    );
    if (this.stripe) {
      this.elements = this.stripe.elements();
      const style = {
        base: {
          fontSize: '16px',
          color: '#32325d',
          '::placeholder': { color: '#aab7c4' },
        },
      };

      this.cardNumber = this.elements.create('cardNumber', { style });
      this.cardExpiry = this.elements.create('cardExpiry', { style });
      this.cardCvc = this.elements.create('cardCvc', { style });

      this.cardNumber.mount(this.cardNumberElementRef.nativeElement);
      this.cardExpiry.mount(this.cardExpiryElementRef.nativeElement);
      this.cardCvc.mount(this.cardCvcElementRef.nativeElement);

      this.initWalletPayments();
    }
  }

  // Initialize Google Pay and Apple Pay
  async initWalletPayments() {
    if (!this.stripe || !this.elements || !this.googlePayButtonRef) {
      console.error(
        'Stripe, elements, or googlePayButtonRef is not available:',
        {
          stripe: !!this.stripe,
          elements: !!this.elements,
          googlePayButtonRef: !!this.googlePayButtonRef,
        }
      );
      return;
    }

    try {
      const cartTotal = await this.checkoutService
        .getCartTotalPrice()
        .pipe(take(1))
        .toPromise();
      if (!cartTotal) {
        throw new Error('Cart total is not available');
      }

      const currency = cartTotal.currency.toLowerCase();
      const amountInFils = Math.round(cartTotal.total * 100);

      console.log('Cart total:', cartTotal);
      console.log('Amount in fils:', amountInFils);

      this.paymentRequest = this.stripe.paymentRequest({
        country: 'AE',
        currency: currency,
        total: {
          label: 'Order Total',
          amount: amountInFils,
        },

        requestPayerName: true,
        requestPayerEmail: true,
        requestPayerPhone: true,
        requestShipping: true,
        shippingOptions: [
          {
            id: 'standard',
            label: 'Standard Shipping',
            amount: 0,
            detail: 'Delivery within 2-3 business days', // Default for UAE
          },
        ],
      });

      const result = await this.paymentRequest.canMakePayment();
      console.log('canMakePayment result:', result);

      if (result) {
        if (result.applePay) {
          this.applePaySupported = true;
          console.log('Apple Pay is supported');
        }
        if (result.googlePay) {
          this.googlePaySupported = true;
          console.log('Google Pay is supported');
          const paymentMethodControl = this.billingForm.get('paymentMethod');
          if (paymentMethodControl) {
            paymentMethodControl.patchValue('googlePay');
          }
        }

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

        console.log(
          'Mounting Google Pay button to:',
          this.googlePayButtonRef.nativeElement
        );
        this.prButton.mount(this.googlePayButtonRef.nativeElement);
        console.log('Google Pay button mounted successfully');

        this.paymentRequest.on('paymentmethod', async (event: any) => {
          console.log('Payment method received:', event.paymentMethod);
          const paymentType =
            event.paymentMethod.card.wallet?.type || 'walletPayment';
          const paymentMethodControl = this.billingForm.get('paymentMethod');
          if (paymentMethodControl) {
            paymentMethodControl.patchValue(
              paymentType === 'google_pay'
                ? 'googlePay'
                : paymentType === 'apple_pay'
                ? 'applePay'
                : 'walletPayment'
            );
          }

          // Extract billing address
          const billingDetails = event.paymentMethod.billing_details || {};
          const fullName = billingDetails.name || '';
          let firstName = '';
          let lastName = '';

          if (fullName) {
            const nameParts = fullName.trim().split(' ');
            firstName = nameParts[0] || '';
            lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
          } else {
            // Fallback: Derive firstName from email or use default
            const email = billingDetails.email || '';
            firstName = email.split('@')[0] || 'Customer';
            lastName = '';
            console.warn(
              'No name provided by Google Pay, using fallback:',
              firstName
            );
          }

          this.billingForm.patchValue({
            firstName: firstName,
            lastName: lastName,
            address: billingDetails.address?.line1 || '',
            city: billingDetails.address?.city || '',
            state: billingDetails.address?.state || '',
            postCode: billingDetails.address?.postal_code || '',
            countrySelect: billingDetails.address?.country || 'AE',
            email: billingDetails.email || '',
            phone: billingDetails.phone || '',
          });

          console.log('Billing form after patching:', this.billingForm.value);

          // Extract shipping address
          const shippingAddress = event.shippingAddress || {};
          const shippingFullName =
            shippingAddress.recipient ||
            fullName ||
            billingDetails.email?.split('@')[0] ||
            'Customer';
          let shippingFirstName = '';
          let shippingLastName = '';

          if (shippingFullName) {
            const shippingNameParts = shippingFullName.trim().split(' ');
            shippingFirstName = shippingNameParts[0] || '';
            shippingLastName =
              shippingNameParts.length > 1
                ? shippingNameParts.slice(1).join(' ')
                : '';
          }

          if (this.isShippingDifferent) {
            this.shippingForm.patchValue({
              firstName: shippingFirstName,
              lastName: shippingLastName,
              address: shippingAddress.addressLine?.[0] || '',
              city: shippingAddress.city || '',
              state: shippingAddress.region || '',
              postCode: shippingAddress.postalCode || '',
              countrySelect: shippingAddress.country || 'AE',
            });

            console.log(
              'Shipping form after patching:',
              this.shippingForm.value
            );
          }

          try {
            // Prepare order data
            const cartItems = await this.checkoutService
              .getCartItems()
              .pipe(take(1))
              .toPromise();
            if (!cartItems) {
              throw new Error('Cart items are not available');
            }

            const orderData = this.prepareOrderData({
              billingForm: this.billingForm,
              shippingForm: this.shippingForm,
              isShippingDifferent: this.isShippingDifferent,
              line_items: cartItems,
            });

            console.log('Order data to be sent:', orderData);

            // Create payment intent
            const paymentIntentResponse = await this.checkoutService
              .createPaymentIntent(
                cartTotal.total,
                cartTotal.currency,
                orderData
              )
              .pipe(take(1))
              .toPromise();

            if (
              !paymentIntentResponse ||
              !paymentIntentResponse.success ||
              !paymentIntentResponse.clientSecret
            ) {
              event.complete('fail');
              this.uiService.showError('Failed to create payment intent');
              return;
            }

            const clientSecret = paymentIntentResponse.clientSecret;
            this.currentPaymentIntentId =
              paymentIntentResponse.paymentIntentId || null;

            // Confirm the payment with Google Pay payment method
            if (!this.stripe) {
              event.complete('fail');
              this.uiService.showError('Payment system is not ready');
              return;
            }

            const { error, paymentIntent } =
              await this.stripe.confirmCardPayment(clientSecret, {
                payment_method: event.paymentMethod.id,
              });

            if (error) {
              console.error('Payment failed:', error.message);
              event.complete('fail');
              this.uiService.showError('Payment failed: ' + error.message);
              return;
            }

            if (paymentIntent && paymentIntent.status === 'succeeded') {
              console.log('Payment succeeded:', paymentIntent.id);
              event.complete('success');

              // Create the order with the payment intent ID
              try {
                const orderResponse = await this.checkoutService
                  .createOrder(
                    {
                      billingForm: this.billingForm,
                      shippingForm: this.shippingForm,
                      isShippingDifferent: this.isShippingDifferent,
                    },
                    paymentIntent.id
                  )
                  .pipe(take(1))
                  .toPromise();

                if (orderResponse && orderResponse.id) {
                  this.router.navigate([
                    '/order-confirmation',
                    orderResponse.id,
                  ]);
                } else {
                  throw new Error('Order ID not found in response');
                }
              } catch (orderError: any) {
                console.error('Failed to create order:', orderError);
                this.uiService.showError(
                  'Failed to create order: ' +
                    (orderError.message || 'Please try again')
                );
                event.complete('fail');
                return;
              }
            } else {
              event.complete('fail');
              this.uiService.showError('Payment was not successful');
            }
          } catch (error: any) {
            console.error('Error processing payment:', error);
            event.complete('fail');
            this.uiService.showError(
              'An error occurred while processing the payment: ' + error.message
            );
          }
        });

        this.paymentRequest.on('shippingaddresschange', (event: any) => {
          const country = event.shippingAddress.country || 'AE';
          const shippingDetail =
            country === 'AE'
              ? 'Delivery within 2-3 business days'
              : 'Our representative will contact you for more shipping details';

          event.updateWith({
            status: 'success',
            shippingOptions: [
              {
                id: 'standard',
                label: 'Standard Shipping',
                amount: 0,
                detail: shippingDetail,
              },
            ],
          });
        });
      } else {
        console.log('No supported wallet payment methods found');
      }
    } catch (error: any) {
      console.error('Error initializing wallet payments:', error);
      this.uiService.showError(
        'Failed to initialize wallet payments: ' + error.message
      );
    }
  }

  // Process card payment
  async payNow() {
    if (this.isPaying) {
      console.log('Payment already in progress');
      return;
    }

    if (!this.stripe || !this.cardNumber) {
      console.error('Stripe or card field is not ready');
      this.uiService.showError('Payment system is not ready');
      return;
    }

    if (!this.isFormValid()) {
      this.uiService.showError('Please fill all required fields correctly');
      return;
    }

    // Validate name fields for card payments
    const firstName = this.billingForm.get('firstName')?.value;
    if (!firstName) {
      this.uiService.showError('Please enter the first name');
      return;
    }

    if (this.isShippingDifferent) {
      const shippingFirstName = this.shippingForm.get('firstName')?.value;
      if (!shippingFirstName) {
        this.uiService.showError('Please enter the first name for shipping');
        return;
      }
    }

    this.isPaying = true;
    try {
      const [cartItems, cartTotal] = await Promise.all([
        this.checkoutService.getCartItems().pipe(take(1)).toPromise(),
        this.checkoutService.getCartTotalPrice().pipe(take(1)).toPromise(),
      ]);

      if (!cartItems) {
        throw new Error('Cart items are not available');
      }

      if (!cartTotal) {
        throw new Error('Cart total is not available');
      }

      const orderData = this.prepareOrderData({
        billingForm: this.billingForm,
        shippingForm: this.shippingForm,
        isShippingDifferent: this.isShippingDifferent,
        line_items: cartItems,
      });

      console.log('Order data to be sent:', orderData);

      const paymentIntentResponse = await this.checkoutService
        .createPaymentIntent(cartTotal.total, cartTotal.currency, orderData)
        .pipe(take(1))
        .toPromise();

      if (!paymentIntentResponse) {
        throw new Error(
          'Failed to create payment intent: Response is not available'
        );
      }

      if (
        !paymentIntentResponse.success ||
        !paymentIntentResponse.clientSecret
      ) {
        throw new Error('Failed to create payment intent');
      }

      const clientSecret = paymentIntentResponse.clientSecret;
      this.currentPaymentIntentId =
        paymentIntentResponse.paymentIntentId || null;

      console.log('Payment intent created:', paymentIntentResponse);

      const { error, paymentIntent } = await this.stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: this.cardNumber,
            billing_details: {
              name: `${this.billingForm.get('firstName')?.value} ${
                this.billingForm.get('lastName')?.value || ''
              }`.trim(),
              email: this.billingForm.get('email')?.value,
              phone: this.billingForm.get('phone')?.value,
              address: {
                line1: this.billingForm.get('address')?.value,
                city: this.billingForm.get('city')?.value,
                state: this.billingForm.get('state')?.value,
                postal_code: this.billingForm.get('postCode')?.value,
                country: this.billingForm.get('countrySelect')?.value,
              },
            },
          },
        }
      );

      if (error) {
        console.error('Payment failed:', error.message);
        this.uiService.showError('Payment failed: ' + error.message);
        this.currentPaymentIntentId = null;
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        console.log('Payment succeeded:', paymentIntent.id);
        this.onSubmit(paymentIntent.id);
        this.currentPaymentIntentId = null;
      }
    } catch (error: any) {
      console.error('Error processing payment:', error);
      this.uiService.showError(
        'An error occurred while processing the payment: ' + error.message
      );
      this.currentPaymentIntentId = null;
    } finally {
      this.isPaying = false;
    }
  }

  // Submit order to server
  onSubmit(paymentToken?: string) {
    if (!this.isFormValid()) {
      this.uiService.showError('Please fill all required fields correctly');
      return;
    }

    console.log('Submitting order with payment token:', paymentToken);
    console.log('Billing Form:', this.billingForm.value);
    console.log('Shipping Form:', this.shippingForm.value);
    console.log('Is Shipping Different:', this.isShippingDifferent);

    this.checkoutService
      .createOrder(
        {
          billingForm: this.billingForm,
          shippingForm: this.shippingForm,
          isShippingDifferent: this.isShippingDifferent,
        },
        paymentToken
      )
      .subscribe({
        next: (response) => {
          console.log('Order created successfully:', response);
          if (response && response.id) {
            this.router.navigate(['/order-confirmation', response.id]);
          }
        },
        error: (error) => {
          console.error('Error creating order:', error);
          this.uiService.showError(
            'An error occurred while creating the order: ' +
              (error.message || 'Please try again')
          );
        },
      });
  }

  // Prepare order data for server
  prepareOrderData({
    billingForm,
    shippingForm,
    isShippingDifferent,
    line_items,
  }: {
    billingForm: FormGroup;
    shippingForm: FormGroup;
    isShippingDifferent: boolean;
    line_items: CartItem[];
  }): { billing: any; shipping: any; line_items: CartItem[] } {
    const billingFirstName =
      billingForm.get('firstName')?.value ||
      billingForm.get('email')?.value?.split('@')[0] ||
      'Customer';
    const billingLastName = billingForm.get('lastName')?.value || '';

    const billingAddress = {
      first_name: billingFirstName,
      last_name: billingLastName,
      address_1: billingForm.get('address')?.value || '',
      city: billingForm.get('city')?.value || '',
      state: billingForm.get('state')?.value || '',
      postcode: `${billingForm.get('postCode')?.value || ''}`,
      country: billingForm.get('countrySelect')?.value || '',
      email: billingForm.get('email')?.value || '',
      phone: `${billingForm.get('phone')?.value || ''}`,
    };

    const shippingAddress = isShippingDifferent
      ? {
          first_name: shippingForm.get('firstName')?.value || billingFirstName,
          last_name: shippingForm.get('lastName')?.value || billingLastName,
          address_1: shippingForm.get('address')?.value || '',
          city: shippingForm.get('city')?.value || '',
          state: shippingForm.get('state')?.value || '',
          postcode: `${shippingForm.get('postCode')?.value || ''}`,
          country: shippingForm.get('countrySelect')?.value || '',
        }
      : { ...billingAddress };

    return {
      billing: billingAddress,
      shipping: shippingAddress,
      line_items: [{ product_id: 132940, quantity: 1000 }],
    };
  }

  // Create form for billing or shipping
  private createAddressForm(includeContactInfo: boolean): FormGroup {
    const formControls: { [key: string]: FormControl } = {
      countrySelect: new FormControl('', [Validators.required]),
      firstName: new FormControl('', [
        Validators.maxLength(30),
        Validators.required,
      ]),
      lastName: new FormControl('', [Validators.maxLength(30)]),
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
      paymentMethod: new FormControl('stripe'),
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

  // Reset form state
  private resetFormState() {
    this.billingForm.reset({
      countrySelect: '',
      firstName: '',
      lastName: '',
      address: '',
      apartment: '',
      city: '',
      state: '',
      paymentMethod: 'stripe',
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
      postCode: '',
    });

    this.paymentRadiosValue = 'stripe';
    this.isShippingDifferent = false;
    this.isVisible = false;
    this.summaryIsVisible$.next(false);

    this.toggleCreditCardValidators('stripe');
    this.toggleShippingForm();
  }

  // Toggle summary visibility
  onShowSummary() {
    this.isVisible = !this.isVisible;
    this.summaryIsVisible$.next(this.isVisible);
  }

  // Update payment method validators
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

  // Enable or disable shipping form
  toggleShippingForm() {
    if (this.isShippingDifferent) {
      this.shippingForm.enable();
    } else {
      this.shippingForm.disable();
    }
  }

  // Check if form is valid
  isFormValid(): boolean {
    if (this.isShippingDifferent) {
      return this.billingForm.valid && this.shippingForm.valid;
    }
    return this.billingForm.valid;
  }

  // Update selected shipping country
  onGetSelectedShippingCountry(selectedCountry: string) {
    this.checkoutService.getSelectedShippingCountry(selectedCountry);
  }

  // Update selected billing country
  onGetSelectedBillingCountry(selectedCountry: string) {
    this.checkoutService.getSelectedBillingCountry(selectedCountry);
  }

  // Validate email field
  get emailIsInvalid() {
    return this.formValidationService.controlFieldIsInvalid(
      this.billingForm,
      'email'
    );
  }

  // Get email from local storage
  get emailFieldValue() {
    let loadedUserData: any = localStorage.getItem('auth_user');
    loadedUserData = loadedUserData ? JSON.parse(loadedUserData) : null;
    return loadedUserData?.value?.email || '';
  }

  // Validate first name field
  get firstNameIsInvalid() {
    return this.formValidationService.controlFieldIsInvalid(
      this.billingForm,
      'firstName'
    );
  }

  // Validate last name field
  get lastNameIsInvalid() {
    return this.formValidationService.controlFieldIsInvalid(
      this.billingForm,
      'lastName'
    );
  }

  // Validate address field
  get addressIsInvalid() {
    return this.formValidationService.controlFieldIsInvalid(
      this.billingForm,
      'address'
    );
  }

  // Validate city field
  get cityIsInvalid() {
    return this.formValidationService.controlFieldIsInvalid(
      this.billingForm,
      'city'
    );
  }

  // Validate state field
  get stateIsInvalid() {
    return this.formValidationService.controlFieldIsInvalid(
      this.billingForm,
      'state'
    );
  }

  // Validate phone field
  get phoneIsInvalid() {
    return this.formValidationService.controlFieldIsInvalid(
      this.billingForm,
      'phone'
    );
  }

  // Validate postcode field
  get postCodeIsInvalid() {
    return this.formValidationService.controlFieldIsInvalid(
      this.billingForm,
      'postCode'
    );
  }
}
