import { Component, DestroyRef, ElementRef, inject, ViewChild, PLATFORM_ID } from '@angular/core';
import { FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Select } from 'primeng/select';
import { Router, RouterLink } from '@angular/router';
import { RadioButtonModule } from 'primeng/radiobutton';
import { FormValidationService } from '../../../../shared/services/form-validation.service';
import { CheckoutService } from '../../services/checkout.service';
import { StripeService } from '../../services/stripe.service';
import { AsyncPipe, CommonModule, NgClass } from '@angular/common';
import { CheckoutSummaryComponent } from '../checkout-summary/checkout-summary.component';
import { BehaviorSubject, Observable, take, interval } from 'rxjs';
import { switchMap, takeWhile, tap } from 'rxjs/operators';
import { trigger, transition, style, animate } from '@angular/animations';
import { UIService } from '../../../../shared/services/ui.service';
import { isPlatformBrowser } from '@angular/common';
import { Stripe, StripeElements, StripeCardNumberElement, StripeCardExpiryElement, StripeCardCvcElement } from '@stripe/stripe-js';
import { WalletPaymentComponent } from '../googlePay-button/google-pay-button.component';
import { CartService } from '../../../cart/service/cart.service';
import { KlaviyoService } from '../../services/klaviyo.service';
import { WooCommerceAccountService } from '../../../auth/account-details/account-details.service';

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
    WalletPaymentComponent
  ],
  templateUrl: './checkout-form.component.html',
  styleUrls: ['./checkout-form.component.css'],
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateY(-20px)', opacity: '0' }),
        animate('200ms ease-in', style({ transform: 'translateY(0)', opacity: '1' })),
      ]),
      transition(':leave', [
        animate('50ms ease-out', style({ transform: 'translateY(-20px)', opacity: '0' })),
      ]),
    ]),
  ],
})
export class CheckoutFormComponent {
  private destroyRef = inject(DestroyRef);
  private formValidationService = inject(FormValidationService);
  public checkoutService = inject(CheckoutService);
  private uiService = inject(UIService);
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private stripeService = inject(StripeService);
  private cartService = inject(CartService);
  private klaviyoService = inject(KlaviyoService);
  private wooCommerceAccountService = inject(WooCommerceAccountService);

  billingForm!: FormGroup;
  shippingForm!: FormGroup;
  isShippingDifferent = false;
  summaryIsVisible$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  isOrderLoading$: Observable<boolean> = this.uiService.isOrderLoading$;
  isVisible: boolean = false;
  paymentRadiosValue: string = 'stripe';
  selectedBillingCountry$: Observable<string> = this.checkoutService.selectedBillingCountry$;
  avaliableCountries$: Observable<any> = this.checkoutService.getAvaliableCountries();
  avaliablePaymentMethods$: Observable<any> = this.checkoutService.availablePaymentMethods$;
  isPaying: boolean = false;
  isLoading: boolean = false;
  currentPaymentIntentId: string | null = null;

  @ViewChild('cardNumberElement') cardNumberElementRef!: ElementRef;
  @ViewChild('cardExpiryElement') cardExpiryElementRef!: ElementRef;
  @ViewChild('cardCvcElement') cardCvcElementRef!: ElementRef;

  stripe: Stripe | null = null;
  elements: StripeElements | null = null;
  cardNumber: StripeCardNumberElement | null = null;
  cardExpiry: StripeCardExpiryElement | null = null;
  cardCvc: StripeCardCvcElement | null = null;

