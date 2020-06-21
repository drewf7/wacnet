import "core-js"; // Compatibility with old browsers.
import {
  AfterViewInit, Component, ElementRef, EventEmitter, Input, NgZone, OnChanges, OnDestroy,
  OnInit, Output, SimpleChanges, ViewChild
} from "@angular/core";
import { Observable, Subscription } from 'rxjs';

import { v4 as uuid } from 'uuid';

import * as am4charts from "@amcharts/amcharts4/charts";
import * as am4core from "@amcharts/amcharts4/core";
import am4themes_animated from "@amcharts/amcharts4/themes/animated";
import am4themes_material from "@amcharts/amcharts4/themes/material";

am4core.useTheme(am4themes_animated);
am4core.useTheme(am4themes_material);

import { ITimeSeriesGraphConfiguration, SeriesConfiguration } from './time-series-graph.models';

const bulletShapes: typeof am4core.Sprite[] = [
  am4core.Circle,
  am4core.Triangle,
  am4core.Rectangle,
];

/**
 * Interface defining the format data needs to be in to be used for the time series graph.
 */
export interface TimeSeriesGraphDataset {
  /** Datapoints loaded into the graph */
  data: {}[];
  /** The name of the time data field */
  timeDataField: string;
  /** Configuration for each series to include in the graph. */
  seriesConfigurations: SeriesConfiguration[];
  /** Field in the dataset that controls whether a datapoint has a bullet or not  */
  bulletVisibilityField?: string;
  /** Whether the series will have a shared value axis or not. */
  sharedAxis?: boolean;
  /** If sharing an axis, this will be the axis's title */
  sharedAxisTitle?: string;
}

export interface QuickZoomButton {
  /** Text displayed in the button */
  text: string;
  /** Value of the zoom in milliseconds */
  value: number;
  /** Title for the zoom button section */
  title?: string;
}

@Component({
  selector: 'app-time-series-graph-component',
  templateUrl: 'time-series-graph.component.html'
})
export class TimeSeriesGraphComponent implements AfterViewInit, OnDestroy, OnInit, OnChanges {
  @Input() graphTitle: string;
  @Input() dataset: TimeSeriesGraphDataset;
  @Input() quickZoomButtons: QuickZoomButton[];
  @Input() configurationOptions: ITimeSeriesGraphConfiguration;
  @Input() loadingData: boolean;
  @Output() graphReady = new EventEmitter<any>();
  @Output() quickZoom = new EventEmitter<number>();
  @Output() datesSelected = new EventEmitter<Date[]>();

  @ViewChild('loadingIndicator') loadingTemplate: ElementRef;

  private chart: am4charts.XYChart;
  private series: am4charts.LineSeries[];
  private dateAxis: am4charts.DateAxis;
  private loadingIndicator: am4core.Container;

  public graphId: string;
  public updatesDataStream: Observable<TimeSeriesGraphDataset>;
  public lastUpdated: Date;
  public dates: Date[];
  public activeQuickZoomButton: number;

  /**
   * Update the date picker's dates based on the quick zoom amount selected.
   * @param zoomAmount Amount of time in milliseconds
   */
  private zoomDateRange(zoomAmount: number) {
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setTime(fromDate.getTime() - zoomAmount);
    this.dates = [fromDate, toDate];
  }

  /**
   * Toggles the visibility of an axis.
   * @param event Event calling this function
   */
  private toggleAxes(event) {
    const axis = event.target.yAxis;
    let disabled = true;
    axis.series.each(series => {
      if (!series.isHiding && !series.isHidden) {
        disabled = false;
      }
    });
    axis.disabled = disabled;
  }

  constructor(private zone: NgZone) {
    this.graphId = uuid();
    this.series = [];
    this.dates = [];
    this.configurationOptions = {};
  }

  ngOnInit() {
    if (this.configurationOptions.hideLastUpdated === undefined || !this.configurationOptions.hideLastUpdated) {
      this.updateLastUpdated(this.dataset.data[this.dataset.data.length - 1]['timestamp']);
    }
  }

  /**
   * Creates the chart after the view is initialized.
   */
  ngAfterViewInit() {
    this.zone.runOutsideAngular(() => {
      this.chart = am4core.create(this.graphId, am4charts.XYChart);
      this.configureLoadingIndicator();
      if (this.dataset) { this.createChart(); }
    });
  }

  /**
   * Resets the chart's data if the input data set changes.
   * @param changes Hashtable of changes
   */
  ngOnChanges(changes: SimpleChanges) {
    if (changes.loadingData && !changes.loadingData.isFirstChange()) {
      this.loadingData ? this.loadingIndicator.show() : this.loadingIndicator.hide();
    }

    if (changes.dataset) {
      if (!changes.dataset.firstChange) {
        // If the previous value was null/undefined, create the chart now
        if (!changes.dataset.previousValue) {
          this.zone.runOutsideAngular(() => this.createChart());
        }

        // If the input dataset changes, re-enable data grouping and clear out the previous bullets
        this.dateAxis.groupData = true;
        for (const series of this.chart.series) {
          series.bulletsContainer.disposeChildren();
        }

        this.chart.data = this.dataset.data;

        if (this.dataset.sharedAxis) {
          this.updateSharedValueAxisTitle(this.dataset.sharedAxisTitle);
        }
      }
    }
  }

