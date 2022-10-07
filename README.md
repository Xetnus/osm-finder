# osm-finder

## The UI is now accessible from anywhere on Heroku: https://osm-finder.herokuapp.com/

## Tool Description
One of the most prominent tools that assists in geolocating images using openstreetmap data is [Overpass Turbo](https://overpass-turbo.eu/). This requires learning and using the [Overpass Query Language](https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL) and restricts your geolocation abilities to only what's permitted by the query language.  

This tool attempts to make it easier for researchers to find locations with a simple click-and-drag interface. No need to learn a new query language. It also adds capabilities not present in existing tools, like the ability to search by the angle between roads, power lines, and railways.

This tool currently supports all [highway](https://wiki.openstreetmap.org/wiki/Key:highway), [railway](https://wiki.openstreetmap.org/wiki/Key:railway), and a couple [power line](https://wiki.openstreetmap.org/wiki/Key:power) (namely, 'line' and 'minor_line') types.

When in doubt, it's always safer to enter larger/wider parameters than you think is needed (e.g., enter an angle of 25 +/- 20 instead of 25 +/- 5).

Works best on images with unique intersections. If there are any tags you can enter (e.g. bridge=yes, tunnel=yes), you'll decrease the size of the results significantly.

Tested on Ubuntu 22.04.1 LTS. 

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

```
    sudo -u postgres createuser osmuser; 
    sudo -u postgres createdb --encoding=UTF8 --owner=osmuser osm; 
    sudo -u postgres psql osm --command='CREATE EXTENSION postgis;'; 
    sudo -u postgres psql osm --command='CREATE EXTENSION hstore;'; 
    sudo -u postgres osm2pgsql -d osm -c massachusetts-latest.osm.bz2 -S flex.lua -O flex; 
```

4. **Configure your (Linux) terminal** using the following commands:
    - Note: The interactive query terminal that opens when you run `psql` is what you'll use to run the PostgreSQL queries that the front-end generates.
    - You can confirm your database was set up correctly by running `\dt`. You should see four tables: `closed_shapes`, `linestrings`, `points`, and `spatial_ref_sys`.
```
    sudo su postgres
    psql
    \c osm
```

### II. Install Frontend
1. Front-end instructions coming soon

## Usage
Buttons:
- Upload Photo: upload any photo you want to geolocate  
- Add Linestring: Click and drag to annotate a line in the image (e.g. highway, railway, power line)  
- Next Step: Continue through the next steps, entering the properties for the linestrings and entering any distance or angle parameters between the linestrings.  

## Next Steps
- [ ] **Start from scratch.** Because this was created during a hackathon, little emphasis was put on code quality and future maintenance. No standard JavaScript libraries were used and most of the code is inefficient in one way or another. Now that I have a better idea for how this tool can be architected, reconstructing it should be easier.
- [ ] **Add support for nodes.** Towers, buildings, and nodes of all types should be supported.
- [ ] **Add support for shapes.** Many roads, buildings, structures, etc. have unique shapes that should be queryable using carefully crafted PostgreSQL queries.
- [ ] **Host a public website.** Depending on cost, I'd like to integrate and host both the frontend (UI) and backend (PostgreSQL) on a public-facing website.
