# osm-finder
(name is a placeholder - any better suggestions out there?)

## Team Members
Grant (Xetnus)

## Tool Description
One of the most prominent tools that assists in geolocating images using openstreetmap data is [Overpass Turbo](https://overpass-turbo.eu/). This requires learning and using the [Overpass Query Language](https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL) and restricts your geolocation abilities to only what's permitted by the query language.  

This tool attempts to make it easier for researchers to find locations with a simple click-and-drag interface. No need to learn a new query language. It also adds capabilities not present in existing tools, like the ability to search by the angle between roads, power lines, and railways.

This tool currently supports all [highway](https://wiki.openstreetmap.org/wiki/Key:highway), [railway](https://wiki.openstreetmap.org/wiki/Key:railway), and a couple [power line](https://wiki.openstreetmap.org/wiki/Key:power) (namely, 'line' and 'minor_line') types.

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
1. Download this project repository.  
        `git clone git@github.com:Xetnus/osm-finder.git`

2. Install paper.js: `npm install paper`

3. Install python3 if not already installed and run `python3 -m http.server` in project directory. Copy the URL that the command outputs and paste it into a web browser window.

## Usage
Buttons:
- Upload Photo: upload any photo you want to geolocate  
- Add Linestring: Click and drag to annotate a line in the image (e.g. highway, railway, power line)  
- Next Step: Continue through the next steps, entering the properties for the linestrings and entering any distance or angle parameters between the linestrings.  

## Additional Information
- Currently only tested on images with one highway intersecting two other highways/bridges.
- Works best on images with unique intersections. If there are any tags you can enter (e.g. bridge=yes, tunnel=yes), you'll decrease the size of the results significantly.
- TODO: So, so much. There are many other directional parameters and hundreds of other map elements that, if I had enough time, could be leveraged to turn this project from a niche geolocation tool to a fully-featured geolocation suite. Integration between the front-end (UI) and back-end (Postgres), as well as hosting a public-facing website, would be crucial in making sure that this tool receives the widest adoption possible in the OSINT community.