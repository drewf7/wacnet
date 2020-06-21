import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DefaultContainerComponent } from './containers/default-container/default-container.component';
import { HomeComponent } from './views/home/home.component';
import { TimeSeriesGraphComponent } from './components/time-series-graph/time-series-graph.component';
import { DatePickerComponent } from './components/date-picker/date-picker.component';
import { GraphComponent } from './views/graph/graph.component';
import { ReactiveFormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    AppComponent,
    DefaultContainerComponent,
    HomeComponent,
    TimeSeriesGraphComponent,
    DatePickerComponent,
    TimeSeriesGraphComponent,
    DatePickerComponent,
    GraphComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    HttpClientModule,
    BsDatepickerModule.forRoot(),
    ReactiveFormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
