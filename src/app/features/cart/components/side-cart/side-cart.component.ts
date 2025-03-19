import { Component, HostListener, inject, Input } from '@angular/core';
import { CartService } from '../../service/cart.service';
import { Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { RouterLink } from '@angular/router';
import { Select } from 'primeng/select';

@Component({
  selector: 'app-side-cart',
  imports: [AsyncPipe, DrawerModule, ButtonModule, Select, RouterLink],
  templateUrl: './side-cart.component.html',
  styleUrl: './side-cart.component.css',
})
export class SideCartComponent {
  private cartService = inject(CartService);

  sideCartVisible$: Observable<boolean> = this.cartService.cartIsVisible$;

  @Input({ required: false }) productDetails!: any;

  hideSideCart() {
    this.cartService.cartMode(false);
  }

  colors = ['Red', 'Green', 'Blue'];
  Sizes = ['L', 'M', 'S'];

  // @HostListener('document:keydown', ['$event'])
  // onKeyDown(event: KeyboardEvent) {
  //   if (event.key === 'Escape') {
  //     if (this.visible) {
  //       this.navbarService.changeVisible();
  //     }
  //   }
  // }
}
