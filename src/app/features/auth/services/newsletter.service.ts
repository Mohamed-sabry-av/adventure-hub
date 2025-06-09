import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { environment } from '../../../../environments/environment';
@Injectable({
  providedIn: 'root'
})
export class NewsletterService {
  private readonly API_URL = environment.customApiUrl;
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
