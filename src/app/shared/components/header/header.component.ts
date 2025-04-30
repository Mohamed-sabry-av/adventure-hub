import { AsyncPipe, CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  inject,
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
import { debounceTime, filter, fromEvent, Observable, take } from 'rxjs';
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
  changeDetection: ChangeDetectionStrategy.OnPush,

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

  isAuth$: Observable<boolean> = this.accountAuthService.isLoggedIn$;
  sidenavIsVisible$: Observable<boolean> = this.navbarService.sideNavIsVisible$;
  @ViewChild('headerEl') headerElement!: ElementRef;
  @ViewChild('placeholderEl') placeholderEl!: ElementRef;
  mainCategories: Category[] = [];
  allCategories: Category[] = [];
  currentPage: string = '';
  showSearchbar: boolean = false;
  isProductPage: boolean = false; // New property to track product page

  // ------------------------- Done
  showNavbar: boolean = true;
  lastScrollY: number = 0;
  headerHeight: number = 0;
  isFixed: boolean = false;

  ngOnInit() {
    this.fetchAllCategories();

    const subscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentPage = event.url === '/checkout' ? 'checkout' : '';
        // Check if the current route is a product page
        this.isProductPage = event.url.startsWith('/product') || event.url.includes('/product/');
      });

    const subscription2 = this.sidenavIsVisible$.subscribe((visible) => {
      document.body.style.overflow = visible ? 'hidden' : 'auto';
    });

    const subscription3 = fromEvent(window, 'scroll')
      .pipe(debounceTime(10))
      .subscribe(() => this.handleScroll());

    this.destroyRef.onDestroy(() => {
      subscription.unsubscribe();
      subscription2.unsubscribe();
      subscription3.unsubscribe();
    });
  }

  handleScroll() {
    const currentScrollY = window.scrollY;

    // Skip sticky behavior for product page
    if (this.isProductPage) {
      this.isFixed = false;
      this.showNavbar = true;
      this.navbarService.showNavbar(true);
      this.navbarService.handleScroll(0); // No offset for product page
      return;
    }

    if (currentScrollY > this.lastScrollY && currentScrollY > 50) {
      // Scrolling down
      this.showNavbar = false;
    } else if (currentScrollY < this.lastScrollY) {
      // Scrolling up
      this.showNavbar = true;
    }

    if (this.headerElement) {
      this.headerHeight = this.headerElement.nativeElement.offsetHeight;
    }

    this.lastScrollY = currentScrollY;
    // -------------------------------- done

    if (currentScrollY > 0) {
      this.isFixed = true;
    } else {
      this.isFixed = false;
    }
    this.navbarService.showNavbar(this.showNavbar);
    this.navbarService.handleScroll(this.headerHeight);
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
}