import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  loadStripe,
  Stripe,
  StripeElements,
  StripePaymentRequestButtonElement,
} from '@stripe/stripe-js';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class WalletPaymentService {
  private stripe: Stripe | null = null;
  private elements: StripeElements | null = null;
  private paymentRequest: any = null;
  private prButton: StripePaymentRequestButtonElement | null = null;

  private readonly STRIPE_PUBLISHABLE_KEY = 'pk_test_51RGe55G0IhgrvppwwIADEDYdoX8XFiOhi4hHHl9pztg3JjECc5QHfQOn7N0Wjyyrw6n6BZJtNF7GFXtakPSvwHkx00vBmKZw45';
  private readonly API_URL = environment.apiUrl || 'https://api.example.com';

  private walletAvailabilitySubject = new BehaviorSubject<{
    googlePay: boolean;
    applePay: boolean;
  }>({
    googlePay: false,
    applePay: false
  });

  walletAvailability$ = this.walletAvailabilitySubject.asObservable();

  constructor(private http: HttpClient) {
    this.initStripe();
  }

  private async initStripe() {
    this.stripe = await loadStripe(this.STRIPE_PUBLISHABLE_KEY);
    if (!this.stripe) {
      console.error('Failed to initialize Stripe');
      return;
    }

    this.elements = this.stripe.elements();
  }

  async initPaymentRequest(
    amount: number,
    currency: string = 'aed',
    productName: string = 'Product'
  ): Promise<boolean> {
    if (!this.stripe || !this.elements) {
      console.error('Stripe or Elements not initialized');
      return false;
    }

    try {
      // Amount needs to be in smallest currency unit (e.g., cents)
      const amountInCents = Math.round(amount * 100);

      this.paymentRequest = this.stripe.paymentRequest({
        country: 'AE',
        currency: currency.toLowerCase(),
        total: {
          label: productName,
          amount: amountInCents,
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
        this.walletAvailabilitySubject.next({
          googlePay: !!result.googlePay,
          applePay: !!result.applePay
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error initializing payment request:', error);
      return false;
    }
  }

  mountWalletButton(elementRef: HTMLElement): boolean {
    if (!this.stripe || !this.elements || !this.paymentRequest) {
      console.error('Stripe, Elements or PaymentRequest not initialized');
      return false;
    }

    try {
      this.prButton = this.elements.create('paymentRequestButton', {
        paymentRequest: this.paymentRequest,
        style: {
          paymentRequestButton: {
            type: 'buy',
            theme: 'dark',
            height: '44px',
          },
        },
      });

      this.prButton.mount(elementRef);
      return true;
    } catch (error) {
      console.error('Error mounting payment request button:', error);
      return false;
    }
  }

  setupPaymentRequestListeners(onSuccess: (result: any) => void, onError: (error: any) => void) {
    if (!this.paymentRequest) {
      console.error('PaymentRequest not initialized');
      return;
    }

    this.paymentRequest.on('paymentmethod', async (event: any) => {
      try {
        // Here we would create a payment intent on the server
        const response = await this.createPaymentIntent(
          event.paymentMethod.id,
          this.paymentRequest._total.amount / 100, // Convert back to regular currency
          this.paymentRequest._total.currency
        ).toPromise();

        if (!response || !response.clientSecret) {
          throw new Error('Failed to create payment intent');
        }

        const { error, paymentIntent } = await this.stripe!.confirmCardPayment(
          response.clientSecret,
          {
            payment_method: event.paymentMethod.id
          }
        );

        if (error) {
          event.complete('fail');
          onError(error);
        } else if (paymentIntent.status === 'succeeded') {
          event.complete('success');
          onSuccess({
            paymentIntent,
            paymentMethod: event.paymentMethod
          });
        } else {
          event.complete('fail');
          onError({ message: 'Payment failed. Unexpected payment status.' });
        }
      } catch (error) {
        event.complete('fail');
        onError(error);
      }
    });

    this.paymentRequest.on('cancel', () => {
      console.log('Payment request canceled');
    });
  }

  createPaymentIntent(
    paymentMethodId: string,
    amount: number,
    currency: string = 'aed'
  ): Observable<any> {
    const payload = {
      payment_method_id: paymentMethodId,
      amount,
      currency: currency.toLowerCase()
    };

    return this.http.post(`${this.API_URL}/api/create-payment-intent`, payload)
      .pipe(
        catchError(error => {
          console.error('Error creating payment intent:', error);
          return throwError(() => new Error('Failed to create payment intent'));
        })
      );
  }

  destroyPaymentRequest() {
    if (this.prButton) {
      this.prButton.destroy();
      this.prButton = null;
    }

    this.paymentRequest = null;
  }
}
