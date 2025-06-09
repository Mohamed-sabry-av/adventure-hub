import { Component, DestroyRef, Inject, inject, PLATFORM_ID, APP_INITIALIZER, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { HeaderComponent } from './shared/components/header/header.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { SideCartComponent } from './features/cart/components/side-cart/side-cart.component';
import { isPlatformBrowser, NgIf, DOCUMENT } from '@angular/common';
import { filter, first } from 'rxjs/operators';
import { CartService } from './features/cart/service/cart.service';
import { ServiceHighlightsComponent } from './shared/components/service-highlights/service-highlights.component';
import { ToastComponent } from './shared/components/toast/toast.component';
import { Meta } from '@angular/platform-browser';
import { NavbarSpacerComponent } from './features/shared/components/navbar-spacer/navbar-spacer.component';

declare global {
  interface Window {
    dataLayer: any[];
    klaviyo: any;
    performance: any;
  }
}

// Add a custom interface for navigation timing
interface PerformanceNavigationTiming extends PerformanceEntry {
  domainLookupStart: number;
  domainLookupEnd: number;
  connectStart: number;
  connectEnd: number;
  requestStart: number;
  responseStart: number;
  domLoading: number;
  domComplete: number;
  loadEventEnd: number;
  startTime: number;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    HeaderComponent,
    FooterComponent,
    SideCartComponent,
    NgIf,
    ServiceHighlightsComponent,
    ToastComponent,
    NavbarSpacerComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  private destroyRef = inject(DestroyRef);
  private cartService = inject(CartService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private document = inject(DOCUMENT);
  private meta = inject(Meta);
  
  isCheckoutPage = false;
  isProductsPage = false;
  private previousUrl: string | null = null;
  
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit() {
    // Add Google site verification meta tag
    this.meta.addTag({ 
      name: 'google-site-verification', 
      content: 'rt6fOYIBwSbI9eK8Pt_0MACLhQGaGs6Tl1MdFohwZmw' 
    });

    if (isPlatformBrowser(this.platformId)) {
      // Report performance metrics
      this.reportPerformanceMetrics();
      
      // Defer non-critical JS loading
      this.deferNonCriticalJSLoading();
    }

    const navEndEvents = this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd)
    );

    const subscription = navEndEvents.subscribe((event: NavigationEnd) => {
      this.isCheckoutPage = event.urlAfterRedirects.includes('/checkout');
      
      // Check if current page is a products category page
      this.isProductsPage = event.urlAfterRedirects.includes('/products/category');
      
      this.cdr.markForCheck();

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

      // Analytics tracking - only in browser
      if (isPlatformBrowser(this.platformId)) {
        this.trackPageView(event.urlAfterRedirects);
      }
    });

    this.destroyRef.onDestroy(() => subscription.unsubscribe());
  }

  /**
   * Track page view in analytics platforms
   */
  private trackPageView(url: string) {
    if (!isPlatformBrowser(this.platformId)) return;
    
    try {
      // Google Analytics through GTM
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'pageView',
        pagePath: url,
        pageTitle: this.document.title,
      });

      // Klaviyo tracking
      if (window.klaviyo) {
        window.klaviyo.push([
          'track',
          'Active on Site',
          {
            pagePath: url,
            pageTitle: this.document.title,
          },
        ]);
      }
    } catch (error) {
      console.error('Error tracking page view:', error);
    }
  }

  /**
   * Report Web Vitals and performance metrics
   */
  private reportPerformanceMetrics() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    try {
      // Report performance metrics after the page has fully loaded
      window.addEventListener('load', () => {
        // Wait until the next frame to collect metrics
        setTimeout(() => {
          const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          const paintTiming = performance.getEntriesByType('paint');
          
          if (navigationTiming && window.dataLayer) {
            // Report to Google Analytics
            window.dataLayer.push({
              event: 'performance_metrics',
              performance_timing: {
                dns: navigationTiming.domainLookupEnd - navigationTiming.domainLookupStart,
                tcp: navigationTiming.connectEnd - navigationTiming.connectStart,
                ttfb: navigationTiming.responseStart - navigationTiming.requestStart,
                domLoad: navigationTiming.domComplete - navigationTiming.domLoading,
                pageLoad: navigationTiming.loadEventEnd - navigationTiming.startTime,
              }
            });
          }
          
          // Report paint metrics
          if (paintTiming && paintTiming.length > 0) {
            const fcp = paintTiming.find(entry => entry.name === 'first-contentful-paint');
            if (fcp && window.dataLayer) {
              window.dataLayer.push({
                event: 'paint_metrics',
                first_contentful_paint: fcp.startTime
              });
            }
          }
        }, 0);
      });
    } catch (error) {
      console.error('Error reporting performance metrics:', error);
    }
  }

  /**
   * Defer loading of non-critical JS for better performance
   */
  private deferNonCriticalJSLoading() {
    // Use requestIdleCallback or setTimeout as fallback
    const runWhenIdle = window.requestIdleCallback || 
      ((cb) => setTimeout(cb, 1000));
    
    runWhenIdle(() => {
      // Load any deferred scripts here
      // This runs when the browser is idle
    });
  }

  toggle() {
    this.cartService.cartMode(true);
  }
}