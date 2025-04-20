import { AsyncPipe, CommonModule, DOCUMENT } from '@angular/common';
import { Component, DestroyRef, HostListener, Inject, inject, OnInit } from '@angular/core';
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
  @Inject(DOCUMENT) private document!: Document;

  isAuth$: Observable<boolean> = this.accountAuthService.isLoggedIn$;
  sidenavIsVisible$: Observable<boolean> = this.navbarService.sideNavIsVisible$;
  mainCategories: Category[] = [];
  allCategories: Category[] = [];
  currentPage: string = '';
  isScrolled: boolean = false;
  lastScrollPosition: number = 0;
  headerVisible: boolean = true;
  isMobile: boolean = false;
  showNavbar: boolean = true;

  @HostListener('window:scroll')
  onWindowScroll() {
    const scrollPosition = window.scrollY;
    
    // Set isScrolled for styling
    this.isScrolled = scrollPosition > 50;
    
    // On mobile, hide entire header when scrolling down
    if (this.isMobile) {
      const scrollingDown = scrollPosition > this.lastScrollPosition;
      
      if (scrollingDown && scrollPosition > 200) {
        this.headerVisible = false;
      } else {
        this.headerVisible = true;
      }
    } else {
      // On desktop, always keep main header visible, only manage navbar visibility
      this.headerVisible = true;
      
      // Hide/show navbar based on scroll position
      this.showNavbar = scrollPosition <= 100;
    }
    
    // Update last scroll position
    this.lastScrollPosition = scrollPosition;
  }
  
  @HostListener('window:resize')
  onWindowResize() {
    this.isMobile = window.innerWidth <= 960;
  }

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
      if (visible) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'auto';
      }
      console.log(visible);
      document.body.style.overflow = visible ? 'hidden' : 'auto';
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