import { ChangeDetectionStrategy, Component, OnInit, inject, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HomeService } from '../../service/home.service';
import { forkJoin, of, throwError, timer } from 'rxjs';
import { catchError, finalize, map, take, timeout, mergeMap } from 'rxjs/operators';

interface CategoryImage {
  category_id: number;
  category_name: string;
  image_url: string;
  slug?: string; // Add slug from API
}

interface Category {
  id: number;
  name: string;
  slug: string;
  count: number;
  image?: {
    src?: string;
    url?: string;
  };
  display_name?: string;
}

@Component({
  selector: 'app-related-categories',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './related-categories.component.html',
  styleUrls: ['./related-categories.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RelatedCategoriesComponent implements OnInit {
  categories: Category[] = [];
  categoryImages: CategoryImage[] = [];
  loading: boolean = true;
  error: string | null = null;
  
  // Top categories that should be loaded eagerly (first 3 categories)
  private topCategoryIds: number[] = [];

  // Category types we're looking for (to match with API data)
  private categoryTypes: string[] = [
    'water-sports', 
    'diving', 
    'hiking', 
    'camping', 
    'cycling', 
    'biking'
  ];

  private homeService = inject(HomeService);
  private cdr = inject(ChangeDetectorRef);
  private platformId = inject(PLATFORM_ID);

  ngOnInit(): void {
    this.loadCategories();
  }
  
  /**
   * Check if a category is one of the top categories that should be loaded eagerly
   */
  isTopCategory(category: Category): boolean {
    return this.topCategoryIds.includes(category.id);
  }
  
  /**
   * Get the appropriate image URL for a category
   */
  getImageUrl(category: Category): string {
    return category.image?.src || category.image?.url || '';
  }
  
  /**
   * Get the srcset attribute for responsive images
   */
  getImageSrcSet(category: Category): string {
    // Only use srcset if the API provides it
    return '';
  }

  loadCategories(): void {
    this.loading = true;
    
    // Set a timeout to stop showing loading state after 3 seconds even if API is slow
    timer(3000).subscribe(() => {
      if (this.loading) {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
    
    // Fetch both categories and custom category images simultaneously
    forkJoin({
      categories: this.homeService.getCategories(0, 50).pipe( // Get more categories to ensure we find all needed types
        timeout(5000), // Set 5-second timeout
        take(1),
        catchError(err => {
          
          return of([]);
        })
      ),
      categoryImages: this.homeService.getCategoryImages().pipe(
        timeout(5000), // Set 5-second timeout
        take(1),
        catchError(err => {
          
          return of([]);
        })
      )
    }).pipe(
      finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (result) => {
        this.categoryImages = result.categoryImages || [];
        
        // Start with empty categories array
        this.categories = [];
        
        // Only use categories directly from the API
        if (result.categories && Array.isArray(result.categories) && result.categories.length > 0) {
          // Filter categories that match our preferred types, if possible
          const matchingCategories = this.categoryTypes.reduce((matches, type) => {
            const match = result.categories.find(
              (cat: Category) => cat.slug === type || 
              cat.slug.includes(type) ||
              cat.name.toLowerCase().includes(type.replace('-', ' '))
            );
            
            if (match && !matches.some(c => c.id === match.id)) {
              matches.push(match);
            }
            
            return matches;
          }, [] as Category[]);
          
          // Add matching categories first
          this.categories = [...matchingCategories];
          
          // If we don't have enough, add other categories from API up to 6 total
          if (this.categories.length < 6) {
            const remainingNeeded = 6 - this.categories.length;
            const otherCategories = result.categories.filter(
              (cat: Category) => !this.categories.some(c => c.id === cat.id)
            ).slice(0, remainingNeeded);
            
            this.categories = [...this.categories, ...otherCategories];
          }
        }
        
        // Ensure we only have 6 categories and all have valid API-provided slugs
        this.categories = this.categories.slice(0, 6).filter(cat => !!cat.slug);
        
        // Map images from API to our categories
        if (this.categoryImages.length > 0) {
          this.categories = this.mapCategoryImages(this.categories);
        }
        
        // First 3 categories are considered "top" and should be loaded eagerly
        this.topCategoryIds = this.categories.slice(0, 3).map(c => c.id);
        
        // Update the view
        this.cdr.markForCheck();
      },
      error: (err) => {
        
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Map custom images to categories
   */
  private mapCategoryImages(categories: Category[]): Category[] {
    if (!this.categoryImages || this.categoryImages.length === 0) {
      return categories;
    }

    return categories.map(category => {
      // Try to find a matching custom image by category name (case-insensitive)
      const customImage = this.categoryImages.find(img => 
        (img.slug && img.slug === category.slug) || // Only use exact slug matches
        img.category_id === category.id || // Match by ID 
        img.category_name.toLowerCase() === category.name.toLowerCase() // Match by exact name
      );
      
      if (customImage && customImage.image_url) {
        // Keep the original category slug - don't update with custom slug
        return {
          ...category,
          image: {
            src: customImage.image_url,
            url: customImage.image_url
          }
        };
      }
      
      // If no matching image, return the category without an image
      return category;
    });
  }
}
