import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BlogPost } from '../../services/blog.service';

@Component({
  selector: 'app-blog-article',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './blog-article.component.html',
  styleUrls: ['./blog-article.component.css']
})
export class BlogArticleComponent implements OnInit {
  @Input() articleData!: any;

  // تخزين الروابط التشعبية التي تم معالجتها
  processedLinksMap: Map<string, string> = new Map();

  ngOnInit(): void {
    if (this.articleData) {
      // معالجة محتوى المقال لتحسين SEO
      this.optimizeArticleContent();
    }
  }

  /**
   * تحسين محتوى المقال لتعزيز SEO وتحسين سرعة التحميل
   */
  private optimizeArticleContent(): void {
    if (typeof document === 'undefined' || !this.articleData) return;

    // معالجة تُنفذ بعد تحميل المحتوى في DOM
    setTimeout(() => {
      // 1. إضافة سمات alt للصور
      this.optimizeImages();

      // 2. إضافة سمة rel="noopener noreferrer" للروابط الخارجية
      this.optimizeExternalLinks();

      // 3. إضافة سمات العناوين (heading IDs) لتحسين التنقل
      this.addHeadingIds();

      // 4. تحسين الروابط الداخلية
      this.optimizeInternalLinks();
    }, 500);
  }

  /**
   * تحسين الصور لتعزيز SEO وتحسين سرعة التحميل
   */
  private optimizeImages(): void {
    const articleElement = document.querySelector('.article-content');
    if (!articleElement) return;

    const images = articleElement.querySelectorAll('img');
    images.forEach((img: HTMLImageElement) => {
      // إضافة سمة alt إذا كانت غير موجودة
      if (!img.alt || img.alt === '') {
        const imgFileName = this.getFileNameFromUrl(img.src);
        img.alt = `${this.getTextFromHtml(this.articleData.title.rendered)} - ${imgFileName}`;
      }

      // إضافة سمة loading="lazy" لتأخير تحميل الصور خارج النافذة المرئية
      if (!img.getAttribute('loading')) {
        img.setAttribute('loading', 'lazy');
      }

      // إضافة فئات CSS للصور
      img.classList.add('rounded', 'shadow-sm');
    });
  }

  /**
   * تحسين الروابط الخارجية لزيادة الأمان وتحسين SEO
   */
  private optimizeExternalLinks(): void {
    const articleElement = document.querySelector('.article-content');
    if (!articleElement) return;

    const links = articleElement.querySelectorAll('a');
    links.forEach((link: HTMLAnchorElement) => {
      // التحقق مما إذا كان الرابط خارجيًا
      if (link.hostname !== window.location.hostname && link.href.startsWith('http')) {
        // إضافة سمات الأمان والتتبع
        link.setAttribute('rel', 'noopener noreferrer');
        link.setAttribute('target', '_blank');

        // إضافة أيقونة للروابط الخارجية
        if (!link.querySelector('.external-link-icon')) {
          const externalIcon = document.createElement('span');
          externalIcon.classList.add('external-link-icon', 'ml-1');
          externalIcon.innerHTML = '↗';
          link.appendChild(externalIcon);
        }
      }
    });
  }

  /**
   * إضافة معرفات للعناوين لتحسين التنقل ومشاركة الأقسام
   */
  private addHeadingIds(): void {
    const articleElement = document.querySelector('.article-content');
    if (!articleElement) return;

    const headings = articleElement.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach((heading) => {
      if (!heading.id) {
        const headingText = heading.textContent || '';
        const id = this.slugify(headingText);
        heading.id = id;

        // إضافة رابط للعنوان للسماح بمشاركة القسم

        const anchor = document.createElement('a');
        anchor.classList.add('heading-anchor');
        anchor.href = `#${id}`;
        anchor.innerHTML = '<span class="opacity-0 hover:opacity-100 text-blue-600 ml-2">#</span>';
        heading.appendChild(anchor);
      }
    });
  }

  /**
   * تحسين الروابط الداخلية للتنقل الأفضل
   */
  private optimizeInternalLinks(): void {
    const articleElement = document.querySelector('.article-content');
    if (!articleElement) return;

    const links = articleElement.querySelectorAll('a');
    links.forEach((link: HTMLAnchorElement) => {
      // التحقق مما إذا كان الرابط داخليًا (على نفس المجال)
      if (link.hostname === window.location.hostname) {
        // إضافة preconnect لتحسين الأداء
        link.setAttribute('rel', 'preconnect');
      }
    });
  }

  /**
   * تحويل النص إلى سلاج (slug) صالح لاستخدامه كمعرف
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // إزالة الأحرف غير اللاتينية والأرقام
      .replace(/\s+/g, '-') // استبدال المسافات بواصلات
      .replace(/-+/g, '-') // إزالة الواصلات المتكررة
      .trim(); // إزالة المسافات البادئة والنهائية
  }

  /**
   * استخراج اسم الملف من URL
   */
  private getFileNameFromUrl(url: string): string {
    // استخراج اسم الملف من المسار
    const pathSegments = url.split('/');
    let fileName = pathSegments[pathSegments.length - 1];

    // إزالة معلمات الاستعلام إن وجدت
    fileName = fileName.split('?')[0];

    // إزالة امتداد الملف
    fileName = fileName.split('.')[0];

    // استبدال الواصلات بمسافات وتحويل أول حرف من كل كلمة إلى حرف كبير
    return fileName
      .replace(/-/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
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
}
