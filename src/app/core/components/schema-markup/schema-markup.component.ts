import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BreadcrumbService } from '../../services/breadcrumb.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-schema-markup',
  standalone: true,
  imports: [CommonModule],
  template: '<div [innerHTML]="schemaMarkup"></div>',
  styles: []
})
export class SchemaMarkupComponent implements OnChanges {
  @Input() type: 'product' | 'category' | 'article' | 'breadcrumb' | 'organization' = 'breadcrumb';
  @Input() data: any;

  schemaMarkup: SafeHtml = '';

  constructor(
    private sanitizer: DomSanitizer,
    private breadcrumbService: BreadcrumbService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['type'] || changes['data']) {
      this.generateSchema();
    }
  }

  private generateSchema(): void {
    switch (this.type) {
      case 'breadcrumb':
        this.schemaMarkup = this.breadcrumbService.generateBreadcrumbSchema();
        break;
      case 'product':
        this.schemaMarkup = this.generateProductSchema();
        break;
      case 'category':
        this.schemaMarkup = this.generateCategorySchema();
        break;
      case 'article':
        this.schemaMarkup = this.generateArticleSchema();
        break;
      case 'organization':
        this.schemaMarkup = this.generateOrganizationSchema();
        break;
      default:
        this.schemaMarkup = '';
    }
  }

  private generateProductSchema(): SafeHtml {
    if (!this.data) return '';

    const product = this.data;
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      'name': product.name,
      'image': product.images?.[0]?.src || '',
      'description': this.stripHtml(product.description || ''),
      'sku': product.sku || '',
      'brand': {
        '@type': 'Brand',
        'name': product.brand || 'Adventures HUB'
      },
      'offers': {
        '@type': 'Offer',
        'url': product.permalink || window.location.href,
        'priceCurrency': 'AED',
        'price': product.price || 0,
        'availability': product.stock_status === 'instock'
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        'itemCondition': 'https://schema.org/NewCondition'
      }
    };

    return this.sanitizer.bypassSecurityTrustHtml(
      `<script type="application/ld+json">${JSON.stringify(schema)}</script>`
    );
  }

  private generateCategorySchema(): SafeHtml {
    if (!this.data) return '';

    const category = this.data;
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      'name': category.name || '',
      'description': this.stripHtml(category.description || ''),
      'url': category.permalink || window.location.href
    };

    return this.sanitizer.bypassSecurityTrustHtml(
      `<script type="application/ld+json">${JSON.stringify(schema)}</script>`
    );
  }

  private generateArticleSchema(): SafeHtml {
    if (!this.data) return '';

    const article = this.data;
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      'headline': article.title || '',
      'image': article.featured_image || '',
      'datePublished': article.date || new Date().toISOString(),
      'dateModified': article.modified || new Date().toISOString(),
      'author': {
        '@type': 'Person',
        'name': article.author?.name || 'Adventures HUB'
      },
      'publisher': {
        '@type': 'Organization',
        'name': 'Adventures HUB Sports Shop',
        'logo': {
          '@type': 'ImageObject',
          'url': 'https://adventures-hub.com/assets/images/logo.png'
        }
      },
      'description': this.stripHtml(article.excerpt || '')
    };

    return this.sanitizer.bypassSecurityTrustHtml(
      `<script type="application/ld+json">${JSON.stringify(schema)}</script>`
    );
  }

  private generateOrganizationSchema(): SafeHtml {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      'name': 'Adventures HUB Sports Shop',
      'url': 'https://adventures-hub.com',
      'logo': 'https://adventures-hub.com/assets/images/logo.png',
      'sameAs': [
        'https://www.facebook.com/adventureshub',
        'https://www.instagram.com/adventures_hub/',
        'https://twitter.com/hub_adventures'
      ],
      'contactPoint': {
        '@type': 'ContactPoint',
        'telephone': '+971-4-123-4567',
        'contactType': 'customer service',
        'areaServed': 'AE',
        'availableLanguage': ['English', 'Arabic']
      },
      'address': {
        '@type': 'PostalAddress',
        'streetAddress': 'Sheikh Zayed Road',
        'addressLocality': 'Dubai',
        'addressRegion': 'Dubai',
        'postalCode': '12345',
        'addressCountry': 'UAE'
      }
    };

    return this.sanitizer.bypassSecurityTrustHtml(
      `<script type="application/ld+json">${JSON.stringify(schema)}</script>`
    );
  }

  private stripHtml(html: string): string {
    return html?.replace(/(<([^>]+)>)/gi, '') || '';
  }
}
