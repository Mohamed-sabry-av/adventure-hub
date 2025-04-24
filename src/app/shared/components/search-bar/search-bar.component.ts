import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { debounceTime, distinctUntilChanged, Subject, switchMap, of } from 'rxjs';
import { SearchBarService } from '../../services/search-bar.service';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';

interface Category {
  id: number;
  name: string;
  count?: number;
  children?: Category[];
  parent?: number;
  expanded?: boolean;
  slug?: any;
}

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [CommonModule, RouterLink],
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

  constructor(
    private searchService: SearchBarService,
    private router: Router
  ) {
    const savedSearches = localStorage.getItem('recentSearches');
    if (savedSearches) {
      this.recentSearches = JSON.parse(savedSearches).slice(0, 5);
    }
  }

  ngOnInit() {
    this.handleSearch();
  }

  // Handle Enter key press for search
  @HostListener('keydown.enter')
  onKeydownEnter(): void {
    const term = this.searchInput.nativeElement.value.trim();
    if (term) {
      this.saveToRecentSearches(term);
      this.showResults = false;
      this.navigateToSearchResults(term);
    }
  }

  // Handle form submission
  onEnterKey(event: Event): void {
    const term = this.searchInput.nativeElement.value.trim();
    if (term) {
      this.saveToRecentSearches(term);
      this.showResults = false;
      this.navigateToSearchResults(term);
    }
  }

  // Navigate to search results page
  navigateToSearchResults(query: string): void {
    if (!query.trim()) return;

    this.showResults = false;
    this.saveToRecentSearches(query);

    this.router.navigate(['/product/search'], {
      queryParams: { query: query }
    });
  }

  // دالة جديدة لاختيار صورة صغيرة
  getThumbnail(product: any): string {
    if (product.images && product.images.length > 0) {
      const image = product.images[0];
      // استخدام الصورة الصغيرة (thumbnail أو صورة من srcset)
      if (image.thumbnail) {
        return image.thumbnail; // مثل 150x150
      }
      // الرجوع إلى صورة صغيرة من srcset إذا كانت موجودة
      const srcset = image.srcset?.split(',').map((src: string) => src.trim().split(' ')[0]);
      const smallImage = srcset?.find((src: string) => src.includes('100x100') || src.includes('150x150'));
      return smallImage || image.src; // الرجوع إلى src إذا لم يكن هناك صورة صغيرة
    }
    return ''; // صورة افتراضية إذا لم تكن هناك صور
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
          this.processCategories();
          this.loading = false;
          if (this.products.length > 0 && this.categories.length === 0) {
            this.activeTab = 'products';
          } else if (this.products.length === 0 && this.categories.length > 0) {
            this.activeTab = 'categories';
          }
        },
        (error) => {
          console.error('Error fetching search results:', error);
          this.loading = false;
        }
      );
  }

  processCategories() {
    const categoryMap = new Map<number, Category>();
    this.categories.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, children: [], expanded: false });
    });

    this.processedCategories = [];

    this.categories.forEach(cat => {
      const category = categoryMap.get(cat.id);
      if (category) {
        if (!cat.parent || !categoryMap.has(cat.parent)) {
          this.processedCategories.push(category);
        } else {
          const parent = categoryMap.get(cat.parent);
          if (parent && parent.children) {
            parent.children.push(category);
          }
        }
      }
    });
  }

  toggleCategory(category: Category, event: Event) {
    event.stopPropagation();
    category.expanded = !category.expanded;
  }

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

  selectProduct(product: any): void {
    this.saveToRecentSearches(this.searchInput.nativeElement.value);
    this.showResults = false;
    this.router.navigate([`/product/${product.id}`]);
  }

  selectCategory(category: Category): void {
    this.saveToRecentSearches(this.searchInput.nativeElement.value);
    this.showResults = false;
    const slugs = this.getCategoryPath(category);
    const path = slugs.join('/');
    this.router.navigate([`/category/${path}`]);
  }

  getCategoryPath(category: Category): string[] {
    const slugs: string[] = [];
    let currentCategory: Category | undefined = category;
    while (currentCategory) {
      slugs.unshift(currentCategory.slug);
      if (currentCategory.parent) {
        currentCategory = this.categories.find(cat => cat.id === currentCategory!.parent);
      } else {
        currentCategory = undefined;
      }
    }
    return slugs;
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
      this.recentSearches = this.recentSearches.slice(0, 5);
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

  formatPrice(product: any): string {
    if (product.onSale) {
      return `<span class="line-through text-gray-400 mr-2">${product.regular_price}</span> ${product.sale_price}`;
    }
    return product.price;
  }

  closeSearchResults(): void {
    this.showResults = false;
  }

  preventClose(event: Event): void {
    event.stopPropagation();
  }
}
