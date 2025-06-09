import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { AppContainerComponent } from '../../../../shared/components/app-container/app-container.component';
import { BlogRelatedInfoComponent } from '../../components/blog-related-info/blog-related-info.component';
import { BlogSectionsComponent } from '../../components/blog-sections/blog-sections.component';
import { SeoService } from '../../../../core/services/seo.service';
@Component({
  selector: 'app-blog-page',
  imports: [
    AppContainerComponent,
    BlogRelatedInfoComponent,
    BlogSectionsComponent,
  ],
  templateUrl: './blog-page.component.html',
  styleUrl: './blog-page.component.css',
  host: { ngSkipHydration: '' },
})
export class BlogPageComponent implements OnInit {
  private seoService = inject(SeoService);
  ngOnInit(): void {
    this.setupSeo();
  }
  /**
   * تحديث بيانات SEO الخاصة بصفحة المدونة الرئيسية
   */
  private setupSeo(): void {
    // this.seoService.updateSeoTags({
    //   title: 'Blog - Latest Outdoor Adventure Articles & Tips',
    //   description: 'Discover the latest articles about outdoor adventures, hiking tips, camping gear reviews, and more on our adventure blog.',
    //   keywords: 'adventure blog, outdoor tips, hiking guides, camping advice, trekking information, gear reviews',
    //   type: 'website',
    //   url: 'https://adventures-hub.com/blog',
    // });
    // إضافة المخطط المنظم (Schema.org) لصفحة المدونة
    this.addBlogSchema();
  }
  /**
   * إضافة مخطط Schema.org للمدونة لتحسين الفهرسة
   */
  private addBlogSchema(): void {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: 'Adventures Hub Blog',
      description: 'Resources, guides, and articles about outdoor adventures and gear.',
      url: 'https://adventures-hub.com/blog',
      publisher: {
        '@type': 'Organization',
        name: 'Adventures Hub',
        logo: {
          '@type': 'ImageObject',
          url: 'https://adventures-hub.com/wp-content/uploads/2025/01/logo.png'
        }
      }
    };
    // إضافة المخطط إلى الصفحة
    this.addSchemaToHead(schema);
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

