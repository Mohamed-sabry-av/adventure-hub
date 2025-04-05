import { Component, ElementRef, inject, viewChild } from '@angular/core';
import { CartService } from '../../service/cart.service';
import { Observable } from 'rxjs';
import { AsyncPipe, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Product } from '../../../../interfaces/product';

@Component({
  selector: 'app-cart-products',
  imports: [AsyncPipe, FormsModule],
  templateUrl: './cart-products.component.html',
  styleUrl: './cart-products.component.css',
})
export class CartProductsComponent {
  private cartService = inject(CartService);
  productCount = viewChild<ElementRef<HTMLParagraphElement>>('productCount');

  loadedCart$: Observable<any> = this.cartService.savedUserCart$;

  ngOnInit() {
    this.cartService.savedUserCart$.subscribe((res) => console.log(res));
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
