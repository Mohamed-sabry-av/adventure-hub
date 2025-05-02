import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, OnInit, OnChanges, SimpleChanges, AfterViewInit } from '@angular/core';
import { loadStripe, Stripe, StripeElements, StripePaymentRequestButtonElement } from '@stripe/stripe-js';
import { UIService } from '../../../../shared/services/ui.service'; // Adjust path as needed
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, Inject } from '@angular/core';
import { take } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { interval } from 'rxjs';
import { switchMap, takeWhile, tap } from 'rxjs/operators';
import { CheckoutService } from '../../../checkout/services/checkout.service';

@Component({
  selector: 'app-product-payment',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="payment-container mt-4 flex justify-center items-center">
      <div class="flex items-center gap-4 py-4">
        <span class="flex-grow h-px bg-gray-400"></span>
        <span class="text-gray-400 text-sm">OR</span>
        <span class="flex-grow h-px bg-gray-400"></span>
      </div>
      <div #paymentRequestButton class="w-full max-w-[262px] payment-button-container"></div>
    </div>
  `,
  styles: [`
    .payment-container {
      flex-direction: column;
    }
    .payment-button-container {
      border: 2px solid blue; /* Debug: Make container visible */
      min-height: 40px; /* Ensure space for button */
    }
    [class*="paymentRequestButton"] {
      border: 1px solid red; /* Debug: Make Stripe button visible */
    }
  `]
})
export class ProductPaymentComponent implements OnInit, OnChanges, AfterViewInit {
  @Input() product: any;
  @Input() selectedVariation: any;
  @Input() quantity: number = 1;
  @Output() paymentSuccess = new EventEmitter<string>();
  @Output() paymentError = new EventEmitter<string>();

  @ViewChild('paymentRequestButton') paymentRequestButtonRef!: ElementRef;

  stripe: Stripe | null = null;
  elements: StripeElements | null = null;
  paymentRequest: any;
  paymentRequestButton: StripePaymentRequestButtonElement | null = null;
  isPaying: boolean = false;
  isPaymentButtonVisible: boolean = false;

  constructor(
    private checkoutService: CheckoutService,
    private uiService: UIService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.initStripe();
    }
  }

  ngAfterViewInit() {
    console.log('ngAfterViewInit: paymentRequestButtonRef available:', !!this.paymentRequestButtonRef);
    if (this.stripe && this.elements && this.paymentRequestButtonRef) {
      console.log('ngAfterViewInit: Initializing wallet payments');
      this.initWalletPayments();
    } else {
      console.error('ngAfterViewInit: Cannot initialize wallet payments', {
        stripe: !!this.stripe,
        elements: !!this.elements,
        paymentRequestButtonRef: !!this.paymentRequestButtonRef,
      });
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if ((changes['product'] || changes['selectedVariation'] || changes['quantity']) && this.stripe && this.elements && this.paymentRequestButtonRef) {
      console.log('ngOnChanges: Input changes detected', {
        product: this.product,
        selectedVariation: this.selectedVariation,
        quantity: this.quantity,
      });
      this.initWalletPayments();
    }
  }

  async initStripe() {
    try {
      console.log('initStripe: Loading Stripe');
      this.stripe = await loadStripe('pk_test_51RGe55G0IhgrvppwwIADEDYdoX8XFiOhi4hHHl9pztg3JjECc5QHfQOn7N0Wjyyrw6n6BZJtNF7GFXtakPSvwHkx00vBmKZw45');
      if (!this.stripe) {
        console.error('initStripe: Failed to load Stripe');
        this.paymentError.emit('Payment system is not ready.');
        return;
      }
      this.elements = this.stripe.elements();
      console.log('initStripe: Stripe initialized successfully');
    } catch (error) {
      console.error('initStripe: Error initializing Stripe:', error);
      this.paymentError.emit('Failed to initialize payment system.');
    }
  }

  async initWalletPayments() {
    console.log('initWalletPayments: Starting initialization');
    if (!this.stripe || !this.elements || !this.paymentRequestButtonRef) {
      console.error('initWalletPayments: Required dependencies missing:', {
        stripe: !!this.stripe,
        elements: !!this.elements,
        paymentRequestButtonRef: !!this.paymentRequestButtonRef,
      });
      this.isPaymentButtonVisible = false;
      return;
    }

    try {
      console.log('initWalletPayments: Validating product data');
      const price = this.selectedVariation?.price || this.product?.price || 0;
      const amountInFils = Math.round(price * this.quantity * 100);

      if (amountInFils <= 0) {
        console.error('initWalletPayments: Invalid price or quantity:', { price, quantity: this.quantity, amountInFils });
        this.isPaymentButtonVisible = false;
        return;
      }

      console.log('initWalletPayments: Price:', price, 'Quantity:', this.quantity, 'Amount in fils:', amountInFils);

      console.log('initWalletPayments: Creating payment request');
      this.paymentRequest = this.stripe.paymentRequest({
        country: 'AE',
        currency: 'aed',
        total: {
          label: this.product?.name || 'Product Purchase',
          amount: amountInFils,
        },
        requestPayerName: true,
        requestPayerEmail: true,
        requestPayerPhone: true,
        requestShipping: false,
        shippingOptions: [
          {
            id: 'standard',
            label: 'Standard Shipping',
            amount: 0,
            detail: 'Delivery within 3-5 business days',
          },
        ],
      });

      console.log('initWalletPayments: Checking canMakePayment');
      const result = await this.paymentRequest.canMakePayment();
      console.log('initWalletPayments: canMakePayment result:', result);

      if (result) {
        this.isPaymentButtonVisible = true;
        if (result.applePay) {
          console.log('initWalletPayments: Apple Pay is supported');
        }
        if (result.googlePay) {
          console.log('initWalletPayments: Google Pay is supported');
        }

        console.log('initWalletPayments: Creating payment request button');
        this.paymentRequestButton = this.elements.create('paymentRequestButton', {
          paymentRequest: this.paymentRequest,
          style: {
            paymentRequestButton: {
              type: 'default',
              theme: 'dark',
              height: '40px',
            },
          },
        });

        console.log('initWalletPayments: Mounting button to:', this.paymentRequestButtonRef.nativeElement);
        this.paymentRequestButton.mount(this.paymentRequestButtonRef.nativeElement);
        console.log('initWalletPayments: Payment button mounted successfully');

        // Fallback: Retry mounting after a delay to ensure DOM readiness
        setTimeout(() => {
          if (this.paymentRequestButton && this.paymentRequestButtonRef) {
            console.log('initWalletPayments: Retrying button mount');
            this.paymentRequestButton.mount(this.paymentRequestButtonRef.nativeElement);
          }
        }, 500);

        this.paymentRequest.on('paymentmethod', async (event: any) => {
          console.log('initWalletPayments: Payment method received:', event.paymentMethod);
          try {
            this.isPaying = true;
            // this.uiService.setLoadingState('payment', true);

            const orderData = this.prepareOrderData(event);
            console.log('initWalletPayments: Creating payment intent with orderData:', orderData);
            const paymentIntentResponse = await this.checkoutService
              .createPaymentIntent(amountInFils / 100, 'aed', orderData)
              .pipe(take(1))
              .toPromise();

            if (!paymentIntentResponse?.success || !paymentIntentResponse.clientSecret) {
              throw new Error('Failed to create payment intent');
            }

            const clientSecret = paymentIntentResponse.clientSecret;
            const paymentIntentId :any = paymentIntentResponse.paymentIntentId;
            console.log('initWalletPayments: Payment intent created:', { clientSecret, paymentIntentId });

            const { error, paymentIntent } = await this.stripe!.confirmCardPayment(clientSecret, {
              payment_method: event.paymentMethod.id,
            });

            if (error) {
              console.error('initWalletPayments: Payment failed:', error.message);
              this.uiService.showError('Payment failed: ' + error.message);
              this.paymentError.emit(error.message);
              event.complete('fail');
              return;
            }

            if (paymentIntent && paymentIntent.status === 'succeeded') {
              console.log('initWalletPayments: Payment succeeded:', paymentIntent.id);
              event.complete('success');
              // this.uiService.showSuccess('Purchase completed successfully!');
              this.pollOrderStatus(paymentIntentId);
            } else {
              console.error('initWalletPayments: Unsupported payment status');
              event.complete('fail');
              this.uiService.showError('Payment failed: Unsupported payment status.');
              this.paymentError.emit('Unsupported payment status.');
            }
          } catch (error: any) {
            console.error('initWalletPayments: Error creating order:', error);
            event.complete('fail');
            this.uiService.showError('An error occurred: ' + (error.message || 'Please try again.'));
            this.paymentError.emit(error.message || 'Payment failed.');
          } finally {
            this.isPaying = false;
            // this.uiService.setLoadingState('payment', false);
          }
        });

        this.paymentRequest.on('shippingaddresschange', (event: any) => {
          console.log('initWalletPayments: Shipping address changed');
          event.updateWith({
            status: 'success',
            shippingOptions: [
              {
                id: 'standard',
                label: 'Standard Shipping',
                amount: 0,
                detail: 'Delivery within 3-5 business days',
              },
            ],
          });
        });
      } else {
        console.log('initWalletPayments: No supported wallet payment methods found');
        this.isPaymentButtonVisible = false;
        // Keep container visible to show "OR" separator
      }
    } catch (error) {
      console.error('initWalletPayments: Error initializing wallet payments:', error);
      this.isPaymentButtonVisible = false;
      this.paymentError.emit('Failed to initialize payment button.');
    }
  }

  private prepareOrderData(event: any) {
    const billingDetails = event.paymentMethod.billing_details || {};
    const productId = this.product?.id;
    const variationId = this.selectedVariation?.id || undefined;

    const orderData = {
      billing: {
        first_name: billingDetails.name?.split(' ')[0] || '',
        last_name: billingDetails.name?.split(' ')[1] || '',
        address_1: billingDetails.address?.line1 || '',
        city: billingDetails.address?.city || '',
        state: billingDetails.address?.state || '',
        postcode: billingDetails.address?.postal_code || '',
        country: billingDetails.address?.country || 'AE',
        email: billingDetails.email || '',
        phone: billingDetails.phone || '',
      },
      shipping: {},
      line_items: [
        {
          product_id: productId,
          variation_id: variationId,
          quantity: this.quantity,
        },
      ],
    };
    console.log('prepareOrderData: Order data prepared:', orderData);
    return orderData;
  }

  private pollOrderStatus(paymentIntentId: string) {
    console.log('pollOrderStatus: Starting polling for paymentIntentId:', paymentIntentId);
    interval(2000)
      .pipe(
        switchMap(() => this.checkoutService.checkOrderStatus(paymentIntentId)),
        takeWhile((response) => !(response.success && response.orderId), true),
        tap((response) => {
          if (response.success && response.orderId) {
            console.log('pollOrderStatus: Order created successfully:', response.orderId);
            this.paymentSuccess.emit(response.orderId);
          }
        })
      )
      .subscribe({
        error: (error) => {
          console.error('pollOrderStatus: Error polling order status:', error);
          this.uiService.showError('An error occurred while checking order status.');
          this.paymentError.emit('Failed to confirm order.');
        },
      });
  }
}