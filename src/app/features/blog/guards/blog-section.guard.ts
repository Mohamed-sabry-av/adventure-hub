import { CanMatchFn, RedirectCommand, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { map } from 'rxjs/operators';
export const blogSectionGuard: CanMatchFn = (route, segments) => {
  const httpClient = inject(HttpClient);
  const router = inject(Router);
  const articleName = segments.length > 0 ? segments[0].path : null;
  if (!articleName) {
    return new RedirectCommand(router.parseUrl('/'));
  }
  return httpClient
    .get(`https://adventures-hub.com/wp-json/wp/v2/posts?slug=${articleName}`)
    .pipe(
      map((response: any) => {
        if (response.length > 0) {
          route.data = { post: response[0] };
          return true;
        } else {
          return new RedirectCommand(router.parseUrl('/'));
        }
      })
    );
};
/*
    .get(`https://adventures-hub.com/wp-json/wp/v2/posts?slug=${articleName}`, {
      params: new HttpParams().set(
        '_fields',
        'content,date,excerpt,id,link,title,yoast_head_json,slug'
      ),
    })
*/

