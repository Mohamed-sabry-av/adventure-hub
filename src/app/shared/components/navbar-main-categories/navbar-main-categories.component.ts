import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, EventEmitter, HostListener, inject, Input, Output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Category } from '../../../interfaces/category.model';
import { NavbarService } from '../../services/navbar.service';
import { AsyncPipe } from '@angular/common';
import { DrawerModule } from 'primeng/drawer';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-navbar-main-categories',
  standalone: true,
  imports: [RouterLink, AsyncPipe, DrawerModule],
  templateUrl: './navbar-main-categories.component.html',
  styleUrl: './navbar-main-categories.component.css',
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateY(-20px)', opacity: '0' }),
        animate('300ms ease-in', style({ transform: 'translateY(0)', opacity: '1' })),
      ]),
      transition(':leave', [
        animate('300ms ease-out', style({ transform: 'translateY(-20px)', opacity: '0' })),
      ]),
    ]),
    trigger('visible', [
      transition(':enter', [
        style({ opacity: 0, height: '0px', overflow: 'hidden' }),
        animate('0.1s ease-out', style({ opacity: 1, height: '*' })),
      ]),
      transition(':leave', [
        animate('0.1s ease-in', style({ opacity: 0, height: '0px' })),
      ]),
    ]),
  ],
})
export class NavbarMainCategoriesComponent {
  @Input({ required: true }) categories: Category[] = [];
  @Input({ required: false }) allCategories: Category[] = [];
  @Output() select = new EventEmitter<number | null>();
  private navbarService = inject(NavbarService);

  expandedCategories = new Set<number>();
  sidenavIsVisible = signal<boolean>(false);
  showNavbar = signal<boolean>(true);
  isMobile = signal<boolean>(false);

  selectedCategoryId: number | null = null;

  // Define custom order for parent categories by IDs
  private customCategoryOrder = [62, 71, 67, 397,338,4238]; 

  drawerTop = computed(() => {
    return this.navbarService.headerHeight();
  });

  constructor() {
    effect(() => {
      this.showNavbar.set(this.navbarService.navBarIsVisible());
      this.sidenavIsVisible.set(this.navbarService.sideNavIsVisible());
      if (!this.navbarService.sideNavIsVisible()) {
        this.expandedCategories.clear();
      }
    });
  }

  ngOnInit() {
    this.checkIfMobile();
    // Sort categories based on custom order
    this.sortCategoriesByCustomOrder();
  }

  @HostListener('window:resize')
  checkIfMobile() {
    this.isMobile.set(window.innerWidth <= 960);
  }

  onSiwtchSideNav(visible: boolean) {
    this.navbarService.toggleSideNav(visible);
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

  private buildFullPath(category: Category, path: string[]): void {
    if (category.parent !== 0) {
      const parentCategory = this.allCategories.find((c) => c.id === category.parent);
      if (parentCategory) {
        this.buildFullPath(parentCategory, path);
      }
    }
    path.push(category.slug);
  }

  private sortCategoriesByCustomOrder(): void {
    this.categories = [...this.categories].sort((a, b) => {
      const indexA = this.customCategoryOrder.indexOf(a.id);
      const indexB = this.customCategoryOrder.indexOf(b.id);
      // If ID is not in custom order, push it to the end
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }
}