import { AfterViewInit, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-date-picker-component',
  templateUrl: './date-picker.component.html'
})
export class DatePickerComponent implements AfterViewInit, OnInit, OnChanges {
  @Input() dates: Date[];
  @Output() datesUpdated = new EventEmitter<Date[]>();

  private initialRange: Date[];
  public maxDate: Date;
  public dateForm: FormGroup;

  constructor(private formBuilder: FormBuilder) { }

  ngOnInit() {
    let fromDate: Date;
    let toDate: Date;

    if (this.dates && this.dates.length === 2) {
      fromDate = this.dates[0];
      toDate = this.dates[1];
    } else {
      fromDate = new Date();
      toDate = new Date();
      fromDate.setDate(toDate.getDate() - 1);
    }
    this.initialRange = [fromDate, toDate];
    this.maxDate = new Date();

    this.dateForm = this.formBuilder.group({
      dateRange: null
    });
  }

  ngAfterViewInit() {
    this.dateForm.setValue({dateRange: this.initialRange });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!changes.dates.firstChange) {
      this.dateForm.setValue({dateRange: this.dates });
    }
  }

  onSubmit() {
    // Update the fromDate to start of date, and toDate to end of day
    const dates = this.dateForm.get("dateRange").value;
    dates[0].setHours(0, 0, 0, 0);
    dates[1].setHours(23, 59, 59, 999);
    this.datesUpdated.emit(dates);
  }
}
