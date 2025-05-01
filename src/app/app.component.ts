import { Component, DestroyRef, Inject, inject, PLATFORM_ID } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { HeaderComponent } from './shared/components/header/header.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { SideCartComponent } from './features/cart/components/side-cart/side-cart.component';
import { SideOptionsComponent } from './shared/components/side-options/side-options.component';
import { isPlatformBrowser, NgIf } from '@angular/common';
import { filter } from 'rxjs/operators';
import { BackToTopComponent } from './shared/components/BackToTop/back-to-top.component';
import { CartService } from './features/cart/service/cart.service';

declare global {
  interface Window {
    dataLayer: any[];
    klaviyo: any;
  }
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    HeaderComponent,
    FooterComponent,
    SideCartComponent,
    SideOptionsComponent,
    NgIf,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  private destroyRef = inject(DestroyRef);
  private cartService = inject(CartService);
  private router = inject(Router);
  isCheckoutPage = false;
  private previousUrl: string | null = null;
  constructor(  @Inject(PLATFORM_ID) private platformId: Object
) {}

  ngOnInit() {
    const navEndEvents = this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd)
    );

    const subscription = navEndEvents.subscribe((event: NavigationEnd) => {
      this.isCheckoutPage = event.urlAfterRedirects.includes('/checkout');

      // Extract path without fragment
      const currentPath = event.urlAfterRedirects.split('#')[0];

      // Scroll to top only if the path has changed (not just fragment)
      if (this.previousUrl !== currentPath) {
        if (isPlatformBrowser(this.platformId)) {

          window.scrollTo({
            top: 0,
            behavior: 'smooth', // Smooth scroll
          });
        }
      }

      this.previousUrl = currentPath;

      // Analytics tracking
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'pageView',
        pagePath: event.urlAfterRedirects,
        pageTitle: document.title,
      });

      if (window.klaviyo) {
        try {
          window.klaviyo.push([
            'track',
            'Active on Site',
            {
              pagePath: event.urlAfterRedirects,
              pageTitle: document.title,
            },
          ]);
        } catch (error) {}
      }
    });

    this.destroyRef.onDestroy(() => subscription.unsubscribe());
  }

  toggle() {
    this.cartService.cartMode(true);
  }
}