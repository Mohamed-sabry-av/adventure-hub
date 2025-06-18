import { Injectable } from '@angular/core';
import axios from 'axios';

@Injectable({
  providedIn: 'root',
})
export class SlugResolverService {
  private apiBase = 'YOUR_WORDPRESS_API_URL'; // Replace with your actual WordPress API URL
  
  async resolveContentType(slug: string): Promise<string> {
    try {
      const response = await axios.get(`${this.apiBase}/api/v1/content-type/${slug}`);
      return response.data.type;
    } catch (error) {
      console.error('Error resolving content type:', error);
      return 'not_found';
    }
  }
} 