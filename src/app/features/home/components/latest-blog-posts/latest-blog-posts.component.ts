import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe, AsyncPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BlogPost, BlogService } from '../../../blog/services/blog.service';
import { Observable, of } from 'rxjs';

@Component({
  selector: 'app-latest-blog-posts',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe, AsyncPipe],
  template: `
    <section class="latest-blog-posts py-12 bg-gray-50">
      <div class="container mx-auto px-4">
        <div class="section-header mb-8">
          <h2 class="text-3xl font-bold text-center">Latest From Our Blog</h2>
          <p class="text-center text-gray-600 mt-2">Stay up to date with the latest trends and news</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          @for (post of latestPosts$ | async; track post.id) {
            <div class="blog-card bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300">
              <a [routerLink]="['/blog/', post.slug]" class="block">
                <div class="relative overflow-hidden h-48">
                  <img
                    [src]="getPostImageUrl(post)"
                    [alt]="post.title.rendered"
                    class="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    loading="lazy"
                  >
                </div>
                <div class="p-5">
                  <p class="text-gray-500 text-sm mb-2">{{ post.date | date:'mediumDate' }}</p>
                  <h3 class="font-semibold text-lg mb-2 line-clamp-2" [innerHTML]="post.title.rendered"></h3>
                  <div class="text-gray-600 text-sm line-clamp-3 excerpt" [innerHTML]="getExcerpt(post.excerpt.rendered)"></div>
                  <span class="inline-block mt-4 text-blue-600 font-medium">Read More</span>
                </div>
              </a>
            </div>
          }
        </div>

        <div class="text-center mt-8">
          <a [routerLink]="['/blog/']" class="inline-flex items-center justify-center bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors">
            Visit Our Blog
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .line-clamp-3 {
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .excerpt ::ng-deep p {
      margin: 0;
    }
  `]
})
export class LatestBlogPostsComponent implements OnInit {
  private blogService = inject(BlogService);

  latestPosts$: Observable<BlogPost[]> = of([]);

  ngOnInit(): void {
    this.latestPosts$ = this.blogService.getLatestPosts(4);
  }

  // Get image URL from post
  getPostImageUrl(post: BlogPost): string {
    if (post.yoast_head_json && post.yoast_head_json.og_image && post.yoast_head_json.og_image[0]) {
      return post.yoast_head_json.og_image[0].url;
    }
    return 'https://via.placeholder.com/400x300';
  }

  // استخراج النص الصافي من HTML
  getExcerpt(html: string): string {
    if (typeof window !== 'undefined') {
      // تنفيذ في المتصفح
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      return tempDiv.textContent || tempDiv.innerText || '';
    } else {
      // تنفيذ على الخادم (SSR)
      return html.replace(/<[^>]*>/g, '');
    }
  }
}
