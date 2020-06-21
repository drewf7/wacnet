/**
 * Defines the configuration that can be done for a series.
 */
export interface ISeriesConfiguration {
    /** Label for the series as a whole */
    seriesLabel: string;
    /** Name of the field in the dataset. */
    valueField: string;
    /** Label for the value field (ideally in a prettier format). */
    valueLabel?: string;
    /** Unit of the value field(s). */
    unit?: string;
    /**
     * An optional additional value field to use for this series. If specified,
     * the graph will fill the vertical space between the two lines.
     */
    additionalValueField?: string;
    /** Label for the additional value field. */
    additionalValueLabel?: string;
    /** Whether to hide the tooltip. */
    hideTooltip?: boolean;
}

/**
 * Concrete implementation of series configuration.
 */
export class SeriesConfiguration implements ISeriesConfiguration {
    seriesLabel: string;
    valueField: string;
    valueLabel?: string;
    unit?: string;
    additionalValueField?: string;
    additionalValueLabel: string;
    hideTooltip = false;
}

/**
 * Defines the configuration options for the time series graph.
 */
export interface ITimeSeriesGraphConfiguration {
    hideLastUpdated?: boolean;
    hideDatePicker?: boolean;
    hideFilterButtons?: boolean;
    hideLiveButton?: boolean;
}
