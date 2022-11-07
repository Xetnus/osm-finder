local highway_vehicle_types = {
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

local highway_path_types = {
    'footway',
    'pedestrian',
    'bridleway',
    'steps',
    'cycleway',
    'path',
    'sidewalk'
}

local delete_keys = {
    -- "mapper" keys
    'attribution', 'comment', 'created_by', 'fixme', 'note', 'note:*', 'odbl', 'odbl:note', 'source', 'source:*', 'source_ref',
    -- "import" keys
    'CLC:*', 'geobase:*', 'canvec:*', 'osak:*', 'kms:*', 'ngbe:*', 'it:fvg:*', 'KSJ2:*', 'yh:*', 'LINZ2OSM:*', 'linz2osm:*', 'LINZ:*', 'ref:linz:*', 'WroclawGIS:*', 'naptan:*', 'tiger:*', 'gnis:*', 'NHD:*', 'nhd:*', 'mvdgis:*', 'project:eurosha_2012', 'ref:UrbIS', 'accuracy:meters', 'sub_sea:type', 'waterway:type', 'statscan:rbuid', 'ref:ruian:addr', 'ref:ruian', 'building:ruian:type', 'dibavod:id', 'uir_adr:ADRESA_KOD', 'gst:feat_id', 'maaamet:ETAK', 'ref:FR:FANTOIR', '3dshapes:ggmodelk', 'AND_nosr_r', 'OPPDATERIN', 'addr:city:simc', 'addr:street:sym_ul', 'building:usage:pl', 'building:use:pl', 'teryt:simc', 'raba:id', 'dcgis:gis_id', 'nycdoitt:bin', 'chicago:building_id', 'lojic:bgnum', 'massgis:way_id', 'lacounty:*', 'at_bev:addr_date',
    -- misc
    'import', 'import_uuid', 'OBJTYPE', 'SK53_bulk:load', 'mml:class'
}

local clean_tags = osm2pgsql.make_clean_tags_func(delete_keys)

local srid = 3857

local tables = {}



tables.nodes = osm2pgsql.define_node_table('nodes', {
    { column = 'tags', type = 'jsonb' },
    { column = 'generic_type', type = 'text' },
    { column = 'subtype', type = 'text' },
    { column = 'geom', type = 'point', projection = srid, not_null = true },
})

tables.closed_shapes = osm2pgsql.define_way_table('closed_shapes', {
    { column = 'name', type = 'text' },
    { column = 'tags', type = 'jsonb' },
    { column = 'generic_type', type = 'text' },
    { column = 'subtype', type = 'text' },
    { column = 'geom', type = 'polygon', projection = srid, not_null = true },
    { column = 'nodes', sql_type = 'int8[]' },
})

tables.linestrings = osm2pgsql.define_way_table('linestrings', {
    { column = 'name', type = 'text' },
    { column = 'tags', type = 'jsonb' },
    { column = 'generic_type', type = 'text' },
    { column = 'subtype', type = 'text' },
    { column = 'geom', type = 'linestring', projection = srid, not_null = true },
    { column = 'nodes', sql_type = 'int8[]' },
})




-- Prepare table "types" for quick checking of highway types
local highway_types = {}
for _, k in ipairs(highway_vehicle_types) do
    highway_types[k] = "vehicle"
end
for _, k in ipairs(highway_path_types) do
    highway_types[k] = "path"
end


function osm2pgsql.process_node(object)
    if clean_tags(object.tags) then
        return
    end

    local man_made = object.tags['man_made']

    if not man_made then
        return
    end
    
    if man_made == 'tower' or man_made == 'communications_tower' or man_made == 'water_tower' then
        tables.nodes:insert({
            tags = object.tags,
            generic_type = "tower",
            subtype = man_made,
            geom = object:as_point()
        })
    end
end

function osm2pgsql.process_way(object)
    if clean_tags(object.tags) then
        return
    end
	
    local name = object.tags.name

    local generic_type
    local subtype
    local geom

    if object.tags.building ~= nil and object.is_closed then
        generic_type = 'building'
        subtype = object.tags.building  
        
        tables.closed_shapes:insert({
            name = name,
            generic_type = generic_type,
            subtype = subtype,

            -- The way node ids are put into a format that PostgreSQL understands
            -- for a column of type "int8[]".
            nodes = '{' .. table.concat(object.nodes, ',') .. '}',

            tags = object.tags,
            geom = object:as_polygon()
        })
        return
    elseif highway_types[object.tags.highway] then
        generic_type = 'highway'
        subtype = highway_types[object.tags.highway]
    elseif object.tags.railway ~= nil then
    	generic_type = 'railway'
    	subtype = object.tags.railway
    elseif object.tags.power == 'line' or object.tags.power == 'minor_line' then
    	generic_type = 'power'
    	subtype = object.tags.power
    else
    	return
    end

    tables.linestrings:insert({
        name = name,
        generic_type = generic_type,
        subtype = subtype,

        -- The way node ids are put into a format that PostgreSQL understands
        -- for a column of type "int8[]".
        nodes = '{' .. table.concat(object.nodes, ',') .. '}',

        tags = object.tags,
        geom = object:as_linestring()
    })
end
