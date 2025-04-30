import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
} from '@angular/core';
import { AppContainerComponent } from '../../../../shared/components/app-container/app-container.component';
import { BlogArticleComponent } from '../../components/blog-article/blog-article.component';
import { BlogRelatedInfoComponent } from '../../components/blog-related-info/blog-related-info.component';
import { ServiceHighlightsComponent } from '../../../../shared/components/service-highlights/service-highlights.component';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-blog-section-page',
  imports: [
    AppContainerComponent,
    BlogArticleComponent,
    BlogRelatedInfoComponent,
    ServiceHighlightsComponent,
  ],
  templateUrl: './blog-section-page.component.html',
  styleUrl: './blog-section-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlogSectionPageComponent {
  private activatedRoute = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  post: any;
  ngOnInit() {
    const subscribtion = this.activatedRoute.data.subscribe(
      (response: any) => (this.post = response.post)
    );

    this.destroyRef.onDestroy(() => subscribtion.unsubscribe());
  }
}
