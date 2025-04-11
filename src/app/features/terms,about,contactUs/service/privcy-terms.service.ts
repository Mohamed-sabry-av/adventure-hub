import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PrivcyTermsService {
  apiURL='https://adventures-hub.com/wp-json/wp/v2/pages/3'
  
  constructor(private http: HttpClient) { }

  getTerms(): Observable<any> {
    return this.http.get<any>(this.apiURL);
  }


}
