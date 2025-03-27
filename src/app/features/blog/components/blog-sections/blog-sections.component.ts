import {
  Component,
  DestroyRef,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { BlogService } from '../../services/blog.service';
import { Observable } from 'rxjs';
import { AsyncPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PaginatorModule } from 'primeng/paginator';

@Component({
  selector: 'app-blog-sections',
  standalone: true,
  imports: [RouterLink, AsyncPipe, DatePipe, PaginatorModule],
  templateUrl: './blog-sections.component.html',
  styleUrls: ['./blog-sections.component.css'],
})
export class BlogSectionsComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private blogService = inject(BlogService);

  blogData$: Observable<any> = this.blogService.blogData$;

  first: number = 0;
  rows: number = 10;
  totalRecords: number = 0;
  currentPage: number = 1;

  ngOnInit() {
    this.loadPosts(this.currentPage);
    const subscribtion = this.blogData$.subscribe((posts) => {
      if (posts.length === this.rows) {
        this.totalRecords = this.currentPage * this.rows + 1;
      } else {
        this.totalRecords = (this.currentPage - 1) * this.rows + posts.length;
      }
    });

    this.destroyRef.onDestroy(() => subscribtion.unsubscribe());
  }

  loadPosts(page: number) {
    this.currentPage = page;
    this.blogService.getPosts(page, this.rows);
  }

  onPageChange(event: any) {
    this.first = event.first;
    this.rows = event.rows;
    this.currentPage = event.page + 1;
    this.loadPosts(this.currentPage);
  }
}
