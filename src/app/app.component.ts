import { Component, DestroyRef, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { HeaderComponent } from './shared/components/header/header.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { SideCartComponent } from './features/cart/components/side-cart/side-cart.component';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    HeaderComponent,
    FooterComponent,
    SideCartComponent,
    NgIf,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  isCheckoutPage = false;

  ngOnInit() {
    const subscribtion = this.router.events.subscribe(() => {
      this.isCheckoutPage = this.router.url.includes('/checkout');
    });
    this.destroyRef.onDestroy(() => subscribtion.unsubscribe());
  }
}
