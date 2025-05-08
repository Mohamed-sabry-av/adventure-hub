import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Category } from '../../../interfaces/category.model';
import { NavbarMainCategoriesComponent } from '../navbar-main-categories/navbar-main-categories.component';
import { NavbarSubCategoriesComponent } from '../navbar-sub-categories/navbar-sub-categories.component';
import { BehaviorSubject, Observable, of } from 'rxjs';

@Component({
  selector: 'app-navbar-container',
  imports: [NavbarMainCategoriesComponent, NavbarSubCategoriesComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,

  templateUrl: './navbar-container.component.html',
  styleUrl: './navbar-container.component.css',
})
export class NavbarContainerComponent {
  @Input() mainCategories: Category[] = [];
  @Input() allCategories: Category[] = [];

  private subCategoriesSubject = new BehaviorSubject<Category[]>([]);
  filterdCategories$: Observable<Category[]> =
    this.subCategoriesSubject.asObservable();

  getSubCategories(categoryId: number | null) {
    const filteredCategories =
      categoryId !== null
        ? this.allCategories.filter((cat) => cat.parent === categoryId)
        : [];

    this.subCategoriesSubject.next(filteredCategories);
  }
}
