import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { ConfigService } from '../../../core/services/config.service';

@Injectable({
  providedIn: 'root'
})
export class PasswordResetService {
  private configService = inject(ConfigService);
  private apiUrl: string = '';
  
  constructor(private apiService: ApiService) {
    // Get API URL from config
    this.configService.getConfig().subscribe(config => {
      if (config && config.apiUrl) {
        this.apiUrl = `${config.apiUrl}/wp-json/custom/v1`;
      }
    });
  }
  
  /**
   * Request password reset for a specific email address
   * @param email - Email address for password reset
   */
  requestPasswordReset(email: string): Observable<any> {
    return this.apiService.postExternalRequest(
      `${this.apiUrl}/forgot-password`,
      { email },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
} 
