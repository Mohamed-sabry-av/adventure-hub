import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

@Injectable({
  providedIn: 'root'
})
export class NewsletterService {
  private readonly API_URL = 'https://adventures-hub.com/wp-json/custom/v1';

  constructor(private apiService: ApiService) {}

  /**
   * Subscribe email to Klaviyo newsletter list
   * @param email - Email address to subscribe
   */
  subscribeToNewsletter(email: string): Observable<any> {
    return this.apiService.postExternalRequest(
      `${this.API_URL}/subscribe`,
      { email },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
} 