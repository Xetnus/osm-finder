# osm-finder (placeholder)

## Team Members
Grant (Xetnus)

## Tool Description
This sections discusses the purpose and motivation for the tool, and how it addresses a tool need you've identified.

## Installation

1. Install osm2pgsql version 1.7.0 or higher. On Ubuntu and Fedora, this requires building from source.
To install on Linux through a package manager: https://osm2pgsql.org/doc/install.html#installing-on-linux
To install on Windows using prebuilt binaries: https://osm2pgsql.org/doc/install.html#installing-on-windows
To install on Ubuntu, follow Building instructions: https://github.com/openstreetmap/osm2pgsql

2. Download openstreetmap data for your area of interest. To follow along with the demo, download the data for Massachusetts at https://download.geofabrik.de/north-america/us.html. Click on the .osm.bz2 download.

3. Download [flex.lua](https://github.com/Xetnus/osm-finder/blob/main/flex.lua) and run the osm2pgsql command `osm2pgsql -d osm -c massachusetts-latest.osm.bz2 -S flex.lua -O flex`

4. Download this project repository.
        git clone git@github.com:Xetnus/osm-finder.git

4. Install python3 if not already installed a run `python3 -m http.server` in project directory.

## Usage
This sections includes detailed instructions for using the tool. If the tool has a command-line interface, include common commands and arguments, and some examples of commands and a description of the expected output. If the tool has a graphical user interface or a browser interface, include screenshots and describe a common workflow.

## Additional Information
This section includes any additional information that you want to mention about the tool, including:
- Potential next steps for the tool (i.e. what you would implement if you had more time)
- Any limitations of the current implementation of the tool
- Motivation for design/architecture decisions
