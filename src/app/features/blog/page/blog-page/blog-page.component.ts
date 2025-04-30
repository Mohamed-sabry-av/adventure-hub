import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AppContainerComponent } from '../../../../shared/components/app-container/app-container.component';
import { BlogRelatedInfoComponent } from '../../components/blog-related-info/blog-related-info.component';
import { BlogSectionsComponent } from '../../components/blog-sections/blog-sections.component';

@Component({
  selector: 'app-blog-page',
  imports: [
    AppContainerComponent,
    BlogRelatedInfoComponent,
    BlogSectionsComponent,
  ],
  templateUrl: './blog-page.component.html',
  styleUrl: './blog-page.component.css',
  host: { ngSkipHydration: '' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlogPageComponent {}
