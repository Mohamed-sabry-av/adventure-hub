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

@Component({
  selector: 'app-signup',
  imports: [ReactiveFormsModule, CommonModule, RecapchaComponent],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignupComponent {
  signupForm!: FormGroup;
  signupError: string = '';
  signupSuccess: string = '';
  recaptchaToken: string | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private accountService: AccountAuthService
  ) {}

  ngOnInit() {
    this.signupFormValidator();
  }

  onRecaptchaSuccess(token: any) {
    this.recaptchaToken = token;
    console.log('recaptchaToken', token);
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
      this.signupError = 'somthing wrong';
      return;
    }

    const userData = {
      ...this.signupForm.value,
      recaptchaToken: this.recaptchaToken,
    };
    this.accountService.signup(userData).subscribe({
      next: (response) => {
        this.signupError = '';
        this.signupSuccess = 'signdup Successfully';
      },
      error: (err) => {
        this.signupError = err.error?.message || 'please try again';
      },
    });
  }
}
