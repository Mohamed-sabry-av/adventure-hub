import { Component } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AccountAuthService } from '../../core/services/account-auth.service';
import { ActivatedRoute } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { SignupComponent } from './signup/signup.component';

@Component({
  selector: 'app-auth',
  imports: [LoginComponent,SignupComponent],
  standalone:true,
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css'
})
export class AuthComponent {
  loginError: string = '';
  registerError: string = '';

  constructor(
    private accountService:AccountAuthService,
    private fb: FormBuilder,
      private route: ActivatedRoute,
  ){}

  // 
}
