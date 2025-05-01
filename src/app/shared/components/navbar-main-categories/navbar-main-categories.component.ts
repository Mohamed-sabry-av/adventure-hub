import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  HostListener,
  inject,
  Input,
  Output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Category } from '../../../interfaces/category.model';
import { NavbarService } from '../../services/navbar.service';
import { Observable } from 'rxjs';
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
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(-100%)', opacity: 0 }),
        animate(
          '300ms cubic-bezier(0.4, 0, 0.2, 1)',
          style({ transform: 'translateX(0)', opacity: 1 })
        ),
      ]),
      transition(':leave', [
        animate(
          '300ms cubic-bezier(0.4, 0, 0.2, 1)',
          style({ transform: 'translateX(-100%)', opacity: 0 })
        ),
      ]),
    ]),
    trigger('visible', [
      transition(':enter', [
        style({ opacity: 0, height: '0px', overflow: 'hidden' }),
        animate(
          '300ms cubic-bezier(0.4, 0, 0.2, 1)',
          style({ opacity: 1, height: '*' })
        ),
      ]),
      transition(':leave', [
        animate(
          '300ms cubic-bezier(0.4, 0, 0.2, 1)',
          style({ opacity: 0, height: '0px' })
        ),
      ]),
    ]),
  ],
})
export class NavbarMainCategoriesComponent {
  private navbarService = inject(NavbarService);
  private destroyRef = inject(DestroyRef);
  @Input({ required: true }) categories: Category[] = [];
  @Input({ required: false }) allCategories: Category[] = [];
  @Output() select = new EventEmitter<number | null>();

  selectedCategoryId: number | null = null;
  isMobile: boolean = false;
  sideNavIsVisible$: Observable<boolean> =
    this.navbarService.getSideNavIsVisible$();
  showNavbar$: Observable<boolean> = this.navbarService.getNavbarIsVisible$();
  headerHeight$: Observable<any> = this.navbarService.getHeaderHeight$();
  drawerTop: any = 88;

  ngOnInit() {
    this.checkIfMobile();
    const subscription = this.headerHeight$.subscribe((height) => {
      this.drawerTop = height || 88;
    });
    this.destroyRef.onDestroy(() => subscription.unsubscribe());
  }

  @HostListener('window:resize')
  checkIfMobile() {
    this.isMobile = window.innerWidth <= 960;
  }

  getSubCategories(categoryId: number): Category[] {
    return this.allCategories.filter((cat) => cat.parent === categoryId);
  }

  selectedCategory(id: number | null) {
    this.selectedCategoryId = id;
    this.select.emit(id);
  }

  toggleCategory(categoryId: number): void {
    if (this.expandedCategories.has(categoryId)) {
      this.expandedCategories.delete(categoryId);
    } else {
      this.expandedCategories.add(categoryId);
    }
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
    // Close the sidenav when a category is clicked
    if (this.isMobile) {
      setTimeout(() => {
        this.navbarService.siwtchSideNav(false);
      }, 100); // Short delay to allow the click to complete first
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
