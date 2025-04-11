import { DestroyRef, inject, Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { CartService } from '../../cart/service/cart.service';
import { map, Observable } from 'rxjs';
import { Store } from '@ngrx/store';
import { StoreInterface } from '../../../Store/store';
import { createOrderAction } from '../../../Store/actions/checkout.action';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private cartService = inject(CartService);
  private destroyRef = inject(DestroyRef);
  private httpClient = inject(HttpClient);
  private store = inject(Store<StoreInterface>);
  private apiUrl = 'https://adventures-hub.com/create-payment-intent';

  createOrder(
    addresses: { billing: any; shipping: any },
    paymentGateway: {
      payment_method: string;
      payment_method_title: string;
    },
    stripeToken?: string
  ) {
    const subscribtion = this.cartService.savedUserCart$
      .pipe(
        map((response: any) =>
          response.items.map((item: any) => {
            return { product_id: item.id + 23054577, quantity: item.quantity };
          })
        )
      )
      .subscribe((loadedCartData: any) => {
        const orderData: any = {
          ...paymentGateway,
          set_paid: false,
          billing: addresses.billing,
          shipping: addresses.shipping,
          line_items: loadedCartData,
        };

        if (stripeToken) {
          orderData.meta_data = [{ key: 'stripe_token', value: stripeToken }];
        }

        this.store.dispatch(createOrderAction({ orderDetails: orderData }));
      });

    this.destroyRef.onDestroy(() => subscribtion.unsubscribe());
  }

  createPaymentIntent(amount: number, currency: string): Observable<any> {
    return this.httpClient.post<any>(this.apiUrl, { amount, currency });
  }
}
