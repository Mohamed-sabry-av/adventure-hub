import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  HostListener,
  inject,
  Input,
  Output,
  ChangeDetectorRef,
  NgZone,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Category } from '../../../interfaces/category.model';
import { NavbarService } from '../../services/navbar.service';
import { Observable, Subject, takeUntil } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { DrawerModule } from 'primeng/drawer';
import { trigger, transition, style, animate } from '@angular/animations';
import { SwipeGestureDirective } from '../../directives/swipe-gesture.directive';

@Component({
  selector: 'app-navbar-main-categories',
  standalone: true,
  imports: [RouterLink, AsyncPipe, DrawerModule, SwipeGestureDirective],
  templateUrl: './navbar-main-categories.component.html',
  styleUrls: ['./navbar-main-categories.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(-100%)', opacity: 0 }),
        animate(
          '300ms ease-out',
          style({ transform: 'translateX(0)', opacity: 1 })
        ),
      ]),
      transition(':leave', [
        style({ transform: 'translateX(0)', opacity: 1 }),
        animate(
          '300ms ease-in',
          style({ transform: 'translateX(-100%)', opacity: 0 })
        ),
      ]),
    ]),
    trigger('visible', [
      transition(':enter', [
        style({ opacity: 0, height: '0px', overflow: 'hidden' }),
        animate('300ms ease-out', style({ opacity: 1, height: '*' })),
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0, height: '0px' })),
      ]),
    ]),
  ],
})
export class NavbarMainCategoriesComponent {
  private navbarService = inject(NavbarService);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);
  private destroy$ = new Subject<void>(); // For unsubscribing

  @Input({ required: true }) categories: Category[] = [];
  @Input({ required: false }) allCategories: Category[] = [];
  @Output() select = new EventEmitter<number | null>();

  selectedCategoryId: number | null = null;
  isMobile: boolean = false;
  sideNavIsVisible$: Observable<boolean> = this.navbarService.getSideNavIsVisible$();
  showNavbar$: Observable<boolean> = this.navbarService.getNavbarIsVisible$();
  headerHeight$: Observable<number> = this.navbarService.getHeaderHeight$();
  drawerTop: number = 88; // Default fallback

  ngOnInit() {
    this.checkIfMobile();
    // Subscribe to headerHeight$ with takeUntil
    this.headerHeight$
      .pipe(takeUntil(this.destroy$))
      .subscribe((height) => {
        console.log('headerHeight$ (NavbarMainCategories)', height); // Debug (remove after testing)
        this.drawerTop = height || 88; // Fallback to 88px
        this.cdr.markForCheck(); // Minimal UI update
      });

    // Subscribe to sideNavIsVisible$ for debugging
    this.sideNavIsVisible$
      .pipe(takeUntil(this.destroy$))
      .subscribe((visible) => {
        console.log('sideNavIsVisible$', visible); // Debug (remove after testing)
        this.cdr.markForCheck(); // Minimal UI update
      });

    // Cleanup on destroy
    this.destroyRef.onDestroy(() => {
      this.destroy$.next();
      this.destroy$.complete();
    });
  }

  @HostListener('window:resize')
  checkIfMobile() {
    this.isMobile = window.innerWidth <= 960;
    this.cdr.markForCheck();
  }

  getSubCategories(categoryId: number): Category[] {
    return this.allCategories.filter((cat) => cat.parent === categoryId);
  }

  selectedCategory(id: number | null) {
    this.selectedCategoryId = id;
    this.select.emit(id);
    if (id !== null && !this.isMobile) {
      setTimeout(() => {
        this.selectedCategoryId = null;
        this.cdr.markForCheck();
      }, 300);
    }
  }

  toggleCategory(categoryId: number): void {
    if (this.expandedCategories.has(categoryId)) {
      this.expandedCategories.delete(categoryId);
    } else {
      this.expandedCategories.add(categoryId);
    }
    this.cdr.markForCheck();
  }

  isCategoryExpanded(categoryId: number): boolean {
    return this.expandedCategories.has(categoryId);
  }

  getCategoryRoute(category: Category): string[] {
    const pathSegments: string[] = ['category'];
    this.buildFullPath(category, pathSegments);
    return pathSegments;
  }

  closeSideNav(): void {
    if (this.isMobile) {
      console.log('closeSideNav called'); // Debug (remove after testing)
      this.ngZone.run(() => {
        this.navbarService.siwtchSideNav(false);
        this.cdr.markForCheck();
      });
    }
  }

  private buildFullPath(category: Category, path: string[]): void {
    if (category.parent !== 0) {
      const parentCategory = this.allCategories.find(
        (c) => c.id === category.parent
      );
      if (parentCategory) {
        this.buildFullPath(parentCategory, path);
      }
    }
    path.push(category.slug);
  }

  expandedCategories = new Set<number>();
}