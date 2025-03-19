import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SortMenuComponent } from './sort-menu.component';

describe('SortMenuComponent', () => {
  let component: SortMenuComponent;
  let fixture: ComponentFixture<SortMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SortMenuComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SortMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
