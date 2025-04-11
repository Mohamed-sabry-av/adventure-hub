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

    if (yoastJson) {
      // Title
      this.titleService.setTitle(yoastJson.title || fallbackData.title || 'Default Page');

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
          content: `${yoastJson.robots.index}, ${yoastJson.robots.follow}`,
        });
      } else {
        this.metaService.removeTag('name="robots"');
      }

      // Canonical
      if (yoastJson.canonical) {
        this.metaService.updateTag({ rel: 'canonical', href: yoastJson.canonical });
      } else {
        this.metaService.removeTag('rel="canonical"');
      }

      // Open Graph Tags
      if (yoastJson.og_title) {
        this.metaService.updateTag({ property: 'og:title', content: yoastJson.og_title });
      } else {
        this.metaService.updateTag({
          property: 'og:title',
          content: fallbackData.title || 'Default Page',
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
        this.metaService.removeTag('property="og:url"');
      }

      if (yoastJson.og_site_name) {
        this.metaService.updateTag({ property: 'og:site_name', content: yoastJson.og_site_name });
      } else {
        this.metaService.removeTag('property="og:site_name"');
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
        this.metaService.removeTag('name="twitter:card"');
      }

      if (yoastJson.twitter_site) {
        this.metaService.updateTag({ name: 'twitter:site', content: yoastJson.twitter_site });
      } else {
        this.metaService.removeTag('name="twitter:site"');
      }

      // Schema Data
      if (yoastJson.schema) {
        return this.sanitizer.bypassSecurityTrustHtml(JSON.stringify(yoastJson.schema));
      }
    } else {
      // Fallback لو مفيش Yoast data
      this.titleService.setTitle(fallbackData.title || 'Default Page');
      if (fallbackData.description) {
        this.metaService.updateTag({
          name: 'description',
          content: this.stripHtml(fallbackData.description),
        });
      } else {
        this.metaService.removeTag('name="description"');
      }
      this.metaService.removeTag('name="robots"');
      this.metaService.removeTag('rel="canonical"');
      this.metaService.updateTag({
        property: 'og:title',
        content: fallbackData.title || 'Default Page',
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
    }
    return null;
  }

  private stripHtml(html: string): string {
    return html.replace(/(<([^>]+)>)/gi, '');
  }
}