import { Injectable, Inject, PLATFORM_ID, Optional, REQUEST } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router, NavigationEnd } from '@angular/router';
import { DOCUMENT, isPlatformBrowser, isPlatformServer } from '@angular/common';
import { filter, take } from 'rxjs/operators';


interface SeoData {
  title?: string;
  description?: string;
  image?: string;
  type?: string;
  canonical?: string;
  published?: string;
  modified?: string;
  author?: string;
  robots?: string;
  keywords?: string[];
  twitterCard?: string;
  schema?: any;
}

@Injectable({
  providedIn: 'root',
})
export class SeoService {
  private readonly siteName = 'Adventures HUB Sports Shop';
  private readonly siteUrl = 'https://adventures-hub.com';
  private readonly defaultDescription = 'Premium outdoor and adventure sports equipment for enthusiasts. Shop high-quality gear for hiking, camping, and outdoor activities.';
  private readonly defaultImage = 'https://adventures-hub.com/assets/images/default-og-image.jpg';
  private readonly logoUrl = 'https://adventures-hub.com/assets/images/logo.png';
  private readonly schemaScriptTags: HTMLScriptElement[] = [];

  constructor(
    private titleService: Title,
    public metaService: Meta,
    private sanitizer: DomSanitizer,
    private router: Router,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: Object,
    @Optional() @Inject(REQUEST) private request: any
  ) {
    // Track route changes for analytics & canonical updates
    if (isPlatformBrowser(this.platformId)) {
      this.router.events.pipe(
        filter(event => event instanceof NavigationEnd)
      ).subscribe((event: NavigationEnd) => {
        // Update canonical URL on route changes
        this.updateCanonicalUrl(this.buildFullUrl(event.urlAfterRedirects));
        // Remove old schema tags when route changes
        this.removeSchemaScripts();
      });
    }
  }

  /**
   * Primary method to apply complete SEO meta tags
   */
  applySeoTags(
    data: any,
    fallbackData: SeoData = {}
  ): SafeHtml | null {
    let schemaHtml = null;

    // Get the current URL
    const pageUrl = this.getCurrentUrl(fallbackData.canonical);
    
    // Core Web Vitals optimization hints
    this.addCoreWebVitalsMetaTags();

    if (data?.yoast_head_json) {
      // WordPress data with Yoast SEO available - use this first
      this.applyYoastSeoData(data.yoast_head_json, fallbackData, pageUrl);
      schemaHtml = this.createSchemaHtml(data, fallbackData, pageUrl);
    } else {
      // Fallback for regular pages or when Yoast data is not available
      this.applyBasicSeoData(fallbackData, pageUrl);
      schemaHtml = this.createSchemaHtml(data, fallbackData, pageUrl);
    }

    // Add schema.org JSON-LD to page
    this.addSchemaToDocument(schemaHtml);

    return schemaHtml;
  }

  /**
   * Apply special meta tags to optimize Core Web Vitals
   */
  private addCoreWebVitalsMetaTags(): void {
    // Add resources that will be needed early
    this.addPreloadForCriticalAssets();
    
    // Prevent unnecessary layout shifts by setting dimensions for media
    this.metaService.updateTag({ 
      name: 'viewport-fit', 
      content: 'cover' 
    });
  }

