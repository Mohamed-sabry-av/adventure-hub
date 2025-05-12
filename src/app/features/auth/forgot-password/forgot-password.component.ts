import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PasswordResetService } from '../services/password-reset.service';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="forgot-password-container">
      <h2>Reset Password</h2>
      <p>Enter your email address and we'll send you a password reset link</p>
      
      <form [formGroup]="resetForm" (ngSubmit)="onSubmit()">
        <div class="form-group">
          <label for="email">Email</label>
          <input 
            type="email" 
            id="email"
            formControlName="email" 
            placeholder="Enter your email"
            [ngClass]="{'is-invalid': submitted && f['email'].errors}"
          />
          <div *ngIf="submitted && f['email'].errors" class="error-message">
            <div *ngIf="f['email'].errors['required']">Email is required</div>
            <div *ngIf="f['email'].errors['email']">Please enter a valid email</div>
          </div>
        </div>
        
        <button type="submit" [disabled]="loading">
          {{ loading ? 'Processing...' : 'Send Reset Link' }}
        </button>
        
        <div *ngIf="success" class="success-message">
          <p>Password reset link has been sent to your email address.</p>
          <p>Please check your inbox and follow the instructions.</p>
        </div>
        
        <div *ngIf="error" class="error-message">
          {{ error }}
        </div>
        
        <div class="back-link">
          <a routerLink="/auth/login">Back to Login</a>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .forgot-password-container {
      max-width: 450px;
      margin: 50px auto;
      padding: 30px;
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
    }
    
    h2 {
      margin-top: 0;
      color: #333;
      text-align: center;
    }
    
    p {
      color: #666;
      margin-bottom: 20px;
      text-align: center;
    }
    
    .form-group {
      margin-bottom: 20px;
    }
    
    label {
      display: block;
      margin-bottom: 5px;
      font-weight: 500;
    }
    
    input {
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 16px;
    }
    
    input.is-invalid {
      border-color: #dc3545;
    }
    
    button {
      width: 100%;
      background-color: #4CAF50;
      color: white;
      padding: 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 15px;
    }
    
    button:disabled {
      background-color: #cccccc;
      cursor: not-allowed;
    }
    
    .error-message {
      color: #dc3545;
      font-size: 14px;
      margin-top: 5px;
    }
    
    .success-message {
      color: #28a745;
      background-color: #d4edda;
      border: 1px solid #c3e6cb;
      padding: 15px;
      border-radius: 4px;
      margin-bottom: 15px;
    }
    
    .back-link {
      text-align: center;
      margin-top: 15px;
    }
    
    .back-link a {
      color: #4CAF50;
      text-decoration: none;
    }
    
    .back-link a:hover {
      text-decoration: underline;
    }
  `]
})
export class ForgotPasswordComponent {
  resetForm: FormGroup;
  loading = false;
  submitted = false;
  success = false;
  error = '';
  
  constructor(
    private formBuilder: FormBuilder,
    private passwordResetService: PasswordResetService,
    private router: Router
  ) {
    this.resetForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }
  
  // Getter for easy access to form fields
  get f(): { [key: string]: AbstractControl } { 
    return this.resetForm.controls; 
  }
  
  onSubmit(): void {
    this.submitted = true;
    this.error = '';
    this.success = false;
    
    // stop here if form is invalid
    if (this.resetForm.invalid) {
      return;
    }
    
    this.loading = true;
    
    this.passwordResetService.requestPasswordReset(this.f['email'].value)
      .subscribe({
        next: () => {
          this.success = true;
          this.loading = false;
        },
        error: (error: any) => {
          this.error = error?.message || 'Failed to send password reset email. Please try again.';
          this.loading = false;
        }
      });
  }
} 