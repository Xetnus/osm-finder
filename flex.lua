local highway_roadway_types = {
    'motorway',
    'motorway_link',
    'trunk',
    'trunk_link',
    'primary',
    'primary_link',
    'secondary',
    'secondary_link',
    'tertiary',
    'tertiary_link',
    'unclassified',
    'residential',
    'track',
    'living_street',
    'service',
    'road',
    'busway',
    'bus_guideway',
    'raceway',
    'escape',
    'construction'
}

local highway_walkway_types = {
    'footway',
    'pedestrian',
    'bridleway',
    'steps',
    'cycleway',
    'path',
    'sidewalk'
}

-- A list of keys that provide no geolocation value. These are removed from each element's tags.
local delete_keys = {
    -- "mapper" keys
    'attribution', 'comment', 'created_by', 'fixme', 'note', 'note:*', 'odbl', 'odbl:note', 'source', 'source:*', 'source_ref',

    -- "import" keys
    'CLC:*', 'geobase:*', 'canvec:*', 'osak:*', 'kms:*', 'ngbe:*', 'it:fvg:*', 'KSJ2:*', 'yh:*', 'LINZ2OSM:*', 
    'linz2osm:*', 'LINZ:*', 'ref:linz:*', 'WroclawGIS:*', 'naptan:*', 'tiger:*', 'gnis:*', 'NHD:*', 'nhd:*', 
    'mvdgis:*', 'project:eurosha_2012', 'ref:UrbIS', 'accuracy:meters', 'sub_sea:type', 'waterway:type', 
    'statscan:rbuid', 'ref:ruian:addr', 'ref:ruian', 'building:ruian:type', 'dibavod:id', 'uir_adr:ADRESA_KOD', 
    'gst:feat_id', 'maaamet:ETAK', 'ref:FR:FANTOIR', '3dshapes:ggmodelk', 'AND_nosr_r', 'OPPDATERIN', 
    'addr:city:simc', 'addr:street:sym_ul', 'building:usage:pl', 'building:use:pl', 'teryt:simc', 'raba:id', 
    'dcgis:gis_id', 'nycdoitt:bin', 'chicago:building_id', 'lojic:bgnum', 'massgis:way_id', 'lacounty:*', 
    'at_bev:addr_date',

    -- misc
    'import', 'import_uuid', 'OBJTYPE', 'SK53_bulk:load', 'mml:class'
}

local clean_tags = osm2pgsql.make_clean_tags_func(delete_keys)

local srid = 3857

local tables = {}

tables.nodes = osm2pgsql.define_table({
  name = 'nodes',
  ids = { type = 'any', type_column = 'osm_type', id_column = 'osm_id' },
  columns = {
    { column = 'tags', type = 'jsonb' },
    { column = 'category', type = 'text' },
    { column = 'subcategory', type = 'text' },
    { column = 'geom', type = 'point', projection = srid, not_null = true },
}})

tables.closed_shapes = osm2pgsql.define_table({
  name = 'closed_shapes', 
  ids = { type = 'way', id_column = 'id' },
  columns = {
    { column = 'tags', type = 'jsonb' },
    { column = 'category', type = 'text' },
    { column = 'subcategory', type = 'text' },
    { column = 'geom', type = 'linestring', projection = srid, not_null = true },
    { column = 'center', type = 'point', projection = srid },
    { column = 'nodes', sql_type = 'int8[]' },
    { column = 'num_nodes', sql_type = 'int8' },
}})

tables.linestrings = osm2pgsql.define_table({
  name = 'linestrings',
  ids = { type = 'any', type_column = 'osm_type', id_column = 'osm_id' },
  columns = {
    { column = 'tags', type = 'jsonb' },
    { column = 'category', type = 'text' },
    { column = 'subcategory', type = 'text' },
    { column = 'geom', type = 'linestring', projection = srid, not_null = true },
}})

-- Prepares a dictionary that'll be used to quickly sort the
-- highway linestrings into the roadway or walkway category
local highway_types = {}
for _, k in ipairs(highway_roadway_types) do
    highway_types[k] = "roadway"
end
for _, k in ipairs(highway_walkway_types) do
    highway_types[k] = "walkway"
end

local count = 0


-- WITH distances AS
-- (
-- 	SELECT id, 
-- 	ST_Distance(ST_PointN(geom, 1), ST_PointN(geom, 2)) AS d1, 
-- 	ST_Distance(ST_PointN(geom, 2), ST_PointN(geom, 3)) AS d2,
-- 	ST_Distance(ST_PointN(geom, 3), ST_PointN(geom, 4)) AS d3, 
-- 	ST_Distance(ST_PointN(geom, 4), ST_PointN(geom, 5)) AS d4, 
-- 	ST_Distance(ST_PointN(geom, 5), ST_PointN(geom, 6)) AS d5, 
-- 	ST_Distance(ST_PointN(geom, 6), ST_PointN(geom, 7)) AS d6, 
-- 	ST_Distance(ST_PointN(geom, 7), ST_PointN(geom, 8)) AS d7, 
-- 	ST_Distance(ST_PointN(geom, 8), ST_PointN(geom, 9)) AS d8
-- 	FROM closed_shapes WHERE num_nodes = 9
-- ),
-- least AS
-- (
-- 	SELECT distances.id, LEAST(distances.d1, distances.d2, distances.d3, distances.d4, distances.d5, distances.d6, distances.d7, distances.d8) AS l, distances.d1, distances.d2, distances.d3, distances.d4, distances.d5, distances.d6, distances.d7, distances.d8
-- 	FROM distances
-- ),
-- reduced AS
-- (
-- 	SELECT least.id, UNNEST(array[(least.d1 / least.l), (least.d2 / least.l), (least.d3 / least.l), (least.d4 / least.l), (least.d5 / least.l), (least.d6 / least.l), (least.d7 / least.l), (least.d8 / least.l)]) AS list
-- 	FROM least
-- ),
-- results AS
-- (
-- 	SELECT reduced.id, abs(stddev_pop(reduced.list) - 2.1272501286928 + avg(reduced.list) - 3.710361111125) AS diff
-- 	FROM reduced
-- 	GROUP BY id
-- 	ORDER BY diff ASC
-- )
-- SELECT row_number() over (), results.id, results.diff
-- FROM results;



