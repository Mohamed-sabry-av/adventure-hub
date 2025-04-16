import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BrandLogosComponent } from './brand-logos.component';

describe('BrandLogosComponent', () => {
  let component: BrandLogosComponent;
  let fixture: ComponentFixture<BrandLogosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrandLogosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BrandLogosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
