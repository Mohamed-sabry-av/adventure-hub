import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  loadStripe,
  Stripe,
  StripeElements,
  StripePaymentRequestButtonElement,
} from '@stripe/stripe-js';
import { ConfigService } from '../../../core/services/config.service';

@Injectable({
  providedIn: 'root',
})
export class WalletPaymentService {
  private stripe: Stripe | null = null;
  private elements: StripeElements | null = null;
  private paymentRequest: any = null;
  private prButton: StripePaymentRequestButtonElement | null = null;

  private apiUrl: string = 'https://api.example.com'; // Default fallback
  private configService = inject(ConfigService);

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
    
    // Get API URL from config
    this.configService.getConfig().subscribe(config => {
      if (config && config.apiUrl) {
        this.apiUrl = config.apiUrl;
      }
    });
  }

  private async initStripe() {
    try {
      // Get Stripe key from config
      const config = this.configService.currentConfig;
      if (!config || !config.stripePublishableKey) {
        // Wait for config to load
        this.configService.getConfig().subscribe(config => {
          if (config && config.stripePublishableKey) {
            this.loadStripe(config.stripePublishableKey);
          }
        });
        return;
      }
      
      this.loadStripe(config.stripePublishableKey);
    } catch (error) {
      console.error('Failed to initialize Stripe:', error);
    }
  }
  
  private async loadStripe(publishableKey: string) {
    this.stripe = await loadStripe(publishableKey);
    
    if (this.stripe) {
      this.elements = this.stripe.elements();
    }
  }

  async initPaymentRequest(
    amount: number,
    currency: string = 'aed',
    productName: string = 'Product'
  ): Promise<boolean> {
    if (!this.stripe || !this.elements) {
      
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
      
      return false;
    }
  }

  mountWalletButton(elementRef: HTMLElement): boolean {
    if (!this.stripe || !this.elements || !this.paymentRequest) {
      
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
      
      return false;
    }
  }

  setupPaymentRequestListeners(onSuccess: (result: any) => void, onError: (error: any) => void) {
    if (!this.paymentRequest) {
      
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

    return this.http.post(`${this.apiUrl}/api/create-payment-intent`, payload)
      .pipe(
        catchError(error => {
          
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

