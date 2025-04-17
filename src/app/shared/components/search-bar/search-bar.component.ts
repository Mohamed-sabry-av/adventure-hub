import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { debounceTime, distinctUntilChanged, Subject, switchMap, of } from 'rxjs';
import { SearchBarService } from '../../services/search-bar.service';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router'; // أضفت Router هنا

interface Category {
  id: number;
  name: string;
  count?: number;
  children?: Category[];
  parent?: number;
  expanded?: boolean;
  slug?:any;
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
    private router: Router // أضفت Router هنا
  ) {
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

  onBlur(): void {}

  selectProduct(product: any): void {
    console.log('Selected product:', product);
    this.saveToRecentSearches(this.searchInput.nativeElement.value);
    this.showResults = false;
    // التنقل لصفحة المنتج باستخدام Router
    this.router.navigate([`/product/${product.id}`]);
  }
  selectCategory(category: Category): void {
    console.log('Selected category:', category);
    
    // احفظ البحث الأخير
    this.saveToRecentSearches(this.searchInput.nativeElement.value);
    
    // أغلق نتائج البحث
    this.showResults = false;
    
    // احصل على مسار الـ slugs
    const slugs = this.getCategoryPath(category);
    
    // قم بتوليد المسار (مثل: main-category/sub-category/sub-sub-category)
    const path = slugs.join('/');
    
    // قم بالتنقل إلى المسار
    this.router.navigate([`/category/${path}`]);
  }


  getCategoryPath(category: Category): string[] {
    const slugs: string[] = [];
    let currentCategory: Category | undefined = category;
  
    // اجمع الـ slugs من الفئة الحالية إلى الفئة الجذر
    while (currentCategory) {
      slugs.unshift(currentCategory.slug); // أضف الـ slug في بداية المصفوفة
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