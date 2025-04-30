import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-blog-article',
  imports: [RouterLink, DatePipe],
  templateUrl: './blog-article.component.html',
  styleUrl: './blog-article.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlogArticleComponent {
  @Input({ required: true }) articleData!: any;
}