  /**
   * Apply Yoast SEO data from WordPress
   */
  private applyYoastSeoData(yoastJson: any, fallbackData: SeoData, pageUrl: string): void {
    // Title - use Yoast title first, then fallback, then site name
    this.titleService.setTitle(yoastJson.title || fallbackData.title || this.siteName);

    // Meta Description
    if (yoastJson.description) {
      this.metaService.updateTag({ name: 'description', content: yoastJson.description });
    } else if (fallbackData.description) {
      this.metaService.updateTag({
        name: 'description',
        content: this.stripHtml(fallbackData.description),
      });
    } else {
      this.metaService.updateTag({ name: 'description', content: this.defaultDescription });
    }

    // Robots meta
    if (yoastJson.robots) {
      this.metaService.updateTag({
        name: 'robots',
        content: `${yoastJson.robots.index}, ${yoastJson.robots.follow}, ${yoastJson.robots['max-snippet'] || 'max-snippet:-1'}, ${yoastJson.robots['max-image-preview'] || 'max-image-preview:large'}`,
      });
    } else {
      this.metaService.updateTag({ name: 'robots', content: fallbackData.robots || 'index, follow' });
    }

    // Canonical
    if (yoastJson.canonical) {
      this.updateCanonicalUrl(yoastJson.canonical);
    } else if (fallbackData.canonical) {
      this.updateCanonicalUrl(fallbackData.canonical);
    } else {
      this.updateCanonicalUrl(pageUrl);
    }

    // Hreflang for multilingual support
    this.setHrefLangTags(pageUrl);

    // Open Graph Tags
    this.setOpenGraphTags({
      title: yoastJson.og_title || fallbackData.title || this.siteName,
      description: yoastJson.og_description || (fallbackData.description ? this.stripHtml(fallbackData.description) : this.defaultDescription),
      url: yoastJson.og_url || pageUrl,
      siteName: yoastJson.og_site_name || this.siteName,
      image: (yoastJson.og_image && yoastJson.og_image[0]?.url) || fallbackData.image || this.defaultImage,
      type: fallbackData.type || 'website',
      imageData: yoastJson.og_image && yoastJson.og_image[0]
    });

    // Twitter Card
    this.setTwitterCardTags({
      card: yoastJson.twitter_card || fallbackData.twitterCard || 'summary_large_image',
      site: yoastJson.twitter_site || '@hub_adventures',
      title: yoastJson.twitter_title || fallbackData.title || this.siteName,
      description: yoastJson.twitter_description || (fallbackData.description ? this.stripHtml(fallbackData.description) : this.defaultDescription),
      image: (yoastJson.twitter_image && yoastJson.twitter_image?.url) || fallbackData.image || this.defaultImage
    });

    // Additional Meta Tags for SEO
    this.setGeoLocationTags();

    // Article specific metadata if available
    if (fallbackData.published || yoastJson.article_published_time) {
      this.setArticleMetadata({
        published: fallbackData.published || yoastJson.article_published_time,
        modified: fallbackData.modified || yoastJson.article_modified_time,
        author: fallbackData.author || yoastJson.author
      });
    }
  }

  /**
   * Apply basic SEO data without Yoast
   */
  private applyBasicSeoData(fallbackData: SeoData, pageUrl: string): void {
    // Title
    this.titleService.setTitle(fallbackData.title || this.siteName);
    
    // Meta Description
    this.metaService.updateTag({
      name: 'description',
      content: fallbackData.description ? this.stripHtml(fallbackData.description) : this.defaultDescription
    });
    
    // Robots meta
    this.metaService.updateTag({ 
      name: 'robots', 
      content: fallbackData.robots || 'index, follow' 
    });
    
    // Canonical URL
    this.updateCanonicalUrl(fallbackData.canonical || pageUrl);
    
    // Hreflang for multilingual support
    this.setHrefLangTags(pageUrl);
    
    // Keywords if available
    if (fallbackData.keywords && fallbackData.keywords.length) {
      this.metaService.updateTag({
        name: 'keywords',
        content: fallbackData.keywords.join(', ')
      });
    }
    
    // Open Graph Tags
    this.setOpenGraphTags({
      title: fallbackData.title || this.siteName,
      description: fallbackData.description ? this.stripHtml(fallbackData.description) : this.defaultDescription,
      url: pageUrl,
      siteName: this.siteName,
      image: fallbackData.image || this.defaultImage,
      type: fallbackData.type || 'website'
    });
    
    // Twitter Card
    this.setTwitterCardTags({
      card: fallbackData.twitterCard || 'summary_large_image',
      site: '@hub_adventures',
      title: fallbackData.title || this.siteName,
      description: fallbackData.description ? this.stripHtml(fallbackData.description) : this.defaultDescription,
      image: fallbackData.image || this.defaultImage
    });
    
    // Additional Meta Tags for SEO
    this.setGeoLocationTags();
    
    // Article specific metadata if available
    if (fallbackData.published) {
      this.setArticleMetadata({
        published: fallbackData.published,
        modified: fallbackData.modified,
        author: fallbackData.author
      });
    }
  }

