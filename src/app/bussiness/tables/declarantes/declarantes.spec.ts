import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Declarantes } from './declarantes';

describe('Declarantes', () => {
  let component: Declarantes;
  let fixture: ComponentFixture<Declarantes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Declarantes],
    }).compileComponents();

    fixture = TestBed.createComponent(Declarantes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
