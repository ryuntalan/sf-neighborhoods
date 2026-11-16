# Know Your Neighborhood

A static website about San Francisco neighborhoods, built with HTML, CSS, and vanilla JavaScript.

## Neighborhood boundaries

The map draws the City and County of San Francisco’s [Analysis Neighborhoods](https://data.sfgov.org/Geographic-Locations-and-Boundaries/Analysis-Neighborhoods/j2bu-swwd) dataset from DataSF (`j2bu-swwd`). The Department of Public Health and the Mayor’s Office of Housing and Community Development created these 41 areas, with support from the Planning Department, by grouping 2010 census tracts. They are a standard reporting geography. They are not legally codified neighborhood boundaries.

- Local file: `data/sf-neighborhoods.geojson`
- Source download: <https://data.sfgov.org/resource/j2bu-swwd.geojson?$limit=100>
- License: [Open Data Commons Public Domain Dedication and License (PDDL) 1.0](http://opendatacommons.org/licenses/pddl/1.0/)
- Retrieved: 2026-11-12

Open the site through a local web server so the page can load the GeoJSON file. From the project folder:

```sh
python3 -m http.server
```
