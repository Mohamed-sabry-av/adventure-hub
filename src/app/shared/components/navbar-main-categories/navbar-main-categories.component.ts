import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  HostListener,
  inject,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Category } from '../../../interfaces/category.model';
import { NavbarService } from '../../services/navbar.service';
import { Observable } from 'rxjs';
import { AsyncPipe, NgClass } from '@angular/common';
import { DrawerModule } from 'primeng/drawer';
import { AppContainerComponent } from '../app-container/app-container.component';
import { StyleClass } from 'primeng/styleclass';
import { trigger, transition, style, animate } from '@angular/animations';
@Component({
  selector: 'app-navbar-main-categories',
  imports: [
    RouterLink,
    StyleClass,
    AsyncPipe,
    AppContainerComponent,
    DrawerModule,
    NgClass,
  ],
  templateUrl: './navbar-main-categories.component.html',
  styleUrl: './navbar-main-categories.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,

  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateY(-20px)', opacity: '0' }),
        animate(
          '300ms ease-in',
          style({ transform: 'translateY(0)', opacity: '1' })
        ),
      ]),
      transition(':leave', [
        animate(
          '300ms ease-out',
          style({ transform: 'translateY(-20px)', opacity: '0' })
        ),
      ]),
    ]),

    trigger('visible', [
      transition(':enter', [
        style({ opacity: 0, height: '0px', overflow: 'hidden' }),
        animate('0.3s ease-out', style({ opacity: 1, height: '*' })),
      ]),
      transition(':leave', [
        animate('0.3s ease-in', style({ opacity: 0, height: '0px' })),
      ]),
    ]),
  ],
})
export class NavbarMainCategoriesComponent {
  private navbarService = inject(NavbarService);
  @Input({ required: true }) categories: Category[] = [];
  @Input({ required: false }) allCategories: Category[] = [];
  @Output() select = new EventEmitter<number | null>();

  selectedCategoryId: number | null = null;
  isMobile: boolean = false;
  sideNavIsVisible$: Observable<boolean> = this.navbarService.sideNavIsVisible$;
  showNavbar$: Observable<boolean> = this.navbarService.navbarIsVisible$;
  drawerTop: number = 100;

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
