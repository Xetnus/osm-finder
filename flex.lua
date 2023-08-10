-- Shape comparison options
-- 0: disabled
-- 1: enabled (all algorithms)
-- 2: only Hu Moments (https://en.wikipedia.org/wiki/Image_moment#Rotation_invariants)
shape_comparison = 1

-- Imports json.lua (a helper file that can read JSON)
json = require("json")

local function read_file(path)
    local open = io.open
    local file = open(path, "r") 
    if not file then return nil end
    local content = file:read("*a")
    file:close()
    return content
end

local categoriesFile = "src/assets/categories.json"
local fileContent = read_file(categoriesFile);
if fileContent == nil then
    print("Error: Please ensure that " .. categoriesFile .. " exists.")
    os.exit()
end

local categories = {} 

for category, v in pairs(json.parse(fileContent)) do
    for _, tableValue in ipairs(v) do
        local key = category
        local value = tableValue
        local index = string.find(tableValue, "=")
        if index ~= nil then
            key = string.sub(tableValue, 1, index - 1)
            value = string.sub(tableValue, index + 1)
        end
        categories[key .. "=" .. value] = category
    end
end

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
  },
--   indexes = {
--     { column = 'osm_id', method = 'hash' },
--     { column = 'category', method = 'hash' },
--     { column = 'subcategory', method = 'hash' }
--   },
})

tables.shapes = osm2pgsql.define_table({
  name = 'shapes', 
  ids = { type = 'any', type_column = 'osm_type', id_column = 'osm_id' },
  columns = {
    { column = 'tags', type = 'jsonb' },
    { column = 'category', type = 'text' },
    { column = 'subcategory', type = 'text' },
    { column = 'geom', type = 'polygon', projection = srid, not_null = true },
    { column = 'hu1', sql_type = 'real' },
    { column = 'hu2', sql_type = 'real' },
    { column = 'hu3', sql_type = 'real' },
    { column = 'hu4', sql_type = 'real' },
    { column = 'hu5', sql_type = 'real' },
    { column = 'hu6', sql_type = 'real' },
    { column = 'hu7', sql_type = 'real' },
  },
--   indexes = {
--     { column = 'osm_id', method = 'hash' },
--     { column = 'category', method = 'hash' },
--     { column = 'subcategory', method = 'hash' }
--   },
})

tables.linestrings = osm2pgsql.define_table({
  name = 'linestrings',
  ids = { type = 'any', type_column = 'osm_type', id_column = 'osm_id' },
  columns = {
    { column = 'tags', type = 'jsonb' },
    { column = 'category', type = 'text' },
    { column = 'subcategory', type = 'text' },
    { column = 'geom', type = 'linestring', projection = srid, not_null = true },
  },
--   indexes = {
--     { column = 'osm_id', method = 'hash' },
--     { column = 'category', method = 'hash' },
--     { column = 'subcategory', method = 'hash' }
--   },
})

if shape_comparison ~= 0 then
    require('shapeComparison')
end

local function store_nodes(nodes)
    local node_count = 0
    for k, v in pairs(nodes) do
        node_count = node_count + 1
    end

    storeNodesBatch(node_count, nodes)
end

node_list = {}
node_list_size = 0

function osm2pgsql.process_node(object)
    -- Store a list of each node's latitude and longitude
    if shape_comparison ~= 0 then
        local longitude, latitude, same1, same2 = object:get_bbox()

        -- Converts longitude and latitude from epsg4326 to epsg3857
        local smRadius = 6378136.98
        local smRange = smRadius * math.pi * 2.0
        local smLonToX = smRange / 360.0
        local smRadiansOverDegrees = math.pi / 180.0
        local e = 2.7182818284590452353602874713527

        longitude = longitude * smLonToX;

        local y = latitude;

        if (y > 86.0) then
            latitude = smRange
        elseif (y < -86.0) then
            latitude = -smRange
        else
            y = y * smRadiansOverDegrees
            y = math.log(math.tan(y) + (1.0 / math.cos(y)), e)
            latitude = y * smRadius
        end

        local location = { x = longitude, y = latitude }
        node_list[object.id] = location
        node_list_size = node_list_size + 1

        if node_list_size >= 500000 then
            store_nodes(node_list)
            node_list = {}
            node_list_size = 0
        end
    end

    if clean_tags(object.tags) then
        return
    end

    local category
    local subcategory

    for k, v in pairs(object.tags) do
        category = categories[k .. "=" .. v]
        if category == nil then
            category = categories[k .. "=*"]
        end
        subcategory = v

        if category ~= nil then
            tables.nodes:insert({
                tags = object.tags,
                category = category,
                subcategory = subcategory,
                geom = object:as_point()
            })
            break
        end
    end
end

flag = 0
function osm2pgsql.process_way(object)
    -- Stores the remaining nodes that didn't quite make the last batch's count threshold
    if shape_comparison ~= 0 and node_list_size > 0 then
        store_nodes(node_list)
        node_list = {}
        node_list_size = 0
    end

    if clean_tags(object.tags) then
        return
    end
	
    local category
    local subcategory 

    for k, v in pairs(object.tags) do
        category = categories[k .. "=" .. v]
        if category == nil then
            category = categories[k .. "=*"]
        end
        subcategory = v

        if category ~= nil then 
            if object.is_closed then
                insertPolygonalNode(object, category, subcategory)

                if shape_comparison == 1 or shape_comparison == 2 then
                    insertHuMoments(object, category, subcategory)
                end
            end

            insertLinestring(object, category, subcategory)
            break
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
-- https://en.wikipedia.org/wiki/Image_moment
----------------------------------------------------------------

function insertHuMoments(object, category, subcategory)
    -- if object.id ~= 355536359 then
    --     return
    -- end

    local count = 0
    for _, node_id in ipairs(object.nodes) do
        count = count + 1
    end

    -- C implementation of Hu Moments is at least 10x faster than Lua implementation
    local h1, h2, h3, h4, h5, h6, h7 = calculateHuMoments(count, object.nodes)

    tables.shapes:insert({
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
    })
end