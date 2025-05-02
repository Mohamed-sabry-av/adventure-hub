import { Component, EventEmitter, Output, ViewChild, ElementRef, inject, AfterViewInit } from '@angular/core';
import { Stripe, StripeElements, StripePaymentRequestButtonElement } from '@stripe/stripe-js';
import { CheckoutService } from '../../services/checkout.service';
import { StripeService } from '../../services/stripe.service';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-wallet-payment',
  template: `
    <div #googlePayButtonElement class="mb-4 md:w-[262px] mx-auto"></div>
  `,
  styles: []
})
export class WalletPaymentComponent implements AfterViewInit {
  private checkoutService = inject(CheckoutService);
  private stripeService = inject(StripeService);
  private stripe: Stripe | null = null;
  private elements: StripeElements | null = null;
  private paymentRequest: any;
  private prButton: StripePaymentRequestButtonElement | null = null;
  public googlePaySupported = false;
  public applePaySupported = false;

  @ViewChild('googlePayButtonElement') googlePayButtonRef!: ElementRef;
  @Output() paymentSucceeded = new EventEmitter<string>();

  async ngAfterViewInit() {
    await this.initStripe();
  }

  private async initStripe() {
    this.stripe = await this.stripeService.getStripe();
    if (this.stripe) {
      this.elements = this.stripe.elements();
      await this.initWalletPayments();
    }
  }

  private async initWalletPayments() {
    if (!this.stripe || !this.elements || !this.googlePayButtonRef) {
      console.error('Stripe, elements, or googlePayButtonRef is not available');
      return;
    }

    try {
      const cartTotal = await this.checkoutService.getCartTotalPrice().pipe(take(1)).toPromise();
      if (!cartTotal) {
        throw new Error('Cart total is not available');
      }

      const currency = cartTotal.currency.toLowerCase();
      const amountInFils = Math.round(cartTotal.total * 100);

      this.paymentRequest = this.stripe.paymentRequest({
        country: 'AE',
        currency: currency,
        total: {
          label: 'Order total',
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
            detail: 'Delivery within 3-5 business days',
          },
        ],
      });

      const result = await this.paymentRequest.canMakePayment();
      if (result) {
        if (result.applePay) {
          this.applePaySupported = true;
        }
        if (result.googlePay) {
          this.googlePaySupported = true;
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

        this.prButton.mount(this.googlePayButtonRef.nativeElement);

        this.paymentRequest.on('paymentmethod', async (event: any) => {
          try {
            const billingDetails = event.paymentMethod.billing_details || {};
            const shippingAddress = event.shippingAddress || {};

            const orderData = this.prepareOrderData(billingDetails, shippingAddress);

            const paymentIntentResponse = await this.checkoutService
              .createPaymentIntent(cartTotal.total, cartTotal.currency, orderData)
              .pipe(take(1))
              .toPromise();

            if (!paymentIntentResponse?.success || !paymentIntentResponse.clientSecret) {
              throw new Error('Failed to create payment intent');
            }

            const clientSecret = paymentIntentResponse.clientSecret;
            const paymentIntentId = paymentIntentResponse.paymentIntentId;

            const { error, paymentIntent } = await this.stripe!.confirmCardPayment(clientSecret, {
              payment_method: event.paymentMethod.id,
            });

            if (error) {
              console.error('Payment failed:', error.message);
              event.complete('fail');
              return;
            }

            if (paymentIntent && paymentIntent.status === 'succeeded') {
              console.log('Payment succeeded:', paymentIntent.id);
              event.complete('success');
              this.paymentSucceeded.emit(paymentIntentId);
            } else {
              event.complete('fail');
            }
          } catch (error: any) {
            console.error('Error processing payment:', error);
            event.complete('fail');
          }
        });

        this.paymentRequest.on('shippingaddresschange', (event: any) => {
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
        console.log('No supported wallet payment methods found');
      }
    } catch (error) {
      console.error('Error initializing wallet payments:', error);
    }
  }

  private prepareOrderData(billingDetails: any, shippingAddress: any) {
    const billing = {
      first_name: billingDetails.name?.split(' ')[0] || '',
      last_name: billingDetails.name?.split(' ')[1] || '',
      address_1: billingDetails.address?.line1 || '',
      city: billingDetails.address?.city || '',
      state: billingDetails.address?.state || '',
      postcode: billingDetails.address?.postal_code || '',
      country: billingDetails.address?.country || 'AE',
      email: billingDetails.email || '',
      phone: billingDetails.phone || '',
    };

    const shipping = {
      first_name: shippingAddress.name?.split(' ')[0] || '',
      last_name: shippingAddress.name?.split(' ')[1] || '',
      address_1: shippingAddress.addressLine?.[0] || '',
      city: shippingAddress.city || '',
      state: shippingAddress.region || '',
      postcode: shippingAddress.postalCode || '',
      country: shippingAddress.country || 'AE',
    };

    return { billing, shipping, line_items: [] };
  }
}