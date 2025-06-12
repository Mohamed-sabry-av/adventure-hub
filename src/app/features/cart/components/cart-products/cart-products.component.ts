import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { CartService } from '../../service/cart.service';
import { Observable } from 'rxjs';
import { AsyncPipe, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Product } from '../../../../interfaces/product';
import { RouterLink } from '@angular/router';
import { UIService } from '../../../../shared/services/ui.service';
import { CartStatus } from '../../model/cart.model';
import { CurrencySvgPipe } from '../../../../shared/pipes/currency.pipe';
@Component({
  selector: 'app-cart-products',
  imports: [AsyncPipe, FormsModule, CurrencySvgPipe, RouterLink],
  templateUrl: './cart-products.component.html',
  styleUrl: './cart-products.component.css',
})
export class CartProductsComponent {
  private cartService = inject(CartService);
  private uiService = inject(UIService);
  private destroyRef = inject(DestroyRef);
  productCount = viewChild<ElementRef<HTMLParagraphElement>>('productCount');
  loadedCart$: Observable<any> = this.cartService.savedUserCart$;
  cartStatus$: Observable<CartStatus> = this.uiService.cartStatus$;
  progressValue: number = 0;
  progressPercentage: number = 0;
  
  ngOnInit() {
    const subscribtion = this.cartService.savedUserCart$.subscribe(
      (response: any) => {
        const cartTotal = response?.userCart.totals?.total_price || 0;
        // Calculate how much more is needed to reach 100 AED for free shipping
        if (cartTotal >= 100) {
          this.progressValue = 0; // No additional amount needed
          this.progressPercentage = 100; // Full progress bar
        } else {
          // Calculate remaining amount needed (100 - current total)
          this.progressValue = Math.max(0, 100 - cartTotal);
          // Calculate progress percentage (current total / 100) * 100
          this.progressPercentage = Math.min(100, Math.max(0, (cartTotal / 100) * 100));
        }
      }
    );
    this.destroyRef.onDestroy(() => subscribtion.unsubscribe());
  }
  onUpdateProductQuantity(
    selectedProduct: any,
    action: 'increase' | 'decrease'
  ) {
    let newQuantity =
      action === 'increase'
        ? selectedProduct.quantity + 1
        : selectedProduct.quantity - 1;
    if (newQuantity < 1) return;
    this.cartService.updateQuantityOfProductInCart(
      newQuantity,
      selectedProduct
    );
  }
  onDeleteProduct(selectedProduct: Product) {
    this.cartService.deleteProductFromCart(selectedProduct);
  }
}

