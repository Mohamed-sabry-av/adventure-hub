import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlogRelatedInfoComponent } from './blog-related-info.component';

describe('BlogRelatedInfoComponent', () => {
  let component: BlogRelatedInfoComponent;
  let fixture: ComponentFixture<BlogRelatedInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlogRelatedInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BlogRelatedInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
