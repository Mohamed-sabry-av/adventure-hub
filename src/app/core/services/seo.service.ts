import { Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root',
})
export class SeoService {
  constructor(
    private titleService: Title,
    private metaService: Meta,
    private sanitizer: DomSanitizer
  ) {}

  applySeoTags(data: any, fallbackData: { title?: string; description?: string; image?: string } = {}): SafeHtml | null {
    const yoastJson = data?.yoast_head_json;
    let schemaHtml = null;

    if (yoastJson) {
      // Title
      this.titleService.setTitle(yoastJson.title || fallbackData.title || 'Adventures HUB Sports Shop');

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
        this.metaService.updateTag({ rel: 'canonical', href: yoastJson.canonical });
      } else if (data.permalink) {
        this.metaService.updateTag({ rel: 'canonical', href: data.permalink });
      } else {
        this.metaService.removeTag('rel="canonical"');
      }

      // Hreflang for multilingual support
      if (data.permalink) {
        this.metaService.updateTag({ rel: 'alternate', hreflang: 'en', href: data.permalink });
        this.metaService.updateTag({ rel: 'alternate', hreflang: 'ar', href: `${data.permalink}?lang=ar` });
        this.metaService.updateTag({ rel: 'alternate', hreflang: 'x-default', href: data.permalink });
      }

      // Open Graph Tags
      if (yoastJson.og_title) {
        this.metaService.updateTag({ property: 'og:title', content: yoastJson.og_title });
      } else {
        this.metaService.updateTag({
          property: 'og:title',
          content: fallbackData.title || 'Adventures HUB Sports Shop',
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
      } else if (data.permalink) {
        this.metaService.updateTag({ property: 'og:url', content: data.permalink });
      } else {
        this.metaService.removeTag('property="og:url"');
      }

      if (yoastJson.og_site_name) {
        this.metaService.updateTag({ property: 'og:site_name', content: yoastJson.og_site_name });
      } else {
        this.metaService.updateTag({
          property: 'og:site_name',
          content: 'Adventures HUB Sports Shop',
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
      // Price and Currency
      if (data.priceSpecification) {
        this.metaService.updateTag({
          name: 'product:price:amount',
          content: data.priceSpecification.price.toString(),
        });
        this.metaService.updateTag({
          name: 'product:price:currency',
          content: data.priceSpecification.priceCurrency,
        });
      }

      // Geo Tags for UAE
      this.metaService.updateTag({ name: 'geo.region', content: 'AE' });
      this.metaService.updateTag({ name: 'geo.placename', content: 'Dubai' });

      // Keywords from meta_data
      const keywords = data.meta_data?.find((meta: any) => meta.key === '_yoast_wpseo_focuskeywords')?.value;
      if (keywords && keywords !== '[]') {
        try {
          const parsedKeywords = JSON.parse(keywords);
          if (Array.isArray(parsedKeywords)) {
            this.metaService.updateTag({ name: 'keywords', content: parsedKeywords.join(', ') });
          }
        } catch (e) {
          console.warn('Failed to parse Yoast keywords:', e);
        }
      } else {
        this.metaService.removeTag('name="keywords"');
      }

      // Product Schema
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
            name: 'Adventures HUB Sports Shop',
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

      // Schema Data
      if (yoastJson.schema) {
        // Merge Product Schema with existing schema
        yoastJson.schema['@graph'].push(productSchema);
        schemaHtml = this.sanitizer.bypassSecurityTrustHtml(JSON.stringify(yoastJson.schema));
      } else {
        // If no Yoast schema, create new schema with Product
        schemaHtml = this.sanitizer.bypassSecurityTrustHtml(
          JSON.stringify({ '@context': 'https://schema.org', '@graph': [productSchema] })
        );
      }
    } else {
      // Fallback if no Yoast data
      this.titleService.setTitle(fallbackData.title || 'Adventures HUB Sports Shop');
      if (fallbackData.description) {
        this.metaService.updateTag({
          name: 'description',
          content: this.stripHtml(fallbackData.description),
        });
      } else {
        this.metaService.removeTag('name="description"');
      }
      this.metaService.updateTag({ name: 'robots', content: 'index, follow' });
      if (data.permalink) {
        this.metaService.updateTag({ rel: 'canonical', href: data.permalink });
        this.metaService.updateTag({ rel: 'alternate', hreflang: 'en', href: data.permalink });
        this.metaService.updateTag({ rel: 'alternate', hreflang: 'ar', href: `${data.permalink}?lang=ar` });
        this.metaService.updateTag({ rel: 'alternate', hreflang: 'x-default', href: data.permalink });
      }
      this.metaService.updateTag({
        property: 'og:title',
        content: fallbackData.title || 'Adventures HUB Sports Shop',
      });
      if (fallbackData.description) {
        this.metaService.updateTag({
          property: 'og:description',
          content: this.stripHtml(fallbackData.description),
        });
      } else {
        this.metaService.removeTag('property="og:description"');
      }
      if (fallbackData.image) {
        this.metaService.updateTag({ property: 'og:image', content: fallbackData.image });
      } else {
        this.metaService.removeTag('property="og:image"');
      }
      this.metaService.updateTag({
        property: 'og:site_name',
        content: 'Adventures HUB Sports Shop',
      });
      this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
      this.metaService.updateTag({ name: 'twitter:site', content: '@hub_adventures' });

      // Fallback Product Schema
      const productSchema = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: data.name || fallbackData.title,
        image: data.images?.[0]?.src || fallbackData.image,
        description: data.description ? this.stripHtml(data.description) : fallbackData.description,
        sku: data.sku,
        brand: {
          '@type': 'Brand',
          name: data.attributes?.find((attr: any) => attr.name === 'Brand')?.options[0]?.name || 'Buff',
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
            name: 'Adventures HUB Sports Shop',
          },
        },
      };
      schemaHtml = this.sanitizer.bypassSecurityTrustHtml(
        JSON.stringify({ '@context': 'https://schema.org', '@graph': [productSchema] })
      );
    }

    return schemaHtml;
  }

  private stripHtml(html: string): string {
    return html?.replace(/(<([^>]+)>)/gi, '') || '';
  }
}