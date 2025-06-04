import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PasswordResetService {
  private readonly API_URL = environment.customApiUrl;

  constructor(private apiService: ApiService) {}

  /**
   * Request password reset for a specific email address
   * @param email - Email address for password reset
   */
  requestPasswordReset(email: string): Observable<any> {
    return this.apiService.postExternalRequest(
      `${this.API_URL}/forgot-password`,
      { email },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
} 