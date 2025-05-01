import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core'; // أضفت OnInit
import { CommonModule } from '@angular/common';
import { PrivcyTermsService } from '../../service/privcy-terms.service';
import { DecodeHtmlPipe } from '../../../../shared/pipes/decode-html.pipe';
import { SeoService } from '../../../../core/services/seo.service';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [CommonModule, DecodeHtmlPipe],

  template: `
    <ng-container *ngIf="schemaData">
      <script type="application/ld+json" [innerHTML]="schemaData"></script>
    </ng-container>
    <div class="terms-container">
      @if (termsData) {
      <div>
        <h1>{{ termsData.title?.rendered | decodeHtml }}</h1>
        <div [innerHTML]="termsData.content?.rendered"></div>
      </div>
      } @else {
      <p>Loading terms...</p>
      }
    </div>
  `,
  styleUrls: ['./terms.component.css'],
})
export class TermsComponent implements OnInit {
  termsData: any;
  schemaData: any;

  constructor(
    private privcyTermsService: PrivcyTermsService,
    private seoService: SeoService
  ) {}

  ngOnInit(): void {
    this.fetchTerms();
  }

  fetchTerms(): void {
    this.privcyTermsService.getTerms().subscribe({
      next: (data) => {
        this.termsData = data;
        // Apply SEO tags using yoast_head_json
        this.schemaData = this.seoService.applySeoTags(this.termsData, {
          title: this.termsData?.title?.rendered,
          description:
            this.termsData?.excerpt?.rendered ||
            'Terms and Conditions - Adventures HUB Sports Shop',
        });
        console.log('Terms Data:', this.termsData);
      },
      error: (error) => {
        console.error('Error fetching terms:', error);
        // Fallback SEO tags in case of error
        this.schemaData = this.seoService.applySeoTags(null, {
          title: 'Terms and Conditions - Adventures HUB Sports Shop',
        });
      },
    });
  }
}