-- WITH PERSPECTIVE SKEW
-- 274.59 / 25.30 = 10.853359684
-- 78.10 / 25.30 = 3.086956522
-- 320.62 / 25.30 = 12.672727273
-- 72.47 / 25.30 = 2.864426877
-- 196.37 / 25.30 = 7.761660079
-- 240.21 / 25.30 = 9.494466403
-- 134.01 / 25.30 = 5.296837945
-- 25.30 / 25.30 = 1
-- 10.853359684, 3.086956522, 12.672727273, 2.864426877, 7.761660079, 9.494466403, 5.296837945, 1
-- mean = 6.628804347875
-- dev = 3.9377031675282


-- ACCOUNTING FOR PERSPECTIVE SKEW
-- 276.72 / 45 = 6.149333333
-- 276.72 / 45 = 6.149333333
-- 86.09 / 45 = 1.913111111
-- 75.18 / 45 = 1.670666667
-- 138.01 / 45 = 3.066888889
-- 138.01 / 45 = 3.066888889
-- 300 / 45 = 6.666666667
-- 45 / 45 = 1
-- 6.149333333, 6.149333333, 1.913111111, 1.670666667, 3.066888889, 3.066888889, 6.666666667, 1
-- mean = 3.710361111125
-- dev = 2.1272501286928



function osm2pgsql.process_node(object)
    if clean_tags(object.tags) then
        return
    end

    local category
    local subcategory

    if object.tags['building'] then
        category = 'building'
        subcategory = object.tags['building']
    elseif object.tags['railway'] then
        category = 'railway'
        subcategory = object.tags['railway']
    elseif object.tags['power'] then
        category = 'power'
        subcategory = object.tags['power']
    elseif object.tags['man_made'] then
        category = 'man_made'
        subcategory = object.tags['man_made']
    end

    if category then
        tables.nodes:insert({
            tags = object.tags,
            category = category,
            subcategory = subcategory,
            geom = object:as_point()
        })
    end
end

function osm2pgsql.process_way(object)
    if clean_tags(object.tags) then
        return
    end
	
    if object.tags['building'] then
        if object.is_closed then
            subcategory = object.tags['building']
            insertPolygonalNode(object, 'building', subcategory)

            tables.closed_shapes:insert({
                tags = object.tags,
                category = 'building',
                subcategory = subcategory,
                geom = object:as_linestring(),
                center = object:as_polygon():centroid(),
                nodes = '{' .. table.concat(object.nodes, ',') .. '}',
                num_nodes = #object.nodes,
            })
        end
        -- TODO: Area shape matching
    elseif highway_types[object.tags['highway']] then
        category = highway_types[object.tags['highway']]
        subcategory = object.tags['highway']
        insertLinestring(object, category, subcategory)
    elseif object.tags['railway'] then
    	category = 'railway'
        subcategory = object.tags['railway']

        if object.is_closed then
            insertPolygonalNode(object, category, subcategory)
        else
            insertLinestring(object, category, subcategory)
        end
    elseif object.tags['power'] then
    	category = 'power'
        subcategory = object.tags['power']

        if object.is_closed then
            insertPolygonalNode(object, category, subcategory)
        else
            insertLinestring(object, category, subcategory)
        end
    elseif object.tags['waterway'] then
        category = 'waterway'
        subcategory = object.tags['waterway']

        -- TODO: Area shape matching
        if not object.is_closed then
            insertLinestring(object, category, subcategory)
        end
    elseif object.tags['natural'] == 'coastline' then
        category = 'coastline'

        -- TODO: Area shape matching
        if not object.is_closed then
            insertLinestring(object, category, '')
        end
    elseif object.tags['man_made'] then
    	category = 'man_made'
        subcategory = object.tags['man_made']

        if object.is_closed then
            insertPolygonalNode(object, category, subcategory)
        else
            insertLinestring(object, category, subcategory)
        end
    end
end


-- Converts a polygon (e.g. way) to a node by using the
-- centroid as the node's point, then inserts it into
-- the nodes table
function insertPolygonalNode(object, category, subcategory)
    tables.nodes:insert({
        tags = object.tags,
        category = category,
        subcategory = subcategory,
        geom = object:as_polygon():centroid()
    })
end

-- Inserts a linestring as-is into the linestrings table
function insertLinestring(object, category, subcategory)
    tables.linestrings:insert({
        category = category,
        subcategory = subcategory,
        tags = object.tags,
        geom = object:as_linestring()
    })
end

-- TODO: Area shape matching
-- function insertClosedShape(object, category)
    -- tables.closed_shapes:insert({
    --     category = category,
    --     subcategory = subcategory,

    --     -- The way node ids are put into a format that PostgreSQL understands
    --     -- for a column of type "int8[]".
    --     nodes = '{' .. table.concat(object.nodes, ',') .. '}',

    --     tags = object.tags,
    --     geom = object:as_polygon()
    -- })
-- end 
