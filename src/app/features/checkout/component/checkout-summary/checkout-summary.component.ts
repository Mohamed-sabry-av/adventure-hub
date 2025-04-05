import { Component, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CartService } from '../../../cart/service/cart.service';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-checkout-summary',
  imports: [AsyncPipe],
  templateUrl: './checkout-summary.component.html',
  styleUrl: './checkout-summary.component.css',
})
export class CheckoutSummaryComponent {
  private cartService = inject(CartService);

  loadedCart$: Observable<any> = this.cartService.savedUserCart$;

  ngOnInit() {
    // this.cartService.fetchCartFromLS();
    this.loadedCart$.subscribe((res) => console.log(res));
  }
}
