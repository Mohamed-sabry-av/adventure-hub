import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BlogSectionPageComponent } from './blog-section-page.component';
describe('BlogSectionPageComponent', () => {
  let component: BlogSectionPageComponent;
  let fixture: ComponentFixture<BlogSectionPageComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlogSectionPageComponent]
    })
    .compileComponents();
    fixture = TestBed.createComponent(BlogSectionPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

