import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from "@angular/router";

import { APIService } from '../../services/api.service';

import { QuickZoomButton, TimeSeriesGraphComponent, TimeSeriesGraphDataset } from '../../components/time-series-graph/time-series-graph.component';
import { ITimeSeriesGraphConfiguration, SeriesConfiguration } from '../../components/time-series-graph/time-series-graph.models';

@Component({
  selector: 'app-graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.scss']
})
export class GraphComponent implements OnInit {
  @ViewChild('stationGraph', {static: false}) timeSeriesGraph !: TimeSeriesGraphComponent;

  loadingGraphData = false;
  timeSeriesButtons: QuickZoomButton[];
  timeSeriesGraphData: TimeSeriesGraphDataset;
  cachedQuickZoomData: Map<number, TimeSeriesGraphDataset>;

  title = "Station Data";

  siteId: string;

  constructor(private api: APIService, private route:ActivatedRoute) {
      this.timeSeriesButtons = [];
      this.cachedQuickZoomData = new Map<number, TimeSeriesGraphDataset>();
     }

  ngOnInit(): void {
    this.siteId = this.route.snapshot.paramMap.get('siteId');
    this.getStationName();
    this.setupGraph();
  }

  getStationName() {
    this.api.getSiteById(this.siteId).subscribe(
      results => {
        this.title = `${results[0]['stationName']} Data`
      }
    )
  }

  /**
   * Sets up the graph's quick zoom buttons and initial data.
   * @todo Currently The graph tab needs to be first because graph axis will not load properly if they are not
   * The focus of the browser window while loading. Why? Great question.
   */
  setupGraph() {
    this.buildGraphQuickZoomButtons();
    this.getLastDay();
  }

  // Initializes the graph with one day of data.
  getLastDay() {
    this.loadingGraphData = true;
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (24 * 3600 * 1000)) // 24 hours ago in ms
    this.api.getDataByTime(startDate.toISOString(), endDate.toISOString(), this.siteId)
    .subscribe(
      results => {
        this.timeSeriesGraphData = this.convertToTimeSeriesFormat(results);
        this.loadingGraphData = false;
      },
      error => {
        console.log(error);
        this.loadingGraphData = false;
      }
    )
  }

  /**
   * Build the graph quick zoom buttons, with values in milliseconds.
   */
  buildGraphQuickZoomButtons() {
    this.timeSeriesButtons.push({ text: "1 hr", value: 60 * 60 * 1000 });
    this.timeSeriesButtons.push({ text: "12 hrs", value: 12 * 60 * 60 * 1000 });
    this.timeSeriesButtons.push({ text: "3 days", value: 3 * 24 * 60 * 60 * 1000 });
    this.timeSeriesButtons.push({ text: "7 days", value: 7 * 24 * 60 * 60 * 1000 });
  }

  /**
   * Handler for when dates are selected.
   * @param dates To and from dates
   */
  onDatesSelected(dates: Date[]) {
    if (!this.loadingGraphData) {
      this.loadingGraphData = true;
      this.api.getDataByTime(dates[0].toISOString(), dates[1].toISOString(), this.siteId)
      .subscribe(response => {
        this.timeSeriesGraphData = this.convertToTimeSeriesFormat(response);
        this.loadingGraphData = false;
      });
    }
  }

  /**
   * Handler for when a quick zoom button is selected.
   * Fetches data based on the selected time.
   * @param zoomAmount Amount of time in milliseconds
   */
  onQuickZoom(zoomAmount: number) {
    // Get the start date determined by the zoom amount
    const startDate = new Date();
    startDate.setTime(startDate.getTime() - zoomAmount);

    // If cached data exists and the graph's latest timestamp is after the start date, use the cached data
    if (this.cachedQuickZoomData.has(zoomAmount) && this.timeSeriesGraph.lastUpdated > startDate) {
      this.timeSeriesGraphData = this.cachedQuickZoomData.get(zoomAmount);
      return;
    }

    if (!this.loadingGraphData) {
      this.loadingGraphData = true;
      this.api.getDataByTime(startDate.toISOString(), new Date().toISOString(), this.siteId).subscribe(response => {
        this.timeSeriesGraphData = this.convertToTimeSeriesFormat(response);
        this.cachedQuickZoomData.set(zoomAmount, this.timeSeriesGraphData);
        this.loadingGraphData = false;
      });
    }
  }

  /**
   * Handler when the graph emits its ready event.
   */
  onGraphReady(event) {
    //console.log("Loaded Graph");
    return;
  }

  /**
   * Convert a response containing site data
   * @param siteData Site data
   */
  convertToTimeSeriesFormat(siteData): TimeSeriesGraphDataset {
    const graphDataset: TimeSeriesGraphDataset = {
      data: [],
      timeDataField: 'timestamp',
      seriesConfigurations: [],
    };

    if (siteData.length === 0) {
      return graphDataset;
    }

    // Configuration
    const firstDatapoint = siteData[0];
    for (const [label, data] of Object.entries(firstDatapoint['data'])) {
      const seriesConfiguration = new SeriesConfiguration();
      seriesConfiguration.valueField = label;
      seriesConfiguration.valueLabel = this.prettyFormat(label);
      seriesConfiguration.seriesLabel = seriesConfiguration.valueField;
      seriesConfiguration.unit = data['unit'];
      let isNumeric = false;
      try {
        let numericTest = parseFloat(data['value'])
        isNumeric = true
      }
      catch (error) {
        console.log(`Skipping Non-Numeric Axis ${label}`)
      }
      if (isNumeric) {
        graphDataset.seriesConfigurations.push(seriesConfiguration);
      }
    }

    // Build the graph's data set
    for (const entry of siteData) {
      const datapoint = { timestamp: new Date(entry['timestamp']) };
      for (const [label, data] of Object.entries(entry['data'])) {
        try {
          const numericParse = parseFloat(data['value'])
          
          if (isNaN(numericParse)) {
          } else {
            datapoint[label] = numericParse;
          }
        }
        catch (error) {
          console.log(`Skipping bad data pair ${label}:${data['value']}`)
        }
      }
      graphDataset.data.push(datapoint);
    }

    return graphDataset;
  }

  /**
   * Formats the text into a prettier, human-friendly format.
   * @param text Text to format
   */
  prettyFormat(text: string): string {
    const substrings = text.split("_");
    const newSubstrings = [];
    for (const substring of substrings) {
      const newSubstring = substring.charAt(0).toUpperCase() + substring.slice(1);
      newSubstrings.push(newSubstring);
    }
    return newSubstrings.join(" ");
  }

}
