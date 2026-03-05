import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShipSchedule } from './ship-schedule';

describe('ShipSchedule', () => {
  let component: ShipSchedule;
  let fixture: ComponentFixture<ShipSchedule>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShipSchedule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShipSchedule);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
