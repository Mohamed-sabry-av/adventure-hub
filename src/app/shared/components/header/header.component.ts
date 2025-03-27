// src/app/components/header/header.component.ts
import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, HostListener, inject, Input, OnInit } from '@angular/core';
import { CategoriesService } from '../../../core/services/categories.service';
import { NavbarComponent } from '../navbar/navbar.component';
import { Category } from '../../../interfaces/category.model';
import { MobileNavbarComponent } from '../navbar/Mobile-navbar/mobile-navbar.component';
import {
  animate,
  query,
  stagger,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { Carousel } from 'primeng/carousel';
import { ButtonModule } from 'primeng/button';
import { AppContainerComponent } from '../app-container/app-container.component';
import { NavbarContainerComponent } from '../navbar-container/navbar-container.component';
import { NavbarService } from '../../services/navbar.service';
import { RouterLink } from '@angular/router';
import { SearchBarComponent } from '../search-bar/search-bar.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    Carousel,
    ButtonModule,
    AppContainerComponent,
    NavbarContainerComponent,
    RouterLink,
    SearchBarComponent
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent implements OnInit {
  private navbarService = inject(NavbarService);
  private accountAuthService = inject(AccountAuthService);

  isAuth$: Observable<boolean> = this.accountAuthService.isLoggedIn$;

  onSiwtchSideNav(visible: boolean) {
    this.navbarService.siwtchSideNav(visible);
  }

  // -------------------------------------------------------------

  mainCategories: Category[] = [];
  allCategories: Category[] = [];

  constructor(private categoriesService: CategoriesService) {}

  ngOnInit() {
    this.fetchAllCategories();
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
