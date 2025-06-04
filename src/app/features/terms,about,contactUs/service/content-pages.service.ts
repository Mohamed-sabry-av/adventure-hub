import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, shareReplay } from 'rxjs';
import { DomSanitizer } from '@angular/platform-browser';
import { ApiService } from '../../../core/services/api.service';
import { environment } from '../../../../environments/environment';

export interface ParsedPageContent {
  title: string;
  excerpt: string;
  date: string;
  modified: string;
  sections: Array<{
    heading?: string;
    content: string;
    type: 'text' | 'image' | 'tabs' | 'list';
    imageUrl?: string;
    tabsData?: Array<{ title: string; content: string }>;
    listItems?: string[];
    position?: number; // For preserving original order
  }>;
  images: string[];
}

@Injectable({
  providedIn: 'root',
})
export class ContentPagesService {
  private readonly baseApiURL = `${environment.baseUrl}/wp-json/wp/v2/pages`; 
  
  // Page ID mapping for common pages
  private readonly pageIds = {
    aboutUs: 1004,
    terms: 3,
    cookies: 78519,
    returnPolicy: 78500,
    contactUs: 1132,
    // Add more page IDs as needed
  };

  // Cache for storing observables instead of just data
  private pageObservableCache = new Map<string, Observable<any>>();

  constructor(
    private apiService: ApiService,
    private sanitizer: DomSanitizer
  ) {}

  /**
   * Get About Us page content
   */
  getAboutUs(): Observable<any> {
    return this.getPageById(this.pageIds.aboutUs);
  }

  /**
   * Get Terms & Conditions page content
   */
  getTerms(): Observable<any> {
    return this.getPageById(this.pageIds.terms);
  }

  /**
   * Get Cookies Policy page content
   */
  getCookiesPolicy(): Observable<any> {
    return this.getPageById(this.pageIds.cookies);
  }

  /**
   * Get Return Policy page content
   */
  getReturnPolicy(): Observable<any> {
    return this.getPageById(this.pageIds.returnPolicy);
  }

  /**
   * Get Contact Us page content
   */
  getContactUs(): Observable<any> {
    return this.getPageById(this.pageIds.contactUs);
  }

  /**
   * Get any page by ID with error handling
   */
  getPageById(pageId: number): Observable<any> {
    // Create a cache key for this specific page
    const cacheKey = `page_${pageId}`;
    
    // Check if we have a cached observable for this page
    if (this.pageObservableCache.has(cacheKey)) {
      return this.pageObservableCache.get(cacheKey)!;
    }
    
    // If not in cache, create a new observable and cache it
    const pageObservable = this.apiService.getExternalRequest<any>(`${this.baseApiURL}/${pageId}`)
      .pipe(
        map(response => this.processPageData(response)),
        catchError(error => {
          console.error(`Error fetching page ID ${pageId}:`, error);
          return of(null);
        }),
        // Important: shareReplay(1) means the observable will replay its most recent emission
        // to any new subscriber, and it will only make the HTTP request once
        shareReplay(1)
      );
    
    // Store in cache
    this.pageObservableCache.set(cacheKey, pageObservable);
    
    return pageObservable;
  }

  /**
   * Process the page data to clean and prepare it
   */
  private processPageData(data: any): any {
    if (!data) return null;
    
    // Extract structured content
    data.parsedContent = this.parsePageContent(data);
    
    return data;
  }

  /**
   * Parse HTML content into structured format for better presentation
   */
  private parsePageContent(data: any): ParsedPageContent {
    const parser = new DOMParser();
    const content = data.content?.rendered || '';
    const doc = parser.parseFromString(content, 'text/html');
    
    // Extract all images from the content
    const allImages = Array.from(doc.querySelectorAll('img')).map(img => img.src);
    
    // Find all sections (usually divided by h2, h3 tags)
    const sections: any = [];
    const contentBody = doc.body;
    
    // Track element positions to maintain proper order
    let position = 0;
    
    // First, extract headings to use as section markers
    const headings = Array.from(contentBody.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    headings.forEach(heading => {
      const rect = heading.getBoundingClientRect();
      sections.push({
        type: 'text',
        heading: heading.textContent || '',
        content: '',
        position: position++,
        sourceElement: heading,
        yPosition: rect.top // For sorting
      });
    });
    
    // Extract paragraphs
    const paragraphs = Array.from(contentBody.querySelectorAll('p'));
    paragraphs.forEach(p => {
      // Skip empty paragraphs
      if (!p.textContent?.trim()) return;
      
      // If paragraph contains an image, extract it as image section
      const img = p.querySelector('img');
      if (img && img.src) {
        const rect = img.getBoundingClientRect();
        sections.push({
          type: 'image',
          content: img.alt || 'Page image',
          imageUrl: img.src,
          position: position++,
          sourceElement: img,
          yPosition: rect.top
        });
        
        // If paragraph has text besides the image, also add it as text section
        const textContent = p.textContent?.trim();
        if (textContent) {
          const rect = p.getBoundingClientRect();
          sections.push({
            type: 'text',
            content: textContent,
            position: position++,
            sourceElement: p,
            yPosition: rect.top
          });
        }
      } else {
        // Regular text paragraph
        const rect = p.getBoundingClientRect();
        sections.push({
          type: 'text',
          content: p.textContent || '',
          position: position++,
          sourceElement: p,
          yPosition: rect.top
        });
      }
    });
    
    // Extract tabs if present
    const tabsElements = Array.from(contentBody.querySelectorAll('.elementor-tabs'));
    tabsElements.forEach(tabsElement => {
      const tabTitles = Array.from(tabsElement.querySelectorAll('.elementor-tab-title'));
      const tabContents = Array.from(tabsElement.querySelectorAll('.elementor-tab-content'));
      
      if (tabTitles.length > 0 && tabContents.length > 0) {
        const tabsData = [];
        
        for (let i = 0; i < tabTitles.length; i++) {
          if (i < tabContents.length) {
            tabsData.push({
              title: tabTitles[i].textContent?.trim() || `Tab ${i+1}`,
              content: tabContents[i].textContent?.trim() || ''
            });
          }
        }
        
        const rect = tabsElement.getBoundingClientRect();
        sections.push({
          type: 'tabs',
          content: 'Tabs content',
          tabsData: tabsData,
          position: position++,
          sourceElement: tabsElement,
          yPosition: rect.top
        });
      }
    });
    
    // Extract lists
    const lists = Array.from(contentBody.querySelectorAll('ul, ol'));
    lists.forEach(list => {
      const items = Array.from(list.querySelectorAll('li')).map(item => item.textContent?.trim() || '');
      
      if (items.length > 0) {
        const rect = list.getBoundingClientRect();
        sections.push({
          type: 'list',
          content: 'List content',
          listItems: items,
          position: position++,
          sourceElement: list,
          yPosition: rect.top
        });
      }
    });
    
    // Sort sections by their position in the document (using Y position or original order)
    const sortedSections = [...sections]
      .sort((a, b) => {
        // If we have y positions, use those
        if (a.yPosition !== undefined && b.yPosition !== undefined) {
          return a.yPosition - b.yPosition;
        }
        // Fall back to the original position
        return a.position - b.position;
      })
      .map(section => {
        // Remove the temporary sorting properties
        const { sourceElement, yPosition, ...cleanSection } = section;
        return cleanSection;
      });
    
    return {
      title: data.title?.rendered || '',
      excerpt: data.excerpt?.rendered || '',
      date: data.date || '',
      modified: data.modified || '',
      sections: sortedSections,
      images: allImages
    };
  }
} 