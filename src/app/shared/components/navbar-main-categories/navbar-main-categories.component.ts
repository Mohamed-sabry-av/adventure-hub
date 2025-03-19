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
  @Output() select = new EventEmitter<number | null>();

  selectedCategoryId: number | null = null;

  selectedCategory(id: number | null) {
    this.select.emit(id);
  }
}
