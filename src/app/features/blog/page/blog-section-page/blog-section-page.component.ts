import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
} from '@angular/core';
import { AppContainerComponent } from '../../../../shared/components/app-container/app-container.component';
import { BlogArticleComponent } from '../../components/blog-article/blog-article.component';
import { BlogRelatedInfoComponent } from '../../components/blog-related-info/blog-related-info.component';
import { ServiceHighlightsComponent } from '../../../../shared/components/service-highlights/service-highlights.component';
import { ActivatedRoute } from '@angular/router';
import { BlogPost } from '../../services/blog.service';
import { SeoService } from '../../../../core/services/seo.service';
@Component({
  selector: 'app-blog-section-page',
  imports: [
    AppContainerComponent,
    BlogArticleComponent,
    BlogRelatedInfoComponent,
    ServiceHighlightsComponent,
  ],
  templateUrl: './blog-section-page.component.html',
  styleUrl: './blog-section-page.component.css',
})
export class BlogSectionPageComponent implements OnInit {
  private activatedRoute = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private seoService = inject(SeoService);
  post: BlogPost | null = null;
  ngOnInit() {
    // الحصول على بيانات المقال من الـ resolver
    const subscription = this.activatedRoute.data.subscribe(
      (response: any) => {
        this.post = response.post;
        if (this.post) {
          this.setupSeo();
        }
      }
    );
    this.destroyRef.onDestroy(() => subscription.unsubscribe());
  }
  /**
   * تحديث بيانات SEO الخاصة بالمقال
   */
  private setupSeo(): void {
    if (!this.post) return;
    // استخراج عنوان المقال من HTML
    const title = this.getTextFromHtml(this.post.title.rendered);
    // إنشاء وصف من محتوى المقال
    // const description = this.seoService.createDescriptionFromHtml(this.post.excerpt.rendered);
    // الحصول على رابط الصورة الرئيسية
    const imageUrl = this.post.yoast_head_json?.og_image?.[0]?.url || '';
    // // تحديث الميتا تاج
    // this.seoService.updateSeoTags({
    //   title: title,
    //   description: description,
    //   type: 'article',
    //   image: imageUrl,
    //   publishedDate: this.post.date,
    //   url: `https://adventures-hub.com/${this.post.slug}`,
    //   keywords: `${title}, adventure, outdoor, hiking, camping, ${this.extractKeywords(title)}`,
    // });
    // إضافة مخطط Schema.org للمقال
    this.addArticleSchema();
  }
  /**
   * إضافة مخطط Schema.org للمقال لتحسين الفهرسة
   */
  private addArticleSchema(): void {
    if (!this.post) return;
    const articleSchema = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: this.getTextFromHtml(this.post.title.rendered),
      // description: this.seoService.createDescriptionFromHtml(this.post.excerpt.rendered),
      image: this.post.yoast_head_json?.og_image?.[0]?.url || '',
      datePublished: this.post.date,
      dateModified: this.post.date, // يمكن استخدام تاريخ التعديل إذا كان متاحًا
      author: {
        '@type': 'Organization',
        name: 'Adventures Hub',
        url: 'https://adventures-hub.com'
      },
      publisher: {
        '@type': 'Organization',
        name: 'Adventures Hub',
        logo: {
          '@type': 'ImageObject',
          url: 'https://adventures-hub.com/wp-content/uploads/2025/01/logo.png'
        }
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': `https://adventures-hub.com/${this.post.slug}`
      }
    };
    this.addSchemaToHead(articleSchema);
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
  /**
   * استخراج النص من HTML
   */
  private getTextFromHtml(html: string): string {
    if (typeof document !== 'undefined') {
      const tempElement = document.createElement('div');
      tempElement.innerHTML = html;
      return tempElement.textContent || tempElement.innerText || '';
    }
    // بديل للتنفيذ على الخادم (SSR)
    return html.replace(/<[^>]*>/g, '');
  }
  /**
   * استخراج الكلمات المفتاحية من النص
   */
  private extractKeywords(title: string): string {
    // إزالة الكلمات الشائعة والحروف
    const commonWords = ['a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'with', 'and', 'or', 'of'];
    return title
      .toLowerCase()
      .split(' ')
      .filter(word => word.length > 3 && !commonWords.includes(word))
      .slice(0, 5)
      .join(', ');
  }
}

