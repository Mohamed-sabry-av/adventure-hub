import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

@Injectable({ providedIn: 'root' })
export class BlogService {
  private httpClient = inject(HttpClient);
  private apiService = inject(ApiService);

  blogData$ = new BehaviorSubject<any>('');


  getPosts(page: number = 1, perPage: number = 100) {
    this.httpClient
      .get(`https://adventures-hub.com/wp-json/wp/v2/posts`, {
        params: new HttpParams()
          .set(
            '_fields',
            'content,date,excerpt,id,link,title,yoast_head_json,slug'
          )
          .set('page', page.toString())
          .set('per_page', perPage.toString()),
      })
      .subscribe((response: any) => {
        this.blogData$.next(response);
      });
  }

  getPostData() {}
}
