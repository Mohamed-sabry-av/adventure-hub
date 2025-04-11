import { DestroyRef, inject, Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { CartService } from '../../cart/service/cart.service';
import { map } from 'rxjs';
import { Store } from '@ngrx/store';
import { StoreInterface } from '../../../Store/store';
import { createOrderAction } from '../../../Store/actions/checkout.action';

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private cartService = inject(CartService);
  private destroyRef = inject(DestroyRef);
  private store = inject(Store<StoreInterface>);

  createOrder(addresses: { billing: any; shipping: any }) {
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
          payment_method: 'cod',
          payment_method_title: 'Cash on delivery',
          set_paid: false,
          billing: addresses.billing,
          shipping: addresses.shipping,
          line_items: loadedCartData,
        };

        this.store.dispatch(createOrderAction({ orderDetails: orderData }));
      });

    this.destroyRef.onDestroy(() => subscribtion.unsubscribe());
  }
}