  /**
   * Add article specific meta tags for blog posts
   */
  private setArticleMetadata(data: { published?: string, modified?: string, author?: string }): void {
    if (data.published) {
      this.metaService.updateTag({ property: 'article:published_time', content: data.published });
    }
    
    if (data.modified) {
      this.metaService.updateTag({ property: 'article:modified_time', content: data.modified });
    }
    
    if (data.author) {
      this.metaService.updateTag({ property: 'article:author', content: data.author });
    }
  }

  /**
   * Set Open Graph meta tags
   */
  private setOpenGraphTags(data: {
    title: string,
    description: string,
    url: string,
    siteName: string,
    image: string,
    type: string,
    imageData?: any
  }): void {
    this.metaService.updateTag({ property: 'og:title', content: data.title });
    this.metaService.updateTag({ property: 'og:description', content: data.description });
    this.metaService.updateTag({ property: 'og:url', content: data.url });
    this.metaService.updateTag({ property: 'og:site_name', content: data.siteName });
    this.metaService.updateTag({ property: 'og:type', content: data.type });
    this.metaService.updateTag({ property: 'og:image', content: data.image });
    
    // Add image metadata if available
    if (data.imageData) {
      if (data.imageData.width) {
        this.metaService.updateTag({
          property: 'og:image:width',
          content: data.imageData.width.toString(),
        });
      }
      
      if (data.imageData.height) {
        this.metaService.updateTag({
          property: 'og:image:height',
          content: data.imageData.height.toString(),
        });
      }
      
      if (data.imageData.type) {
        this.metaService.updateTag({
          property: 'og:image:type',
          content: data.imageData.type,
        });
      }
    }
    
    // Add locale information
    this.metaService.updateTag({ property: 'og:locale', content: 'en_US' });
    this.metaService.updateTag({ property: 'og:locale:alternate', content: 'ar_AE' });
  }

  /**
   * Set Twitter Card meta tags
   */
  private setTwitterCardTags(data: {
    card: string,
    site: string,
    title: string,
    description: string,
    image: string
  }): void {
    this.metaService.updateTag({ name: 'twitter:card', content: data.card });
    this.metaService.updateTag({ name: 'twitter:site', content: data.site });
    this.metaService.updateTag({ name: 'twitter:title', content: data.title });
    this.metaService.updateTag({ name: 'twitter:description', content: data.description });
    this.metaService.updateTag({ name: 'twitter:image', content: data.image });
  }

  /**
   * Set geolocation meta tags for local SEO
   */
  private setGeoLocationTags(): void {
    this.metaService.updateTag({ name: 'geo.region', content: 'AE' });
    this.metaService.updateTag({ name: 'geo.placename', content: 'Dubai' });
    this.metaService.updateTag({ name: 'geo.position', content: '25.2048;55.2708' });
    this.metaService.updateTag({ name: 'ICBM', content: '25.2048, 55.2708' });
  }

  /**
   * Set hreflang tags for multilingual support
   */
  private setHrefLangTags(pageUrl: string): void {
    this.metaService.updateTag({ rel: 'alternate', hreflang: 'en', href: pageUrl });
    this.metaService.updateTag({ rel: 'alternate', hreflang: 'ar', href: `${pageUrl}?lang=ar` });
    this.metaService.updateTag({ rel: 'alternate', hreflang: 'x-default', href: pageUrl });
  }

