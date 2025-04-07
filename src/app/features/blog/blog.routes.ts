import { Routes } from '@angular/router';
import { blogSectionGuard } from '../blog/guards/blog-section.guard';

export const blogRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../blog/page/blog-page/blog-page.component').then(
        (m) => m.BlogPageComponent
      ),
    pathMatch: 'full',
  },
  {
    path: ':articleName',
    loadComponent: () =>
      import('../blog/page/blog-section-page/blog-section-page.component').then(
        (m) => m.BlogSectionPageComponent
      ),
    canMatch: [blogSectionGuard],
  },
];