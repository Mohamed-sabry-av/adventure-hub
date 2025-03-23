import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardImageSliderComponent } from './card-image-slider.component';

describe('CardImageSliderComponent', () => {
  let component: CardImageSliderComponent;
  let fixture: ComponentFixture<CardImageSliderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardImageSliderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CardImageSliderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
