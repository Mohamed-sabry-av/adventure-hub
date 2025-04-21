import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
} from '@angular/core';
import { AppContainerComponent } from '../../../../shared/components/app-container/app-container.component';
import { CartProductsComponent } from '../../components/cart-products/cart-products.component';
import { CartCheckoutComponent } from '../../components/cart-checkout/cart-checkout.component';
import { CartService } from '../../service/cart.service';
import { ServiceHighlightsComponent } from '../../../../shared/components/service-highlights/service-highlights.component';
import { Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { UIService } from '../../../../shared/services/ui.service';
import { DialogErrorComponent } from '../../../../shared/components/dialog-error/dialog-error.component';

@Component({
  selector: 'app-cart-page',
  imports: [
    AppContainerComponent,
    CartProductsComponent,
    CartCheckoutComponent,
    ServiceHighlightsComponent,
    AsyncPipe,
    DialogErrorComponent,
  ],
  templateUrl: './cart-page.component.html',
  styleUrl: './cart-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartPageComponent {
  private cartService = inject(CartService);
  private uiService = inject(UIService);
  private destroyRef = inject(DestroyRef);

  loadedCart$: Observable<any> = this.cartService.savedUserCart$;
  isLoading$: Observable<boolean> = this.uiService.isLoading$;
  isError$: Observable<boolean> = this.uiService.uiFailure$;

  ngOnInit() {
    const subscription = this.loadedCart$.subscribe((res: any) => {
      if (res?.length === 0) {
        this.cartService.fetchUserCart();
      }
    });

    this.destroyRef.onDestroy(() => subscription.unsubscribe());
  }
}
