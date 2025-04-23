import {
  Component,
  DestroyRef,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { CartService } from '../../service/cart.service';
import { Observable } from 'rxjs';
import { AsyncPipe, CurrencyPipe, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Product } from '../../../../interfaces/product';
import { RouterLink } from '@angular/router';
import { UIService } from '../../../../shared/services/ui.service';
import { CartStatus } from '../../model/cart.model';

@Component({
  selector: 'app-cart-products',
  imports: [AsyncPipe, FormsModule, CurrencyPipe, RouterLink],
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

  ngOnInit() {
    const subscribtion = this.cartService.savedUserCart$.subscribe(
      (response: any) => {
        console.log('HELLLLLLLLLOOO');

        this.progressValue = response?.totals?.total_price;
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
