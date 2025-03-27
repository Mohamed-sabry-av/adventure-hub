import { Component } from '@angular/core';
import { AppContainerComponent } from '../../../../shared/components/app-container/app-container.component';
import { BlogArticleComponent } from '../../components/blog-article/blog-article.component';
import { BlogRelatedInfoComponent } from '../../components/blog-related-info/blog-related-info.component';
import { ServiceHighlightsComponent } from '../../../../shared/components/service-highlights/service-highlights.component';
import { BlogSectionsComponent } from '../../components/blog-sections/blog-sections.component';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-blog-page',
  imports: [
    AppContainerComponent,
    BlogArticleComponent,
    BlogRelatedInfoComponent,
    ServiceHighlightsComponent,
    BlogSectionsComponent,
    RouterOutlet,
  ],
  templateUrl: './blog-page.component.html',
  styleUrl: './blog-page.component.css',
  host: { ngSkipHydration: '' },
})
export class BlogPageComponent {}
