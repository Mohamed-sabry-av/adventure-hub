import { Component, AfterViewInit, PLATFORM_ID, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GoogleAuthService } from './google-auth.service';
import { isPlatformBrowser } from '@angular/common';
import { ConfigService } from '../../../core/services/config.service';

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
  private configService = inject(ConfigService);

  constructor(
    private router: Router,
    private googleService: GoogleAuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngAfterViewInit(): void {
    // Skip on server
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    
    // Wait for config before initializing Google sign-in
    this.configService.getConfig().subscribe(config => {
      if (config && config.googleClientId) {
        this.initializeGoogleSignIn(config.googleClientId);
      }
    });
  }

  private initializeGoogleSignIn(clientId: string): void {
    // Load the Google Sign-In API script
    if (typeof google === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
      
      script.onload = () => {
        this.renderGoogleButton(clientId);
      };
    } else {
      this.renderGoogleButton(clientId);
    }
  }

  private renderGoogleButton(clientId: string): void {
    google.accounts.id.initialize({
      client_id: clientId,
      callback: this.handleCredentialResponse.bind(this),
      auto_select: false,
      cancel_on_tap_outside: true
    });
    
    google.accounts.id.renderButton(
      document.getElementById('googleSignInButton'),
      { 
        theme: 'outline',
        size: 'large',
        type: 'standard',
        shape: 'rectangular',
        text: 'continue_with',
        logo_alignment: 'left'
      }
    );
  }
  
  private handleCredentialResponse(response: any): void {
    if (response && response.credential) {
      this.googleService.loginWithGoogle(response.credential).subscribe({
        next: (res) => {
          this.loginError = '';
          this.router.navigate(['/user/Useraccount']);
        },
        error: (err) => {
          this.loginError = err.error?.message || 'Google login failed';
        }
      });
    }
  }
}
