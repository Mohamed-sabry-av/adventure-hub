import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Category } from '../../../interfaces/category.model';
import { NavbarService } from '../../services/navbar.service';
import { Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { DrawerModule } from 'primeng/drawer';

@Component({
  selector: 'app-navbar-main-categories',
  imports: [RouterLink, AsyncPipe, DrawerModule],
  templateUrl: './navbar-main-categories.component.html',
  styleUrl: './navbar-main-categories.component.css',
})
export class NavbarMainCategoriesComponent {
  private navbarService = inject(NavbarService);

  sideNavIsVisible$: Observable<boolean> = this.navbarService.sideNavIsVisible$;

  hideSideNav() {
    this.navbarService.siwtchSideNav(false);
  }

  @Input({ required: true }) categories: Category[] = [];
  @Input({ required: false }) allCategories: Category[] = [];
  @Output() select = new EventEmitter<number | null>();

  selectedCategoryId: number | null = null;

  selectedCategory(id: number | null) {
    this.selectedCategoryId = id;
    this.select.emit(id);
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

  getSubCategories(categoryId: number): Category[] {
    return this.allCategories.filter((cat) => cat.parent === categoryId);
  }
}
