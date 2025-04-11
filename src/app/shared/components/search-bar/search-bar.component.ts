import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';
import { SearchBarService } from '../../services/search-bar.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-search-bar',
  imports: [CommonModule],
  templateUrl: './search-bar.component.html',
  styleUrls: ['./search-bar.component.css']
})
export class SearchBarComponent implements OnInit {
  searchTerm = new Subject<string>();
  products: any[] = [];
  loading = false;
  showResults = false;

  @ViewChild('searchInput') searchInput!: ElementRef;

  constructor(private searchService: SearchBarService) {}

  ngOnInit() {
    this.handleSearch();
  }

  handleSearch() {
    this.searchTerm
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term: string) => {
          this.loading = true;
          this.showResults = !!term;
          return term ? this.searchService.SearchProducts(term) : [];
        })
      )
      .subscribe(
        (results: any) => {
          this.products = results;
          this.loading = false;
        },
        (error) => {
          console.log('Error fetching products:', error);
          this.loading = false;
        }
      );
  }

  onSearch(event: any): void {
    const term = event.target.value.trim();
    this.searchTerm.next(term);
    if (!term) {
      this.showResults = false;
    }
  }

  onFocus(): void {
    if (this.products.length > 0 || this.searchInput.nativeElement.value) {
      this.showResults = true;
    }
  }

  onBlur(): void {
    setTimeout(() => {
      this.showResults = false;
    }, 200); // تأخير بسيط عشان لو المستخدم يضغط على نتيجة يتم التعامل معاها
  }

  selectProduct(product: any): void {
    console.log('Selected product:', product);
    this.showResults = false;
  }

  clearSearch(): void {
    this.searchTerm.next('');
    this.showResults = false;
    this.searchInput.nativeElement.value = '';
  }
}