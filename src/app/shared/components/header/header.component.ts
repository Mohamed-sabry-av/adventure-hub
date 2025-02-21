import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { CategoriesService } from '../../../core/services/categories.service';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { NavbarComponent } from '../navbar/navbar.component';
import { forkJoin, mergeMap, map, Observable, merge, of } from 'rxjs';
import { Category } from '../../../interfaces/category.model';
// interface ParentCategory {
//   id: number;
//   name: string;
// }

// interface SubCategory {
//   id: number;
//   name: string;
//   parentId: number;
// }

// interface SubSubCategory {
//   id: number;
//   name: string;
//   parent: number;
// }
// interface Category {
//   id: number;
//   name: string;
//   slug: string;
//   parent: number;
// }

@Component({
  selector: 'app-header',
  imports: [CommonModule, NgbDropdownModule, NavbarComponent],
  standalone: true,
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
  providers: [CategoriesService],
})
export class HeaderComponent implements OnInit {
  mainCategories: any[] = [];
  subCategories: { [key: number]: any[] } = {};
  allCategories: Category[] = [];

  constructor(private categoriesService: CategoriesService) {}

  ngOnInit(): void {
    this.fetchMainCategories().subscribe({
      next:(category)=>{
        this.mainCategories.push(category);
        this.allCategories.push(category);
      }
    });
  }
  // We Bring the Main Categories First!
  private fetchMainCategories(): Observable<Category> {
    const mainCategoryIds = [397, 338, 71, 4238, 67, 62];
    const categoryObservables = mainCategoryIds.map((id) =>
      this.categoriesService.getCategoryById(id)
    );
    return merge(...categoryObservables);
  }

  // then we bring the sub categories for each main category
   fetchSubCategories(categoryId: number): Observable<Category[]> {
    if (!this.subCategories[categoryId]) {
      return this.categoriesService.getSubCategories(categoryId).pipe(
        mergeMap((subCategories) => {
          const subSubObservables = subCategories.map((sub) =>
            this.fetchSubCategories(sub.id).pipe(
              map((subSubs) => ({ ...sub, subSubs }))
            )
          );
          return merge(...subSubObservables);
        }),

        map((subCategory) => {
          if (!this.subCategories[categoryId]) {
            this.subCategories[categoryId] = [];
          }
          this.subCategories[categoryId].push(subCategory);
          this.subCategories[subCategory.id] = subCategory.subSubs;
          this.allCategories.push(subCategory, ...subCategory.subSubs);
          return this.subCategories[categoryId];
        })
      );
    }
    return of(this.subCategories[categoryId]);
  }

  private fetchSubSubCategories(parentId: number): Observable<Category[]> {
    return this.categoriesService.getSubSubCategories(parentId);
  }

  
}
