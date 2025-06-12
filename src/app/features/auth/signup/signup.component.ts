import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AccountAuthService } from '../account-auth.service';
import { response } from 'express';
import { CommonModule } from '@angular/common';
import { RecapchaComponent } from './recapcha/recapcha.component';
import { GoogleAuthComponent } from '../google-auth/google-auth.component';
import { FacebookAuthComponent } from '../Facebook-auth/facebook-auth.component';
import { CartService } from '../../cart/service/cart.service';
import { UnifiedWishlistService } from '../../../shared/services/unified-wishlist.service';

@Component({
  selector: 'app-signup',
  imports: [
    ReactiveFormsModule, 
    CommonModule, 
    RecapchaComponent,
    GoogleAuthComponent,
    FacebookAuthComponent
  ],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css',
})
export class SignupComponent {
  signupForm!: FormGroup;
  signupError: string = '';
  signupSuccess: string = '';
  recaptchaToken: string | null = null;
  isLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private accountService: AccountAuthService,
    private cartService: CartService,
    private wishlistService: UnifiedWishlistService
  ) {}

  ngOnInit() {
    this.signupFormValidator();
  }

  onRecaptchaSuccess(token: any) {
    this.recaptchaToken = token;

  }

  signupFormValidator() {
    this.signupForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  onSignupSubmit(): void {
    if (this.signupForm.invalid) {
      this.signupError = 'Please fill in all required fields';
      return;
    }

    this.isLoading = true;
    const userData = {
      ...this.signupForm.value,
      recaptchaToken: this.recaptchaToken,
    };
    
    this.accountService.signup(userData).subscribe({
      next: (response) => {
        this.signupError = '';
        this.signupSuccess = 'Account created successfully! Logging you in...';
        
        // Auto login after successful registration
        const credentials = {
          username: userData.username,
          password: userData.password
        };
        
        this.accountService.login(credentials).subscribe({
          next: () => {
            this.cartService.syncUserCart();
            
            this.wishlistService.syncWishlistOnLogin().subscribe({
              next: (result) => {

              },
              error: (err) => {
                
              }
            });
            
            // Redirect to dashboard
            this.router.navigate(['/user/Useraccount']);
          },
          error: (err) => {
            this.isLoading = false;
            this.signupSuccess = 'Account created successfully! Please login to continue.';
            setTimeout(() => {
              this.router.navigate(['/user/myaccount']);
            }, 2000);
          }
        });
      },
      error: (err) => {
        this.isLoading = false;
        this.signupError = err.error?.message || 'Registration failed. Please try again.';
      },
    });
  }
}

