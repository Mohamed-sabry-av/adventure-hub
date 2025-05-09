import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { AsyncPipe, CommonModule } from '@angular/common';
import { SliderComponent } from '../../components/slider/slider.component';
import { BrandLogosComponent } from '../../components/brand-logos/brand-logos.component';
import { RelatedCategoriesComponent } from '../../components/related-categories/related-categories.component';
import { NewProductsComponent } from '../../components/new-products/new-products.component';
import { RecommendedProductsComponent } from '../../components/recommended-products/recommended-products.component';
import { SaleProductsComponent } from '../../components/sale-products/sale-products.component';
import { AppContainerComponent } from '../../../../shared/components/app-container/app-container.component';
import { DialogErrorComponent } from '../../../../shared/components/dialog-error/dialog-error.component';
import { UIService } from '../../../../shared/services/ui.service';
import { Observable } from 'rxjs';
import { CartStatus } from '../../../cart/model/cart.model';
import { LatestBlogPostsComponent } from '../../components/latest-blog-posts/latest-blog-posts.component';
import { SeoService } from '../../../../core/services/seo.service';
import { Title, Meta } from '@angular/platform-browser';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    CommonModule,
    SliderComponent,
    BrandLogosComponent,
    RelatedCategoriesComponent,
    NewProductsComponent,
    RecommendedProductsComponent,
    SaleProductsComponent,
    DialogErrorComponent,
    LatestBlogPostsComponent
  ],
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomePageComponent implements OnInit {
  private uiService = inject(UIService);
  private seoService = inject(SeoService);
  private titleService = inject(Title);
  private metaService = inject(Meta);

  cartStatus$: Observable<CartStatus> = this.uiService.cartStatus$;

  ngOnInit(): void {
    this.setupSeo();
  }

  /**
   * Apply comprehensive SEO metadata for the homepage
   */
  private setupSeo(): void {
    // Define and apply SEO metadata
    const seoData = {
      title: 'Adventures HUB - Premium Outdoor & Adventure Sports Equipment',
      description: 'Discover high-quality outdoor gear, hiking equipment, camping supplies, and adventure accessories at Adventures HUB. UAE\'s leading outdoor sports shop with worldwide shipping.',
      keywords: ['outdoor gear', 'hiking equipment', 'camping supplies', 'adventure gear', 'sports equipment', 'UAE', 'Dubai'],
      type: 'website',
      image: 'https://adventures-hub.com/assets/images/homepage-hero.jpg'
    };

    // Apply SEO tags via the SeoService
    this.seoService.applySeoTags(null, seoData);

    // Add specific structured data for the home page
    this.addHomePageSchema();

    // Add performance optimization tags
    this.metaService.addTag({ name: 'preload', content: 'home-critical' });
  }

  /**
   * Create and add structured data schema for the home page
   */
  private addHomePageSchema(): void {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Adventures Hub - Premium Outdoor Sports Equipment',
      description: 'Discover high-quality outdoor gear, hiking equipment, camping supplies, and adventure accessories at Adventures HUB.',
      url: 'https://adventures-hub.com',
      speakable: {
        '@type': 'SpeakableSpecification',
        cssSelector: ['h1', 'h2', '.product-category-heading']
      },
      hasPart: [
        {
          '@type': 'WebPageElement',
          isPartOf: {
            '@id': 'https://adventures-hub.com/#website'
          },
          image: 'https://adventures-hub.com/assets/images/homepage-hero.jpg'
        }
      ]
    };

    // In a real app, this would be passed to a service
    // that handles the schema.org tags
    this.seoService.applySeoTags(null, {
      title: 'Adventures HUB - Premium Outdoor & Adventure Sports Equipment',
      description: 'Discover high-quality outdoor gear, hiking equipment, camping supplies, and adventure accessories at Adventures HUB. UAE\'s leading outdoor sports shop with worldwide shipping.',
      schema: schema
    });
  }
}
