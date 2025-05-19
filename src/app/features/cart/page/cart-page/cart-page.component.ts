import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { AppContainerComponent } from '../../../../shared/components/app-container/app-container.component';
import { CartProductsComponent } from '../../components/cart-products/cart-products.component';
import { CartCheckoutComponent } from '../../components/cart-checkout/cart-checkout.component';
import { CartService } from '../../service/cart.service';
import { ServiceHighlightsComponent } from '../../../../shared/components/service-highlights/service-highlights.component';
import { Observable, Subscription, catchError, of } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { UIService } from '../../../../shared/services/ui.service';
import { DialogErrorComponent } from '../../../../shared/components/dialog-error/dialog-error.component';
import { DialogSuccessComponent } from '../../../../shared/components/dialog-success/dialog-success.component';
import { DialogInfoComponent } from '../../../../shared/components/dialog-info/dialog-info.component';
import { CartStatus } from '../../model/cart.model';
import { RouterLink } from '@angular/router';
import { CheckoutProgressMapComponent } from '../../../shared/components/checkout-progress-map/checkout-progress-map.component';

@Component({
  selector: 'app-cart-page',
  imports: [
    AppContainerComponent,
    CartProductsComponent,
    CartCheckoutComponent,
    ServiceHighlightsComponent,
    AsyncPipe,
    DialogErrorComponent,
    DialogSuccessComponent,
    DialogInfoComponent,
    RouterLink,
    CheckoutProgressMapComponent,
  ],
  templateUrl: './cart-page.component.html',
  styleUrl: './cart-page.component.css',
})
export class CartPageComponent implements OnInit, OnDestroy {
  private cartService = inject(CartService);
  private uiService = inject(UIService);
  private destroyRef = inject(DestroyRef);
  
  private subscription = new Subscription();

  loadedCart$: Observable<any> = this.cartService.savedUserCart$;
  cartStatus$: Observable<CartStatus> = this.uiService.cartStatus$;
  
  // Error handling flags
  hasError = false;
  isLoading = true;

  ngOnInit() {
    this.subscription.add(
      this.loadedCart$.pipe(
        catchError(error => {
          this.handleCartError(error);
          return of({ cartIsLoaded: false, userCart: null });
        })
      ).subscribe((res: any) => {
        this.isLoading = false;
        
      if (!res?.cartIsLoaded) {
        this.cartService.fetchUserCart({
          mainPageLoading: true,
          sideCartLoading: false,
        });
      }
      })
    );

    this.subscription.add(
      this.cartStatus$.subscribe(status => {
        if (status.error) {
          this.handleCartError(status.error);
        }
      })
    );
    
    this.destroyRef.onDestroy(() => this.subscription.unsubscribe());
  }
  
  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
  
  private handleCartError(error: any) {
    this.hasError = true;
    this.isLoading = false;
    
    let errorMessage = 'An error occurred while loading your cart.';
    
    if (typeof error === 'string') {
      errorMessage = error;
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    this.uiService.showError(errorMessage);
    console.error('Cart error:', error);
  }

  retryLoadCart() {
    // Reset error state
    this.hasError = false;
    this.isLoading = true;
    
    // Attempt to fetch the cart again
    this.cartService.fetchUserCart({
      mainPageLoading: true,
      sideCartLoading: false,
    });
  }
}