  /**
   * Get the full current URL, handling both browser and server environments
   */
  private getCurrentUrl(canonical?: string): string {
    if (canonical) {
      return canonical;
    }
    
    if (isPlatformBrowser(this.platformId)) {
      return window.location.href;
    } else if (isPlatformServer(this.platformId) && this.request) {
      const protocol = this.request.protocol || 'https';
      const host = this.request.get('host') || 'adventures-hub.com';
      const url = this.request.originalUrl || '/';
      return `${protocol}://${host}${url}`;
    }
    
    return this.buildFullUrl(this.router.url);
  }

  /**
   * Build a full URL from a relative path
   */
  private buildFullUrl(path: string): string {
    // Ensure the path starts with a slash
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    
    return `${this.siteUrl}${path}`;
  }

  /**
   * Update the canonical URL meta tag
   */
  updateCanonicalUrl(url: string): void {
    // Remove existing canonical links
    const linkElements = this.document.head.querySelectorAll('link[rel="canonical"]');
    linkElements.forEach(element => element.remove());
    
    // Create and append a new canonical link
    const link = this.document.createElement('link');
    link.setAttribute('rel', 'canonical');
    link.setAttribute('href', url);
    this.document.head.appendChild(link);
  }

  /**
   * Add preload hints for critical assets
   */
  private addPreloadForCriticalAssets(): void {
    if (isPlatformServer(this.platformId)) {
      // This method would be used in SSR to add preload hints to the head
      // Add implementation for server-side preloaded assets if needed
    }
  }

  /**
   * Create Schema.org structured data
   */
  private createSchemaHtml(data: any, fallbackData: SeoData, pageUrl: string): SafeHtml {
    // Define schema based on page type
    let schema: any;
    
    if (fallbackData.schema) {
      // Use provided schema directly if available
      schema = fallbackData.schema;
    } else if (data?.permalink && data?.name) {
      // Product page schema
      schema = this.createProductSchema(data, fallbackData, pageUrl);
    } else if (data?.id && data?.title?.rendered) {
      // Blog article schema
      schema = this.createArticleSchema(data, fallbackData, pageUrl);
    } else if (this.router.url.includes('/category/') || this.router.url.includes('/products/')) {
      // Collection page schema
      schema = this.createCollectionSchema(fallbackData, pageUrl);
    } else {
      // Default website schema
      schema = this.createWebsiteSchema(fallbackData, pageUrl);
    }
    
    // Always add the organization schema
    const graphArray = Array.isArray(schema['@graph']) ? schema['@graph'] : [schema];
    const fullSchema = {
      '@context': 'https://schema.org',
      '@graph': [...graphArray, this.createOrganizationSchema()]
    };
    
    return this.sanitizer.bypassSecurityTrustHtml(JSON.stringify(fullSchema));
  }

