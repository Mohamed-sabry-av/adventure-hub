import { Component, AfterViewInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GoogleAuthService } from './google-auth.service';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../../environments/environment';

declare var google: any;

@Component({
  selector: 'app-google-auth',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="google-signin-container">
      <!-- Google Sign In Button -->
      <div id="googleSignInButton"></div>
      <p class="error" *ngIf="loginError">{{ loginError }}</p>
    </div>
  `,
  styleUrls: ['./google-auth.component.css'],
})
export class GoogleAuthComponent implements AfterViewInit {
  loginError: string = '';

  constructor(
    private router: Router,
    private googleService: GoogleAuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadGoogleScript()
        .then(() => {
          this.initializeGoogleSignIn();
        })
        .catch(err => {
          console.error('Failed to load Google script:', err);
          this.loginError = 'Failed to load Google Sign-In';
        });
    }
  }

  private loadGoogleScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof google !== 'undefined' && google.accounts) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Google script failed to load'));
      document.head.appendChild(script);
    });
  }

  initializeGoogleSignIn() {
    google.accounts.id.initialize({
      client_id: environment.google.clientId,
      callback: (response: any) => this.handleCredentialResponse(response),
    });

    google.accounts.id.renderButton(
      document.getElementById('googleSignInButton'),
      {
        type: 'standard',
        theme: 'filled_blue',
        size: 'large',
        shape: 'rectangular',
        text: 'continue_with',
        width: 'fill',
        logo_alignment: 'left',
      }
    );
  }

  handleCredentialResponse(response: any) {
    console.log('Google Response:', response);
    if (response && response.credential) {
      const idToken = response.credential;
      console.log('idToken:', idToken);
      this.googleService.loginWithGoogle(idToken).subscribe({
        next: (res) => {
          console.log('Login Success:', res);
          this.loginError = '';
          this.router.navigate(['/user/Useraccount']);
        },
        error: (err) => {
          this.loginError = err.error?.message || 'Google login failed';
          console.error('Google login failed:', err);
        },
      });
    } else {
      console.log('No credential in response');
      this.loginError = 'Failed to get credentials from Google';
    }
  }
}