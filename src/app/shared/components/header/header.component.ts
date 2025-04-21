import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CategoriesService } from '../../../core/services/categories.service';
import { Category } from '../../../interfaces/category.model';
import { ButtonModule } from 'primeng/button';
import { AppContainerComponent } from '../app-container/app-container.component';
import { NavbarContainerComponent } from '../navbar-container/navbar-container.component';
import { NavbarService } from '../../services/navbar.service';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { SearchBarComponent } from '../search-bar/search-bar.component';
import { AccountAuthService } from '../../../features/auth/account-auth.service';
import { filter, Observable } from 'rxjs';
import { animate, style, transition, trigger } from '@angular/animations';

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
  animations: [
    trigger('navbarAnimation', [
      transition(':enter', [
        style({ transform: 'translateY(-100%)', opacity: 0 }),
        animate(
          '300ms ease-in-out',
          style({ transform: 'translateY(0)', opacity: 1 })
        ),
      ]),
      transition(':leave', [
        style({ transform: 'translateY(0)', opacity: 1 }),
        animate(
          '300ms ease-in-out',
          style({ transform: 'translateY(-100%)', opacity: 0 })
        ),
      ]),
    ]),
  ],
})
export class HeaderComponent implements OnInit {
  private navbarService = inject(NavbarService);
  private accountAuthService = inject(AccountAuthService);
  private categoriesService = inject(CategoriesService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  @Inject(DOCUMENT) private document!: Document;

  isAuth$: Observable<boolean> = this.accountAuthService.isLoggedIn$;
  sidenavIsVisible$: Observable<boolean> = this.navbarService.sideNavIsVisible$;
  mainCategories: Category[] = [];
  allCategories: Category[] = [];
  currentPage: string = '';
  showNavbar: boolean = true;
  lastScrollY: number = 0;

  ngOnInit() {
    this.fetchAllCategories();
    this.onWindowResize(); // Initialize mobile state

    const subscribtion = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        if (event.url === '/checkout') {
          this.currentPage = 'checkout';
        } else {
          this.currentPage = '';
        }
      });

    const subscribtion2 = this.sidenavIsVisible$.subscribe((visible) => {
      document.body.style.overflow = visible ? 'hidden' : 'auto';
    });

    // Handle scroll events
    window.addEventListener('scroll', this.handleScroll.bind(this));

    this.destroyRef.onDestroy(() => {
      subscribtion.unsubscribe();
      subscribtion2.unsubscribe();
      window.removeEventListener('scroll', this.handleScroll.bind(this));
    });
  }

  handleScroll() {
    const currentScrollY = window.scrollY;

    if (currentScrollY > this.lastScrollY && currentScrollY > 50) {
      // Scrolling down
      this.showNavbar = false;
    } else if (currentScrollY < this.lastScrollY) {
      // Scrolling up
      this.showNavbar = true;
    }

    this.lastScrollY = currentScrollY;
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