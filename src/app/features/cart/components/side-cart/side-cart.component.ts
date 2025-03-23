import {
  Component,
  ElementRef,
  HostListener,
  inject,
  Input,
  viewChild,
} from '@angular/core';
import { CartService } from '../../service/cart.service';
import { Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { RouterLink } from '@angular/router';
import { Select } from 'primeng/select';
import { Product } from '../../../../interfaces/product';

@Component({
  selector: 'app-side-cart',
  imports: [AsyncPipe, DrawerModule, ButtonModule, Select, RouterLink],
  templateUrl: './side-cart.component.html',
  styleUrl: './side-cart.component.css',
})
export class SideCartComponent {
  private cartService = inject(CartService);
  @Input({ required: false }) productDetails!: any;

  productCount = viewChild<ElementRef<HTMLParagraphElement>>('productCount');

  loadedCart$: Observable<any> = this.cartService.savedCartOfLS$;
  sideCartVisible$: Observable<boolean> = this.cartService.cartIsVisible$;

  ngOnInit() {
    this.cartService.fetchCartFromLS();
  }

  hideSideCart() {
    this.cartService.cartMode(false);
  }

  onUpdateProductCount(selectedProduct: any, action: 'increase' | 'decrease') {
    let newCount =
      action === 'increase'
        ? selectedProduct.count + 1
        : selectedProduct.count - 1;
    if (newCount < 1) return;

    this.cartService.updateCountOfProductInCart(newCount, selectedProduct);
  }

  onDeleteProduct(selectedProduct: Product) {
    this.cartService.deleteProductFromCart(selectedProduct);
  }
}
