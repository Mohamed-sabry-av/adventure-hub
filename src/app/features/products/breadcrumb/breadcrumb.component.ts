import { CommonModule } from '@angular/common';
import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CategoriesService } from '../../../core/services/categories.service';
import { Category } from '../../../interfaces/category.model';
import { map, switchMap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

interface BreadcrumbItem {
  label: string;
  url: string[];
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './breadcrumb.component.html',
  styleUrls: ['./breadcrumb.component.css'],
})
export class BreadcrumbComponent implements OnInit {
  breadcrumbs$!: Observable<BreadcrumbItem[]>;
  currentCategoryId: number | null = null;
  @Output() categoryIdChange = new EventEmitter<number | null>();

  constructor(
    private route: ActivatedRoute,
    private categoriesService: CategoriesService
  ) {}

  ngOnInit(): void {
    this.breadcrumbs$ = this.route.params.pipe(
      switchMap((params) => {
        const slugs = Object.keys(params)
          .filter((key) => key.includes('CategorySlug'))
          .map((key) => params[key])
          .filter((s) => s);

        if (slugs.length === 0) {
          this.currentCategoryId = null;
          this.categoryIdChange.emit(null);
          return of([{ label: 'Home', url: ['/'] }]);
        }

        return this.buildBreadcrumbs(slugs);
      })
    );



    this.breadcrumbs$.subscribe((breadcrumbs) => {
      this.categoryIdChange.emit(this.currentCategoryId);
    });
  }

  private buildBreadcrumbs(slugs: string[]): Observable<BreadcrumbItem[]> {
    const breadcrumbItems: BreadcrumbItem[] = [{ label: 'Home', url: ['/'] }];

    return this.categoriesService.getAllCategories().pipe(
      map((allCategories) => {
        let pathSegments: string[] = [];
        let currentParentId = 0;

        for (const slug of slugs) {
          const category = allCategories.find(
            (cat) => cat.slug === slug && cat.parent === currentParentId
          );
          if (category) {
            pathSegments.push(category.slug);
            breadcrumbItems.push({
              label: category.name,
              url: ['/', ...pathSegments],
            });
            currentParentId = category.id;
            // console.log(`Breadcrumb step: ${category.name} (ID: ${category.id})`);
          } else {
            console.warn(`Category with slug "${slug}" not found or not a child of parent ${currentParentId}`);
            break;
          }
        }

        this.currentCategoryId = currentParentId;
        return breadcrumbItems;
      })
    );
  }
}