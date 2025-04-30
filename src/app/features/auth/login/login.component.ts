import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AccountAuthService } from '../account-auth.service';
import { FacebookAuthComponent } from '../Facebook-auth/facebook-auth.component';
import { GoogleAuthComponent } from '../google-auth/google-auth.component';
import { CartService } from '../../cart/service/cart.service';

@Component({
  selector: 'app-login',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    GoogleAuthComponent,
    FacebookAuthComponent,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  loginForm!: FormGroup;
  loginError: string = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private accountService: AccountAuthService,
    private cartService: CartService
  ) {}

  ngOnInit() {
    this.loginFormValidator();
  }

  loginFormValidator() {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  onLoginSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginError = 'Please fill all required fields correctly';
      return;
    }

    const credentials = this.loginForm.value;
    this.accountService.login(credentials).subscribe({
      next: () => {
        this.cartService.syncUserCart();
        this.loginError = '';
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.loginError = err.error?.message || 'Login failed, try again';
      },
    });
  }
}
