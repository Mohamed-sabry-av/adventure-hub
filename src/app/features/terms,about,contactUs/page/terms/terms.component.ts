import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { ContentPagesService } from '../../service/content-pages.service';
import { SeoService } from '../../../../core/services/seo.service';
import { BaseContentPageComponent } from '../page-skeleton/base-content-page.component';
import { ContentPageComponent } from '../page-skeleton/content-page.component';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NO_ERRORS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [CommonModule, ContentPageComponent],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <!-- SEO Schema Data -->
    <ng-container *ngIf="schemaData">
      <script type="application/ld+json" [innerHTML]="schemaData"></script>
    </ng-container>
    
    <app-content-page
      [pageData]="pageData"
      [schemaData]="schemaData"
      [isLoading]="isLoading"
      pageClass="terms-page"
    ></app-content-page>
  `,
  providers: [
    {
      provide: BaseContentPageComponent,
      useExisting: TermsComponent
    }
  ]
})
export class TermsComponent extends BaseContentPageComponent {
  constructor(
    protected override contentPagesService: ContentPagesService,
    protected override seoService: SeoService,
    protected override router: Router
  ) {
    super(contentPagesService, seoService, router);
  }

  protected override getPageContent(): Observable<any> {
    return this.contentPagesService.getTerms();
  }

  protected override getDefaultSeoData(): { title: string; description: string } {
    return {
      title: 'Terms and Conditions - Adventures HUB Sports Shop',
      description: 'Terms and conditions for Adventure HUB Sports Shop. Details about our services, policies, and user agreements.'
    };
  }
}
