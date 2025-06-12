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
  
  // Advanced third layer control - start with visible
  thirdLayerVisible = signal<boolean>(true);
  
  // Intelligent scroll tracking - now public
  lastScrollY = signal<number>(0);
  scrollDirection = signal<'up' | 'down' | 'none'>('none');
  private isDesktop = signal<boolean>(true);
  
  // Debounce control with much longer times
  private scrollStabilityTimer: any = null;
  private intentionalScrollTimer: any = null;
  private scrollThrottleTimer: any = null;
  private pendingVisibilityChange: any = null;
  private forceHideTimer: any = null;
  
  // Configuration - drastically reduced sensitivity
  private readonly SCROLL_THRESHOLD = 350;
  private readonly DESKTOP_WIDTH_THRESHOLD = 960;
  private readonly SCROLL_STABILITY_DELAY = 1500;
  private readonly INTENTIONAL_SCROLL_DELAY = 8000;
  private readonly MIN_SCROLL_DISTANCE = 80;
  private readonly SCROLL_DEBOUNCE = 200;
  
  // Force hide behavior - ensure it always hides
  private readonly FORCE_HIDE_DELAY = 10000; // Force hide after 10 seconds of down scroll
  
  // Visibility change tracking to reduce flickering
  private lastDirectionChangeTime: number = 0;
  private lastVisibilityChangeTime: number = 0;
  private readonly DIRECTION_CHANGE_COOLDOWN = 800;
  private readonly VISIBILITY_CHANGE_COOLDOWN = 1200;
  
  // Scroll distance tracking
  private totalDownScroll: number = 0;
  private totalUpScroll: number = 0;
  private readonly RESET_SCROLL_THRESHOLD = 200;
  
  // Debug flag
  private debugMode = false;
  
  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      // Initialize device type detection
      this.detectDeviceType();
      
      // Setup scroll event listeners with optimized performance
      this.setupScrollListeners();
      
      // Setup resize listener for responsive behavior
      this.setupResizeListener();
      
      // Initialize z-index for proper stacking
      this.setupZIndexStyles();
      
      // Set up a force hide timer to ensure the navbar can be hidden
      this.setupForceHideTimer();
    }
  }
  
  /**
   * Set up proper z-index and stacking context for navbar elements
   */
  private setupZIndexStyles(): void {
    // Create a style element
    const styleEl = document.createElement('style');
    styleEl.type = 'text/css';
    
    // Define CSS to fix z-index stacking issues
    const css = `
      /* Fix stacking context for header layers */
      .header-content-wrapper {
        position: relative;
        z-index: 1000;
      }
      
      /* Ensure third layer has proper stacking */
      .header-bottom-layer {
        position: relative;
        z-index: 990;
      }
      
      /* Fix main content position */
      .main-content {
        position: relative;
        z-index: 1;
      }
      
      /* Ensure proper flow with sticky header */
      header {
        position: sticky;
        top: 0;
        z-index: 1000;
      }
      
      /* Fix for Safari */
      @supports (-webkit-touch-callout: none) {
        header {
          position: -webkit-sticky;
        }
      }
    `;
    
    // Add the CSS to the style element
    styleEl.appendChild(document.createTextNode(css));
    
    // Add the style element to the head
    document.head.appendChild(styleEl);
  }
  
  /**
   * Detect if user is on desktop or mobile
   */
  private detectDeviceType(): void {
    this.isDesktop.set(window.innerWidth >= this.DESKTOP_WIDTH_THRESHOLD);
  }
  
  /**
   * Setup optimized scroll event listeners with reduced sensitivity
   */
  private setupScrollListeners(): void {
    // Use passive event listener for better performance with extreme throttling
    fromEvent(window, 'scroll', { passive: true })
      .pipe(
        throttleTime(50),
        debounceTime(this.SCROLL_DEBOUNCE)
      )
      .subscribe(() => {
        // Use additional throttling for extremely smooth behavior
        if (this.scrollThrottleTimer) return;
        
        this.scrollThrottleTimer = setTimeout(() => {
        this.handleScroll();
          this.scrollThrottleTimer = null;
        }, 50);
      });
  }
  
  /**
   * Setup resize listener
   */
  private setupResizeListener(): void {
    fromEvent(window, 'resize')
      .pipe(
        debounceTime(200),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.detectDeviceType();
      });
  }
  
  /**
   * Setup a force hide timer to ensure the navbar can be hidden
   */
  private setupForceHideTimer(): void {
    // Check every 5 seconds if we should force hide the navbar
    setInterval(() => {
      const currentScrollY = window.scrollY;
      
      // If we're scrolled down significantly and the navbar is visible,
      // force hide it after a delay
      if (currentScrollY > this.SCROLL_THRESHOLD && this.thirdLayerVisible() === true) {
        if (!this.forceHideTimer) {
          this.forceHideTimer = setTimeout(() => {
            // Check one more time before hiding
            if (currentScrollY > this.SCROLL_THRESHOLD) {
              this.logDebug('Force hiding navbar after delay');
              this.thirdLayerVisible.set(false);
            }
            this.forceHideTimer = null;
          }, this.FORCE_HIDE_DELAY);
        }
      } else {
        // Clear force hide timer if we're at the top or navbar is already hidden
        if (this.forceHideTimer) {
          clearTimeout(this.forceHideTimer);
          this.forceHideTimer = null;
        }
      }
    }, 5000);
  }
  
  /**
   * Handle scroll events intelligently with greatly reduced sensitivity
   */
  private handleScroll(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    
    const currentScrollY = window.scrollY;
    const previousScrollY = this.lastScrollY();
    const scrollDifference = Math.abs(currentScrollY - previousScrollY);
    
    // Always update last scroll position
    this.lastScrollY.set(currentScrollY);
    
    // Accumulate scroll distance to reduce sensitivity
    if (currentScrollY > previousScrollY) {
      // Scrolling down
      this.totalDownScroll += scrollDifference;
      this.totalUpScroll = 0; // Reset up scroll counter
    } else if (currentScrollY < previousScrollY) {
      // Scrolling up
      this.totalUpScroll += scrollDifference;
      this.totalDownScroll = 0; // Reset down scroll counter
    }
    
    // Only update direction if accumulated scroll is significant
    // and enough time has passed since the last direction change
    const now = Date.now();
    const timeSinceLastChange = now - this.lastDirectionChangeTime;
    
    if (timeSinceLastChange > this.DIRECTION_CHANGE_COOLDOWN) {
      if (this.totalDownScroll > this.MIN_SCROLL_DISTANCE) {
        this.scrollDirection.set('down');
        this.lastDirectionChangeTime = now;
        this.totalDownScroll = 0;
        
        // When scrolling down, explicitly hide the third layer after a delay
        if (currentScrollY > this.SCROLL_THRESHOLD && this.thirdLayerVisible()) {
          this.logDebug('Setting hide timer due to down scroll');
          setTimeout(() => {
            if (this.scrollDirection() === 'down') {
              this.logDebug('Hiding navbar after down scroll delay');
              this.thirdLayerVisible.set(false);
            }
          }, 600);
        }
      } else if (this.totalUpScroll > this.MIN_SCROLL_DISTANCE) {
        this.scrollDirection.set('up');
        this.lastDirectionChangeTime = now;
        this.totalUpScroll = 0;
      }
    }
    
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
      if (currentScrollY < 100) {
        this.safelySetVisibility(true);
      } else if (currentScrollY > this.SCROLL_THRESHOLD) {
        // If we're scrolled down and have stopped scrolling, hide the navbar
        this.safelySetVisibility(false);
      }
    }, this.SCROLL_STABILITY_DELAY);
  }
  
  /**
   * Helper method to safely change visibility with reduced flicker
   */
  private safelySetVisibility(visible: boolean): void {
    const now = Date.now();
    const timeSinceLastVisibilityChange = now - this.lastVisibilityChangeTime;
    
    // Log the requested change
    this.logDebug(`Request to set visibility: ${visible}`);
    
    // If we just changed visibility, don't change it again too soon
    if (timeSinceLastVisibilityChange < this.VISIBILITY_CHANGE_COOLDOWN) {
      // Cancel any pending visibility changes
      if (this.pendingVisibilityChange) {
        clearTimeout(this.pendingVisibilityChange);
      }
      
      // Schedule the change for later
      this.pendingVisibilityChange = setTimeout(() => {
        this.logDebug(`Delayed visibility change to: ${visible}`);
        this.thirdLayerVisible.set(visible);
        this.lastVisibilityChangeTime = Date.now();
        this.pendingVisibilityChange = null;
      }, this.VISIBILITY_CHANGE_COOLDOWN - timeSinceLastVisibilityChange);
      
      return;
    }
    
    // Otherwise, make the change now
    this.logDebug(`Immediate visibility change to: ${visible}`);
    this.thirdLayerVisible.set(visible);
    this.lastVisibilityChangeTime = now;
  }
  
  /**
   * Handle desktop-specific scroll behavior
   * Much more stable and less sensitive to movements
   */
  private handleDesktopScroll(currentScrollY: number): void {
    // At the top, always show third layer
    if (currentScrollY < 50) {
      this.safelySetVisibility(true);
      return;
    }
    
    // When scrolling down, ensure we hide the third layer
    if (this.scrollDirection() === 'down' && 
        this.totalDownScroll > this.RESET_SCROLL_THRESHOLD && 
        currentScrollY > this.SCROLL_THRESHOLD) {
      
      setTimeout(() => {
        if (this.scrollDirection() === 'down') {
          this.logDebug('Hiding third layer after down scroll threshold');
          this.thirdLayerVisible.set(false);
        }
      }, 500);
    }
    // When scrolling up, always show the third layer regardless of position
    else if (this.scrollDirection() === 'up' && this.totalUpScroll > this.RESET_SCROLL_THRESHOLD) {
      // Clear any existing timers
      if (this.intentionalScrollTimer) {
        clearTimeout(this.intentionalScrollTimer);
      }
      
      // Set the third layer to visible immediately when scrolling up
      this.safelySetVisibility(true);
      
      // Set a long timer before hiding it again
      this.intentionalScrollTimer = setTimeout(() => {
        if (currentScrollY > this.SCROLL_THRESHOLD && this.scrollDirection() !== 'up') {
          this.logDebug('Hiding third layer after visibility timer');
          this.safelySetVisibility(false);
        }
      }, this.INTENTIONAL_SCROLL_DELAY);
    }
  }
  
  /**
   * Handle mobile-specific scroll behavior
   * Much less sensitive to conserve screen space
   */
  private handleMobileScroll(currentScrollY: number): void {
    // At the top, always show third layer
    if (currentScrollY < 50) {
      this.safelySetVisibility(true);
      return;
    }
    
    // When scrolling down significantly, hide the navbar
    if (this.scrollDirection() === 'down' && 
        this.totalDownScroll > this.RESET_SCROLL_THRESHOLD && 
        currentScrollY > 150) {
      
      setTimeout(() => {
        if (this.scrollDirection() === 'down') {
          this.logDebug('Hiding third layer for mobile after down scroll');
          this.thirdLayerVisible.set(false);
        }
      }, 400);
    } 
    // When scrolling up, always show the navbar regardless of position
    else if (this.scrollDirection() === 'up' && this.totalUpScroll > this.RESET_SCROLL_THRESHOLD) {
      // Show immediately when scrolling up
      this.safelySetVisibility(true);
      
      // Clear any pending hide timers
      if (this.intentionalScrollTimer) {
        clearTimeout(this.intentionalScrollTimer);
      }
      
      // Set a longer timer to maintain visibility
      this.intentionalScrollTimer = setTimeout(() => {
        if (currentScrollY > 150 && this.scrollDirection() !== 'up') {
          this.logDebug('Hiding third layer for mobile after timer');
          this.safelySetVisibility(false);
        }
      }, 5000);
    }
  }

  /**
   * Debug log helper
   */
  private logDebug(message: string): void {
    if (this.debugMode && isPlatformBrowser(this.platformId)) {
      
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
    this.logDebug(`Force third layer visibility: ${visible}`);
    this.thirdLayerVisible.set(visible); // Bypass the safety checks for explicit control
  }
}
