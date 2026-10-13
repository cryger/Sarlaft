import { TestBed } from '@angular/core/testing';
import { Declarantes } from './declarantes';

describe('Declarantes', () => {
  let service: Declarantes;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Declarantes);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
