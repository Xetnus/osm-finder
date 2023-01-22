# osm-finder

## The UI is now accessible from anywhere on Netlify: https://osm-finder.netlify.app/

## Description
One of the most prominent tools that assists in geolocating images using openstreetmap data is [Overpass Turbo](https://overpass-turbo.eu/). This requires learning and using the [Overpass Query Language](https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL) and restricts your geolocation abilities to only what's permitted by the query language.  

This tool attempts to make it easier for researchers to find locations with a simple click-and-drag interface. No need to learn a new query language. It also adds capabilities not present in existing tools, like the ability to search by the angles created by line intersections. 

This tool is still in early development. Please feel free to report issues or create pull requests if you find any bugs.

Tested on Ubuntu 22.04.1 LTS. 

Note: The default image used in this program is subject to copyright.  
Image copyright by flickr user "willem van bergen". No modifications made.  
https://www.flickr.com/photos/willemvanbergen/271226856/  
https://creativecommons.org/licenses/by-sa/2.0/  

## General Usage
The numbers below correspond to the stages in the application. By clicking the Next button, you either progress to the next stage or the next phase of the same stage.    
1. Upload the image you want to geolocate. 
2. Choose the most appropriate linestring(s) and node(s) from the photograph that uniquely identify the location and draw them. 
3. Input the category, subcategory, and tags for each line. The subcategory can be selected from the curated list or typed. Multiple tags can be separated with a space: `bridge=yes surface=wood junction`. 
4. Input the max distances, min distances, angles, and angle errors for each relation. 
   - Important note: all distances and angles should be entered as if the image is viewed from directly overhead. 
5. That's it! Your query should be generated and displayed automatically. 

The final step is to execute that query in a PostgreSQL backend. 

This tool currently supports the following types:
- **Nodes**: [building](https://wiki.openstreetmap.org/wiki/Key:building), [railway](https://wiki.openstreetmap.org/wiki/Key:railway), [power](https://wiki.openstreetmap.org/wiki/Key:power), [man_made](https://wiki.openstreetmap.org/wiki/Key:man_made) 
- **Linestrings**: walkway*, roadway*, [railway](https://wiki.openstreetmap.org/wiki/Key:railway), [power](https://wiki.openstreetmap.org/wiki/Key:power), [waterway](https://wiki.openstreetmap.org/wiki/Key:waterway), [coastline](https://wiki.openstreetmap.org/wiki/Tag:natural=coastline), [man_made](https://wiki.openstreetmap.org/wiki/Key:man_made) 

* Walkways and roadways are custom types unique to OSM Finder that split the [highway](https://wiki.openstreetmap.org/wiki/Key:highway) key into two categories, one meant for roads that vehicles travel on (roadway) and the other meant for the paths that pedestrians or cyclists use (walkway). 

### Tips
The general rule is that the more objects you add to the network, the longer the query will take to execute, oftentimes on an exponential scale.

When in doubt, it's always safer to enter larger/wider parameters than you think is needed. For instance, enter an angle of 25 ± 10° instead of 25 ± 5°. Also, please utilize the tagging feature as much as possible. Any tags you enter (e.g. bridge=yes, lanes=4) will decrease the size of the results significantly.

## Detailed Usage
Before getting into the details, let's define some terms:
- **intersecting**: linestrings that fully or partially overlap in 2D space when viewed from above (as the bird flies). For instance, a bridge that crosses over a major highway is said to *intersect* with that highway. Two linestrings only need to have one point in common to intersect.
- **disjoint**: an object (e.g., linestring, node) that does not intersect and does not have any defined angles to any other object in the network. Maximum and minimum distances may be entered for disjoint objects, but no angle or error values may be entered.
- **disjoint but directional (DBD)**: an object (e.g., linestring, node) that does not intersect with any other object, but does have defined angles to at least one other object in the network. 

The following "network" configurations are expressly supported, although other configurations will likely work:
- 1 linestring and 1 node
  - both disjoint (but you may as well use [Overpass Turbo](https://overpass-turbo.eu/))
- 2 linestrings
  - both intersecting
  - both DBD
  - both disjoint (but you may as well use [Overpass Turbo](https://overpass-turbo.eu/))
- 2 linestrings and 1 node
  - 2 intersecting linestrings and 1 disjoint node
  - 2 intersecting linestrings and 1 DBD node
  - 2 DBD linestrings and 1 disjoint node
- 3 linestrings
  - all intersecting
  - 2 intersecting and 1 DBD
  - all DBD

### Warning for DBD Linestrings
Due to technical limitations of PostgreSQL, linestrings that intersect are usually preferred over DBD linestrings. If you must enter a DBD linestring, be aware that the entire linestring will be used (as it appears in OpenStreetMap), even though the image you're trying to geolocate may only show a portion of the linestring. This will affect any angles you enter for that linestring.

To see why this is an issue, take a look at this linestring: https://www.openstreetmap.org/way/300593937. It's possible that only a fraction of the full linestring is visible in your image. However, if you draw a linestring that represents the portion that's visible to you and then enter an angle to relate it to another object, the actual angle calculated by PostgreSQL will be determined by a straight line drawn between the starting point and ending point of the linestring as it appears in OpenStreetMap. Thus, any angle you enter will likely be different to the angle that PostgreSQL calculates.

Intersecting linestrings don't have this issue because we compute a small ring around the intersection and then calculate the angle using only the sections of the linestrings that fall within that ring.

## Installation
Instructions below are for Linux.

### I. Install and Configure Postgres Backend 
1. **Ensure you have [PostGIS](https://postgis.net/) installed, and then install osm2pgsql version 1.7.1 or higher.** Note: in most Linux distributions, this requires building from source (as of Nov 7).  
    - To install on Windows using prebuilt binaries: https://osm2pgsql.org/doc/install.html#installing-on-windows  
    - To check for v1.7.1 support on your Linux distribution: https://osm2pgsql.org/doc/install.html#installing-on-linux  
    - If v1.7.1 isn't available for your Linux distribution, follow Building instructions: https://github.com/openstreetmap/osm2pgsql  

2. **Optional: tune your PostgreSQL server.** https://osm2pgsql.org/doc/manual.html#tuning-the-postgresql-server

3. **Download openstreetmap data for your area of interest.** To follow along with the demo, download the data for Massachusetts at https://download.geofabrik.de/north-america/us.html. Click on the .osm.bz2 download.

4. **Download [flex.lua](https://github.com/Xetnus/osm-finder/blob/main/flex.lua)** and run the following commands (in Linux):
    - Note: you may need to move files around and change directory/file permissions appropriately to ensure that the postgres user can access `massachusetts-latest.osm.bz2` and `flex.lua`.
    - Note: if you get an error saying "peer authentication failed" when you run the last command, check out the solution at https://stackoverflow.com/a/26735105/1941353, but replace every instance of 'postgres' with 'osmuser'.

```
    sudo -u postgres createuser osmuser 
    sudo -u postgres createdb --encoding=UTF8 --owner=osmuser osm 
    sudo -u postgres psql osm --command='CREATE EXTENSION postgis;' 
    sudo -u postgres psql osm --command='CREATE EXTENSION hstore;' 
    osm2pgsql -d osm -U osmuser -c massachusetts-latest.osm.bz2 -S flex.lua -O flex 
```

5. **Open the interative query terminal** by running: `psql -d osm -U osmuser` 
    - Note: The interactive terminal that opens is where you'll run the PostgreSQL queries that the frontend generates.
    - You can confirm your database was set up correctly by running `\dt`. You should see four tables: `closed_shapes`, `linestrings`, `nodes`, and `spatial_ref_sys`.


### II. Install Frontend
1. Download this project repository.  
      `git clone https://github.com/Xetnus/osm-finder.git`

2. Change your directory: `cd osm-finder`

3. Install nodejs version >= 14.18.0 (if not already installed). Confirm your installation with `nodejs -v`

3. Install dependencies: `npm install`

4. Start the server: `npm run dev`

## Unit Testing
Unit testing was added to detect unexpected changes in the generated PostgreSQL queries and their results once the queries are run. To run the unit tests, type `npm run test`. The unit tests assume you have a PostgreSQL database running that's been loaded with the OSM data for the US state of Massachusetts. To create your own tests, review the comments in the `queryCreator.test.js` file. 

## Roadmap
### Alpha
- [x] **Start from scratch.** Because this was created during a hackathon, little emphasis was put on code quality and future maintenance. No standard JavaScript libraries were used and most of the code is inefficient in one way or another.
- [x] **Add support for nodes.** Towers, buildings, and nodes of all types should be supported.
- [x] **Update flex.lua.** Include more node and linestring types. Add "downsampling" capability such that ways and relations can be queried as nodes.
- [ ] **Revamp UI.** Give the bottom input bar a more modern and functional appearance.
### Bet
- [ ] **Add support for shapes.** Many roads, buildings, structures, etc. have unique shapes that should be queryable using carefully crafted PostgreSQL queries.
### Future
- [ ] **Host a public website.** Depending on cost, integrate and host both the frontend (UI) and backend (PostgreSQL) on a public-facing website.
