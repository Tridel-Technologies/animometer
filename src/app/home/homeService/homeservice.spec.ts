import { TestBed } from '@angular/core/testing';

import { Homeservice } from './homeservice';

describe('Homeservice', () => {
  let service: Homeservice;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Homeservice);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
