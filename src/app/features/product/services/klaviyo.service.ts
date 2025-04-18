import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.prod';

interface KlaviyoReview {
  id: string;
  attributes: {
    product: { url: string; name: string; image_url: string };
    author: string;
    content: string;
    rating: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class KlaviyoService {
  private apiUrl = 'https://a.klaviyo.com/api/reviews/';
  private apiKey = environment.klaviyoPrivateApiKey;

  constructor(private http: HttpClient) {}

  getProductReviews(productId: string): Observable<{ data: KlaviyoReview[] }> {
    const catalogId = `$shopify:::$default:::${productId}`; // Adjust based on your platform
    return this.http.get<{ data: KlaviyoReview[] }>(
      `${this.apiUrl}?filter=equals(item.id,"${catalogId}")&fields[review]=product,author,content,rating`,
      {
        headers: {
          Authorization: `Klaviyo-API-Key ${this.apiKey}`, // Correct format
          accept: 'application/json',
          revision: '2024-07-15', // Ensure correct API revision
        },
      }
    );
  }

  createReview(
    productId: string,
    review: { rating: number; comment: string; reviewer: string }
  ): Observable<any> {
    const catalogId = `$shopify:::$default:::${productId}`;
    const payload = {
      data: {
        type: 'event',
        attributes: {
          profile: { email: review.reviewer }, // Adjust based on your profile data
          metric: { name: 'SubmittedReview' },
          properties: {
            product_id: catalogId,
            rating: review.rating,
            comment: review.comment,
            reviewer: review.reviewer,
          },
          time: new Date().toISOString(),
        },
      },
    };
    return this.http.post('https://a.klaviyo.com/api/events/', payload, {
      headers: {
        Authorization: `Klaviyo-API-Key ${this.apiKey}`, // Correct format
        accept: 'application/json',
        revision: '2024-07-15',
      },
    });
  }
}