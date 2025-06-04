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
    // Clean up any potentially problematic cart IDs in localStorage
    this.cleanupInvalidCartIds();
    
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
    // Extract error message from the error object, wherever it might be
    let errorMsg = '';
    
    if (typeof error === 'string') {
      errorMsg = error;
    } else if (error?.error?.message) {
      errorMsg = error.error.message;
    } else if (error?.message) {
      errorMsg = error.message;
    }
    
    // Check if error message is related to invalid cart id
    const isInvalidCartError = errorMsg && (
      errorMsg.includes('invalid cart id') || 
      errorMsg.includes('Invalid cart') || 
      errorMsg.includes('expired cart') ||
      errorMsg.includes('Invalid or expired cart ID')
    );
    
    // Handle invalid cart errors by showing empty cart
    if (isInvalidCartError) {
      console.log('Handling invalid cart error in component:', errorMsg);
      this.hasError = false;
      this.isLoading = false;
      
      // Use the cart service method to handle empty guest cart
      this.cartService.handleEmptyGuestCart();
      return;
    }
    
    // Handle other errors normally
    this.hasError = true;
    this.isLoading = false;
    
    let displayErrorMessage = 'An error occurred while loading your cart.';
    if (errorMsg) {
      displayErrorMessage = errorMsg;
    }
    
    this.uiService.showError(displayErrorMessage);
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

  /**
   * Cleanup potentially invalid cart IDs that might cause errors
   */
  private cleanupInvalidCartIds() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const cartId = localStorage.getItem('cartId');
        
        // Check if cartId exists but is suspicious (empty, malformed, etc.)
        if (cartId !== null) {
          const parsedCartId = JSON.parse(cartId);
          
          if (!parsedCartId || parsedCartId === '' || typeof parsedCartId !== 'string') {
            console.log('Removing suspicious cart ID:', parsedCartId);
            localStorage.removeItem('cartId');
          }
        }
      } catch (e) {
        // If there's any error parsing the cart ID, it's probably invalid
        console.log('Error parsing cart ID, removing it:', e);
        localStorage.removeItem('cartId');
      }
    }
  }
}
