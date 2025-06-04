import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Subject, fromEvent, debounceTime, throttleTime, distinctUntilChanged } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NavbarService {
  private platformId = inject(PLATFORM_ID);
  
  // Basic visibility signals
  navBarIsVisible = signal<boolean>(true);
  headerHeight = signal<number>(92);
  showSearchBar = signal<boolean>(false);
  sideNavIsVisible = signal<boolean>(false);
  
  // Advanced third layer control
  thirdLayerVisible = signal<boolean>(true);
  
  // Intelligent scroll tracking - now public
  lastScrollY = signal<number>(0);
  scrollDirection = signal<'up' | 'down' | 'none'>('none');
  private isDesktop = signal<boolean>(true);
  
  // Debounce control
  private scrollStabilityTimer: any = null;
  private intentionalScrollTimer: any = null;
  
  // Configuration
  private readonly SCROLL_THRESHOLD = 100;
  private readonly DESKTOP_WIDTH_THRESHOLD = 768;
  private readonly SCROLL_STABILITY_DELAY = 500;
  private readonly INTENTIONAL_SCROLL_DELAY = 3000;
  
  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      // Initialize device type detection
      this.detectDeviceType();
      
      // Setup scroll event listeners with optimized performance
      this.setupScrollListeners();
      
      // Setup resize listener for responsive behavior
      this.setupResizeListener();
    }
  }
  
  /**
   * Detect if user is on desktop or mobile
   */
  private detectDeviceType(): void {
    this.isDesktop.set(window.innerWidth >= this.DESKTOP_WIDTH_THRESHOLD);
  }
  
  /**
   * Setup optimized scroll event listeners
   */
  private setupScrollListeners(): void {
    // Use passive event listener for better performance
    fromEvent(window, 'scroll', { passive: true })
      .pipe(
        throttleTime(10), // Limit processing during rapid scrolling
        debounceTime(20)  // Process after scrolling pauses briefly
      )
      .subscribe(() => {
        this.handleScroll();
      });
  }
  
  /**
   * Setup resize listener
   */
  private setupResizeListener(): void {
    fromEvent(window, 'resize')
      .pipe(
        debounceTime(100),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.detectDeviceType();
      });
  }
  
  /**
   * Handle scroll events intelligently
   */
  private handleScroll(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    
    const currentScrollY = window.scrollY;
    const previousScrollY = this.lastScrollY();
    
    // Update scroll direction
    if (currentScrollY > previousScrollY + 5) {
      this.scrollDirection.set('down');
    } else if (currentScrollY < previousScrollY - 5) {
      this.scrollDirection.set('up');
    }
    
    // Update last scroll position
    this.lastScrollY.set(currentScrollY);
    
    // Apply different behavior based on device type
    if (this.isDesktop()) {
      this.handleDesktopScroll(currentScrollY);
    } else {
      this.handleMobileScroll(currentScrollY);
    }
    
    // Reset scroll stability timer
    if (this.scrollStabilityTimer) {
      clearTimeout(this.scrollStabilityTimer);
    }
    
    // Set a timer to detect when scrolling has stabilized
    this.scrollStabilityTimer = setTimeout(() => {
      // If we've stopped scrolling and are near the top, show the navbar
      if (currentScrollY < this.SCROLL_THRESHOLD) {
        this.thirdLayerVisible.set(true);
      }
    }, this.SCROLL_STABILITY_DELAY);
  }
  
  /**
   * Handle desktop-specific scroll behavior
   * More stable and less sensitive to small movements
   */
  private handleDesktopScroll(currentScrollY: number): void {
    // At the top, always show third layer
    if (currentScrollY < 10) {
      this.thirdLayerVisible.set(true);
      return;
    }
    
    // When scrolling up, show the third layer
    if (this.scrollDirection() === 'up') {
      this.thirdLayerVisible.set(true);
      
      // Set a timer to keep the layer visible for a while after scrolling up
      if (this.intentionalScrollTimer) {
        clearTimeout(this.intentionalScrollTimer);
      }
      
      this.intentionalScrollTimer = setTimeout(() => {
        // Only hide if we're scrolled down significantly and not actively scrolling up
        if (currentScrollY > this.SCROLL_THRESHOLD && this.scrollDirection() !== 'up') {
          this.thirdLayerVisible.set(false);
        }
      }, this.INTENTIONAL_SCROLL_DELAY);
    } 
    // When scrolling down significantly, hide the third layer
    else if (this.scrollDirection() === 'down' && currentScrollY > this.SCROLL_THRESHOLD) {
      // Add a slight delay before hiding to prevent flickering
      setTimeout(() => {
        if (this.scrollDirection() === 'down') {
          this.thirdLayerVisible.set(false);
        }
      }, 100);
    }
  }
  
  /**
   * Handle mobile-specific scroll behavior
   * More responsive to conserve screen space
   */
  private handleMobileScroll(currentScrollY: number): void {
    // At the top, always show third layer
    if (currentScrollY < 10) {
      this.thirdLayerVisible.set(true);
      return;
    }
    
    // When scrolling up, show the navbar
    if (this.scrollDirection() === 'up') {
      this.thirdLayerVisible.set(true);
    } 
    // When scrolling down, hide the navbar faster on mobile
    else if (this.scrollDirection() === 'down' && currentScrollY > 50) {
      this.thirdLayerVisible.set(false);
    }
  }

  /**
   * Public API to control navbar visibility
   */
  showNavbar(navbarVisible: boolean) {
    this.navBarIsVisible.set(navbarVisible);
  }

  /**
   * Set header height
   */
  setHeaderHeight(headerHeight: any) {
    this.headerHeight.set(headerHeight);
  }

  /**
   * Toggle search bar visibility
   */
  toggleSearchBar(isVisible: boolean) {
    this.showSearchBar.set(isVisible);
  }

  /**
   * Toggle side navigation visibility
   */
  toggleSideNav(visible: boolean) {
    this.sideNavIsVisible.set(visible);
  }
  
  /**
   * Force show/hide the third layer (for manual control)
   */
  forceThirdLayerVisibility(visible: boolean) {
    this.thirdLayerVisible.set(visible);
  }
}
