import { Component, Inject, OnDestroy, OnInit, Optional, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { CommonModule, isPlatformBrowser, isPlatformServer } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, filter, map, of, Subscription, tap, timeout } from 'rxjs';
import { ProductPageComponent } from '../product/page/product-page/product-page.component';
import { ProductsComponent } from '../products/pages/Products/products.component';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-dynamic-content',
  standalone: true,
  imports: [CommonModule, ProductPageComponent, ProductsComponent],
  template: `
    <ng-container [ngSwitch]="contentType">
      <app-product-page *ngSwitchCase="'product'"></app-product-page>
      <app-products *ngSwitchCase="'category'"></app-products>
      <div *ngSwitchDefault class="loading-container">
        <div class="spinner"></div>
        <p>Loading content...</p>
      </div>
    </ng-container>
  `,
  styles: [`
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 300px;
      padding: 2rem;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid rgba(0, 0, 0, 0.1);
      border-left-color: #3498db;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 1rem;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class DynamicContentComponent implements OnInit, OnDestroy {
  slug: string = '';
  contentType: 'product' | 'category' | null = null;
  private loadingTimeout: any = null;
  private contentTypeCache: Map<string, string> = new Map();
  private routeSubscription: Subscription | null = null;
  private navigationSubscription: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    @Inject(PLATFORM_ID) private platformId: Object,
    @Optional() @Inject('CONTENT_TYPE') private serverContentType: { type: string, slug: string } | null,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Extract clean slug from URL path parameter
    this.extractSlugFromRoute();
    console.log('Dynamic content component initialized with slug:', this.slug);
    this.checkContentTypeInParallel();
    
    // Subscribe to route parameter changes
    this.routeSubscription = this.route.paramMap.subscribe(params => {
      const rawSlug = params.get('slug') || '';
      // Clean the slug by removing query parameters
      this.slug = this.cleanSlug(rawSlug);
      console.log('Route param changed, new slug:', this.slug);
      this.loadContent();
    });
    
    // Also listen for NavigationEnd events to catch query parameter changes
    // that don't result in param map changes
    this.navigationSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.extractSlugFromRoute();
      this.loadContent();
    });
  }
  
  /**
   * Extracts the clean slug from the current route
   */
  private extractSlugFromRoute(): void {
    const rawSlug = this.route.snapshot.paramMap.get('slug') || '';
    this.slug = this.cleanSlug(rawSlug);
  }
  
  /**
   * Removes query parameters and hash from a slug
   */
  private cleanSlug(rawSlug: string): string {
    return rawSlug.split(/[?#]/)[0];
  }
  
  private setLoadingTimeout(): void {
    // Clear any existing timeout
    this.clearLoadingTimeout();
    
    // Set new timeout
    this.loadingTimeout = setTimeout(() => {
      if (!this.contentType) {
        console.log('Content type detection timeout - redirecting to 404');
        this.router.navigate(['/page-not-found'], { skipLocationChange: true });
      }
    }, 5000); // 5 second timeout
  }
  
  private loadContent(): void {
    console.log('Loading content for slug:', this.slug);
    this.checkContentTypeInParallel();
  }
  
  private checkContentTypeInParallel(): void {
    console.log(`Checking content type in parallel for slug: ${this.slug}`);

    // Check cache first
    const cachedContentType = this.contentTypeCache.get(this.slug);
    if (cachedContentType) {
      console.log(`Using cached content type for ${this.slug}: ${cachedContentType}`);
      this.contentType = cachedContentType as 'product' | 'category';
      this.cdr.markForCheck();
      this.clearLoadingTimeout();
      return;
    }

    // If server provided content type, use it
    if (this.serverContentType && this.serverContentType.slug === this.slug) {
      console.log(`Using server provided content type for ${this.slug}: ${this.serverContentType.type}`);
      this.contentType = this.serverContentType.type as 'product' | 'category';
      // Cache the content type
      this.contentTypeCache.set(this.slug, this.serverContentType.type);
      this.cdr.markForCheck();
      return;
    }

    // Check if it's a product
    const productCheck = this.apiService.getRequest(`products?slug=${this.slug}`).subscribe({
      next: (response: any) => {
        if (response && response.length > 0) {
          console.log(`Detected as product!`);
          this.contentType = 'product';
          // Cache the content type
          this.contentTypeCache.set(this.slug, 'product');
          this.cdr.markForCheck();
          this.clearLoadingTimeout();
        }
      },
      error: (error) => {
        console.error('Error checking product:', error);
      },
      complete: () => {
        productCheck.unsubscribe();
      }
    });

    // Check if it's a category
    const categoryCheck = this.apiService.getRequest(`products/categories?slug=${this.slug}`).subscribe({
      next: (response: any) => {
        if (response && response.length > 0) {
          console.log(`Detected as category!`);
          this.contentType = 'category';
          // Cache the content type
          this.contentTypeCache.set(this.slug, 'category');
          this.cdr.markForCheck();
          this.clearLoadingTimeout();
        }
      },
      error: (error) => {
        console.error('Error checking category:', error);
      },
      complete: () => {
        categoryCheck.unsubscribe();
      }
    });

    // Set timeout to handle cases where neither check completes
    this.setLoadingTimeout();
  }
  
  private clearLoadingTimeout(): void {
    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
      this.loadingTimeout = null;
    }
  }
  
  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
    if (this.navigationSubscription) {
      this.navigationSubscription.unsubscribe();
    }
    this.clearLoadingTimeout();
  }
} 