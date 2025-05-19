import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { ContentPagesService } from '../../service/content-pages.service';
import { SeoService } from '../../../../core/services/seo.service';
import { BaseContentPageComponent } from '../page-skeleton/base-content-page.component';
import { ContentPageComponent } from '../page-skeleton/content-page.component';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-return-policy',
  standalone: true,
  imports: [CommonModule, ContentPageComponent],
  template: `
    <!-- SEO Schema Data -->
    <ng-container *ngIf="schemaData">
      <script type="application/ld+json" [innerHTML]="schemaData"></script>
    </ng-container>
    
    <app-content-page
      [pageData]="pageData"
      [schemaData]="schemaData"
      [isLoading]="isLoading"
      pageClass="return-policy-page"
    ></app-content-page>
  `,
  providers: [
    {
      provide: BaseContentPageComponent,
      useExisting: RefundPolicyComponent
    }
  ]
})
export class RefundPolicyComponent extends BaseContentPageComponent {
  constructor(
    protected override contentPagesService: ContentPagesService,
    protected override seoService: SeoService,
    protected override router: Router
  ) {
    super(contentPagesService, seoService, router);
  }

  protected override getPageContent(): Observable<any> {
    return this.contentPagesService.getReturnPolicy();
  }

  protected override getDefaultSeoData(): { title: string; description: string } {
    return {
      title: 'Return & Refund Policy - Adventures HUB Sports Shop',
      description: 'Learn about the Adventures HUB return and refund policies, including eligibility criteria, timeframes, and how to request a return or refund.'
    };
  }
}
