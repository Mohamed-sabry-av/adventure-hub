import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlogSectionsComponent } from './blog-sections.component';

describe('BlogSectionsComponent', () => {
  let component: BlogSectionsComponent;
  let fixture: ComponentFixture<BlogSectionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlogSectionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BlogSectionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
