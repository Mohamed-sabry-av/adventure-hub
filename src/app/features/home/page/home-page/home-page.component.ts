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
})
export class HomePageComponent implements OnInit {
  private uiService = inject(UIService);
  private seoService = inject(SeoService);

  cartStatus$: Observable<CartStatus> = this.uiService.cartStatus$;

  ngOnInit(): void {
    this.setupSeo();
  }

  /**
   * تحديث بيانات SEO للصفحة الرئيسية
   */
  private setupSeo(): void {
    // this.seoService.updateSeoTags({
    //   title: 'Adventures Hub - Your Ultimate Outdoor Gear & Adventure Resource',
    //   description: 'Find the best outdoor gear, hiking equipment, camping supplies, and adventure tips. Discover high-quality products for your outdoor adventures.',
    //   keywords: 'outdoor gear, adventure equipment, hiking supplies, camping gear, trekking equipment, outdoor activities',
    //   type: 'website',
    //   url: 'https://adventures-hub.com',
    // });

    // إضافة مخطط Schema.org للصفحة الرئيسية
    this.addHomePageSchema();
  }

  /**
   * إضافة مخطط Schema.org للصفحة الرئيسية
   */
  private addHomePageSchema(): void {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Adventures Hub',
      url: 'https://adventures-hub.com',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://adventures-hub.com/search?q={search_term_string}'
        },
        'query-input': 'required name=search_term_string'
      },
      sameAs: [
        'https://www.facebook.com/adventureshub',
        'https://www.instagram.com/adventureshub',
        'https://twitter.com/adventureshub'
      ]
    };

    const organizationSchema = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Adventures Hub',
      url: 'https://adventures-hub.com',
      logo: 'https://adventures-hub.com/wp-content/uploads/2025/01/logo.png',
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+1-234-567-8900',
        contactType: 'customer service',
        availableLanguage: ['English', 'Arabic']
      }
    };

    this.addSchemaToHead(schema);
    this.addSchemaToHead(organizationSchema);
  }

  /**
   * إضافة مخطط JSON-LD إلى رأس الصفحة
   */
  private addSchemaToHead(schema: any): void {
    // التحقق مما إذا كان في بيئة المتصفح
    if (typeof document !== 'undefined') {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.innerHTML = JSON.stringify(schema);
      document.head.appendChild(script);
    }
  }
}
