# OSM Finder

## The UI is now accessible from anywhere on Netlify: https://osm-finder.netlify.app/
## To see OSM Finder in action, check out the blog: https://xetnus.github.io/blog/

## Description
One of the most prominent tools that assists in geolocating images using openstreetmap data is [Overpass Turbo](https://overpass-turbo.eu/). This requires learning the [Overpass Query Language](https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL) and restricts your geolocation abilities to only what's permitted by the query language.  

This tool attempts to make it easier for researchers to find locations with a simple click-and-drag interface. No need to learn a new query language. It also adds capabilities not present in existing tools, like the ability to find locations by leveraging the angles created by line intersections.

This tool is in beta development. If you encounter any issues or have recommendations on how to improve the application, please feel free to open an [issue](https://github.com/Xetnus/osm-finder/issues).

Tested on Ubuntu 22.04.1 LTS. 

## Usage Instructions
Check out the [wiki](https://github.com/Xetnus/osm-finder/wiki) for usage instructions and the [OSM Finder Blog](https://xetnus.github.io/blog/) for more concrete examples of how it can be used in investigations. 

## Installation
Instructions below are for Linux.

### I. Install and Configure PostgreSQL Backend 
1. **Ensure you have [PostGIS](https://postgis.net/) installed, and then install osm2pgsql version 1.7.1 or higher.** Note: in most Linux distributions, this requires building from source (as of Nov 7).  
    - To install on Windows using prebuilt binaries: https://osm2pgsql.org/doc/install.html#installing-on-windows  
    - To check for v1.7.1 support on your Linux distribution: https://osm2pgsql.org/doc/install.html#installing-on-linux  
    - If v1.7.1 isn't available for your Linux distribution, follow the building instructions: https://github.com/openstreetmap/osm2pgsql#building  

2. **Optional: tune your PostgreSQL server.** https://osm2pgsql.org/doc/manual.html#tuning-the-postgresql-server

3. **Download openstreetmap data for your area of interest.** To follow along with the demo, download the data for Washington state at https://download.geofabrik.de/north-america/us.html. Click on the .osm.pbf download.

4. **Download [flex.lua](https://github.com/Xetnus/osm-finder/blob/main/flex.lua)** and run the following commands (in Linux):
    - Note: you may need to move files around and change directory/file permissions appropriately to ensure that the postgres user can access `washington-latest.osm.pbf` and `flex.lua`.
    - Note: if you get an error saying "peer authentication failed" when you run the last command, check out the solution at https://stackoverflow.com/a/26735105/1941353, but replace user 'postgres' with 'osmuser'.

```
    sudo -u postgres createuser osmuser 
    sudo -u postgres createdb --encoding=UTF8 --owner=osmuser osm 
    sudo -u postgres psql osm --command='CREATE EXTENSION postgis;' 
    sudo -u postgres psql osm --command='CREATE EXTENSION hstore;' 
    osm2pgsql -d osm -U osmuser -O flex -S flex.lua washington-latest.osm.pbf 
```

5. **Open the interative query terminal** by running: `psql -d osm -U osmuser` 
    - Note: The interactive terminal that opens is where you'll run the PostgreSQL queries that the frontend generates.
    - You can confirm your database was set up correctly by running `\dt`. You should see four tables: `closed_shapes`, `linestrings`, `nodes`, and `spatial_ref_sys`.


### II. Install Frontend
1. Download this project repository.  
      `git clone https://github.com/Xetnus/osm-finder.git`

2. Change your directory: `cd osm-finder`

3. Install Node version >= 14.18.0 (if not already installed). Confirm your installation with `node -v`

3. Install dependencies: `npm install`

4. Start the server: `npm run dev`

## Unit Testing
Unit testing was added to detect unexpected changes in the generated PostgreSQL queries and their results once the queries are run. To run the unit tests, type `npm run test`. The unit tests assume you have a PostgreSQL database running that's been loaded with the OSM data for the US state of Washington. To create your own tests, review the comments in the `queryCreator.test.js` file. 

## Roadmap
### Alpha
- [x] **Start from scratch.** Because this was created during a hackathon, little emphasis was put on code quality and future maintenance. No standard JavaScript libraries were used and most of the code is inefficient in one way or another.
- [x] **Add support for nodes.** Towers, buildings, and nodes of all types should be supported.
- [x] **Update flex.lua.** Include more node and linestring types. Add "downsampling" capability such that ways can be queried as nodes.
- [x] **Revamp UI.** Give the bottom input bar a more modern and functional appearance.
### Beta
- [ ] **Improve image loader.** Find a way to reduce aliasing artifacts in images uploaded by user.
- [ ] **Add support for polygons.** Many objects have unique shapes that should be queryable using carefully crafted PostgreSQL queries.
  - [ ] **Closed polygons:** buildings, structures, etc.
  - [ ] **Open polygons:** roads, coastlines, and other types of waterfronts
### Future
- [ ] **Host a public website and server.** Depending on cost, integrate and host both the frontend (UI) and backend (PostgreSQL) on a public-facing website.
