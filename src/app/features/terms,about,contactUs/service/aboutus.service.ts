import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AboutusService {
  private readonly baseApiURL = 'https://adventures-hub.com/wp-json/wp/v2/pages'; 

  constructor(private http: HttpClient) {}

  // About Us (page_id=1004)
  getAboutUs(): Observable<any> {
    return this.http.get<any>(`${this.baseApiURL}/1004`);
  }
  // Cookies Policy (page_id=78519)
  getPageById(pageId: number = 78519): Observable<any> {
    return this.http.get<any>(`${this.baseApiURL}/${pageId}`);
  }
  getReturn(pageId: number = 78500): Observable<any> {
    return this.http.get<any>(`${this.baseApiURL}/${pageId}`);
  }
}
