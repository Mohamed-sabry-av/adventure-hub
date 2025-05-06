import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { AccountAuthService } from './account-auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { SignupComponent } from './signup/signup.component';
import { AccountDetailsComponent } from './account-details/account-details.component';
import { CommonModule } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { take, filter, timeout } from 'rxjs/operators';

@Component({
  selector: 'app-auth',
  imports: [CommonModule, LoginComponent, SignupComponent],
  standalone: true,
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css',
})
export class AuthComponent implements OnInit {
  loginError: string = '';
  registerError: string = '';
  activeTab: string = 'login';
  isLoading: boolean = true;
  redirectInProgress: boolean = false;

  constructor(
    private accountService: AccountAuthService,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private titleService: Title,
    private metaService: Meta
  ) {}

  ngOnInit() {
    // تقليل وقت التحميل إلى 1 ثانية كحد أقصى
    setTimeout(() => {
      if (this.isLoading) {
        this.isLoading = false;
      }
    }, 1000);

    // أولا، تحقق من حالة تسجيل الدخول باستخدام المعلومات المخزنة محليًا
    if (this.accountService.getToken()) {
      // تحقق من صحة الجلسة باستخدام التوكن
      this.accountService.isLoggedIn$.pipe(
        take(1),
        filter(isLoggedIn => isLoggedIn)
      ).subscribe(() => {
        // المستخدم مسجل الدخول بالفعل، قم بالتوجيه إلى صفحة حساب المستخدم
        this.redirectToUserAccount();
      });

      // محاولة التحقق من صحة التوكن عبر الخادم
      this.accountService.verifyToken(true).pipe(
        timeout(1500) // زمن انتهاء المهلة 1.5 ثانية لتحسين سرعة التحميل
      ).subscribe({
        next: (response) => {
          if (response && response.valid === false) {
            this.isLoading = false;
            this.loadAuthPage();
          } else {
            this.redirectToUserAccount();
          }
        },
        error: () => {
          this.isLoading = false;
          this.loadAuthPage();
        }
      });
    } else {
      // لا يوجد توكن، عرض صفحة تسجيل الدخول
      this.isLoading = false;
      this.loadAuthPage();
    }
  }

  private redirectToUserAccount(): void {
    if (!this.redirectInProgress) {
      this.redirectInProgress = true;
      this.router.navigate(['/user/Useraccount']);
    }
  }

  private loadAuthPage(): void {
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
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }
}
