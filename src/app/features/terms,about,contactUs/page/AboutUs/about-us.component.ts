import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrivcyTermsService } from '../../service/privcy-terms.service';
import { DecodeHtmlPipe } from '../../../../shared/pipes/decode-html.pipe';
import { AboutusService } from '../../service/aboutus.service';

@Component({
  selector: 'app-about-us',
  standalone: true,
  imports: [CommonModule, DecodeHtmlPipe],
  template: `
    <div class="about-us-container">
      @if (aboutUsData) {
        <div>
          <h1>{{ aboutUsData.title?.rendered | decodeHtml }}</h1>
          <div [innerHTML]="aboutUsData.content?.rendered"></div>
        </div>
      } @else {
        <p>Loading About Us...</p>
      }
    </div>
  `,
  styleUrls: ['./about-us.component.css'],
})
export class AboutUsComponent implements OnInit {
  aboutUsData: any;

  constructor(private AboutUsService: AboutusService) {}

  ngOnInit(): void {
    this.fetchAboutUs();
  }

  fetchAboutUs(): void {
    this.AboutUsService.getAboutUs().subscribe({
      next: (data) => {
        this.aboutUsData = data;
        console.log('About Us Data:', this.aboutUsData);
      },
      error: (error) => {
        console.error('Error fetching About Us:', error);
      },
    });
  }
}