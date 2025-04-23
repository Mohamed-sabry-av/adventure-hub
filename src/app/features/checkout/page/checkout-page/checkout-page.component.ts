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
import { SkeletonLoaderComponent } from '../../../../shared/components/skeleton-loader/skeleton-loader.component';
import { CartStatus } from '../../../cart/model/cart.model';

@Component({
  selector: 'app-checkout-page',
  imports: [
    CheckoutFormComponent,
    CheckoutSummaryComponent,
    RouterLink,
    AsyncPipe,
    DialogErrorComponent,
    SkeletonLoaderComponent,
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

  loadedCart$: Observable<any> = this.cartService.savedUserCart$;
  productsOutOfStock$: Observable<any> = this.checkoutService.productsOutStock$;
  cartStatus$: Observable<CartStatus> = this.uiService.cartStatus$;

  ngOnInit() {
    const subscription = this.loadedCart$.subscribe((res: any) => {
      if (!res?.cartIsLoaded) {
        this.cartService.fetchUserCart({
          mainPageLoading: true,
          sideCartLoading: false,
        });
      }
    });

    this.destroyRef.onDestroy(() => subscription.unsubscribe());
  }
}
