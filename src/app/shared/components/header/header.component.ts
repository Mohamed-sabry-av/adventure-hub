// src/app/components/header/header.component.ts
import { CommonModule } from '@angular/common';
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

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    NavbarComponent,
    MobileNavbarComponent,
    Carousel,
    ButtonModule,
    AppContainerComponent,
    NavbarContainerComponent,
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent implements OnInit {
  private navbarService = inject(NavbarService);

  announcements: string[] = [
    '<strong>Free Delivery</strong> for orders over AED 500',
    'Buy Now & Pay Later with <strong>Tabby</strong>',
  ];

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
