import { Injectable, OnDestroy, OnInit } from '@angular/core';
import { ContentPagesService } from '../../service/content-pages.service';
import { SeoService } from '../../../../core/services/seo.service';
import { SafeHtml } from '@angular/platform-browser';
import { BehaviorSubject, Observable, Subject, of, takeUntil } from 'rxjs';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
@Injectable()
export abstract class BaseContentPageComponent implements OnInit, OnDestroy {
  pageData: any;
  schemaData: SafeHtml | null = null;
  isLoading = true;
  protected destroy$ = new Subject<void>();
  // Static cache to store page content between navigations
  private static pageCache = new Map<string, any>();
  // Track if this is the first load
  private static loadedPages = new Set<string>();
  constructor(
    protected contentPagesService: ContentPagesService,
    protected seoService: SeoService,
    protected router?: Router
  ) {
    // If router is provided, clear cache on major navigation events
    if (this.router) {
      this.router.events.pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      ).subscribe(() => {
        // Currently we don't need to clear cache on navigation
        // but this is a good place to add that logic if needed
      });
    }
  }
  ngOnInit(): void {
    // Immediately check for cached content
    const cacheKey = this.getPageCacheKey();
    const isFirstLoad = !BaseContentPageComponent.loadedPages.has(cacheKey);
    // If we've loaded this page before, use the cache right away (if available)
    if (!isFirstLoad && BaseContentPageComponent.pageCache.has(cacheKey)) {
      this.pageData = BaseContentPageComponent.pageCache.get(cacheKey);
      this.isLoading = false;
      this.applySeoTags(this.pageData);
    } else {
      // Mark this page as having been loaded once
      BaseContentPageComponent.loadedPages.add(cacheKey);
    }
    // Always fetch the content (even if we have cache) to keep it up to date
    // But we won't show the loading state again if we've loaded before
    this.fetchPageContent(!isFirstLoad);
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  /**
   * This method should be implemented by child classes to specify
   * which page content to load
   */
  protected abstract getPageContent(): Observable<any>;
  /**
   * Get default SEO fallback data specific to this page
   */
  protected abstract getDefaultSeoData(): { title: string; description: string };
  /**
   * Generate a unique key for this page type for caching
   */
  protected getPageCacheKey(): string {
    // Default implementation uses the constructor name as the key
    return this.constructor.name;
  }
  /**
   * Fetch the content for this page and apply SEO
   * @param silent If true, won't show loading state while fetching
   */
  protected fetchPageContent(silent: boolean = false): void {
    // Only show loading if we don't have the page yet and not in silent mode
    if (!this.pageData && !silent) {
      this.isLoading = true;
    }
    // If not in cache, fetch from API
    this.getPageContent()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          if (data) {
            // Update state with new data
            this.pageData = data;
            this.isLoading = false;
            // Store in cache for future navigations
            const cacheKey = this.getPageCacheKey();
            BaseContentPageComponent.pageCache.set(cacheKey, data);
            // Apply SEO tags using yoast_head_json
            this.applySeoTags(data);
          } else if (!this.pageData) {
            // Only apply fallback if we don't have existing data
            this.isLoading = false;
            this.applyFallbackSeo();
          } else {
            // Keep existing data but ensure loading is finished
            this.isLoading = false;
          }
        },
        error: (error) => {
          
          // Only show error state if we don't have existing data
          if (!this.pageData) {
            this.isLoading = false;
            this.applyFallbackSeo();
          } else {
            // Keep existing data but ensure loading is finished
            this.isLoading = false;
          }
        },
      });
  }
  /**
   * Apply SEO tags from page data
   */
  protected applySeoTags(data: any): void {
    const fallback = this.getDefaultSeoData();
    this.schemaData = this.seoService.applySeoTags(data, {
      title: data?.title?.rendered || fallback.title,
      description: data?.excerpt?.rendered || fallback.description,
      type: 'article'
    });
  }
  /**
   * Apply fallback SEO when no data is available
   */
  protected applyFallbackSeo(): void {
    const fallback = this.getDefaultSeoData();
    this.schemaData = this.seoService.applySeoTags(null, {
      title: fallback.title,
      description: fallback.description
    });
  }
} 
