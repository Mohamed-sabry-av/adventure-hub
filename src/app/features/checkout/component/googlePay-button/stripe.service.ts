import { Injectable, inject } from '@angular/core';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { ConfigService } from '../../../../core/services/config.service';

@Injectable({
  providedIn: 'root',
})
export class StripeService {
  private stripePromise: Promise<Stripe | null> | null = null;
  private configService = inject(ConfigService);
  
  constructor() {
    // Get Stripe key from config service
    this.configService.getConfig().subscribe(config => {
      if (config && config.stripePublishableKey) {
        this.stripePromise = loadStripe(config.stripePublishableKey);
      }
    });
  }
  
  getStripe(): Promise<Stripe | null> {
    return this.stripePromise || Promise.resolve(null);
  }
}
