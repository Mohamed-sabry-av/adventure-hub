import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AboutusService } from '../../service/aboutus.service';
import { DecodeHtmlPipe } from '../../../../shared/pipes/decode-html.pipe';
import { SeoService } from '../../../../core/services/seo.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-refund-policy',
  standalone: true,
  imports: [CommonModule, DecodeHtmlPipe],
  template: `
    <ng-container *ngIf="schemaData">
      <script type="application/ld+json" [innerHTML]="schemaData"></script>
    </ng-container>
    <!-- / Yoast SEO Premium plugin. -->

    <div class="refund-policy-container">
      @if (pageData) {
        <div>
          <h1>{{ pageData.title?.rendered | decodeHtml }}</h1>
          <div [innerHTML]="safeContent"></div>
        </div>
      } @else {
        <p>Loading Refund Policy...</p>
      }
    </div>
  `,
  styleUrls: ['./refund-policy.component.css'],
})
export class RefundPolicyComponent implements OnInit {
  pageData: any;
  schemaData: any;
  safeContent?: SafeHtml; // جعل safeContent اختيارية باستخدام ?

  constructor(
    private aboutUsService: AboutusService,
    private seoService: SeoService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.fetchRefundPolicy();
  }

  fetchRefundPolicy(): void {
    this.aboutUsService.getPageById(78500).subscribe({
      next: (data) => {
        this.pageData = data;
        this.safeContent = this.sanitizer.bypassSecurityTrustHtml(data.content.rendered);
        // Apply SEO tags using yoast_head_json
        this.schemaData = this.seoService.applySeoTags(this.pageData, {
          title: this.pageData?.title?.rendered,
          description: this.pageData?.excerpt?.rendered || 'Refund Policy - Adventures HUB Sports Shop',
        });
      },
      error: (error) => {
        // Fallback SEO tags in case of error
        this.schemaData = this.seoService.applySeoTags(null, {
          title: 'Refund Policy - Adventures HUB Sports Shop',
        });
      },
    });
  }
}