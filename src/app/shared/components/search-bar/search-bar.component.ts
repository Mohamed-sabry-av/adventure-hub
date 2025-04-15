import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { debounceTime, distinctUntilChanged, Subject, switchMap, of } from 'rxjs';
import { SearchBarService } from '../../services/search-bar.service';
import { CommonModule } from '@angular/common';

interface Category {
  id: number;
  name: string;
  count?: number;
  children?: Category[];
  parent?: number;
  expanded?: boolean;
}

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './search-bar.component.html',
  styleUrls: ['./search-bar.component.css']
})
export class SearchBarComponent implements OnInit {
  searchTerm = new Subject<string>();
  products: any[] = [];
  categories: Category[] = [];
  processedCategories: Category[] = [];
  loading = false;
  showResults = false;
  activeTab: 'products' | 'categories' = 'products';
  recentSearches: string[] = [];

  @ViewChild('searchInput') searchInput!: ElementRef;
  @ViewChild('resultsContainer') resultsContainer!: ElementRef;

  constructor(private searchService: SearchBarService) {
    // Load recent searches from local storage
    const savedSearches = localStorage.getItem('recentSearches');
    if (savedSearches) {
      this.recentSearches = JSON.parse(savedSearches).slice(0, 5);
    }
  }

  ngOnInit() {
    this.handleSearch();
  }

  handleSearch() {
    this.searchTerm
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term: string) => {
          if (!term.trim()) {
            return of({ products: [], categories: [] });
          }
          
          this.loading = true;
          this.showResults = true;
          return this.searchService.ComprehensiveSearch(term);
        })
      )
      .subscribe(
        (results: any) => {
          this.products = results.products || [];
          this.categories = results.categories || [];
          
          // Process categories to create a hierarchy
          this.processCategories();
          
          this.loading = false;
          
          // Set active tab based on results
          if (this.products.length > 0 && this.categories.length === 0) {
            this.activeTab = 'products';
          } else if (this.products.length === 0 && this.categories.length > 0) {
            this.activeTab = 'categories';
          }
          // Otherwise, keep current tab selected
        },
        (error) => {
          console.error('Error fetching search results:', error);
          this.loading = false;
        }
      );
  }

  // Process categories to create a proper hierarchy
  processCategories() {
    // Create a map for faster lookup
    const categoryMap = new Map<number, Category>();
    this.categories.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, children: [], expanded: false });
    });
    
    // Root categories (no parent or parent not in our results)
    this.processedCategories = [];
    
    // Organize into hierarchy
    this.categories.forEach(cat => {
      const category = categoryMap.get(cat.id);
      if (category) {
        if (!cat.parent || !categoryMap.has(cat.parent)) {
          // This is a root category
          this.processedCategories.push(category);
        } else {
          // This is a child category, add to parent
          const parent = categoryMap.get(cat.parent);
          if (parent && parent.children) {
            parent.children.push(category);
          }
        }
      }
    });
  }

  // Toggle category expansion
  toggleCategory(category: Category, event: Event) {
    event.stopPropagation(); // Prevent category selection
    category.expanded = !category.expanded;
  }

  // Check if a category has children
  hasChildren(category: Category): boolean {
    return !!(category.children && category.children.length > 0);
  }

  onSearch(event: any): void {
    const term = event.target.value.trim();
    this.searchTerm.next(term);
    if (!term) {
      this.showResults = false;
      this.products = [];
      this.categories = [];
    }
  }

  onFocus(): void {
    const term = this.searchInput.nativeElement.value.trim();
    if (term || this.recentSearches.length > 0) {
      this.showResults = true;
    }
  }

  onBlur(): void {
    // We'll handle this with the overlay click instead
    // to prevent issues when clicking on results
  }

  selectProduct(product: any): void {
    console.log('Selected product:', product);
    // Save search term to recent searches
    this.saveToRecentSearches(this.searchInput.nativeElement.value);
    this.showResults = false;
    // Here you would typically navigate to product page
  }

  selectCategory(category: any): void {
    console.log('Selected category:', category);
    // Save search term to recent searches
    this.saveToRecentSearches(this.searchInput.nativeElement.value);
    this.showResults = false;
    // Here you would typically navigate to category page
  }

  clearSearch(): void {
    this.searchInput.nativeElement.value = '';
    this.searchTerm.next('');
    this.showResults = false;
    this.products = [];
    this.categories = [];
    this.processedCategories = [];
  }

  saveToRecentSearches(term: string): void {
    if (term && !this.recentSearches.includes(term)) {
      this.recentSearches.unshift(term);
      this.recentSearches = this.recentSearches.slice(0, 5); // Keep only 5 most recent
      localStorage.setItem('recentSearches', JSON.stringify(this.recentSearches));
    }
  }

  selectRecentSearch(term: string): void {
    this.searchInput.nativeElement.value = term;
    this.searchTerm.next(term);
  }

  clearRecentSearches(): void {
    this.recentSearches = [];
    localStorage.removeItem('recentSearches');
  }

  switchTab(tab: 'products' | 'categories'): void {
    this.activeTab = tab;
  }

  // Format price with original price strikethrough if on sale
  formatPrice(product: any): string {
    if (product.onSale) {
      return `<span class="line-through text-gray-400 mr-2">${product.regular_price}</span> ${product.sale_price}`;
    }
    return product.price;
  }

  // Close search results when clicking outside
  closeSearchResults(): void {
    this.showResults = false;
  }

  // Prevent closing when clicking inside the results container
  preventClose(event: Event): void {
    event.stopPropagation();
  }
}