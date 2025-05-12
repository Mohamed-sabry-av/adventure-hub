import { Component, AfterViewInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FacebookAuthService } from './facebook-auth.service';
import { isPlatformBrowser } from '@angular/common';

declare var FB: any;

@Component({
  selector: 'app-facebook-auth',
  standalone: true,
  imports: [CommonModule],
  template: `
   <div class="social-signin-container">
    <button class="facebook-btn" (click)="signInWithFacebook()">
      <span class="facebook-icon"></span>
      Continue with Facebook
    </button>
    <p class="error" *ngIf="loginError">{{ loginError }}</p>
  </div>
  `,
  styleUrls: ['./facebook-auth.component.css'],
})
export class FacebookAuthComponent implements AfterViewInit {
  loginError: string = '';

  constructor(
    private router: Router,
    private facebookService: FacebookAuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.initFacebookSDK();
    }
  }

  initFacebookSDK() {
    // Check if FB SDK is already loaded
    if (typeof FB !== 'undefined') {
      this.checkLoginStatus();
    } else {
      // Load the Facebook SDK asynchronously
      this.loadFacebookScript()
        .then(() => {
          this.initFB();
        })
        .catch(err => {
          console.error('Failed to load Facebook SDK:', err);
          this.loginError = 'Failed to load Facebook login';
        });
    }
  }

  private loadFacebookScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Add the Facebook SDK script only if it's not already added
      if (document.getElementById('facebook-jssdk')) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Facebook SDK failed to load'));
      
      document.head.appendChild(script);
    });
  }

  initFB() {
    // Initialize the Facebook SDK with your app ID
    FB.init({
      appId: '834825131701175',
      cookie: true,
      xfbml: true,
      version: 'v17.0'
    });

    this.checkLoginStatus();
  }

  checkLoginStatus() {
    FB.getLoginStatus((response: any) => {
      this.statusChangeCallback(response);
    });
  }

  // Handle login status change
  statusChangeCallback(response: any) {
    console.log('Facebook Login Status:', response);
    if (response.status === 'connected') {
      // User is already logged in
      this.handleFacebookCredentialResponse(response);
    } else if (response.status === 'not_authorized') {
      // User is logged in to Facebook but not authorized for this app
      this.loginError = 'Please authorize this app to log in';
    } else {
      // User is not logged in
      this.loginError = 'Please log in with Facebook';
    }
  }

  signInWithFacebook() {
    if (typeof FB !== 'undefined') {
      FB.login(
        (response: any) => {
          this.statusChangeCallback(response);
        },
        { scope: 'public_profile,email' }
      );
    } else {
      this.loginError = 'Facebook SDK not loaded';
    }
  }

  handleFacebookCredentialResponse(response: any) {
    if (response.authResponse) {
      const accessToken = response.authResponse.accessToken;
      console.log('Facebook Access Token:', accessToken);
      this.facebookService.loginWithFacebook(accessToken).subscribe({
        next: (res) => {
          console.log('Facebook Login Success:', res);
          this.loginError = '';
          this.router.navigate(['']);
        },
        error: (err) => {
          this.loginError = err.error?.message || 'Facebook login failed';
          console.error('Facebook login failed:', err);
        },
      });
    }
  }
}