  /**
   * Creates the chart, axes, and series.
   *
   * @returns Chart to be displayed.
   */
  createChart() {
    this.configureChart();

    this.chart.data = this.dataset.data;

    this.configureDateAxis();
    this.createSeries();
  }

  /**
   * Configures some chart-wide options like colors and responsiveness.
   */
  configureChart() {
    this.chart.responsive.enabled = true;
    this.chart.preloader.disabled = true;
    this.chart.colors.step = 2;    // Increase contrast by taking every second color

    this.chart.cursor = new am4charts.XYCursor();
    this.chart.legend = new am4charts.Legend();
    this.chart.scrollbarX = new am4core.Scrollbar();

    this.configureExportMenu();

    // Chart events
    this.chart.events.on('ready', () => {
      this.graphReady.emit(null);
    });
  }

  /**
   * Configures the loading indicator that will display whenever data is being actively loaded.
   */
  configureLoadingIndicator() {
    this.loadingIndicator = this.chart.tooltipContainer.createChild(am4core.Container);
    this.loadingIndicator.hide();
    this.loadingIndicator.background.fill = am4core.color("#FFF");
    this.loadingIndicator.background.fillOpacity = 0.8;
    this.loadingIndicator.width = am4core.percent(100);
    this.loadingIndicator.height = am4core.percent(100);

    const indicatorLabel = this.loadingIndicator.createChild(am4core.Label);
    indicatorLabel.html = `
      <div class="spinner-border" style="width: 10rem; height: 10rem;" role="status">
        <span class="sr-only">Loading...</span>
      </div>`;
    indicatorLabel.align = "center";
    indicatorLabel.valign = "middle";
  }

  configureExportMenu() {
    const menu = new am4core.ExportMenu();
    menu.align = "right";
    menu.verticalAlign = "bottom";
    menu.items[0].label = "Export this graph";

    // Have timestamps export in ISO format
    this.chart.exporting.dateFields = new am4core.List();
    this.chart.exporting.dateFields.push(this.dataset.timeDataField);
    this.chart.exporting.dateFormat = "i";

    this.chart.exporting.menu = menu;
  }

  /**
   * Configures the graph's date axis.
   */
  configureDateAxis() {
    // Basic padding, grid distance, and ability to aggregate data
    this.dateAxis = this.chart.xAxes.push(new am4charts.DateAxis());
    this.dateAxis.renderer.minGridDistance = 75;
    this.dateAxis.extraMin = 0.01;
    this.dateAxis.extraMax = 0.01;

    // Configure date formats
    this.dateAxis.dateFormats.setKey("minute", "hh:mm a");
    this.dateAxis.periodChangeDateFormats.setKey("minute", "hh:mm a");
    this.dateAxis.dateFormats.setKey("hour", "hh:mm a");
    this.dateAxis.periodChangeDateFormats.setKey("hour", "MMM dd hh:mm a");
    this.dateAxis.dateFormats.setKey("day", "MMM dd");
    this.dateAxis.periodChangeDateFormats.setKey("day", "MMM dd");

    // Label formatting
    this.dateAxis.renderer.labels.template.wrap = true;
    this.dateAxis.events.on("sizechanged", (ev) => {
      const axis = ev.target;
      const cellWidth = axis.pixelWidth / (axis.endIndex - axis.startIndex);
      axis.renderer.labels.template.maxWidth = cellWidth;
    });
  }

  /**
   * Creates and configures the different series for the graph.
   */
  createSeries() {
    let valueAxis;
    if (this.dataset.sharedAxis) {
      valueAxis = this.chart.yAxes.push(new am4charts.ValueAxis());
      this.configureValueAxis(valueAxis, this.dataset.sharedAxisTitle);
    }

    let oppositeFlag = false;
    this.dataset.seriesConfigurations.forEach((seriesConfiguration, index) => {
      if (this.dataset.sharedAxis === undefined || !this.dataset.sharedAxis) {
        valueAxis = this.chart.yAxes.push(new am4charts.ValueAxis());
      }

      const series = this.chart.series.push(new am4charts.LineSeries());

      // Set data fields
      series.dataFields.dateX = this.dataset.timeDataField;
      series.dataFields.valueY = seriesConfiguration.valueField;
      if (seriesConfiguration.additionalValueField) {
        series.dataFields.openValueY = seriesConfiguration.additionalValueField;
      }

      // Configure series
      series.yAxis = valueAxis;
      series.name = seriesConfiguration.seriesLabel;
      series.strokeWidth = (seriesConfiguration.additionalValueField) ? 0 : 3;

      series.minBulletDistance = 15;

      if (seriesConfiguration.additionalValueField) { series.fillOpacity = 0.3; }
      if (!seriesConfiguration.hideTooltip) {
        series.tooltipText = "{name}: [bold]{valueY} " + seriesConfiguration.unit;
      }

      // Events to toggle the axes when hiding a series
      series.events.on("hidden", this.toggleAxes);
      series.events.on("shown", this.toggleAxes);
      series.hidden = true; // Start all disabled
      this.series.push(series);

      const bullet = series.bullets.push(new am4charts.Bullet());
      this.createBullet(bullet, bulletShapes[index % bulletShapes.length]);

      if (this.dataset.sharedAxis === undefined || !this.dataset.sharedAxis) {
        oppositeFlag = this.configureValueAxis(
          valueAxis, seriesConfiguration.valueLabel + ' (' + seriesConfiguration.unit + ')', oppositeFlag, series);
      }
    });
  }

