import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { CategoriesService } from '../../../core/services/categories.service';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { NavbarComponent } from '../navbar/navbar.component';

interface ParentCategory {
  id: number;
  name: string;
}

interface SubCategory {
  id: number;
  name: string;
  parentId: number;
}

interface SubSubCategory {
  id: number;
  name: string;
  parent: number;
}

@Component({
  selector: 'app-header',
  imports: [CommonModule, NgbDropdownModule, NavbarComponent],
  standalone: true,
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent implements OnInit {
  mainCategories: any[] = [];
  subCategories: { [key: number]: any[] } = {};

  constructor(private categoriesService: CategoriesService) {}

  ngOnInit(): void {
    this.fetchCategories();
  }
  // header.component.ts
  fetchCategories(): void {
    const mainCategoryIds = [397, 338, 71, 4238, 67, 62];
    mainCategoryIds.forEach((id) => {
      this.categoriesService.getCategoryById(id).subscribe({
        next: (category) => {
          this.mainCategories.push(category);

          // جلب التصنيفات الفرعية (Subcategories)
          this.categoriesService.getSubCategories(id).subscribe({
            next: (subs) => {
              this.subCategories[id] = subs; 

              // جلب التصنيفات الفرعية من المستوى الثالث (Sub-Subcategories)
              subs.forEach((sub) => {
                this.categoriesService.getSubSubCategories(sub.id).subscribe({
                  next: (subSubs) => {
                    this.subCategories[sub.id] = subSubs; // تخزين Sub-Subcategories
                  },
                  error: (err) =>
                    console.error(
                      `Error loading sub-subcategories for ${sub.id}:`,
                      err
                    ),
                });
              });
            },
            error: (err) => console.error('Error loading subcategories:', err),
          });
        },
        error: (err) => console.error('Error loading category:', err),
      });
    });
  }
}
