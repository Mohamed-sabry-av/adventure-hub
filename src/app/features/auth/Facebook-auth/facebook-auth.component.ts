import { Component, OnInit, PLATFORM_ID, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FacebookAuthService } from './facebook-auth.service';
import { isPlatformBrowser } from '@angular/common';
import { ConfigService } from '../../../core/services/config.service';

declare var FB: any;

@Component({
  selector: 'app-facebook-auth',
  standalone: true,
  imports: [CommonModule],
  template: `
   <div class="facebook-signin-container">
    <button class="facebook-btn" (click)="signInWithFacebook()">
      <span class="facebook-icon"></span>
      Continue with Facebook
    </button>
    <p class="error" *ngIf="loginError">{{ loginError }}</p>
  </div>
  `,
  styleUrls: ['./facebook-auth.component.css'],
})
export class FacebookAuthComponent implements OnInit {
  loginError: string = '';
  private configService = inject(ConfigService);
  private fbAppId: string = '';
  private fbSDKLoaded = false;

  constructor(
    private router: Router,
    private facebookService: FacebookAuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.configService.getConfig().subscribe(config => {
        if (config && config.fbAppId) {
          this.fbAppId = config.fbAppId;
          this.loadFacebookSDK();
        }
      });
    }
  }

  private loadFacebookSDK(): void {
    // Check if the SDK script is already loaded
    if (document.getElementById('facebook-jssdk')) {
      // If the script exists but FB is not defined, we need to wait
      if (typeof FB !== 'undefined') {
        this.initFacebookSDK();
      }
      return;
    }

    // Create and append the script tag
    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      // Verify FB is defined before initializing
      if (typeof FB !== 'undefined') {
        this.initFacebookSDK();
      } else {
        this.loginError = 'Failed to load Facebook SDK';
      }
    };
    
    script.onerror = () => {
      this.loginError = 'Failed to load Facebook login';
    };
    
    document.head.appendChild(script);
  }

  private initFacebookSDK(): void {
    if (typeof FB === 'undefined') {
      return;
    }
    
    FB.init({
      appId: this.fbAppId,
      cookie: true, 
      xfbml: true,
      version: 'v18.0'
    });
    
    this.fbSDKLoaded = true;
  }

  signInWithFacebook() {
    // Double check FB is defined and SDK is loaded
    if (typeof FB === 'undefined') {
      this.loginError = 'Facebook SDK not loaded. Please try again later.';
      return;
    }
    
    if (!this.fbSDKLoaded) {
      this.loginError = 'Facebook SDK still initializing. Please try again in a moment.';
      return;
    }

    FB.login(
      (response: any) => {
        if (response.status === 'connected') {
          const authResponse = response.authResponse;
          if (authResponse) {
            // Get user data from Facebook Graph API
            FB.api('/me', { fields: 'email,name' }, (userInfo: any) => {
              // Use our service that now handles token generation locally
              this.facebookService.loginWithFacebook(authResponse.accessToken).subscribe({
                next: (res) => {
                  this.loginError = '';
                  this.router.navigate(['/user/Useraccount']);
                },
                error: (err) => {
                  this.loginError = err.error?.message || 'Facebook login failed';
                }
              });
            });
          } else {
            this.loginError = 'Failed to get Facebook authentication data';
          }
        } else if (response.status === 'not_authorized') {
          this.loginError = 'You did not authorize this application';
        } else {
          this.loginError = 'Facebook login failed';
        }
      },
      { scope: 'public_profile,email' }
    );
  }
}
