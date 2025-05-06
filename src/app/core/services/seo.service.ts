import { Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class SeoService {
  private readonly siteName = 'Adventures HUB Sports Shop';
  private readonly siteUrl = 'https://adventures-hub.com';

  constructor(
    private titleService: Title,
    public metaService: Meta,
    private sanitizer: DomSanitizer,
    private router: Router
  ) {
    // Track route changes for analytics if needed
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      // Update canonical URL on route changes
      this.updateCanonicalUrl(this.siteUrl + event.urlAfterRedirects);
    });
  }

  applySeoTags(
    data: any,
    fallbackData: { title?: string; description?: string; image?: string; pageUrl?: string } = {}
  ): SafeHtml | null {
    let schemaHtml = null;

    // Default page URL (use fallbackData.pageUrl or current window location)
    const pageUrl = fallbackData.pageUrl || window.location.href;

    if (data?.yoast_head_json) {
      const yoastJson = data.yoast_head_json;

      // Title
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
        this.metaService.removeTag('name="description"');
      }

      // Robots
      if (yoastJson.robots) {
        this.metaService.updateTag({
          name: 'robots',
          content: `${yoastJson.robots.index}, ${yoastJson.robots.follow}, ${yoastJson.robots['max-snippet'] || 'max-snippet:-1'}, ${yoastJson.robots['max-image-preview'] || 'max-image-preview:large'}`,
        });
      } else {
        this.metaService.updateTag({ name: 'robots', content: 'index, follow' });
      }

      // Canonical
      if (yoastJson.canonical) {
        this.updateCanonicalUrl(yoastJson.canonical);
      } else if (data.permalink) {
        this.updateCanonicalUrl(data.permalink);
      } else {
        this.updateCanonicalUrl(pageUrl);
      }

      // Hreflang for multilingual support
      this.metaService.updateTag({ rel: 'alternate', hreflang: 'en', href: pageUrl });
      this.metaService.updateTag({ rel: 'alternate', hreflang: 'ar', href: `${pageUrl}?lang=ar` });
      this.metaService.updateTag({ rel: 'alternate', hreflang: 'x-default', href: pageUrl });

      // Open Graph Tags
      if (yoastJson.og_title) {
        this.metaService.updateTag({ property: 'og:title', content: yoastJson.og_title });
      } else {
        this.metaService.updateTag({
          property: 'og:title',
          content: fallbackData.title || this.siteName,
        });
      }

      if (yoastJson.og_description) {
        this.metaService.updateTag({ property: 'og:description', content: yoastJson.og_description });
      } else if (fallbackData.description) {
        this.metaService.updateTag({
          property: 'og:description',
          content: this.stripHtml(fallbackData.description),
        });
      } else {
        this.metaService.removeTag('property="og:description"');
      }

      if (yoastJson.og_url) {
        this.metaService.updateTag({ property: 'og:url', content: yoastJson.og_url });
      } else {
        this.metaService.updateTag({ property: 'og:url', content: pageUrl });
      }

      if (yoastJson.og_site_name) {
        this.metaService.updateTag({ property: 'og:site_name', content: yoastJson.og_site_name });
      } else {
        this.metaService.updateTag({
          property: 'og:site_name',
          content: this.siteName,
        });
      }

      if (yoastJson.og_image && yoastJson.og_image[0]?.url) {
        this.metaService.updateTag({ property: 'og:image', content: yoastJson.og_image[0].url });
        if (yoastJson.og_image[0].width) {
          this.metaService.updateTag({
            property: 'og:image:width',
            content: yoastJson.og_image[0].width.toString(),
          });
        } else {
          this.metaService.removeTag('property="og:image:width"');
        }
        if (yoastJson.og_image[0].height) {
          this.metaService.updateTag({
            property: 'og:image:height',
            content: yoastJson.og_image[0].height.toString(),
          });
        } else {
          this.metaService.removeTag('property="og:image:height"');
        }
        if (yoastJson.og_image[0].type) {
          this.metaService.updateTag({
            property: 'og:image:type',
            content: yoastJson.og_image[0].type,
          });
        } else {
          this.metaService.removeTag('property="og:image:type"');
        }
      } else if (fallbackData.image) {
        this.metaService.updateTag({ property: 'og:image', content: fallbackData.image });
      } else {
        this.metaService.removeTag('property="og:image"');
      }

      // Twitter Card
      if (yoastJson.twitter_card) {
        this.metaService.updateTag({ name: 'twitter:card', content: yoastJson.twitter_card });
      } else {
        this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
      }

      if (yoastJson.twitter_site) {
        this.metaService.updateTag({ name: 'twitter:site', content: yoastJson.twitter_site });
      } else {
        this.metaService.updateTag({ name: 'twitter:site', content: '@hub_adventures' });
      }

      // Additional Meta Tags
      // Geo Tags for UAE
      this.metaService.updateTag({ name: 'geo.region', content: 'AE' });
      this.metaService.updateTag({ name: 'geo.placename', content: 'Dubai' });

      // Product Schema (only for single product pages)
      if (data?.permalink && data?.name) {
        const productSchema = {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: data.name,
          image: data.images?.[0]?.src || fallbackData.image,
          description: data.description ? this.stripHtml(data.description) : yoastJson.description,
          sku: data.sku,
          brand: {
            '@type': 'Brand',
            name:
              data.attributes?.find((attr: any) => attr.name === 'Brand')?.options[0]?.name ||
              yoastJson.product_brand ||
              'Buff',
          },
          offers: {
            '@type': 'Offer',
            url: data.permalink,
            priceCurrency: data.priceSpecification?.priceCurrency || 'AED',
            price: data.price,
            priceValidUntil: data.priceSpecification?.validThrough || '2026-12-31',
            availability: data.stock_status === 'instock' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            itemCondition: 'https://schema.org/NewCondition',
            seller: {
              '@type': 'Organization',
              name: this.siteName,
            },
          },
          aggregateRating:
            data.average_rating && data.rating_count > 0
              ? {
                  '@type': 'AggregateRating',
                  ratingValue: data.average_rating,
                  reviewCount: data.rating_count,
                }
              : undefined,
        };

        if (yoastJson.schema) {
          yoastJson.schema['@graph'].push(productSchema);
          schemaHtml = this.sanitizer.bypassSecurityTrustHtml(JSON.stringify(yoastJson.schema));
        } else {
          schemaHtml = this.sanitizer.bypassSecurityTrustHtml(
            JSON.stringify({ '@context': 'https://schema.org', '@graph': [productSchema] })
          );
        }
      } else {
        // CollectionPage Schema for listing pages
        const collectionSchema = {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: fallbackData.title || 'On Sale Products',
          description: fallbackData.description ? this.stripHtml(fallbackData.description) : '',
          url: pageUrl,
          publisher: {
            '@type': 'Organization',
            name: this.siteName,
          },
        };
        schemaHtml = this.sanitizer.bypassSecurityTrustHtml(
          JSON.stringify({ '@context': 'https://schema.org', '@graph': [collectionSchema] })
        );
      }
    } else {
      // Fallback for listing pages or when data is null
      this.titleService.setTitle(fallbackData.title || this.siteName);
      if (fallbackData.description) {
        this.metaService.updateTag({
          name: 'description',
          content: this.stripHtml(fallbackData.description),
        });
      } else {
        this.metaService.removeTag('name="description"');
      }
      this.metaService.updateTag({ name: 'robots', content: 'index, follow' });
      this.updateCanonicalUrl(pageUrl);
      this.metaService.updateTag({ rel: 'alternate', hreflang: 'en', href: pageUrl });
      this.metaService.updateTag({ rel: 'alternate', hreflang: 'ar', href: `${pageUrl}?lang=ar` });
      this.metaService.updateTag({ rel: 'alternate', hreflang: 'x-default', href: pageUrl });

      this.metaService.updateTag({
        property: 'og:title',
        content: fallbackData.title || this.siteName,
      });
      if (fallbackData.description) {
        this.metaService.updateTag({
          property: 'og:description',
          content: this.stripHtml(fallbackData.description),
        });
      } else {
        this.metaService.removeTag('property="og:description"');
      }
      this.metaService.updateTag({ property: 'og:url', content: pageUrl });
      this.metaService.updateTag({
        property: 'og:site_name',
        content: this.siteName,
      });
      if (fallbackData.image) {
        this.metaService.updateTag({ property: 'og:image', content: fallbackData.image });
      } else {
        this.metaService.removeTag('property="og:image"');
      }
      this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
      this.metaService.updateTag({ name: 'twitter:site', content: '@hub_adventures' });

      // Geo Tags for UAE
      this.metaService.updateTag({ name: 'geo.region', content: 'AE' });
      this.metaService.updateTag({ name: 'geo.placename', content: 'Dubai' });

      // CollectionPage Schema for listing pages
      const collectionSchema = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: fallbackData.title || 'On Sale Products',
        description: fallbackData.description ? this.stripHtml(fallbackData.description) : '',
        url: pageUrl,
        publisher: {
          '@type': 'Organization',
          name: this.siteName,
        },
      };
      schemaHtml = this.sanitizer.bypassSecurityTrustHtml(
        JSON.stringify({ '@context': 'https://schema.org', '@graph': [collectionSchema] })
      );
    }

    return schemaHtml;
  }

  /**
   * Updates the canonical URL meta tag
   * @param url The full URL to set as canonical
   */
  updateCanonicalUrl(url: string): void {
    const linkElements = document.querySelectorAll('link[rel="canonical"]');

    // Remove existing canonical tags if any
    if (linkElements.length > 0) {
      linkElements.forEach(element => element.remove());
    }

    // Set canonical in meta tags
    this.metaService.updateTag({ rel: 'canonical', href: url });
  }

  /**
   * Generate XML Sitemap data (can be used for dynamic sitemap generation)
   * @returns XML string for sitemap
   */
  generateSitemapXml(): string {
    // This would typically fetch data from an API
    // For now, returning a basic structure
    return `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url>
        <loc>${this.siteUrl}/</loc>
        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
        <priority>1.0</priority>
      </url>
    </urlset>`;
  }

  private stripHtml(html: string): string {
    return html?.replace(/(<([^>]+)>)/gi, '') || '';
  }
}
