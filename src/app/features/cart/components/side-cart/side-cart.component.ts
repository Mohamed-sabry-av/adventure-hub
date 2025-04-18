import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  Input,
  viewChild,
} from '@angular/core';
import { CartService } from '../../service/cart.service';
import { filter, Observable } from 'rxjs';
import { AsyncPipe, CurrencyPipe } from '@angular/common';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { RouterLink } from '@angular/router';
import { Select } from 'primeng/select';
import { Product } from '../../../../interfaces/product';

@Component({
  selector: 'app-side-cart',
  imports: [
    AsyncPipe,
    DrawerModule,
    ButtonModule,
    CurrencyPipe,
    Select,
    RouterLink,
  ],
  templateUrl: './side-cart.component.html',
  styleUrl: './side-cart.component.css',
  host: { ngSkipHydration: '' },
})
export class SideCartComponent {
  private cartService = inject(CartService);
  private destroyRef = inject(DestroyRef);

  productCount = viewChild<ElementRef<HTMLParagraphElement>>('productCount');

  loadedCart$: Observable<any> = this.cartService.savedUserCart$;
  sideCartVisible$: Observable<boolean> = this.cartService.cartIsVisible$;

  progressValue: number = 0;

  ngOnInit() {
    const subscribtion = this.cartService.savedUserCart$
      .pipe(filter((response: any) => response?.items?.length > 0))
      .subscribe((response: any) => {
        this.progressValue = response?.totals?.total_price;
      });

    const subscribtion2 = this.sideCartVisible$.subscribe((visible) => {
      if (visible) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'auto';
      }
      document.body.style.overflow = visible ? 'hidden' : 'auto';
    });

    this.destroyRef.onDestroy(() => {
      subscribtion.unsubscribe();
      subscribtion2.unsubscribe();
    });
  }

  hideSideCart() {
    this.cartService.cartMode(false);
  }

  onDeleteProduct(selectedProduct: Product) {
    this.cartService.deleteProductFromCart(selectedProduct);
  }
}
