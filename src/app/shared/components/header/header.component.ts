import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  OnInit,
  PLATFORM_ID,
  signal,
  ViewChild,
  Inject,
  AfterViewInit
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
  state
} from '@angular/animations';
import { WishlistIconComponent } from './wishlist-icon/wishlist-icon.component';
import { CartService } from '../../../features/cart/service/cart.service';

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
    trigger('layerAnimation', [
      state('visible', style({
        opacity: 1,
        maxHeight: '200px',
        visibility: 'visible',
        transform: 'translateY(0)',
        pointerEvents: 'auto'
      })),
      state('hidden', style({
        opacity: 0,
        maxHeight: 0,
        visibility: 'hidden',
        transform: 'translateY(-5px)',
        pointerEvents: 'none'
      })),
      transition('visible => hidden', [
        style({ 
          opacity: 1, 
          maxHeight: '200px', 
          visibility: 'visible', 
          transform: 'translateY(0)',
          pointerEvents: 'auto'
        }),
        animate(
          '1000ms cubic-bezier(0.25, 0.1, 0.25, 1)',
          style({ 
            opacity: 0, 
            maxHeight: 0, 
            visibility: 'hidden', 
            transform: 'translateY(-5px)',
            pointerEvents: 'none'
          })
        ),
      ]),
      transition('hidden => visible', [
        style({ 
          opacity: 0, 
          maxHeight: 0, 
          visibility: 'hidden', 
          transform: 'translateY(-5px)',
          pointerEvents: 'none'
        }),
        animate(
          '1000ms cubic-bezier(0.25, 0.1, 0.25, 1)',
          style({ 
            opacity: 1, 
            maxHeight: '200px', 
            visibility: 'visible', 
            transform: 'translateY(0)',
            pointerEvents: 'auto'
          })
        ),
      ]),
    ]),
  ],
})
export class HeaderComponent implements OnInit, AfterViewInit {
  private navbarService = inject(NavbarService);
  private accountAuthService = inject(AccountAuthService);
  private categoriesService = inject(CategoriesService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  private cartService = inject(CartService);
  private platformId = inject(PLATFORM_ID);

  isAuth$: Observable<boolean> = this.accountAuthService.isLoggedIn$;
  cartCount: number = 0;
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
  showSearchbar = this.navbarService.showSearchBar;
  sidenavIsVisible = signal<boolean>(false);
  showNavbarLayer = signal<'full' | 'partial' | 'minimal'>('full');
  scrollDirection = signal<'up' | 'down' | 'none'>('none');
  
  // Use the thirdLayerVisible signal from NavbarService
  thirdLayerVisible = this.navbarService.thirdLayerVisible;
  
  // Thresholds for showing/hiding layers
  readonly SCROLL_THRESHOLD = 300; // Increased threshold for better stability
  readonly NAVBAR_SHOW_THRESHOLD = 50; // Increased threshold for showing navbar
  readonly SCROLL_SENSITIVITY = 50; // Increased sensitivity threshold
  readonly SCROLL_DEBOUNCE_TIME = 100; // Increased debounce time for smoother behavior

  // Timer for hiding navigation bar
  private _hideNavTimeout: any = null;
  // Timer for maintaining up scroll state
  private _upScrollTimeout: any = null;
  // Flag to force navbar visibility
  private _forceNavbarVisible = false;
  // Flag to track if we're actively scrolling
  private _isActivelyScrolling = false;
  // Time to maintain scroll up state
  readonly UP_SCROLL_MAINTAIN_TIME = 5000; // Increased to 5 seconds
  // Minimum time between navbar state changes
  readonly MIN_STATE_CHANGE_DELAY = 500; // 500ms minimum delay between state changes
  private _lastStateChangeTime = 0;

  // Getter للاستخدام في القالب
  get forceNavbarVisible(): boolean {
    return this._forceNavbarVisible;
  }

  constructor() {
    effect(() => {
      const isVisible = this.navbarService.sideNavIsVisible();
      this.sidenavIsVisible.set(isVisible);

      if (isPlatformBrowser(this.platformId)) {
        if (isVisible) {
          document.body.style.overflow = 'hidden';
        } else {
          document.body.style.overflow = 'auto';
        }
      }
    });
    
    // Add effect to sync lastScrollY with NavbarService
    effect(() => {
      this.lastScrollY.set(this.navbarService.lastScrollY());
    });
    
    // Add effect to sync scrollDirection with NavbarService
    effect(() => {
      this.scrollDirection.set(this.navbarService.scrollDirection());
    });
  }

  ngOnInit() {
    this.fetchAllCategories();

    const subscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.currentPage = event.url === '/checkout' ? 'checkout' : '';
        this.isProductPage = event.url.startsWith('/product'); // Check if URL starts with /product
        this.showNavbar.set(!this.isProductPage); // Show navbar by default unless on product page
        
        // Set initial header height for body padding
        setTimeout(() => {
          this.onSetHeaderHeight();
          this.cdr.detectChanges();
        }, 10);
      });

