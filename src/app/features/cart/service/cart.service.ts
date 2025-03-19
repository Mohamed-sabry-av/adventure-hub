import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CartService {
  cartIsVisible$ = new BehaviorSubject<boolean>(false);

  cartMode(isVisible: boolean) {
    this.cartIsVisible$.next(isVisible);
  }
}
