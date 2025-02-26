import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { CategoriesService } from '../../../core/services/categories.service';
import { NavbarComponent } from '../navbar/navbar.component';
import { Category } from '../../../interfaces/category.model';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, NgbDropdownModule, NavbarComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  // providers: [CategoriesService],
})
export class HeaderComponent implements OnInit {
  mainCategories: Category[] = [];
  allCategories: Category[] = [];

  constructor(private categoriesService: CategoriesService) {}

  ngOnInit(): void {
    this.fetchAllCategories();
  }

  /**
   * Fetches all categories and filters the main ones.
   */
  private fetchAllCategories(): void {
    this.categoriesService.getAllCategories(['default']).subscribe((categories) => {
      this.allCategories = categories; // كل الفئات
      this.mainCategories = categories.filter((cat) => cat.parent === 0); // الفئات الرئيسية فقط
    });
  }
}