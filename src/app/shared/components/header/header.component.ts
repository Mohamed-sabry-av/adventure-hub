// src/app/components/header/header.component.ts
import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CategoriesService } from '../../../core/services/categories.service';
import { Category } from '../../../interfaces/category.model';
import { Carousel } from 'primeng/carousel';
import { ButtonModule } from 'primeng/button';
import { AppContainerComponent } from '../app-container/app-container.component';
import { NavbarContainerComponent } from '../navbar-container/navbar-container.component';
import { NavbarService } from '../../services/navbar.service';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { SearchBarComponent } from '../search-bar/search-bar.component';
import { AccountAuthService } from '../../../features/auth/account-auth.service';
import { filter, Observable } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    AppContainerComponent,
    NavbarContainerComponent,
    RouterLink,
    SearchBarComponent,
    AsyncPipe,
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent implements OnInit {
  private navbarService = inject(NavbarService);
  private accountAuthService = inject(AccountAuthService);
  private categoriesService = inject(CategoriesService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  isAuth$: Observable<boolean> = this.accountAuthService.isLoggedIn$;
  sidenavIsVisible$: Observable<boolean> = this.navbarService.sideNavIsVisible$;
  mainCategories: Category[] = [];
  allCategories: Category[] = [];
  currentPage: string = '';

  ngOnInit() {
    this.fetchAllCategories();

    const subscribtion = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        if (event.url === '/checkout') {
          this.currentPage = 'checkout';
        } else {
          this.currentPage = '';
        }
      });

    const subscribtion2 = this.sidenavIsVisible$.subscribe((visible) => {
      if (visible) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'auto';
      }
      console.log(visible);
      // document.body.style.overflow = visible ? 'hidden' : 'auto';
    });

    this.destroyRef.onDestroy(() => {
      subscribtion.unsubscribe();
      subscribtion2.unsubscribe();
    });
  }

  onSiwtchSideNav(visible: boolean) {
    this.navbarService.siwtchSideNav(visible);
  }

  private fetchAllCategories(): void {
    this.categoriesService
      .getAllCategories(['default'])
      .subscribe((categories) => {
        this.allCategories = categories;
        this.mainCategories = categories.filter((cat) => cat.parent === 0);
      });
  }
}
