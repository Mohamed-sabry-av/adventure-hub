import { Component } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AccountAuthService } from './account-auth.service';
import { ActivatedRoute } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { SignupComponent } from './signup/signup.component';
import { AccountDetailsComponent } from './account-details/account-details.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-auth',
  imports: [CommonModule, LoginComponent, SignupComponent, AccountDetailsComponent],
  standalone: true,
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css',
})
export class AuthComponent {
  loginError: string = '';
  registerError: string = '';
  activeTab: string = 'login'; // Default active tab is login

  constructor(
    private accountService: AccountAuthService,
    private fb: FormBuilder,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // Check if there's a specific tab to show from route params
    this.route.queryParams.subscribe(params => {
      if (params['tab'] === 'signup') {
        this.activeTab = 'signup';
      }
    });
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }
}
