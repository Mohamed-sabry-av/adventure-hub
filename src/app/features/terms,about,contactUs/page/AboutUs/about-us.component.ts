import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { ContentPagesService } from '../../service/content-pages.service';
import { SeoService } from '../../../../core/services/seo.service';
import { BaseContentPageComponent } from '../page-skeleton/base-content-page.component';
import { ContentPageComponent } from '../page-skeleton/content-page.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-about-us',
  standalone: true,
  imports: [ContentPageComponent],
  template: `
    <!-- SEO Schema Data -->
    <ng-container *ngIf="schemaData">
      <script type="application/ld+json" [innerHTML]="schemaData"></script>
    </ng-container>
    
    <app-content-page
      [pageData]="pageData"
      [schemaData]="schemaData"
      [isLoading]="isLoading"
      pageClass="about-us-page"
    ></app-content-page>
  `,
  providers: [
    {
      provide: BaseContentPageComponent,
      useExisting: AboutUsComponent
    }
  ]
})
export class AboutUsComponent extends BaseContentPageComponent {
  constructor(
    protected override contentPagesService: ContentPagesService,
    protected override seoService: SeoService,
    protected override router: Router
  ) {
    super(contentPagesService, seoService, router);
  }

  protected override getPageContent(): Observable<any> {
    return this.contentPagesService.getAboutUs();
  }

  protected override getDefaultSeoData(): { title: string; description: string } {
    return {
      title: 'About Us - Adventures HUB Sports Shop',
      description: 'Learn about Adventures HUB Sports Shop, our mission, vision, values and how we serve the outdoor and adventure sports community.'
    };
  }
}
