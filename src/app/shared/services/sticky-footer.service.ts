import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class StickyFooterService {
  private isMobileDevice = window.innerWidth < 768;
  private isFooterVisibleSubject = new BehaviorSubject<boolean>(false);
  isFooterVisible$ = this.isFooterVisibleSubject.asObservable();
  private scrollThreshold = 500; // Default fallback threshold
  private renderer: Renderer2;

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
  }

  private handleResize() {
    this.isMobileDevice = window.innerWidth < 768;
    if (!this.isMobileDevice) {
      this.isFooterVisibleSubject.next(false);
    }
  }

  initScrollHandler(): () => void {
    const handler = () => {
      if (this.isMobileDevice) {
        // Try to find the product action buttons (Add to Cart and Buy Now)
        const actionButtons = document.querySelector('.cart-action-row');
        const buyNowButton = document.querySelector('.buy-now-container');
        
        if (actionButtons || buyNowButton) {
          // Get the position of the elements
          const actionRect = actionButtons?.getBoundingClientRect();
          const buyNowRect = buyNowButton?.getBoundingClientRect();
          
          // Check if both elements are out of the viewport (above the screen)
          const actionsOutOfView = actionRect ? actionRect.bottom < 0 : true;
          const buyNowOutOfView = buyNowRect ? buyNowRect.bottom < 0 : true;
          
          // Show the footer if both action buttons are out of view
          if (actionsOutOfView && buyNowOutOfView) {
            this.isFooterVisibleSubject.next(true);
          } else {
            this.isFooterVisibleSubject.next(false);
          }
        } else {
          // Fallback to the scroll threshold if elements aren't found
          const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
          this.isFooterVisibleSubject.next(scrollPosition > this.scrollThreshold);
        }
      }
    };

    window.addEventListener('scroll', handler, { passive: true });
    handler(); // Initial check

    return () => {
      window.removeEventListener('scroll', handler);
    };
  }
}
