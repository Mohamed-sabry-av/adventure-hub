import { Component } from '@angular/core';
import { SeoService } from '../../../../core/services/seo.service';
import { AboutusService } from '../../service/aboutus.service';
import { CommonModule } from '@angular/common';
import { DecodeHtmlPipe } from '../../../../shared/pipes/decode-html.pipe';

@Component({
  selector: 'app-contact-us',
  imports: [CommonModule, DecodeHtmlPipe],
  template: `
    <ng-container *ngIf="schemaData">
      <script type="application/ld+json" [innerHTML]="schemaData"></script>
    </ng-container>
    <!-- / Yoast SEO Premium plugin. -->

    <div class="contact-container">
      @if (pageData) {
      <div>
        <h1>{{ pageData.title?.rendered | decodeHtml }}</h1>
        <div [innerHTML]="pageData.content?.rendered"></div>
      </div>
      } @else {
      <p>Loading Contact Us...</p>
      }
    </div>
  `,
  styleUrl: './contact-us.component.css',
})
export class ContactUsComponent {
  pageData: any;
  schemaData: any;

  constructor(
    private aboutUsService: AboutusService,
    private seoService: SeoService
  ) {}

  ngOnInit(): void {
    this.fetctContactUs();
  }

  fetctContactUs(): void {
    this.aboutUsService.getPageById(1132).subscribe({
      next: (data) => {
        this.pageData = data;
        // Apply SEO tags using yoast_head_json
        this.schemaData = this.seoService.applySeoTags(this.pageData, {
          title: this.pageData?.title?.rendered,
          description:
            this.pageData?.excerpt?.rendered ||
            'Contact Us - Adventures HUB Sports Shop',
        });
      },
      error: (error) => {
        console.error('Error fetching Contact Us:', error);
        // Fallback SEO tags in case of error
        this.schemaData = this.seoService.applySeoTags(null, {
          title: 'Contact Us - Adventures HUB Sports Shop',
        });
      },
    });
  }
}
