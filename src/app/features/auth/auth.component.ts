import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { AccountAuthService } from './account-auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { SignupComponent } from './signup/signup.component';
import { AccountDetailsComponent } from './account-details/account-details.component';
import { CommonModule } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-auth',
  imports: [CommonModule, LoginComponent, SignupComponent],
  standalone: true,
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css',
})
export class AuthComponent {
  loginError: string = '';
  registerError: string = '';
  activeTab: string = 'login';
  isLoading: boolean = true; // ضفنا متغيّر isLoading

  constructor(
    private accountService: AccountAuthService,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private titleService: Title,
    private metaService: Meta
  ) {}

  ngOnInit() {
    this.accountService.verifyToken().subscribe({
      next: () => {
        this.router.navigate(['/user/Useraccount']);
      },
      error: () => {
        this.isLoading = false; // حطيناه هنا بدل الـ complete
        this.route.queryParams.subscribe((params) => {
          if (params['tab'] === 'signup') {
            this.activeTab = 'signup';
          }
        });
        this.titleService.setTitle('Login - Adventures HUB Sports Shop');
        this.metaService.updateTag({
          name: 'robots',
          content: 'noindex, nofollow',
        });
      },
      // مش محتاجين الـ complete handler خلاص
    });
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }
}
