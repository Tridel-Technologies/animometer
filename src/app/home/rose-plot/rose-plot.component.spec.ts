import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RosePlotComponent } from './rose-plot.component';

describe('RosePlotComponent', () => {
  let component: RosePlotComponent;
  let fixture: ComponentFixture<RosePlotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RosePlotComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RosePlotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
