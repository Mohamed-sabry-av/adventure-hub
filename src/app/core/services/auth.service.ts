import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { HandleErrorsService } from './handel-errors.service';
import { catchError, map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private consumerKey: string = '';
  private consumerSecret: string = '';
  private configService = inject(ConfigService);
  private http = inject(HttpClient);
  private handelErrorService = inject(HandleErrorsService);

  constructor() {
    // Get initial config values immediately if available
    const initialConfig = this.configService.currentConfig;
    if (initialConfig) {
      this.consumerKey = initialConfig.consumerKey;
      this.consumerSecret = initialConfig.consumerSecret;
    }

    // Subscribe to future changes
    this.configService.getConfig().subscribe(config => {
      if (config) {
        this.consumerKey = config.consumerKey;
        this.consumerSecret = config.consumerSecret;
      }
    });
  }

  getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization:
        'Basic ' + btoa(`${this.consumerKey}:${this.consumerSecret}`),
      'Content-Type': 'application/json',
    });
  }
}

