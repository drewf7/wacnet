# WACNet Graphs

## Summary
This project is designed to ingest data from existing WACNet stations, and make it available via web based interactive graphs.

Data is uploaded via the code in "wacnet-datapump" to a postgres database. "wacnet-angular" is served at [wacnet.drewf.net](wacnet.drewf.net). It communicates with the database via "wacnet-api" in order to pull data into the browser for display.

More detail on each piece is below.

## WACNet Datapump
The datapump script run every two hours on the hosting server. Based on the sites stored in the database, it pulls CSV files from [The WACNet Station List](http://www.wrds.uwyo.edu/WACNet/Stations.html).

This data is then compared to existing data in the database. Unused columns are removed, and then new data is added to the database.

The project require [NodeJS > 12](https://nodejs.org/en/download/) to run.

### Setup
Download the project. Change into the project directory, and then run "npm install" to setup dependencies.

Create a new file called ".env" and fill the following values in order to establish a database connection.
- PGUSER="Your Database User"
- PGHOST="Your Database Host"
- PGPASSWORD="Your Database Password"
- PGDATABASE="Your Database"
- PGPORT="Your Database Server Port"

The database expepcts the following tables to exist.

*site*:
- siteId SERIAL, PK, NOT NULL
- siteName VARCHAR(128), NOT NULL
- siteHourlyDataURL VARCHAR(128), NOT NULL
- siteLatitude NUMERIC // Not currently used
- siteLongitude NUMERIC // Not currently used
- lastUpdated VARCHAR(128)
- stationName VARCHAR(128)

*data*:
- recordId BIGSERIAL, PK, NOT NULL
- siteId SERIAL FK REF "site"
- timestamp VARCHAR(128)
- data JSONB

## WACNet Angular
The Angular dashboard is the frontend piece to display data.

It relies on [Bootstrap](https://getbootstrap.com/) for layout and [amcharts](https://www.amcharts.com/) for the graphing.

### Setup
See the [Angular Website](https://angular.io/guide/setup-local) for instructions on setting up angular and installing the CLI.

Once installed, download the folder and run "npm install" to install dependencies. Then run "npm start" or "ng serve" to start Angular.

Note if running locally it will attempt to try and connect to an API running on port 3000.

## WACNet API
The API is the interface between the front end dashboard and the database. It pull data from the database in response to requests from web browsers, and sends that data back for display on graphs.

### Setup
The API also needs [NodeJS > 12](https://nodejs.org/en/download/) to run.

Change directory into the folder and run "npm install" to setup dependencies.

The API also requires a ".env" file for environmental variables.

It requires
- PGUSER="Your Database User"
- PGHOST="Your Database Host"
- PGPASSWORD="Your Database Password"
- PGDATABASE="Your Database"
- PGPORT="Your Database Server Port"
- PORT=3000
- isLocalDev=true // Allows CORS access for angular
