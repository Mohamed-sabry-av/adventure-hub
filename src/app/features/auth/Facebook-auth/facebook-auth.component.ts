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
      this.checkFacebookSDK();
    }
  }

  checkFacebookSDK() {
    if (typeof FB !== 'undefined') {
      FB.getLoginStatus((response: any) => {
        this.statusChangeCallback(response);
      });
    } else {
      console.error('Facebook SDK not loaded yet');
      this.loginError = 'Facebook SDK not loaded';
      setTimeout(() => this.checkFacebookSDK(), 1000);
    }
  }

  // دالة معالجة حالة تسجيل الدخول (زي statusChangeCallback بتاع Facebook)
  statusChangeCallback(response: any) {
    console.log('Login Status:', response);
    if (response.status === 'connected') {
      // المستخدم مسجّل بالفعل
      this.handleFacebookCredentialResponse(response);
    } else if (response.status === 'not_authorized') {
      // المستخدم مسجّل في Facebook بس مش عندك
      this.loginError = 'Please authorize this app to log in';
    } else {
      // المستخدم مش مسجّل خالص
      this.loginError = 'Please log in with Facebook';
    }
  }

  signInWithFacebook() {
    if (typeof FB !== 'undefined') {
      FB.login(
        (response: any) => {
          this.statusChangeCallback(response); // نستخدم نفس الـ callback بعد تسجيل الدخول
        },
        { scope: 'public_profile,email' }
      );
    } else {
      this.loginError = 'Facebook SDK not loaded';
    }
  }

  // الـ callback للزر الرسمي (لو عايز تستخدمه)
  checkLoginState() {
    FB.getLoginStatus((response: any) => {
      this.statusChangeCallback(response);
    });
  }

  handleFacebookCredentialResponse(response: any) {
    if (response.authResponse) {
      const accessToken = response.authResponse.accessToken;
      console.log('Facebook Access Token:', accessToken);
      this.facebookService.loginWithFacebook(accessToken).subscribe({
        next: (res) => {
          console.log('Facebook Login Success:', res);
          this.loginError = '';
          this.router.navigate(['/home']);
        },
        error: (err) => {
          this.loginError = err.error?.message || 'Facebook login failed';
          console.error('Facebook login failed:', err);
        },
      });
    }
  }
}

// نضيف الـ checkLoginState كدالة عامة لو عايز تستخدم الزر الرسمي
if (typeof window !== 'undefined') {
  (window as any).checkLoginState = () => {
    FB.getLoginStatus((response: any) => {
      const fbComponent = document.querySelector('app-facebook-auth') as any;
      if (fbComponent) {
        fbComponent.__proto__.constructor.prototype.checkLoginState.call(fbComponent);
      }
    });
  };
}