    if (isPlatformBrowser(this.platformId)) {
      // Update header height on window resize
      const resizeSubscription = fromEvent(window, 'resize')
        .pipe(debounceTime(100))
        .subscribe(() => {
          this.onSetHeaderHeight();
          this.cdr.detectChanges();
        });
        
      this.destroyRef.onDestroy(() => {
        subscription.unsubscribe();
        resizeSubscription.unsubscribe();
      });
    } else {
      this.destroyRef.onDestroy(() => {
        subscription.unsubscribe();
      });
    }

    // Subscribe to cart updates to show cart count
    const cartSubscription = this.cartService.savedUserCart$.subscribe((response: any) => {
      if (response?.userCart?.items) {
        this.cartCount = response.userCart.items.length;
      } else if (response?.userCart) {
        this.cartCount = response.userCart.length || 0;
      } else {
        this.cartCount = 0;
      }
      this.cdr.detectChanges();
    });
    
    this.destroyRef.onDestroy(() => {
      cartSubscription.unsubscribe();
    });

    // Add a timer to periodically check and force the third layer visibility
    if (isPlatformBrowser(this.platformId)) {
      setInterval(() => {
        // If we're scrolled down and the third layer is visible, force it to hide
        if (window.scrollY > 200 && this.navbarService.thirdLayerVisible()) {
          this.forceCloseThirdLayer();
        }
      }, 5000); // Check every 5 seconds
    }
  }
  
  ngAfterViewInit() {
    // Set header height after view is initialized
    setTimeout(() => {
      this.onSetHeaderHeight();
      this.cdr.detectChanges();
    }, 100);
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

  onSetHeaderHeight() {
    if (this.headerElement && isPlatformBrowser(this.platformId)) {
      // Use getBoundingClientRect for more accurate measurement
      const headerRect = this.headerElement.nativeElement.getBoundingClientRect();
      const height = Math.ceil(headerRect.height); // Round up to avoid fractional pixels
      
      // تعيين ارتفاع الهيدر بدقة
      this.headerHeight.set(height);
      this.navbarService.setHeaderHeight(height);
      
      // تعيين متغير CSS للاستخدام في جميع أنحاء التطبيق
      document.documentElement.style.setProperty('--header-height', `${height}px`);
      
      // With sticky positioning, we don't need to add padding to the body
      document.body.style.paddingTop = '0';
      
      // Force layout recalculation
      this.cdr.detectChanges();
    }
  }

  onSiwtchSideNav(visible: boolean) {
    this.navbarService.toggleSideNav(visible);
  }

  onShowSearchbar() {
    this.navbarService.toggleSearchBar(!this.navbarService.showSearchBar());
  }

  onAnimationDone(event: AnimationEvent): void {
    // After animation completes, recalculate header height
    this.onSetHeaderHeight();

    // If the animation was hiding the third layer, ensure it's properly hidden
    if (event.toState === 'hidden' || 
        (event.fromState !== 'void' && !this.navbarService.thirdLayerVisible())) {
      // Force third layer to be hidden again to ensure it stays hidden
      setTimeout(() => {
        this.navbarService.forceThirdLayerVisibility(false);
      }, 50);
    }
  }

  // Add direct method to force close third layer
  forceCloseThirdLayer(): void {
    this.navbarService.forceThirdLayerVisibility(false);
  }
}
