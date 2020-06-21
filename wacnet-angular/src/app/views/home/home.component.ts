import { Component, OnInit } from '@angular/core';

import { APIService } from '../../services/api.service';

import { ISite } from '../../models/site.model';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  sites: Array<ISite>;

  constructor(private api: APIService) { }

  ngOnInit(): void {
    this.api.getSites().subscribe(
      results => {
        try {
          this.sites = [];
          // Cast sites to our typed interface as we import.
          for (const site in results) {
            this.sites.push(results[site] as ISite);
          }
        }
        catch (err) {
          console.log(err);
        }
      },
      error => {
        console.log(error)
      }
    )
  }

}
