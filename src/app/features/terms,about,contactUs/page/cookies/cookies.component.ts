import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AboutusService } from '../../service/aboutus.service';
import { DecodeHtmlPipe } from '../../../../shared/pipes/decode-html.pipe';
import { SeoService } from '../../../../core/services/seo.service';

@Component({
  selector: 'app-cookies-policy',
  standalone: true,
  imports: [CommonModule, DecodeHtmlPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,

  template: `
    <ng-container *ngIf="schemaData">
      <script type="application/ld+json" [innerHTML]="schemaData"></script>
    </ng-container>
    <!-- / Yoast SEO Premium plugin. -->

    <div class="cookies-policy-container">
      @if (pageData) {
      <div>
        <h1>{{ pageData.title?.rendered | decodeHtml }}</h1>
        <div [innerHTML]="pageData.content?.rendered"></div>
      </div>
      } @else {
      <p>Loading Cookies Policy...</p>
      }
    </div>
  `,
  styleUrls: ['./cookies-policy.component.css'],
})
export class CookiesPolicyComponent implements OnInit {
  pageData: any;
  schemaData: any;

  constructor(
    private aboutUsService: AboutusService,
    private seoService: SeoService
  ) {}

  ngOnInit(): void {
    this.fetchCookiesPolicy();
  }

  fetchCookiesPolicy(): void {
    this.aboutUsService.getPageById(78519).subscribe({
      next: (data) => {
        this.pageData = data;
        // Apply SEO tags using yoast_head_json
        this.schemaData = this.seoService.applySeoTags(this.pageData, {
          title: this.pageData?.title?.rendered,
          description:
            this.pageData?.excerpt?.rendered ||
            'Cookies Policy - Adventures HUB Sports Shop',
        });
      },
      error: (error) => {
        console.error('Error fetching Cookies Policy:', error);
        // Fallback SEO tags in case of error
        this.schemaData = this.seoService.applySeoTags(null, {
          title: 'Cookies Policy - Adventures HUB Sports Shop',
        });
      },
    });
  }
}
