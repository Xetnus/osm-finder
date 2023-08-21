# OSM Finder

## The UI is now accessible from anywhere on Netlify: https://osm-finder.netlify.app/
## To see OSM Finder in action, check out the blog: https://medium.com/@xetnus

## Description
One of the most prominent tools that assists in geolocating images using openstreetmap data is [Overpass Turbo](https://overpass-turbo.eu/). This requires learning the [Overpass Query Language](https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL) and restricts your geolocation abilities to only what's permitted by the query language.  

This tool attempts to make it easier for researchers to find locations with a simple click-and-drag interface. No need to learn a new query language. It also adds capabilities not present in existing tools, like the ability to find locations by leveraging the angles created by line intersections and search for uniquely shaped features.

This tool is in beta development. If you encounter any issues or have recommendations on how to improve the application, please feel free to open an [issue](https://github.com/Xetnus/osm-finder/issues).

## Usage Instructions
Check out the [wiki](https://github.com/Xetnus/osm-finder/wiki) for usage instructions and the [OSM Finder Blog](https://medium.com/@xetnus) for more concrete examples of how it can be used in investigations. 

## Installation
Instructions below are for Linux. OSM Finder has been installed and tested on Ubuntu 22.04.1 LTS and Windows Subsystem for Linux - Ubuntu 22.04.2 LTS edition. Your mileage may vary on other operating systems.

### I. Install and Configure PostgreSQL Backend 
Instructions moved to the [wiki](https://github.com/Xetnus/osm-finder/wiki/Installing-the-Backend-(Database)).

### II. Install Frontend:
Instructions moved to the [wiki](https://github.com/Xetnus/osm-finder/wiki/Installing-the-Frontend-(Website)).

### Alpha
- [x] **Start from scratch.** Because this was created during a hackathon, little emphasis was put on code quality and future maintenance. No standard JavaScript libraries were used and most of the code is inefficient in one way or another.
- [x] **Add support for nodes.** Towers, buildings, and nodes of all types should be supported.
- [x] **Update flex.lua.** Include more node and linestring types. Add "downsampling" capability such that ways can be queried as nodes.
- [x] **Revamp UI.** Give the bottom input bar a more modern and functional appearance.
### Beta
- [ ] **Improve image loader.** Find a way to reduce aliasing artifacts in images uploaded by user.
- [ ] **Add support for polygons.** Many objects have unique shapes that should be queryable using carefully crafted PostgreSQL queries.
  - [x] **Closed polygons:** buildings, structures, etc.
  - [ ] **Open polygons:** roads, coastlines, and other types of waterfronts
### Future
- [ ] **Host a public website and server.** Depending on cost, integrate and host both the frontend (UI) and backend (PostgreSQL) on a public-facing website.