  ngOnInit() {
    this.billingForm = this.createAddressForm(true);
    this.shippingForm = this.createAddressForm(false);
    this.resetFormState();
    
    // Check if cart has items before proceeding
    this.validateCart();
    
    // Load user details if available
    this.loadUserDetails();
    
    // Detect user's country by IP and set it as default
    this.setCountryFromGeolocation();

    const subscribtion3 = this.billingForm.get('shippingMethod')?.valueChanges.subscribe((method) => {
      if (method === 'different') {
        this.isShippingDifferent = true;
      } else {
        this.isShippingDifferent = false;
        this.shippingForm.get('countrySelect')?.setValue(this.billingForm.controls?.['countrySelect'].value);
      }
      this.toggleShippingForm();
    });

    const subscribtion = this.billingForm.get('paymentMethod')?.valueChanges.subscribe((method) => {
      this.toggleCreditCardValidators(method!);
    });

    const subscribtion2 = this.billingForm.get('countrySelect')?.valueChanges.subscribe((value) => {
      this.onGetSelectedBillingCountry(value);
      if (!this.isShippingDifferent) {
        this.onGetSelectedShippingCountry(value);
      }
    });

    const subscribtion4 = this.shippingForm?.get('countrySelect')?.valueChanges.subscribe((value) => {
      if (this.isShippingDifferent) {
        this.onGetSelectedShippingCountry(value);
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

    this.checkoutService.setBillingForm(this.billingForm);
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.initStripe();
      this.detectWalletPaymentAvailability();
    }
  }

  async detectWalletPaymentAvailability() {
    // Wait for Stripe to be initialized
    this.stripe = await this.stripeService.getStripe();
    if (!this.stripe) {
      this.checkoutService.walletPaymentAvailable$.next(false);
      return;
    }

    try {
      const paymentRequest = this.stripe.paymentRequest({
        country: 'AE',
        currency: 'aed',
        total: {
          label: 'Checkout Payment',
          amount: 1000, // 10 AED in fils (just for testing availability)
        },
        requestPayerName: true,
        requestPayerEmail: true,
      });

      const result = await paymentRequest.canMakePayment();
      // If Apple Pay or Google Pay is available, set to true
      this.checkoutService.walletPaymentAvailable$.next(!!result);
    } catch (error) {
      console.error('Error detecting wallet payment availability:', error);
      this.checkoutService.walletPaymentAvailable$.next(false);
    }
  }

  async initStripe() {
    this.stripe = await this.stripeService.getStripe();
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
    }
  }

  async payNow() {
    if (this.isPaying) {
      console.log('Payment already in progress');
      return;
    }

    if (!this.stripe || !this.cardNumber) {
      this.uiService.showError('Payment system is not ready.');
      return;
    }

    if (!this.isFormValid()) {
      this.uiService.showError('Please fill in all required fields correctly.');
      return;
    }

    // Double check cart is not empty
    try {
      const cartItems = await this.checkoutService.getCartItems().pipe(take(1)).toPromise();
      if (!cartItems || cartItems.length === 0) {
        // this.uiService.showWarning('Your cart is empty. Please add products before checkout.');
        this.router.navigate(['/cart']);
        return;
      }
    } catch (error) {
      console.error('Error checking cart items:', error);
      this.uiService.showError('Unable to access your cart. Please try again.');
      this.router.navigate(['/cart']);
      return;
    }

    this.isPaying = true;
    this.isLoading = true;

    // Check if user wants to subscribe to newsletter
    const subscribeNewsletter = this.billingForm.get('subscribeNewsletter')?.value;
    if (subscribeNewsletter) {
      const email = this.billingForm.get('email')?.value;
      if (email) {
        this.klaviyoService.subscribeToNewsletter(email).subscribe({
          next: () => console.log('Newsletter subscription successful'),
          error: (error) => console.error('Newsletter subscription failed', error)
        });
      }
    }
    
    try {
      const [cartItems, cartTotal] = await Promise.all([
        this.checkoutService.getCartItems().pipe(take(1)).toPromise(),
        this.checkoutService.getCartTotalPrice().pipe(take(1)).toPromise(),
      ]);

      if (!cartItems || !cartTotal) {
        throw new Error('Cart data is not available');
      }

      const orderData = this.prepareOrderData({
        billingForm: this.billingForm,
        shippingForm: this.shippingForm,
        isShippingDifferent: this.isShippingDifferent,
        line_items: cartItems,
      });

      const paymentIntentResponse = await this.checkoutService
        .createPaymentIntent(cartTotal.total, cartTotal.currency, orderData)
        .pipe(take(1))
        .toPromise();

      if (!paymentIntentResponse?.success || !paymentIntentResponse.clientSecret) {
        throw new Error('Failed to create payment intent');
      }

      const clientSecret = paymentIntentResponse.clientSecret;
      this.currentPaymentIntentId = paymentIntentResponse.paymentIntentId || null;

      const { error, paymentIntent } = await this.stripe.confirmCardPayment(clientSecret, {
        payment_method: {
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
            },
          },
        },
      });

      if (error) {
        console.error('Payment failed:', error.message);
        this.uiService.showError('Payment failed: ' + error.message);
        this.currentPaymentIntentId = null;
        this.isLoading = false;
        this.isPaying = false;
            } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        console.log('Payment succeeded:', paymentIntent.id);
        this.currentPaymentIntentId = paymentIntent.id;
        this.pollOrderStatus(paymentIntent.id);
      }
    } catch (error: any) {
      console.error('Error processing payment:', error);
      this.uiService.showError('An error occurred while processing the payment: ' + error.message);
      this.currentPaymentIntentId = null;
      this.isPaying = false;
      this.isLoading = false;
    }
  }

  onPaymentSucceeded(paymentIntentId: string) {
    this.pollOrderStatus(paymentIntentId);
  }

  async onSubmit(paymentToken?: string) {
    if (this.isPaying) {
      return;
    }

    if (!this.isFormValid()) {
      this.uiService.showError('Please fill in all required fields correctly.');
      return;
    }
    
    // Verify cart is not empty before proceeding
    try {
      const cartItems = await this.checkoutService.getCartItems().pipe(take(1)).toPromise();
      if (!cartItems || cartItems.length === 0) {
        // this.uiService.showWarning('Your cart is empty. Please add products before checkout.');
        this.router.navigate(['/cart']);
        return;
      }
    } catch (error) {
      console.error('Error checking cart items:', error);
      this.uiService.showError('Unable to access your cart. Please try again.');
      this.router.navigate(['/cart']);
      return;
    }

    this.isPaying = true;
    this.isLoading = true;

    // Check if user wants to subscribe to newsletter
    const subscribeNewsletter = this.billingForm.get('subscribeNewsletter')?.value;
    if (subscribeNewsletter) {
      const email = this.billingForm.get('email')?.value;
      if (email) {
        this.klaviyoService.subscribeToNewsletter(email).subscribe({
          next: () => console.log('Newsletter subscription successful'),
          error: (error) => console.error('Newsletter subscription failed', error)
        });
      }
    }

    const paymentMethod = this.billingForm.get('paymentMethod')?.value;
    if (paymentMethod === 'cod') {
      this.checkoutService
        .createOrder(
          {
            billingForm: this.billingForm,
            shippingForm: this.shippingForm,
            isShippingDifferent: this.isShippingDifferent,
          },
          undefined
        )
        .subscribe({
          next: (response) => {
            console.log('COD order created successfully:', response);
            if (response && response.id) {
              this.router.navigate(['/order-received', response.id]);
              this.cartService.clearUserCart();
              this.isLoading = false;
            }
          },
          error: (error) => {
            console.error('Error creating COD order:', error);
            const errorMessage = error.message || 'Please try again later';
            this.uiService.showError(`Error creating order: ${errorMessage}`);
            this.isPaying = false;
            this.isLoading = false;
                    },
          complete: () => {
            // No need to reset isPaying here as we're navigating away
          }
        });
    }
  }

  private pollOrderStatus(paymentIntentId: string) {
    interval(2000).pipe(
      switchMap(() => this.checkoutService.checkOrderStatus(paymentIntentId)),
      takeWhile((response) => !(response.success && response.orderId), true),
      tap((response) => {
        if (response.success && response.orderId) {
          this.router.navigate(['/order-received', response.orderId]);
          this.isLoading = false
        }
      })
    ).subscribe({
      error: (error) => {
        this.uiService.showError('An error occurred while checking order status: ' + (error.message || 'Please try again.'));
        this.router.navigate(['/']);
        this.isLoading = false
      },
    });
  }

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
    const billingAddress = {
      first_name: billingForm.get('firstName')?.value || '',
      last_name: billingForm.get('lastName')?.value || '',
      address_1: billingForm.get('address')?.value || '',
      city: billingForm.get('city')?.value || '',
      state: billingForm.get('state')?.value || '',
      postcode: `${billingForm.get('postCode')?.value}` || '',
      country: billingForm.get('countrySelect')?.value || '',
      email: billingForm.get('email')?.value || '',
      phone: `${billingForm.get('phone')?.value}` || '',
    };

    const shippingAddress = isShippingDifferent
      ? {
          first_name: shippingForm.get('firstName')?.value || '',
          last_name: shippingForm.get('lastName')?.value || '',
          address_1: shippingForm.get('address')?.value || '',
          city: shippingForm.get('city')?.value || '',
          state: shippingForm.get('state')?.value || '',
          postcode: `${billingForm.get('postCode')?.value}` || '',
          country: shippingForm.get('countrySelect')?.value || '',
        }
      : { ...billingAddress };

    return {
      billing: billingAddress,
      shipping: shippingAddress,
      line_items: line_items || [],
    };
  }

  private createAddressForm(includeContactInfo: boolean): FormGroup {
    const formControls: { [key: string]: FormControl } = {
      countrySelect: new FormControl('', [Validators.required]),
      firstName: new FormControl('', [Validators.maxLength(30), Validators.required]),
      lastName: new FormControl('', [Validators.maxLength(30), Validators.required]),
      address: new FormControl('', [Validators.maxLength(30), Validators.required]),
      apartment: new FormControl('', [Validators.maxLength(30)]),
      city: new FormControl('', [Validators.maxLength(30), Validators.required]),
      state: new FormControl('', [Validators.maxLength(30), Validators.required]),
      paymentMethod: new FormControl('stripe', [Validators.required]),
      shippingMethod: new FormControl('same', [Validators.required]),
    };

    if (includeContactInfo) {
      formControls['email'] = new FormControl('', [Validators.email, Validators.required]);
      formControls['phone'] = new FormControl('', [Validators.maxLength(30), Validators.required]);
      formControls['postCode'] = new FormControl('', [Validators.maxLength(30), Validators.required]);
      formControls['subscribeNewsletter'] = new FormControl(false);
    }

    return new FormGroup(formControls);
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
      paymentMethod: 'stripe',
      shippingMethod: 'same',
      email: '',
      phone: '',
      postCode: '',
      subscribeNewsletter: false,
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

  onGetSelectedShippingCountry(selectedCountry: string) {
    this.checkoutService.getSelectedShippingCountry(selectedCountry);
  }

  onGetSelectedBillingCountry(selectedCountry: string) {
    this.checkoutService.getSelectedBillingCountry(selectedCountry);
  }

  get emailIsInvalid() {
    return this.formValidationService.controlFieldIsInvalid(this.billingForm, 'email');
  }

  get emailFieldValue() {
    let loadedUserData: any = localStorage.getItem('auth_user');
    loadedUserData = loadedUserData ? JSON.parse(loadedUserData) : null;
    return loadedUserData?.value?.email || '';
  }

  get firstNameIsInvalid() {
    return this.formValidationService.controlFieldIsInvalid(this.billingForm, 'firstName');
  }

  get lastNameIsInvalid() {
    return this.formValidationService.controlFieldIsInvalid(this.billingForm, 'lastName');
  }

  get addressIsInvalid() {
    return this.formValidationService.controlFieldIsInvalid(this.billingForm, 'address');
  }

  get cityIsInvalid() {
    return this.formValidationService.controlFieldIsInvalid(this.billingForm, 'city');
  }

  get stateIsInvalid() {
    return this.formValidationService.controlFieldIsInvalid(this.billingForm, 'state');
  }

  get phoneIsInvalid() {
    return this.formValidationService.controlFieldIsInvalid(this.billingForm, 'phone');
  }

  get postCodeIsInvalid() {
    return this.formValidationService.controlFieldIsInvalid(this.billingForm, 'postCode');
  }

  get paymentMethodIsInvalid() {
    return this.formValidationService.controlFieldIsInvalid(this.billingForm, 'paymentMethod');
  }

  // Load user details from account service to pre-fill the form
  private loadUserDetails() {
    if (this.wooCommerceAccountService.isLoggedIn()) {
      const userId = this.wooCommerceAccountService.getCustomerId();
      if (userId) {
        this.wooCommerceAccountService.getCustomerDetails(userId).subscribe({
          next: (userDetails) => {
            console.log('Retrieved user details:', userDetails);
            this.populateFormWithUserDetails(userDetails);
          },
          error: (error) => {
            console.error('Error retrieving user details:', error);
            // Still use basic info from localStorage if available
            this.populateBasicUserDetails();
          }
        });
      } else {
        // Fallback to basic info from localStorage
        this.populateBasicUserDetails();
      }
    } else {
      // Not logged in but we might have email from localStorage
      this.populateBasicUserDetails();
    }
  }

  // Fill form with user details from API
  private populateFormWithUserDetails(userDetails: any) {
    if (!userDetails) return;
    
    // Set billing details
    const billing = userDetails.billing || {};
    const patchValues: any = {
      email: userDetails.email || this.emailFieldValue,
      firstName: billing.first_name || userDetails.first_name || '',
      lastName: billing.last_name || userDetails.last_name || '',
      phone: billing.phone || '',
      address: billing.address_1 || '',
      apartment: billing.address_2 || '',
      city: billing.city || '',
      state: billing.state || '',
    };
    
    // Only set country if not already set by geolocation
    if (billing.country && !this.billingForm.get('countrySelect')?.value) {
      patchValues.countrySelect = billing.country;
      this.checkoutService.getSelectedBillingCountry(billing.country);
    }
    
    this.billingForm.patchValue(patchValues);
    
    // Set shipping details if different
    if (this.isShippingDifferent && userDetails.shipping) {
      const shipping = userDetails.shipping;
      this.shippingForm.patchValue({
        firstName: shipping.first_name || userDetails.first_name || '',
        lastName: shipping.last_name || userDetails.last_name || '',
        address: shipping.address_1 || '',
        apartment: shipping.address_2 || '',
        city: shipping.city || '',
        state: shipping.state || '',
        countrySelect: shipping.country || this.billingForm.get('countrySelect')?.value || '',
      });
      
      if (shipping.country) {
        this.checkoutService.getSelectedShippingCountry(shipping.country);
      }
    }
  }

  // Fill form with basic details from localStorage
  private populateBasicUserDetails() {
    const emailValue = this.emailFieldValue;
    if (emailValue) {
      this.billingForm.get('email')?.setValue(emailValue);
    }
  }

  // Set country based on geolocation
  private setCountryFromGeolocation() {
    // Check if user location is available in localStorage
    const savedLocation = localStorage.getItem('user_location');
    if (savedLocation) {
      try {
        const location = JSON.parse(savedLocation);
        if (location && location.country_code) {
          // Set the country code in form and notify the service
          this.billingForm.get('countrySelect')?.setValue(location.country_code);
          this.checkoutService.getSelectedBillingCountry(location.country_code);
          
          // Also update shipping form if using same address
          if (!this.isShippingDifferent) {
            this.shippingForm.get('countrySelect')?.setValue(location.country_code);
            this.checkoutService.getSelectedShippingCountry(location.country_code);
          }
          
          console.log('Set form country from localStorage geolocation:', location.country_code);
        } else {
          // If no saved location, try to detect it
          this.checkoutService.setDefaultCountryBasedOnGeolocation();
        }
      } catch (e) {
        console.error('Error parsing saved location:', e);
        this.checkoutService.setDefaultCountryBasedOnGeolocation();
      }
    } else {
      // No saved location, detect it
      this.checkoutService.setDefaultCountryBasedOnGeolocation();
    }
  }

  /**
   * Validates if the cart has items before allowing checkout
   * Redirects to cart page with a message if cart is empty
   */
  private validateCart(): void {
    this.checkoutService.getCartItems().pipe(take(1)).subscribe({
      next: (cartItems) => {
        if (!cartItems || cartItems.length === 0) {
          // Cart is empty - redirect to cart page with message
          // this.uiService.showWarning('Your cart is empty. Please add products before proceeding to checkout.');
          this.router.navigate(['/cart']);
        }
      },
      error: (error) => {
        console.error('Error validating cart:', error);
        if (error.status === 404 || error.error?.message?.includes('Valid cart id')) {
          // Cart not found or invalid cart ID (guest user without cart)
          // this.uiService.showWarning('Your cart is empty. Please add products before proceeding to checkout.');
          this.router.navigate(['/cart']);
        } else {
          this.uiService.showError('Error loading cart. Please try again later.');
          this.router.navigate(['/']);
        }
      }
    });
  }
}
