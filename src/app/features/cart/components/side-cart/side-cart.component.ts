import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  Inject,
  inject,
  Input,
  PLATFORM_ID,
  viewChild,
  OnInit
} from '@angular/core';
import { CartService } from '../../service/cart.service';
import { filter, Observable } from 'rxjs';
import { AsyncPipe, CurrencyPipe, isPlatformBrowser } from '@angular/common';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { RouterLink } from '@angular/router';
import { Product } from '../../../../interfaces/product';
import { UIService } from '../../../../shared/services/ui.service';
import { CartStatus } from '../../model/cart.model';
import { CurrencySvgPipe } from '../../../../shared/pipes/currency.pipe';

@Component({
  selector: 'app-side-cart',
  imports: [AsyncPipe, DrawerModule, ButtonModule, CurrencySvgPipe, RouterLink],
  templateUrl: './side-cart.component.html',
  styleUrl: './side-cart.component.css',

  host: { ngSkipHydration: '' },
})
export class SideCartComponent implements OnInit {
  private cartService = inject(CartService);
  private uiService = inject(UIService);
  private destroyRef = inject(DestroyRef);
  private platformId = inject(PLATFORM_ID);

  constructor() {
    this.checkScreenSize();
  }

  cartStatus$: Observable<CartStatus> = this.uiService.cartStatus$;

  productCount = viewChild<ElementRef<HTMLParagraphElement>>('productCount');

  loadedCart$: Observable<any> = this.cartService.savedUserCart$;
  sideCartVisible$: Observable<boolean> = this.cartService.cartIsVisible$;

  progressValue: number = 0;
  isMobile: boolean = false;

  @HostListener('window:resize', ['$event'])
  checkScreenSize() {
    if (isPlatformBrowser(this.platformId)) {
      this.isMobile = window.innerWidth < 768;
    }
  }

  ngOnInit() {
    const subscribtion = this.cartService.savedUserCart$
      .pipe(filter((response: any) => response?.userCart?.items?.length > 0))
      .subscribe((response: any) => {
        // Calculate total product price (excluding shipping)
        const subTotal = response?.userCart.totals?.sub_total || 0;
        // If shipping costs are included in sub_total, subtract them
        const shippingCost = response?.userCart.totals?.shipping_total || 0;
        
        // Use product prices only for free shipping threshold calculation (100 is the threshold)
        const productTotal = subTotal - shippingCost;
        this.progressValue = productTotal > 0 ? productTotal : 0;
      });

    const subscribtion2 = this.sideCartVisible$.subscribe((visible) => {
      if (isPlatformBrowser(this.platformId)) {
        document.body.style.overflow = visible ? 'hidden' : 'auto';
      }
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
    const openSideCart = true;
    this.cartService.deleteProductFromCart(selectedProduct, openSideCart);
  }
}