  /**
   * Configures a value axis.
   * @param valueAxis Reference to the value axis
   * @param title Title text for the axis
   * @param oppositeFlag Whether this axis should be displayed on the opposite side of the graph
   * @param series Used to color/style the axis based on the given series
   * @returns The opposite flag flipped
   */
  configureValueAxis(
    valueAxis: am4charts.ValueAxis, title: string, oppositeFlag: boolean = false, series: am4charts.Series = null
  ) {
    // Tweaking value axis title
    valueAxis.title.text = title;
    valueAxis.title.fontSize = 16;
    valueAxis.title.fontWeight = "bold";

    // Tweaking visual axis line appearence and spacing
    valueAxis.renderer.line.strokeOpacity = 1;
    valueAxis.renderer.line.strokeWidth = 2;
    if (series) { valueAxis.renderer.line.stroke = series.stroke; }
    valueAxis.renderer.line.paddingRight = 10;
    valueAxis.renderer.line.paddingLeft = 10;

    // Pad the value axis by 20%
    valueAxis.extraMin = 0.2;
    valueAxis.extraMax = 0.2;

    // Coloring the axis labels to match the actual lines
    if (series) { valueAxis.renderer.labels.template.fill = series.stroke; }

    // Disable the horizontal line grid (looks cluttered if multiple series exist)
    valueAxis.renderer.grid.template.disabled = true;

    // Alternate which side of the graph the axis is on (for more than one axis)
    if (oppositeFlag) { valueAxis.renderer.opposite = true; }
    return !oppositeFlag;
  }

  /**
   * If using a shared axis, update its title text.
   * @param title New title text to be used
   */
  updateSharedValueAxisTitle(title: string) {
    this.chart.yAxes.getIndex(0).title.text = title;
  }

  /**
   * Creates and configures bullets based on the given type.
   * @param bulletShape Type of bullet sprite
   */
  createBullet(bullet: am4charts.Bullet, bulletShape: typeof am4core.Sprite): am4core.Sprite {
    if (this.dataset.bulletVisibilityField) {
      bullet.disabled = true;
      bullet.propertyFields.disabled = this.dataset.bulletVisibilityField;
    }

    bullet.disabled = true;
    bullet.propertyFields.disabled = "disabled";

    const bulletHover = bullet.states.create("hover");
    bulletHover.properties.scale = 1.5;

    // Basic configuration for each bullet type
    const shape = bullet.createChild(bulletShape);
    shape.horizontalCenter = "middle";
    shape.verticalCenter = "middle";

    switch (bulletShape) {
      case am4core.Circle: {
        const circle = shape as am4core.Circle;
        circle.radius = 5;
        break;
      }
      case am4core.Triangle: {
        const triangle = shape as am4core.Triangle;
        triangle.direction = "top";
        triangle.width = 10;
        triangle.height = 10;
        break;
      }
      case am4core.Rectangle: {
        const rectangle = shape as am4core.Rectangle;
        rectangle.width = 8;
        rectangle.height = 8;
        break;
      }
      default: {
        // No configuration done; assuming the bullet will be configured by the caller
        break;
      }
    }

    return shape;
  }

  /**
   * Updates the last updated date (creates a new reference to update the view accordingly).
   * @param newDate New date to display
   */
  updateLastUpdated(newDate: Date) {
    // Interestingly, if this function is called from within a subscribe block originating outside Angular's zone
    //  (i.e. the getUpdates function is subscribing to an Observable being passed from a parent component)
    //  the view won't automatically update. We can run code directly in Angular's zone to get around this.
    this.zone.run(() => {
      this.lastUpdated = new Date(newDate.getTime());
    });
  }

  /**
   * Listener for when dates are changed.
   * @param dates New dates selected
   */
  onDatesUpdated(dates: Date[]) {
    this.activeQuickZoomButton = null;
    this.datesSelected.emit(dates);
  }

  /**
   * Handler when a quick zoom button is selected.
   * @param zoomAmount Value to zoom on
   */
  quickZoomSelected(zoomAmount: number, index: number) {
    this.activeQuickZoomButton = index;

    this.zoomDateRange(zoomAmount);
    this.dateAxis.groupData = true;
    this.quickZoom.emit(zoomAmount);
  }

  /**
   * Disposes the chart and unsubscribes to any update data.
   */
  ngOnDestroy() {
    this.zone.runOutsideAngular(() => {
      if (this.chart) {
        this.chart.dispose();
      }
    });
  }
}
