import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map, switchMap, of as observableOf, from, firstValueFrom } from 'rxjs';
import { Observable, of } from 'rxjs';
import { CategoriesService } from '../../../../core/services/categories.service';

interface BreadcrumbItem {
  label: string;
  url?: string[]; // Make url optional for product name
  id?: number;    // Optional category ID
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './breadcrumb.component.html',
  styleUrls: ['./breadcrumb.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreadcrumbComponent implements OnInit, OnChanges {
  @Input() productName: string | null = null;
  @Input() paths: any[] = [];
  @Input() specialPageType: string | null = null; // Add input for special pages like 'sale', 'brand', etc.
  @Input() specialPageName: string | null = null; // Add input for the name of the special page
  breadcrumbs$!: Observable<BreadcrumbItem[]>;
  currentCategoryId: number | null = null;
  @Output() categoryIdChange = new EventEmitter<number | null>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private categoriesService: CategoriesService
  ) {}

  ngOnInit(): void {
    this.initializeBreadcrumbs();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Re-initialize breadcrumbs if any of the inputs change
    if (changes['specialPageType'] || changes['specialPageName'] || changes['productName'] || changes['paths']) {
      this.initializeBreadcrumbs();
    }
  }

  private initializeBreadcrumbs(): void {
    this.breadcrumbs$ = this.route.params.pipe(
      switchMap((params) => {
        // First check if we're on a special page type (like sale or brand)
        if (this.specialPageType) {
          return this.buildSpecialPageBreadcrumbs();
        }
        
        // Check if we have categories from product data
        if (this.paths && this.paths.length > 0) {
          return this.buildProductCategoryBreadcrumbs(this.paths);
        }
        
        // Continue with existing category logic from URL params
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

  /**
   * Build breadcrumbs for a product page using product category info
   */
  private buildProductCategoryBreadcrumbs(categories: any[]): Observable<BreadcrumbItem[]> {
    if (!categories || categories.length === 0) {
      const breadcrumbItems: BreadcrumbItem[] = [{ label: 'Home', url: ['/'] }];
      if (this.productName) {
        breadcrumbItems.push({ label: this.productName });
      }
      return of(breadcrumbItems);
    }

    // Start with Home
    const breadcrumbItems: BreadcrumbItem[] = [{ label: 'Home', url: ['/'] }];

    // Find the most specific category (the one with the most levels in its hierarchy)
    // This will help us show the most detailed breadcrumb path
    return from(this.findMostSpecificCategory(categories)).pipe(
      map(categoryItems => {
        // Add all category items to breadcrumbs
        breadcrumbItems.push(...categoryItems);
        
        // Add product name if available
        if (this.productName) {
          breadcrumbItems.push({ label: this.productName });
        }
        
        // Set the current category ID
        if (categoryItems.length > 0) {
          this.currentCategoryId = categoryItems[categoryItems.length - 1].id || null;
        }
        
        return breadcrumbItems;
      })
    );
  }

  /**
   * Find the most specific category (with the deepest hierarchy) from a list of categories
   */
  private async findMostSpecificCategory(categories: any[]): Promise<BreadcrumbItem[]> {
    if (!categories || categories.length === 0) {
      return [];
    }

    let mostSpecificCategoryItems: BreadcrumbItem[] = [];
    let maxDepth = -1;

    // Check each category to find the one with the deepest hierarchy
    for (const category of categories) {
      try {
        const categoryItems = await this.buildCategoryHierarchy(category);
        
        if (categoryItems.length > maxDepth) {
          maxDepth = categoryItems.length;
          mostSpecificCategoryItems = categoryItems;
        }
      } catch (error) {
        console.error('Error processing category:', error);
      }
    }

    return mostSpecificCategoryItems;
  }

  /**
   * Build the complete category hierarchy for a category
   * Similar to calculateCategoryPath in CardDetailsComponent
   */
  private async buildCategoryHierarchy(category: any): Promise<BreadcrumbItem[]> {
    try {
      const items: BreadcrumbItem[] = [];
      
      // Get full category info first
      let currentCategory = await firstValueFrom(
        this.categoriesService.getCategoryBySlugDirect(category.slug)
      );
      
      if (!currentCategory) {
        // Fallback if we can't get full info
        return [{
          label: category.name,
          url: ['/category', category.slug],
          id: category.id
        }];
      }
      
      // Build items by traversing up the hierarchy
      const categoryChain: any[] = [];
      
      // Start with the current category
      categoryChain.push(currentCategory);
      
      // Add parent categories
      while (currentCategory && currentCategory.parent) {
        // Explicitly define the type for parentCategory
        const parentCategory: any = await firstValueFrom(
          this.categoriesService.getCategoryById(currentCategory.parent)
        );
        
        if (!parentCategory) break;
        
        categoryChain.unshift(parentCategory);
        currentCategory = parentCategory;
      }
      
      // Build breadcrumb items from the chain
      const slugChain: string[] = categoryChain.map(cat => cat.slug);
      
      // Now create breadcrumb items for each level of the hierarchy
      for (let i = 0; i < categoryChain.length; i++) {
        const cat = categoryChain[i];
        // For each category, include all parent slugs in the URL
        const urlPath = ['/category', ...slugChain.slice(0, i + 1)];
        
        items.push({
          label: cat.name,
          url: urlPath,
          id: cat.id
        });
      }
      
      return items;
    } catch (error) {
      console.error('Error building category hierarchy:', error);
      // Fallback to just the provided category
      return [{
        label: category.name,
        url: ['/category', category.slug],
        id: category.id
      }];
    }
  }

  private buildSpecialPageBreadcrumbs(): Observable<BreadcrumbItem[]> {
    const breadcrumbItems: BreadcrumbItem[] = [{ label: 'Home', url: ['/'] }];
    
    switch (this.specialPageType) {
      case 'sale':
        breadcrumbItems.push({ 
          label: this.specialPageName || 'Products on Sale',
          url: ['/sale']
        });
        break;
      case 'brand':
        breadcrumbItems.push({ 
          label: 'Brands',
          url: ['/brands']
        });
        if (this.specialPageName) {
          const currentUrl = this.router.url;
          const brandSlug = currentUrl.split('/').pop() || '';
          breadcrumbItems.push({ 
            label: this.specialPageName,
            url: ['/product/brand', brandSlug]
          });
        }
        break;
      case 'search':
        breadcrumbItems.push({ 
          label: this.specialPageName || 'Search Results',
          url: ['/search']
        });
        break;
      case 'new':
        breadcrumbItems.push({ 
          label: this.specialPageName || 'New Products',
          url: ['/new']
        });
        break;
      case 'featured':
        breadcrumbItems.push({ 
          label: this.specialPageName || 'Featured Products',
          url: ['/featured']
        });
        break;
      case 'popular':
        breadcrumbItems.push({ 
          label: this.specialPageName || 'Popular Products',
          url: ['/popular']
        });
        break;
      case 'bestsellers':
        breadcrumbItems.push({ 
          label: this.specialPageName || 'Best Selling Products',
          url: ['/bestsellers']
        });
        break;
      case 'clearance':
        breadcrumbItems.push({ 
          label: this.specialPageName || 'Clearance Items',
          url: ['/clearance']
        });
        break;
      case 'deals':
        breadcrumbItems.push({ 
          label: this.specialPageName || 'Special Deals',
          url: ['/deals']
        });
        break;
      default:
        // Handle any other special page types
        if (this.specialPageName) {
          breadcrumbItems.push({ 
            label: this.specialPageName,
            url: ['/']
          });
        }
    }
    
    // If there's a product name (for product detail pages)
    if (this.productName) {
      breadcrumbItems.push({ label: this.productName });
    }
    
    return of(breadcrumbItems);
  }

  private buildBreadcrumbs(slugs: string[]): Observable<BreadcrumbItem[]> {
    const breadcrumbItems: BreadcrumbItem[] = [{ label: 'Home', url: ['/'] }];

    return this.categoriesService.getAllCategories().pipe(
      map((allCategories) => {
        const validSlugs: string[] = [];
        let currentParentId = 0;

        for (const slug of slugs) {
          const category = allCategories.find(
            (cat) => cat.slug === slug && cat.parent === currentParentId
          );
          if (category) {
            validSlugs.push(category.slug);
            
            // For each category, build the URL path with all slugs up to this point
            const urlPath = ['/category', ...validSlugs];
            
            breadcrumbItems.push({
              label: category.name,
              url: urlPath,
              id: category.id
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
        
        // If there's a product name (for product detail pages)
        if (this.productName) {
          breadcrumbItems.push({ label: this.productName });
        }
        
        return breadcrumbItems;
      })
    );
  }
}