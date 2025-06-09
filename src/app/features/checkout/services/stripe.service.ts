import { Injectable } from '@angular/core';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { environment } from '../../../../environments/environment';
@Injectable({
  providedIn: 'root',
})
export class StripeService {
  private stripePromise: Promise<Stripe | null>;
  constructor() {
    this.stripePromise = loadStripe(environment.stripe.publishableKey);
  }
  getStripe(): Promise<Stripe | null> {
    return this.stripePromise;
  }
}
