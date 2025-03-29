import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AboutusService {
  private readonly apiURL = 'https://adventures-hub.com/wp-json/wp/v2/pages/1004'; // ID بتاع About Us

  constructor(private http: HttpClient) {}

  getAboutUs(): Observable<any> { // غيرت الاسم لـ getAboutUs عشان يكون أوضح
    return this.http.get<any>(this.apiURL);
  }

}
