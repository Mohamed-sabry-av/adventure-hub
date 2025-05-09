import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  OnInit,
  signal,
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
import {
  animate,
  style,
  transition,
  trigger,
  AnimationEvent,
} from '@angular/animations';
import { WishlistIconComponent } from './wishlist-icon/wishlist-icon.component';

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
    WishlistIconComponent,
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  animations: [
    trigger('navbarAnimation', [
      transition(':enter', [
        style({ transform: 'translateY(-100%)', opacity: 0 }),
        animate(
          '400ms cubic-bezier(0.33, 1, 0.68, 1)',
          style({ transform: 'translateY(0)', opacity: 1 })
        ),
      ]),
      transition(':leave', [
        style({ transform: 'translateY(0)', opacity: 1 }),
        animate(
          '400ms cubic-bezier(0.33, 1, 0.68, 1)',
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
  private cdr = inject(ChangeDetectorRef);

  isAuth$: Observable<boolean> = this.accountAuthService.isLoggedIn$;
  @ViewChild('headerEl') headerElement!: ElementRef;
  @ViewChild('placeholderEl') placeholderEl!: ElementRef;
  mainCategories: Category[] = [];
  allCategories: Category[] = [];
  currentPage: string = '';
  isProductPage: boolean = false;

  // Signals
  showNavbar = signal<boolean>(true);
  headerHeight = signal<number>(0);
  lastScrollY = signal<number>(0);
  showSearchbar = signal<boolean>(false);
  sidenavIsVisible = signal<boolean>(false);

  constructor() {
    effect(() => {
      const isVisible = this.navbarService.sideNavIsVisible();
      this.sidenavIsVisible.set(isVisible);

      if (isVisible) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'auto';
      }
    });
  }

  ngOnInit() {
    this.fetchAllCategories();

    const subscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentPage = event.url === '/checkout' ? 'checkout' : '';
        this.isProductPage = event.url.startsWith('/product'); // Check if URL starts with /product
        this.showNavbar.set(!this.isProductPage); // Show navbar by default unless on product page
        this.cdr.detectChanges();
      });

    const subscription2 = fromEvent(window, 'scroll')
      .pipe(debounceTime(10))
      .subscribe(() => this.handleScroll());

    this.destroyRef.onDestroy(() => {
      subscription.unsubscribe();
      subscription2.unsubscribe();
    });
  }

  private fetchAllCategories(): void {
    this.categoriesService
      .getAllCategories(['default'])
      .subscribe((categories) => {
        this.allCategories = categories || [];
        this.mainCategories = this.allCategories.filter((cat) => cat.parent === 0);
        this.cdr.detectChanges();
      });
  }

  handleScroll() {
    if (this.isProductPage) {
      // Skip sticky behavior on product page
      this.showNavbar.set(true); // Keep navbar visible
      this.navbarService.showNavbar(true);
      this.onSetHeaderHeight();
      return;
    }

    const currentScrollY = window.scrollY;
    const scrollDelta = currentScrollY - this.lastScrollY();
    
    // Only trigger hide/show for significant scroll amounts (more than 10px)
    if (Math.abs(scrollDelta) > 10) {
      // Scrolling down - hide header with a small delay for smoother experience
      if (scrollDelta > 0 && currentScrollY > 100) {
        setTimeout(() => {
      this.showNavbar.set(false);
          this.navbarService.showNavbar(false);
          this.cdr.detectChanges();
        }, 50);
      } 
      // Scrolling up - show header immediately for responsive feel
      else if (scrollDelta < 0) {
      this.showNavbar.set(true);
        this.navbarService.showNavbar(true);
      }
    }

    this.lastScrollY.set(currentScrollY);
    this.onSetHeaderHeight();
  }

  onSetHeaderHeight() {
    if (this.headerElement) {
      this.headerHeight.set(this.headerElement.nativeElement.offsetHeight);
      this.navbarService.setHeaderHeight(this.headerHeight());
    }
  }

  onSiwtchSideNav(visible: boolean) {
    this.navbarService.toggleSideNav(visible);
  }

  onShowSearchbar() {
    this.showSearchbar.set(!this.showSearchbar());
    this.navbarService.toggleSearchBar(this.showSearchbar());
    this.cdr.detectChanges();
  }

  onAnimationDone(event: AnimationEvent) {
    if (event.fromState !== 'void' || event.toState !== 'void') {
      this.onSetHeaderHeight();
    }
  }}
