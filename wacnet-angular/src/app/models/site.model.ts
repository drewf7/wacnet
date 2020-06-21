export interface ISite {
    siteId: string;
    siteName: string;
    siteHourlyDataURL: string;
    siteLatitude?: number;
    siteLongitude?: number;
    lastUpdated?: string;
    stationName: string;
}