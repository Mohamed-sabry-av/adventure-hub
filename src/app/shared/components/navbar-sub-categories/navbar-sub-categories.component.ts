import { Component, DestroyRef, inject, Input } from '@angular/core';
import { Category } from '../../../interfaces/category.model';
import { filter, map, Observable } from 'rxjs';
import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { AsyncPipe, CommonModule, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-navbar-sub-categories',
  imports: [CommonModule,RouterLink],
  templateUrl: './navbar-sub-categories.component.html',
  styleUrl: './navbar-sub-categories.component.css',
  animations: [
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
export class NavbarSubCategoriesComponent {
  private destroyRef = inject(DestroyRef);

  @Input() allCategoriesData: Category[] = [];
  @Input({ required: true }) subCategories$!: Observable<any[]>;

  categoriesData: any[] = [];
  keepOpen: boolean = false;
  selectedCategoryId: number | null = null;

  ngOnInit() {
    const subscription = this.subCategories$
      .pipe(map((response: any) => response || []))
      .subscribe((data) => {
        if (data.length > 0) {
          this.categoriesData = data;
          this.keepOpen = true;
        } else {
          this.keepOpen = false;
        }
      });
    this.destroyRef.onDestroy(() => subscription.unsubscribe());
  }

  onLeave() {
    this.keepOpen = false;
    this.selectedCategoryId = null;
  }

  onEnter() {
    this.keepOpen = true;
  }

  getSubCategories(categoryId: number | null) {
    return this.allCategoriesData.filter((cat) => cat.parent === categoryId);
  }

  getCategoryRoute(category:Category):string[]{
    const pathSegments:string[] = ['category'];
    this.buildFullPath(category, pathSegments)
    return pathSegments
  }

  private buildFullPath(category: Category, path: string[]): void {
    if(category.parent !== 0){
      const parentCategory = this.allCategoriesData.find(c=> c.id=== category.parent)
      if(parentCategory){
        this.buildFullPath(parentCategory, path)
      }
    }
    path.push(category.slug)
  }
}
