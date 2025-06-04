import {
  ChangeDetectionStrategy,
  Component,
  Input,
} from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Category } from '../../../interfaces/category.model';
import { NavbarMainCategoriesComponent } from '../navbar-main-categories/navbar-main-categories.component';
import { NavbarSubCategoriesComponent } from '../navbar-sub-categories/navbar-sub-categories.component';

@Component({
  selector: 'app-navbar-container',
  imports: [
    NavbarMainCategoriesComponent, 
    NavbarSubCategoriesComponent
  ],
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
  private selectedCategoryId: number | null = null;

  getSubCategories(categoryId: number | null) {
    this.selectedCategoryId = categoryId;
    const filteredCategories =
      categoryId !== null
        ? this.allCategories.filter((cat) => cat.parent === categoryId)
        : [];
    this.subCategoriesSubject.next(filteredCategories);
  }

  onMouseEnter() {
    // لما الماوس يدخل الـ container، حافظ على الـ menu مفتوح
    if (this.selectedCategoryId !== null) {
      this.getSubCategories(this.selectedCategoryId);
    }
  }

  onMouseLeave() {
    // لما الماوس يخرج من الـ container، أغلق الـ menu
    this.getSubCategories(null);
  }
}