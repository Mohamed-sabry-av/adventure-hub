// features/not-found/not-found-page.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';
@Component({
  selector: 'app-not-found-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './not-found-page.component.html',
  styleUrls: ['./not-found-page.component.css'],
})
export class NotFoundPageComponent implements OnInit {
  private seoService = inject(SeoService);
  ngOnInit() {
    // Apply SEO settings for the 404 page
    this.seoService.applySeoTags(null, {
      title: '404 - Page Not Found < Adventures HUB Sports Shop',
      description: 'Sorry, the page you are looking for does not exist. You can return to the homepage or browse our products.',
    });
    // Add meta tags for browsers and search engines
    this.seoService.metaService.updateTag({
      name: 'robots',
      content: 'noindex, nofollow',
    });
  }
}

