-- Shape comparison options
-- 0: disabled
-- 1: enabled (all algorithms)
-- 2: only Hu Moments
shape_comparison = 1

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
    { column = 'geom', type = 'polygon', projection = srid, not_null = true },
    -- { column = 'num_nodes', sql_type = 'int8' },
    { column = 'hu1', sql_type = 'real' },
    { column = 'hu2', sql_type = 'real' },
    { column = 'hu3', sql_type = 'real' },
    { column = 'hu4', sql_type = 'real' },
    { column = 'hu5', sql_type = 'real' },
    { column = 'hu6', sql_type = 'real' },
    { column = 'hu7', sql_type = 'real' },
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

node_list = {}

function osm2pgsql.process_node(object)
    -- Store a list of each node's latitude and longitude
    if shape_comparison ~= 0 then
        local longitude, latitude, same1, same2 = object:get_bbox()
        local location = { x = longitude, y = latitude }
        node_list[object.id] = location
    end

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
	
    local category
    local subcategory

    if object.tags['building'] then
        category = 'building'
        if object.is_closed then
            subcategory = object.tags[category]
            insertPolygonalNode(object, category, subcategory)

            if shape_comparison == 1 or shape_comparison == 2 then
                insertHuMoments(object, category, subcategory)
            end
        end
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

----------------------------------------------------------------
-- Functions to calculate Hu Moments
-- Based on explanation found here:
-- https://www.kaggle.com/code/keizerzilla/four-shapes-using-hu-moments-99-98-acc-0-02-std
----------------------------------------------------------------

function insertHuMoments(object, category, subcategory)
    local coords = {}
    local count = 0
    for _, node_id in ipairs(object.nodes) do
        coords[count] = node_list[node_id]
        count = count + 1
    end

    -- require("shape_comparison")
    -- print(calculate_eta(52))

    local h1 = calculateEta(coords, 2, 0) + calculateEta(coords, 0, 2)
    local h2 = ((calculateEta(coords, 2, 0) - calculateEta(coords, 0, 2)) ^ 2) + 4 * (calculateEta(coords, 1, 1) ^ 2)
    local h3 = ((calculateEta(coords, 3, 0) - 3 * calculateEta(coords, 1, 2)) ^ 2) + 3 * ((calculateEta(coords, 0, 3) - 3 * calculateEta(coords, 2, 1)) ^ 2)
    local h4 = ((calculateEta(coords, 3, 0) + calculateEta(coords, 1, 2)) ^ 2) + ((calculateEta(coords, 0, 3) + calculateEta(coords, 2, 1)) ^ 2)
    local h5 = (calculateEta(coords, 3, 0) - 3 * calculateEta(coords, 1, 2)) * (calculateEta(coords, 3, 0) + calculateEta(coords, 1, 2)) * ((calculateEta(coords, 3, 0) + calculateEta(coords, 1, 2)) ^ 2) - 3 * ((calculateEta(coords, 0, 3) + calculateEta(coords, 2, 1)) ^ 2)
            + ((3 * calculateEta(coords, 2, 1) - calculateEta(coords, 0, 3)) * (calculateEta(coords, 0, 3) + calculateEta(coords, 2, 1)) * (3 * ((calculateEta(coords, 3, 0) + calculateEta(coords, 1, 2)) ^ 2) - ((calculateEta(coords, 0, 3) + calculateEta(coords, 2, 1)) ^ 2)))
    local h6 = (calculateEta(coords, 2, 0) - calculateEta(coords, 0, 2)) * (((calculateEta(coords, 3, 0) + calculateEta(coords, 1, 2)) ^ 2) - 7 * ((calculateEta(coords, 0, 3) + calculateEta(coords, 2, 1)) ^ 2))
            + 4 * (calculateEta(coords, 1, 1) * (calculateEta(coords, 3, 0) + calculateEta(coords, 1, 2)) * (calculateEta(coords, 0, 3) + calculateEta(coords, 2, 1)))
    local h7 = (3 * calculateEta(coords, 2, 1) - calculateEta(coords, 0, 3)) * (calculateEta(coords, 3, 0) + calculateEta(coords, 1, 2)) * (((calculateEta(coords, 3, 0) + calculateEta(coords, 1, 2)) ^ 2) - 3 * ((calculateEta(coords, 0, 3) + calculateEta(coords, 2, 1)) ^ 2))
            + (calculateEta(coords, 3, 0) - 3 * calculateEta(coords, 1, 2)) * (calculateEta(coords, 0, 3) + calculateEta(coords, 2, 1)) * (3 * ((calculateEta(coords, 3, 0) + calculateEta(coords, 1, 2)) ^ 2) - ((calculateEta(coords, 0, 3) + calculateEta(coords, 2, 1)) ^ 2))

    tables.closed_shapes:insert({
        tags = object.tags,
        category = category,
        subcategory = subcategory,
        geom = object:as_polygon(),
        hu1 = h1,
        hu2 = h2,
        hu3 = h3,
        hu4 = h4,
        hu5 = h5,
        hu6 = h6,
        hu7 = h7,
        -- num_nodes = #object.nodes,
    })
