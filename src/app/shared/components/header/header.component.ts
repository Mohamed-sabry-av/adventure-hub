import { AsyncPipe, CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  inject,
  NgZone,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CategoriesService } from '../../../core/services/categories.service';
import { Category } from '../../../interfaces/category.model';
import { ButtonModule } from 'primeng/button';
import { AppContainerComponent } from '../app-container/app-container.component';
import { NavbarContainerComponent } from '../navbar-container/navbar-container.component';
import { NavbarService } from '../../services/navbar.service';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { SearchBarComponent } from '../search-bar/search-bar.component';
import { AccountAuthService } from '../../../features/auth/account-auth.service';
import { debounceTime, filter, fromEvent, Observable } from 'rxjs';
import { animate, style, transition, trigger } from '@angular/animations';
import { InViewportDirective } from '../../directives/in-viewport.directive';

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
    InViewportDirective
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  animations: [
    trigger('navbarAnimation', [
      transition(':enter', [
        style({ transform: 'translateY(-100%)', opacity: 0 }),
        animate(
          '400ms cubic-bezier(0.4, 0, 0.2, 1)',
          style({ transform: 'translateY(0)', opacity: 1 })
        ),
      ]),
      transition(':leave', [
        style({ transform: 'translateY(0)', opacity: 1 }),
        animate(
          '400ms cubic-bezier(0.4, 0, 0.2, 1)',
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
  private ngZone = inject(NgZone);

  isAuth$: Observable<boolean> = this.accountAuthService.isLoggedIn$;
  sidenavIsVisible$: Observable<boolean> = this.navbarService.getSideNavIsVisible$();
  isNavbarAnimating$: Observable<boolean> = this.navbarService.getIsNavbarAnimating$();
  isDrawerOpen$: Observable<boolean> = this.navbarService.getIsDrawerOpen$();
  @ViewChild('headerEl') headerElement!: ElementRef;
  mainCategories: Category[] = [];
  allCategories: Category[] = [];
  currentPage: string = '';
  showNavbar: boolean = true;
  showSearchbar: boolean = false;
  lastScrollY: number = 0;
  headerHeight: number = 88; // Default height
  isFixed: boolean = false;
  isProductPage: boolean = false;
  scrollDelta: number = 0; // Track scroll distance for threshold
  navbarVisible: boolean = false;
  ticking: boolean = false; // For requestAnimationFrame to optimize scroll

  ngOnInit() {
    this.fetchAllCategories();

    const subscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.currentPage = event.url === '/checkout' ? 'checkout' : '';
        this.isProductPage = event.url.startsWith('/product') || event.url.includes('/product/');
        this.showNavbar = true;
        this.navbarService.showNavbar(true);
        this.scrollDelta = 0; // Reset scroll delta on navigation
      });

    const subscription2 = this.sidenavIsVisible$.subscribe((visible) => {
      document.body.style.overflow = visible ? 'hidden' : 'auto';
    });

    // Use passive listener for better scroll performance
    this.ngZone.runOutsideAngular(() => {
      window.addEventListener('scroll', this.onScroll, { passive: true });
    });

    this.destroyRef.onDestroy(() => {
      subscription.unsubscribe();
      subscription2.unsubscribe();
      window.removeEventListener('scroll', this.onScroll);
    });
  }

  // Bound method for scroll handler
  private onScroll = () => {
    if (!this.ticking) {
      window.requestAnimationFrame(() => {
        this.handleScroll();
        this.ticking = false;
      });
      this.ticking = true;
    }
  };

  handleScroll() {
    const currentScrollY = window.scrollY;

    // Skip sticky behavior for product page or checkout
    if (this.isProductPage || this.currentPage === 'checkout') {
      this.isFixed = false;
      this.showNavbar = true;
      this.navbarService.showNavbar(true);
      this.navbarService.handleScroll(0);
      this.scrollDelta = 0;
      return;
    }

    // Update header height
    if (this.headerElement) {
      this.headerHeight = this.headerElement.nativeElement.offsetHeight || 88;
      this.navbarService.handleScroll(this.headerHeight);
    }

    // Calculate scroll delta for threshold
    const delta = currentScrollY - this.lastScrollY;
    this.scrollDelta += Math.abs(delta);

    // Smart scroll handling with reduced threshold for smoother experience
    if (delta > 0 && currentScrollY > 80 && this.scrollDelta > 30) {
      // Scrolling down, hide navbar after threshold
      this.ngZone.run(() => {
        this.showNavbar = false;
        this.navbarService.showNavbar(false);
      });
      this.scrollDelta = 0; // Reset delta after hiding
    } else if (delta < 0 && this.scrollDelta > 20) {
      // Scrolling up, show navbar after threshold - reduced for faster response
      this.ngZone.run(() => {
        this.showNavbar = true;
        this.navbarService.showNavbar(true);
      });
      this.scrollDelta = 0; // Reset delta after showing
    }

    // Fix header only when scrolled
    this.isFixed = currentScrollY > 0;

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

  onShowSearchbar() {
    this.showSearchbar = !this.showSearchbar;
    this.navbarService.showSearchBar(this.showSearchbar);
  }

  // For the InViewportDirective
  onNavbarVisible(isVisible: boolean) {
    this.navbarVisible = isVisible;
  }
}
