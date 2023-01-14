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
    { column = 'geom', type = 'point', projection = srid, not_null = true },
}})

-- TODO: Area shape matching
-- tables.closed_shapes = osm2pgsql.define_table({
--   name = 'closed_shapes', 
--   ids = { type = 'way', id_column = 'id' },
--   columns = {
--     { column = 'tags', type = 'jsonb' },
--     { column = 'category', type = 'text' },
--     { column = 'geom', type = 'polygon', projection = srid, not_null = true },
--     { column = 'nodes', sql_type = 'int8[]' },
-- }})

tables.linestrings = osm2pgsql.define_table({
  name = 'linestrings',
  ids = { type = 'any', type_column = 'osm_type', id_column = 'osm_id' },
  columns = {
    { column = 'tags', type = 'jsonb' },
    { column = 'category', type = 'text' },
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


function osm2pgsql.process_node(object)
    if clean_tags(object.tags) then
        return
    end

    local category

    if object.tags['building'] then
        category = 'building'
    elseif object.tags['railway'] then
        category = 'railway'
    elseif object.tags['power'] then
        category = 'power'
    elseif object.tags['man_made'] then
        category = 'man_made'
    end

    if category then
        tables.nodes:insert({
            tags = object.tags,
            category = category,
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
            insertPolygonalNode(object, 'building')
        end
        -- TODO: Area shape matching
    elseif highway_types[object.tags['highway']] then
        category = highway_types[object.tags['highway']]
        insertLinestring(object, category)
    elseif object.tags['railway'] then
    	category = 'railway'

        if object.is_closed then
            insertPolygonalNode(object, category)
        else
            insertLinestring(object, category)
        end
    elseif object.tags['power'] then
    	category = 'power'

        if object.is_closed then
            insertPolygonalNode(object, category)
        else
            insertLinestring(object, category)
        end
    elseif object.tags['waterway'] then
        category = 'waterway'

        -- TODO: Area shape matching
        if not object.is_closed then
            insertLinestring(object, category)
        end
    elseif object.tags['natural'] == 'coastline' then
        category = 'coastline'

        -- TODO: Area shape matching
        if not object.is_closed then
            insertLinestring(object, category)
        end
    elseif object.tags['man_made'] then
    	category = 'man_made'

        if object.is_closed then
            insertPolygonalNode(object, category)
        else
            insertLinestring(object, category)
        end
    end
end


-- Converts a polygon (e.g. way) to a node by using the
-- centroid as the node's point, then inserts it into
-- the nodes table
function insertPolygonalNode(object, category)
    tables.nodes:insert({
        tags = object.tags,
        category = category,
        geom = object:as_polygon():centroid()
    })
end

-- Inserts a linestring as-is into the linestrings table
function insertLinestring(object, category)
    tables.linestrings:insert({
        category = category,
        -- nodes = '{' .. table.concat(object.nodes, ',') .. '}',
        tags = object.tags,
        geom = object:as_linestring()
    })
end

-- TODO: Area shape matching
-- function insertClosedShape(object, category)
    -- tables.closed_shapes:insert({
    --     category = category,

    --     -- The way node ids are put into a format that PostgreSQL understands
    --     -- for a column of type "int8[]".
    --     nodes = '{' .. table.concat(object.nodes, ',') .. '}',

    --     tags = object.tags,
    --     geom = object:as_polygon()
    -- })
-- end 