end

function dist2(v, w)
    return ((v.x - w.x) ^ 2) + ((v.y - w.y) ^ 2)
end

function distToSegmentSquared(p, v, w)
    local l2 = dist2(v, w)
    if l2 == 0 then
        return dist2(p, v)
    end
    local t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2

    -- The next if statement implements this JS code:
    -- t = Math.max(0, Math.min(1, t))
    if t < 1 then
        if t < 0 then
            t = 0
        end
    else
        t = 1
    end

    return dist2(p, { x = v.x + t * (w.x - v.x), y = v.y + t * (w.y - v.y) })
end

-- Determines shortest distance between a point and line segment
-- p: point whose distance to line segment will be measured
-- v: point at one end of line segment
-- w: point at other end of line segment
-- Translated from this answer https://stackoverflow.com/a/1501725/1941353
function distToSegment(p, v, w)
    return math.sqrt(distToSegmentSquared(p, v, w));
end

function calculateI(nodes, x, y)
    local p = { ["x"] = x, ["y"] = y }

    local node_count = 0
    for _ in pairs(nodes) do node_count = node_count + 1 end

    for i = 0, node_count - 2 do
        local segment_p1 = { ["x"] = nodes[i].x, ["y"] = nodes[i].y }
        local segment_p2 = { ["x"] = nodes[i + 1].x, ["y"] = nodes[i + 1].y }
        if distToSegment(p, segment_p1, segment_p2) < 1 then
            return 1
        end
    end

    return 0
end

function calculateM(nodes, p, q, max_x, max_y)
    local m = 0
    for x = 0, max_x do
        for y = 0, max_y do
            m = m + ((x ^ p) * (y ^ q) * calculateI(nodes, x, y))
        end
    end
    return m
end

-- Greek letter mu
function calculateMu(nodes, p, q, max_x, max_y)
    local centroid_x = calculateM(nodes, 1, 0, max_x, max_y) / calculateM(nodes, 0, 0, max_x, max_y)
    local centroid_y = calculateM(nodes, 0, 1, max_x, max_y) / calculateM(nodes, 0, 0, max_x, max_y)

    local mu = 0
    for x = 0, max_x do
        for y = 0, max_y do
            mu = mu + ((x - centroid_x) ^ p) * ((y - centroid_y) ^ q) * calculateI(nodes, x, y)
        end
    end

    return mu
end

-- Greek letter eta
function calculateEta(nodes, p, q)
    local max_x = 30
    local max_y = 30
    local numerator = calculateMu(nodes, p, q, max_x, max_y)
    local denominator = calculateMu(nodes, 0, 0, max_x, max_y) ^ (1 + (p + q) / 2)
    return numerator / denominator
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
