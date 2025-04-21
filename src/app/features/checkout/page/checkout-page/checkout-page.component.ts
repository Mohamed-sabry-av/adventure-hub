import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
} from '@angular/core';
import { CheckoutFormComponent } from '../../component/checkout-form/checkout-form.component';
import { CheckoutSummaryComponent } from '../../component/checkout-summary/checkout-summary.component';
import { CartService } from '../../../cart/service/cart.service';
import { Observable } from 'rxjs';
import { RouterLink } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { CheckoutService } from '../../services/checkout.service';
import { UIService } from '../../../../shared/services/ui.service';
import { DialogErrorComponent } from '../../../../shared/components/dialog-error/dialog-error.component';

@Component({
  selector: 'app-checkout-page',
  imports: [
    CheckoutFormComponent,
    CheckoutSummaryComponent,
    RouterLink,
    AsyncPipe,
    DialogErrorComponent,
  ],
  templateUrl: './checkout-page.component.html',
  styleUrl: './checkout-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { ngSkipHydration: '' },
})
export class CheckoutPageComponent {
  private cartService = inject(CartService);
  private checkoutService = inject(CheckoutService);
  private uiService = inject(UIService);
  private destroyRef = inject(DestroyRef);

  isLoading$: Observable<boolean> = this.uiService.isLoading$;
  isError$: Observable<boolean> = this.uiService.uiFailure$;

  loadedCart$: Observable<any> = this.cartService.savedUserCart$;
  productsOutOfStock$: Observable<any> = this.checkoutService.productsOutStock$;

  ngOnInit() {
    const subscription = this.loadedCart$.subscribe((res: any) => {
      if (res?.length === 0) {
        this.cartService.fetchUserCart();
      }
    });

    this.destroyRef.onDestroy(() => subscription.unsubscribe());
  }
}
