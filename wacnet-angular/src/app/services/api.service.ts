import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from 'rxjs';

@Injectable({
    providedIn: "root"
})
export class APIService {

    constructor(private http: HttpClient) { }

    baseURL: string = ((window.location.hostname === 'localhost') ? "http://localhost:3000/api" : "/api");

    getSites() {
        return this.http.get(this.baseURL + '/sites')
    }

    getSiteById(siteId: string) {
        return this.http.get(this.baseURL + `/sites/${siteId}`);
    }

    getDataByTime(startTime, endTime, siteId){
        return this.http.get(this.baseURL + `/data/${siteId}`, {
            params: {
                startTime,
                endTime
            }
        })
    }
}