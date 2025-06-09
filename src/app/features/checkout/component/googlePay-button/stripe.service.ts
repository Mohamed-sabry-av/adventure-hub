import { Injectable } from '@angular/core';
import { loadStripe, Stripe } from '@stripe/stripe-js';
@Injectable({
  providedIn: 'root',
})
export class StripeService {
  private stripePromise: Promise<Stripe | null>;
  constructor() {
    this.stripePromise = loadStripe('pk_test_51RGe55G0IhgrvppwwIADEDYdoX8XFiOhi4hHHl9pztg3JjECc5QHfQOn7N0Wjyyrw6n6BZJtNF7GFXtakPSvwHkx00vBmKZw45');
  }
  getStripe(): Promise<Stripe | null> {
    return this.stripePromise;
  }
}
