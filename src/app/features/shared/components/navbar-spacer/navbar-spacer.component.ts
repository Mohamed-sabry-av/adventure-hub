import { Component, OnInit, inject, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { NavbarService } from '../../../../../app/shared/services/navbar.service';
import { DOCUMENT } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';

@Component({
  selector: 'app-navbar-spacer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Empty template - we'll handle positioning with JS -->
  `,
  styles: []
})
export class NavbarSpacerComponent implements OnInit, AfterViewInit, OnDestroy {
  private navbarService = inject(NavbarService);
  private document = inject(DOCUMENT);
  private platformId = inject(PLATFORM_ID);
  
  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      // Apply the transform approach to the header
      this.setupHeaderTransform();
    }
  }
  
  ngAfterViewInit() {
    // Additional initialization if needed
  }
  
  ngOnDestroy() {
    // Cleanup if needed
  }
  
  /**
   * Sets up a transform-based approach for the header
   * This avoids creating space and makes the header hover above content
   */
  private setupHeaderTransform() {
    // Get the header element
    const headerElement = this.document.querySelector('header');
    const mainContent = this.document.querySelector('main');
    
    if (headerElement && mainContent) {
      // Remove fixed positioning from header
      const style = this.document.createElement('style');
      style.textContent = `
        /* Override header fixed positioning */
        header.w-full {
          position: absolute !important;
          transform: translateZ(0);
          will-change: transform;
        }
        
        /* Ensure main content starts from the top */
        main.main-content {
          position: relative;
          z-index: 1;
          margin-top: 0;
          padding-top: 0;
        }
        
        /* Override any existing padding */
        body {
          padding-top: 0 !important;
        }
      `;
      
      this.document.head.appendChild(style);
      
      // Add a translation transform to the main content
      mainContent.setAttribute('style', 'transform: translateY(0); transition: transform 0.3s ease;');
      
      // Use IntersectionObserver to detect when the header is out of view
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // Header is visible, reset main content
            mainContent.setAttribute('style', 'transform: translateY(0); transition: transform 0.3s ease;');
          } else {
            // Header is not visible, no need to push content down
            const headerHeight = headerElement.getBoundingClientRect().height;
            mainContent.setAttribute('style', `transform: translateY(0); transition: transform 0.3s ease;`);
          }
        });
      }, { threshold: [0, 0.5, 1] });
      
      observer.observe(headerElement);
    }
  }
} 