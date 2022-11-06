# osm-finder

## The UI is now accessible from anywhere on Netlify: https://osm-finder.netlify.app/

## Description
One of the most prominent tools that assists in geolocating images using openstreetmap data is [Overpass Turbo](https://overpass-turbo.eu/). This requires learning and using the [Overpass Query Language](https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL) and restricts your geolocation abilities to only what's permitted by the query language.  

This tool attempts to make it easier for researchers to find locations with a simple click-and-drag interface. No need to learn a new query language. It also adds capabilities not present in existing tools, like the ability to search by the angle between roads, power lines, and railways.

This tool currently supports all [highway](https://wiki.openstreetmap.org/wiki/Key:highway), [railway](https://wiki.openstreetmap.org/wiki/Key:railway), and a couple [power line](https://wiki.openstreetmap.org/wiki/Key:power) (namely, 'line' and 'minor_line') types.

When in doubt, it's always safer to enter larger/wider parameters than you think is needed (e.g., enter an angle of 25 ± 10° instead of 25 ± 5°).

Works best on images with unique intersections. If there are any tags you can enter (e.g. bridge=yes, tunnel=yes), you'll decrease the size of the results significantly.

This tool is still in early development. Please feel free to report issues or create pull requests if you find any bugs.

Tested on Ubuntu 22.04.1 LTS. 

Note: The default image used in this program is subject to copyright.  
Image copyright by flickr user "willem van bergen". No modifications made.  
https://www.flickr.com/photos/willemvanbergen/271226856/  
https://creativecommons.org/licenses/by-sa/2.0/  

## Usage
The numbers below correspond to the stages in the application. By clicking the Next button, you either progress to the next stage or the next phase of the same stage.    
1. Upload the image you want to geolocate 
2. Draw the linestrings that make up the line network of the photo 
3. Input the generic types, subtypes, and tags for each line. Multiple tags can be separated with a comma: `bridge=yes,surface=wood,junction` 
4. Input the max distances, min distances, angles, and angle errors for each relation 
5. That's it! Your query should be generated and displayed automatically. 

## Installation
Instructions below are for Linux.

### I. Install and Configure Postgres Backend 
1. **Ensure you have [PostGIS](https://postgis.net/) installed, and then install osm2pgsql version 1.7.0 or higher.** Note: On Ubuntu and Fedora, this requires building from source (as of Sep 25).  
    - To install on Linux using a package manager: https://osm2pgsql.org/doc/install.html#installing-on-linux  
    - To install on Windows using prebuilt binaries: https://osm2pgsql.org/doc/install.html#installing-on-windows  
    - To install on Ubuntu, follow Building instructions: https://github.com/openstreetmap/osm2pgsql  

2. **Download openstreetmap data for your area of interest.** To follow along with the demo, download the data for Massachusetts at https://download.geofabrik.de/north-america/us.html. Click on the .osm.bz2 download.

3. **Download [flex.lua](https://github.com/Xetnus/osm-finder/blob/main/flex.lua)** and run the following commands (in Linux):
    - Note: you may need to move files around and change directory/file permissions appropriately to ensure that the postgres user can access `massachusetts-latest.osm.bz2` and `flex.lua`.
    - Note: if you get an error saying "peer authentication failed" when you run the last command, check out the solution at https://stackoverflow.com/a/26735105/1941353, but replace every instance of 'postgres' with 'osmuser'.

```
    sudo -u postgres createuser osmuser 
    sudo -u postgres createdb --encoding=UTF8 --owner=osmuser osm 
    sudo -u postgres psql osm --command='CREATE EXTENSION postgis;' 
    sudo -u postgres psql osm --command='CREATE EXTENSION hstore;' 
    osm2pgsql -d osm -U osmuser -c massachusetts-latest.osm.bz2 -S flex.lua -O flex 
```

4. **Set up your (Linux) terminal** by running: `psql -d osm -U osmuser` 
    - Note: The interactive query terminal that opens is where you'll run the PostgreSQL queries that the front-end generates.
    - You can confirm your database was set up correctly by running `\dt`. You should see four tables: `closed_shapes`, `linestrings`, `points`, and `spatial_ref_sys`.


### II. Install Frontend
1. Download this project repository.  
      `git clone git@github.com:Xetnus/osm-finder.git`

2. Change your directory: `cd osm-finder`

3. Install npm version >= 14.18.0 (if not already installed). Confirm your installation with `npm -v`

3. Install dependencies: `npm install`

4. Start the server: `npm run dev`

## Unit Testing
Unit testing was added to detect unexpected changes in the generated PostgreSQL queries and their results once the queries are run. To run the unit tests, type `npm run test`. The unit tests assume you have a PostgreSQL database running that's been loaded with the OSM data for the US state of Massachusetts. To create your own tests, review the comments in the `queryCreator.test.js` file. 

## Roadmap
- [x] **Start from scratch.** Because this was created during a hackathon, little emphasis was put on code quality and future maintenance. No standard JavaScript libraries were used and most of the code is inefficient in one way or another. Now that I have a better idea for how this tool can be architected, reconstructing it should be easier.
- [ ] **Add support for nodes.** Towers, buildings, and nodes of all types should be supported.
- [ ] **Add support for shapes.** Many roads, buildings, structures, etc. have unique shapes that should be queryable using carefully crafted PostgreSQL queries.
- [ ] **Host a public website.** Depending on cost, I'd like to integrate and host both the frontend (UI) and backend (PostgreSQL) on a public-facing website.
