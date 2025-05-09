import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map, switchMap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { CategoriesService } from '../../../../core/services/categories.service';

interface BreadcrumbItem {
  label: string;
  url?: string[]; // Make url optional for product name
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './breadcrumb.component.html',
  styleUrls: ['./breadcrumb.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreadcrumbComponent implements OnInit {
  @Input() productName: string | null = null;
  @Input() paths: any[] = [];
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
          const breadcrumbItems: BreadcrumbItem[] = [{ label: 'Home', url: ['/'] }];
          if (this.productName) {
            breadcrumbItems.push({ label: this.productName });
          }
          return of(breadcrumbItems);
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
        let pathSegments: string[] = ['category'];
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
          } else {
            console.warn(
              `Category with slug "${slug}" not found or not a child of parent ${currentParentId}`
            );
            break;
          }
        }

        this.currentCategoryId = currentParentId;
        return breadcrumbItems;
      })
    );
  }
}