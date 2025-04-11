import { Component, OnInit } from '@angular/core'; // أضفت OnInit
import { CommonModule } from '@angular/common';
import { PrivcyTermsService } from '../../service/privcy-terms.service';
import { DecodeHtmlPipe } from '../../../../shared/pipes/decode-html.pipe';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [CommonModule,DecodeHtmlPipe],
  template: `
    <div class="terms-container">
      @if (termsData) {
        <div>
        <h1>{{ termsData.title?.rendered | decodeHtml }}</h1>
        <div [innerHTML]="termsData.content?.rendered"></div>
        </div>
      } @else {
        <p>Loading terms...</p> <!-- شيلت ng-template وحطيت الـ p مباشرة -->
      }
    </div>
  `,
  styleUrls: ['./terms.component.css'],
})
export class TermsComponent implements OnInit { // أضفت OnInit
  termsData: any;

  constructor(private privcyTermsService: PrivcyTermsService) {}

  ngOnInit(): void {
    this.fetchTerms(); // استدعاء الـ API لما الـ component يتحمل
  }

  fetchTerms(): void {
    this.privcyTermsService.getTerms().subscribe({
      next: (data) => {
        this.termsData = data;
        console.log(this.termsData); // طباعة البيانات بعد الـ assignment
      },
      error: (error) => {
        console.error('Error fetching terms:', error); // استخدمت console.error للأخطاء
      },
    });
  }
}