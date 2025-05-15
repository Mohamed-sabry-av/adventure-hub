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
      transition(':enter', [
        style({ opacity: 0, maxHeight: 0, visibility: 'hidden' }),
        animate(
          '400ms cubic-bezier(0.33, 1, 0.68, 1)',
          style({ opacity: 1, maxHeight: '100px', visibility: 'visible' })
        ),
      ]),
      transition(':leave', [
        style({ opacity: 1, maxHeight: '100px', visibility: 'visible' }),
        animate(
          '400ms cubic-bezier(0.33, 1, 0.68, 1)',
          style({ opacity: 0, maxHeight: 0, visibility: 'hidden' })
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
  private cartService = inject(CartService);

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
  showSearchbar = signal<boolean>(false);
  sidenavIsVisible = signal<boolean>(false);
  showNavbarLayer = signal<'full' | 'partial' | 'minimal'>('full');
  scrollDirection = signal<'up' | 'down' | 'none'>('none');
  
  // Thresholds for showing/hiding layers
  readonly SCROLL_THRESHOLD = 200; // قيمة متوسطة للتمرير لأسفل
  readonly NAVBAR_SHOW_THRESHOLD = 30; // قيمة صغيرة للتمرير لأعلى لإظهار شريط التنقل
  readonly SCROLL_SENSITIVITY = 30; // حساسية متوسطة لتحديد اتجاه التمرير

  // Timer for hiding navigation bar
  private _hideNavTimeout: any = null;
  // Timer for maintaining up scroll state
  private _upScrollTimeout: any = null;
  // Flag to force navbar visibility
  private _forceNavbarVisible = false;
  // Flag to track if we're actively scrolling
  private _isActivelyScrolling = false;
  // Time to maintain scroll up state
  readonly UP_SCROLL_MAINTAIN_TIME = 3000; // 3 seconds

  // Getter للاستخدام في القالب
  get forceNavbarVisible(): boolean {
    return this._forceNavbarVisible;
  }

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
      .subscribe((event: any) => {
        this.currentPage = event.url === '/checkout' ? 'checkout' : '';
        this.isProductPage = event.url.startsWith('/product'); // Check if URL starts with /product
        this.showNavbar.set(!this.isProductPage); // Show navbar by default unless on product page
        this.updateHeaderState();
        
        // Set initial header height for body padding
        setTimeout(() => {
          this.onSetHeaderHeight();
          this.cdr.detectChanges();
        }, 10);
      });

    const subscription2 = fromEvent(window, 'scroll')
      .pipe(debounceTime(5)) // Reduced debounce time for smoother animations
      .subscribe(() => this.handleScroll());

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

    // Set initial header height for body padding
    setTimeout(() => {
      this.onSetHeaderHeight();
    }, 100);

    // Update header height on window resize
    const resizeSubscription = fromEvent(window, 'resize')
      .pipe(debounceTime(100))
      .subscribe(() => {
        this.onSetHeaderHeight();
        this.cdr.detectChanges();
      });

    this.destroyRef.onDestroy(() => {
      subscription.unsubscribe();
      subscription2.unsubscribe();
      cartSubscription.unsubscribe();
      resizeSubscription.unsubscribe();
      
      // تنظيف المؤقتات
      if (this._hideNavTimeout) {
        clearTimeout(this._hideNavTimeout);
        this._hideNavTimeout = null;
      }
      
      if (this._upScrollTimeout) {
        clearTimeout(this._upScrollTimeout);
        this._upScrollTimeout = null;
      }
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
      // Skip header behavior on product page
      this.updateHeaderState();
      return;
    }

    // تعليم أننا في حالة تمرير نشط
    this._isActivelyScrolling = true;

    const currentScrollY = window.scrollY;
    const scrollDelta = currentScrollY - this.lastScrollY();
    
    // تحديد اتجاه التمرير
    if (Math.abs(scrollDelta) > this.SCROLL_SENSITIVITY) {
      // تمرير لأعلى بقيمة معقولة
      if (scrollDelta < -35) {
        this.scrollDirection.set('up');
        this._forceNavbarVisible = true;
        
        // إلغاء مؤقت الإخفاء
        if (this._hideNavTimeout) {
          clearTimeout(this._hideNavTimeout);
          this._hideNavTimeout = null;
        }
        
        // إعادة تعيين مؤقت ظهور شريط التنقل
        if (this._upScrollTimeout) {
          clearTimeout(this._upScrollTimeout);
        }
        
        // الاحتفاظ بشريط التنقل ظاهراً لفترة محدودة فقط
        this._upScrollTimeout = setTimeout(() => {
          this._forceNavbarVisible = false;
          this._isActivelyScrolling = false;
          this.cdr.detectChanges();
        }, this.UP_SCROLL_MAINTAIN_TIME);
      } 
      // تمرير لأسفل واضح
      else if (scrollDelta > 40 && currentScrollY > this.SCROLL_THRESHOLD) {
        // إلغاء فرض ظهور شريط التنقل بعد تأخير قصير
        if (this._forceNavbarVisible) {
          setTimeout(() => {
            this._forceNavbarVisible = false;
            this.scrollDirection.set('down');
            this._isActivelyScrolling = false;
            this.updateHeaderState();
          }, 200);
        } else {
          this.scrollDirection.set('down');
        }
      }
    }
    
    // تحديث آخر موضع تمرير
    this.lastScrollY.set(currentScrollY);
    
    // تحديث حالة الهيدر
    this.updateHeaderState();
    
    // بعد 200 مللي ثانية نعتبر التمرير انتهى إذا لم يحدث تمرير جديد
    setTimeout(() => {
      this._isActivelyScrolling = false;
    }, 200);
  }

  private updateHeaderState() {
    if (this.isProductPage) {
      // صفحة المنتج: عرض كل الطبقات دائمًا
      this.showNavbar.set(true);
      this.showNavbarLayer.set('full');
      this.navbarService.showNavbar(true);
      this.onSetHeaderHeight();
      return;
    }

    const currentScrollY = this.lastScrollY();
    const direction = this.scrollDirection();
    
    // في قمة الصفحة: عرض كل الطبقات
    if (currentScrollY <= 20) {
      this.showNavbar.set(true);
      this.showNavbarLayer.set('full');
      this.navbarService.showNavbar(true);
      
      // تحديث الارتفاع
      setTimeout(() => {
        this.onSetHeaderHeight();
        this.cdr.detectChanges();
      }, 10);
    } 
    // عند التمرير لأعلى أو فرض ظهور شريط التنقل: عرض الطبقة الثانية والثالثة
    else if (direction === 'up' || this._forceNavbarVisible) {
      this.showNavbar.set(true);
      this.showNavbarLayer.set('partial');
      this.navbarService.showNavbar(true);
      this.onSetHeaderHeight();
      this.cdr.detectChanges();
    } 
    // عند التمرير لأسفل بعد تجاوز الحد المطلوب وليس في حالة فرض ظهور شريط التنقل: إخفاء الطبقة الثالثة
    else if (direction === 'down' && currentScrollY > this.SCROLL_THRESHOLD && !this._forceNavbarVisible) {
      // تأخير معقول قبل إخفاء شريط التنقل
      if (!this._hideNavTimeout && !this._isActivelyScrolling) {
        this._hideNavTimeout = setTimeout(() => {
          // تحقق مرة أخرى لضمان عدم تغير الحالة
          if (this.scrollDirection() === 'down' && !this._forceNavbarVisible) {
            this.showNavbar.set(false);
            this.showNavbarLayer.set('minimal');
            this.navbarService.showNavbar(false);
            this.onSetHeaderHeight();
            this.cdr.detectChanges();
          }
          this._hideNavTimeout = null;
        }, 400); // تأخير معقول
      }
    }
    
    // تحديث ارتفاع الهيدر دائمًا
    this.onSetHeaderHeight();
    this.cdr.detectChanges();
  }

  onSetHeaderHeight() {
    if (this.headerElement) {
      const height = this.headerElement.nativeElement.offsetHeight;
      this.headerHeight.set(height);
      this.navbarService.setHeaderHeight(height);
      
      // Set CSS variable for dynamic spacing
      document.documentElement.style.setProperty('--header-height', `${height}px`);
      
      // Only apply specific styling if not on product page
      if (this.isProductPage) {
        document.body.style.paddingTop = '0';
        document.querySelector('.header-spacer')?.setAttribute('style', 'display: none');
      } else {
        // Ensure the spacer has the correct height
        const spacer = document.querySelector('.header-spacer');
        if (spacer) {
          spacer.setAttribute('style', `height: ${height}px; display: block`);
        }
        
        // Force a layout recalculation to ensure content is not hidden
        setTimeout(() => {
          window.dispatchEvent(new Event('resize'));
        }, 10);
      }
    }
  }

  ngAfterViewInit() {
    // After the view is initialized, set the header height again to ensure proper spacing
    setTimeout(() => {
      this.onSetHeaderHeight();
      
      // Force a reflow to ensure proper content positioning
      window.dispatchEvent(new Event('scroll'));
    }, 150);
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
  }
}
