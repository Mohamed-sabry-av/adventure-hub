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
import { debounceTime, filter, fromEvent, Observable } from 'rxjs';
import { animate, style, transition, trigger } from '@angular/animations';

// Component for the header section
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
        animate('300ms ease-in-out', style({ transform: 'translateY(0)', opacity: 1 })),
      ]),
      transition(':leave', [
        style({ transform: 'translateY(0)', opacity: 1 }),
        animate('300ms ease-in-out', style({ transform: 'translateY(-100%)', opacity: 0 })),
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
  private cdr = inject(ChangeDetectorRef);

  isAuth$: Observable<boolean> = this.accountAuthService.isLoggedIn$;
  sidenavIsVisible$: Observable<boolean> = this.navbarService.sideNavIsVisible$;
  @ViewChild('headerEl') headerElement!: ElementRef;
  mainCategories: Category[] = [];
  allCategories: Category[] = [];
  currentPage: string = '';
  showSearchbar: boolean = false;
  isProductPage: boolean = false;
  showNavbar: boolean = true;
  lastScrollY: number = 0;
  headerHeight: number = 0;
  isFixed: boolean = false;

  ngOnInit() {
    this.fetchAllCategories();
    this.observeHeaderHeight();

    // Subscribe to router events to detect page changes
    const subscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentPage = event.url === '/checkout' ? 'checkout' : '';
        this.isProductPage = event.url.startsWith('/product') || event.url.includes('/product/');
        this.showNavbar = true;
        this.navbarService.showNavbar(true);
        this.cdr.detectChanges();
      });

    // Handle sidenav visibility to control body scroll
    const subscription2 = this.sidenavIsVisible$.subscribe((visible) => {
      document.body.style.overflow = visible ? 'hidden' : 'auto';
    });

    // Handle scroll events with debounce
    const subscription3 = fromEvent(window, 'scroll')
      .pipe(debounceTime(20))
      .subscribe(() => this.handleScroll());

    this.destroyRef.onDestroy(() => {
      subscription.unsubscribe();
      subscription2.unsubscribe();
      subscription3.unsubscribe();
    });
  }

  // Observe header height changes dynamically
  private observeHeaderHeight() {
    const observer = new ResizeObserver(() => {
      if (this.headerElement) {
        this.headerHeight = this.headerElement.nativeElement.offsetHeight || 100; // Fallback to 100px
        this.navbarService.handleScroll(this.headerHeight);
        this.cdr.detectChanges();
      }
    });
    setTimeout(() => {
      if (this.headerElement) {
        observer.observe(this.headerElement.nativeElement);
      }
    }, 0);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }

  // Handle scroll behavior for navbar visibility
  handleScroll() {
    const currentScrollY = window.scrollY;

    if (this.isProductPage) {
      this.isFixed = false;
      this.showNavbar = true;
      this.navbarService.showNavbar(true);
      this.navbarService.handleScroll(this.headerHeight);
      this.cdr.detectChanges();
      return;
    }

    if (currentScrollY > this.lastScrollY && currentScrollY > 50) {
      this.showNavbar = false;
    } else {
      this.showNavbar = true; // Always show navbar when scrolling up or at the top
    }

    this.lastScrollY = currentScrollY;
    this.isFixed = currentScrollY > 0;
    this.navbarService.showNavbar(this.showNavbar);
    this.navbarService.handleScroll(this.headerHeight);
    this.cdr.detectChanges();
  }

  // Toggle sidenav visibility
  onSwitchSideNav(visible: boolean) {
    this.navbarService.siwtchSideNav(visible);
  }

  // Fetch categories using CategoriesService
  private fetchAllCategories(): void {
    this.categoriesService.getAllCategories(['default']).subscribe({
      next: (categories) => {
        this.allCategories = categories;
        this.mainCategories = categories.filter((cat) => cat.parent === 0);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Failed to fetch categories:', error);
      },
    });
  }

  // Toggle search bar visibility
  onShowSearchbar() {
    this.showSearchbar = !this.showSearchbar;
    this.navbarService.showSearchBar(this.showSearchbar);
  }
}