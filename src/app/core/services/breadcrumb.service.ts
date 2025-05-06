import { Injectable } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export interface Breadcrumb {
  label: string;
  url: string;
}

@Injectable({
  providedIn: 'root',
})
export class BreadcrumbService {
  private readonly siteUrl: string = 'https://adventures-hub.com';
  breadcrumb: Array<Breadcrumb> = [];

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private sanitizer: DomSanitizer
  ) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.breadcrumb = this.createBreadcrumbs(this.activatedRoute.root);
    });
  }

  /**
   * Generates breadcrumb schema JSON-LD for SEO
   * @returns SafeHtml containing the JSON-LD schema
   */
  generateBreadcrumbSchema(): SafeHtml {
    if (!this.breadcrumb || this.breadcrumb.length === 0) {
      return '';
    }

    const itemListElements = this.breadcrumb
      .filter(item => item.label) // Filter out items with no label
      .map((item, index) => {
        return {
          '@type': 'ListItem',
          'position': index + 1,
          'name': item.label,
          'item': `${this.siteUrl}${item.url}`
        };
      });

    // Add home as first item if not present
    if (this.breadcrumb[0]?.label !== 'Home') {
      itemListElements.unshift({
        '@type': 'ListItem',
        'position': 1,
        'name': 'Home',
        'item': this.siteUrl
      });

      // Update positions for all other items
      for (let i = 1; i < itemListElements.length; i++) {
        itemListElements[i].position = i + 1;
      }
    }

    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': itemListElements
    };

    return this.sanitizer.bypassSecurityTrustHtml(
      `<script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>`
    );
  }

  private createBreadcrumbs(route: ActivatedRoute, url: string = '', breadcrumbs: Array<Breadcrumb> = []): Array<Breadcrumb> {
    const children: ActivatedRoute[] = route.children;

    if (children.length === 0) {
      return breadcrumbs;
    }

    for (const child of children) {
      const routeUrl: string = child.snapshot.url.map(segment => segment.path).join('/');
      if (routeUrl !== '') {
        url += `/${routeUrl}`;
      }

      // Only add if there's a valid breadcrumb data
      if (child.snapshot.data['breadcrumb']) {
        breadcrumbs.push({
          label: child.snapshot.data['breadcrumb'],
          url
        });
      }

      return this.createBreadcrumbs(child, url, breadcrumbs);
    }
    return breadcrumbs;
  }
}
