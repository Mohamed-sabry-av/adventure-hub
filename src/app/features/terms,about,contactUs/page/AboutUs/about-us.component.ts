import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AboutusService } from '../../service/aboutus.service';
import { DecodeHtmlPipe } from '../../../../shared/pipes/decode-html.pipe';
import { SeoService } from '../../../../core/services/seo.service';

@Component({
  selector: 'app-about-us',
  standalone: true,
  imports: [CommonModule, DecodeHtmlPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,

  template: `
    <ng-container *ngIf="schemaData">
      <script type="application/ld+json" [innerHTML]="schemaData"></script>
    </ng-container>
    <!-- / Yoast SEO Premium plugin. -->

    <div class="about-us-container">
      @if (aboutUsData) {
      <div>
        <h1>{{ aboutUsData.title?.rendered | decodeHtml }}</h1>
        <div [innerHTML]="aboutUsData.content?.rendered"></div>
      </div>
      } @else {
      <p>Loading About Us...</p>
      }
    </div>
  `,
  styleUrls: ['./about-us.component.css'],
})
export class AboutUsComponent implements OnInit {
  aboutUsData: any;
  schemaData: any;

  constructor(
    private aboutUsService: AboutusService,
    private seoService: SeoService
  ) {}

  ngOnInit(): void {
    this.fetchAboutUs();
  }

  fetchAboutUs(): void {
    this.aboutUsService.getAboutUs().subscribe({
      next: (data) => {
        this.aboutUsData = data;
        // Apply SEO tags using yoast_head_json
        this.schemaData = this.seoService.applySeoTags(this.aboutUsData, {
          title: this.aboutUsData?.title?.rendered,
          description:
            this.aboutUsData?.excerpt?.rendered ||
            'About Us - Adventures HUB Sports Shop',
        });
        console.log('About Us Data:', this.aboutUsData);
      },
      error: (error) => {
        console.error('Error fetching About Us:', error);
        // Fallback SEO tags in case of error
        this.schemaData = this.seoService.applySeoTags(null, {
          title: 'About Us - Adventures HUB Sports Shop',
        });
      },
    });
  }
}