  /**
   * Create Product Schema
   */
  private createProductSchema(data: any, fallbackData: SeoData, pageUrl: string): any {
    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: data.name,
      image: data.images?.[0]?.src || fallbackData.image || this.defaultImage,
      description: data.description ? this.stripHtml(data.description) : (fallbackData.description || this.defaultDescription),
      sku: data.sku,
      mpn: data.id,
      brand: {
        '@type': 'Brand',
        name: data.attributes?.find((attr: any) => attr.name === 'Brand')?.options[0]?.name || 'Adventures Hub'
      },
      offers: {
        '@type': 'Offer',
        url: data.permalink || pageUrl,
        priceCurrency: data.priceSpecification?.priceCurrency || 'AED',
        price: data.price,
        priceValidUntil: data.priceSpecification?.validThrough || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        availability: data.stock_status === 'instock' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
        seller: {
          '@type': 'Organization',
          name: this.siteName,
          logo: this.logoUrl
        }
      },
      aggregateRating: data.average_rating && data.rating_count > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: data.average_rating,
            reviewCount: data.rating_count
          }
        : undefined
    };
  }

  /**
   * Create Article Schema
   */
  private createArticleSchema(data: any, fallbackData: SeoData, pageUrl: string): any {
    return {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: data.title?.rendered || fallbackData.title || 'Blog Article',
      image: data.jetpack_featured_media_url || fallbackData.image || this.defaultImage,
      datePublished: data.date || fallbackData.published || new Date().toISOString(),
      dateModified: data.modified || fallbackData.modified || new Date().toISOString(),
      author: {
        '@type': 'Person',
        name: data.author_info?.display_name || fallbackData.author || 'Adventures Hub Author'
      },
      publisher: {
        '@type': 'Organization',
        name: this.siteName,
        logo: {
          '@type': 'ImageObject',
          url: this.logoUrl
        }
      },
      description: this.stripHtml(data.excerpt?.rendered) || fallbackData.description || this.defaultDescription,
      url: pageUrl,
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': pageUrl
      }
    };
  }

  /**
   * Create Collection/Category Schema
   */
  private createCollectionSchema(fallbackData: SeoData, pageUrl: string): any {
    return {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: fallbackData.title || 'Product Collection',
      description: fallbackData.description || this.defaultDescription,
      url: pageUrl,
      publisher: {
        '@type': 'Organization',
        name: this.siteName,
        logo: this.logoUrl
      }
    };
  }

  /**
   * Create Website Schema
   */
  private createWebsiteSchema(fallbackData: SeoData, pageUrl: string): any {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: this.siteName,
      url: this.siteUrl,
      description: fallbackData.description || this.defaultDescription,
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${this.siteUrl}/search?q={search_term_string}`
        },
        'query-input': 'required name=search_term_string'
      }
    };
  }

  /**
   * Create Organization Schema
   */
  private createOrganizationSchema(): any {
    return {
      '@type': 'Organization',
      '@id': `${this.siteUrl}/#organization`,
      name: this.siteName,
      url: this.siteUrl,
      logo: {
        '@type': 'ImageObject',
        url: this.logoUrl,
        width: 190,
        height: 60
      },
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+1-234-567-8900',
        contactType: 'customer service',
        availableLanguage: ['English', 'Arabic']
      },
      sameAs: [
        'https://www.facebook.com/adventureshub',
        'https://www.instagram.com/adventureshub',
        'https://twitter.com/adventureshub'
      ]
    };
  }

  /**
   * Add schema.org JSON-LD to document head
   */
  private addSchemaToDocument(schemaHtml: SafeHtml | null): void {
    if (!schemaHtml || !isPlatformBrowser(this.platformId)) {
      return;
    }
    
    // Create and add a new script element with the schema data
    const script = this.document.createElement('script');
    script.type = 'application/ld+json';
    script.innerHTML = this.sanitizer.sanitize(1, schemaHtml) || '';
    this.document.head.appendChild(script);
    
    // Keep track of created schema scripts to remove them later
    this.schemaScriptTags.push(script);
  }

  /**
   * Remove previously added schema scripts to prevent duplicates
   */
  private removeSchemaScripts(): void {
    // Remove all previously added script tags
    this.schemaScriptTags.forEach(script => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    });
    
    // Reset the array
    this.schemaScriptTags.length = 0;
  }

  /**
   * Generate XML Sitemap data for dynamic sitemap generation
   */
  generateSitemapXml(): string {
    // Basic sitemap structure - in a real app, this would fetch data from APIs
    return `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url>
        <loc>${this.siteUrl}/</loc>
        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
        <priority>1.0</priority>
      </url>
    </urlset>`;
  }

  /**
   * Helper to strip HTML from strings
   */
  private stripHtml(html: string): string {
    return html?.replace(/(<([^>]+)>)/gi, '') || '';
  }
}
