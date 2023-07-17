import { shapes } from 'konva/lib/Shape.js';
import {calculateIntersection} from './generalTools.js'
import {calculateBounds, createTagsQuery, createMaxDistanceQuery, createMinDistanceQuery, createNoOverlappingQuery, calculateHuMoments} from './queryTools.js'

// Example query for single object
/*
WITH sorted_shapes AS
(
  SELECT
    sqrt(pow(hu1 - 1.579253696117602, 2) + pow(hu2 - 0.10631286212389285, 2) + pow(hu3 - 0.13545548639569183, 2) + pow(hu4 - 0.013422893459921623, 2) + pow(hu5 - 0.000292619813566153, 2) + pow(hu6 - 0.002071577493100666, 2) + pow(hu7 - -0.0004919013709091156, 2)) AS distance,
    replace(replace(shape1.osm_type, 'N', 'www.openstreetmap.org/node/'), 'W', 'www.openstreetmap.org/way/') || shape1.osm_id AS shape1_id
  FROM shapes AS shape1
  WHERE shape1.category = 'building'
  ORDER BY distance ASC
),
filtered_shapes AS
(
  SELECT
    sorted_shapes.shape1_id, COUNT(*) OVER () AS count, ROW_NUMBER() OVER () AS row
  FROM sorted_shapes
)
SELECT filtered_shapes.shape1_id
FROM filtered_shapes
WHERE filtered_shapes.row < GREATEST((filtered_shapes.count * 0.01), 500);
*/

function constructSingleObjectQuery(annotations, displayUrls) {
  let query = '';
  if (annotations[0].geometryType === 'shape') {
    query += 'WITH sorted_shapes AS\n';
    query += '(\n';
    query += '  ';
  }

  query += 'SELECT\n';

  if (annotations[0].geometryType === 'shape') {
    let moments = calculateHuMoments(annotations[0].points);
    query += '    sqrt(pow(' + annotations[0].name + '.hu1 - ' + moments[0] + ', 2) + pow(' + annotations[0].name + '.hu2 - ' + moments[1] + ', 2) + pow(' + annotations[0].name + '.hu3 - ' + moments[2] + ', 2) + pow(' + annotations[0].name + '.hu4 - ' + moments[3] + ', 2) + pow(' + annotations[0].name + '.hu5 - ' + moments[4] + ', 2) + pow(' + annotations[0].name + '.hu6 - ' + moments[5] + ', 2) + pow(' + annotations[0].name + '.hu7 - ' + moments[6] + ', 2)) AS distance,\n';
    query += '  ';
  }

  let wayPrefix = displayUrls ? 'www.openstreetmap.org/way/' : 'way ';
  let nodePrefix = displayUrls ? 'www.openstreetmap.org/node/' : 'node ';
  query += '  replace(replace(' + annotations[0].name + ".osm_type, 'N', '" + nodePrefix + "'), 'W', '" + wayPrefix + "') || ";
  query += annotations[0].name + '.osm_id AS ' + annotations[0].name + '_id\n';

  if (annotations[0].geometryType === 'shape') {
    query += '  ';
  }

  query += 'FROM ';
  query += annotations[0].geometryType + 's AS ' + annotations[0].name + '\n';

  if (annotations[0].geometryType === 'shape') {
    query += '  ';
  }

  query += 'WHERE ';
  // Filters results by category and subcategory
  let category = annotations[0].category;
  let subcategory = annotations[0].subcategory;
  let subcategoryString = (subcategory == '' ? '' : annotations[0].name + '.subcategory = \'' + subcategory + '\' AND ');
  query += annotations[0].name + '.category = \'' + category + '\' AND ' + subcategoryString;

  // Adds any additional tags entered by the user to the WHERE
  if (annotations[0].tags.length != 0) {
    query += createTagsQuery(annotations[0]);
  }
  query = query.slice(0, query.length - 5); // remove last AND

  if (annotations[0].geometryType === 'shape') {
    query += '\n';
    query += '),\n';
    query += 'filtered_shapes AS\n';
    query += '(\n';
    query += '  SELECT\n';
    query += '    sorted_shapes.' + annotations[0].name + '_id, COUNT(*) OVER () AS count, ROW_NUMBER() OVER (ORDER BY distance ASC) AS row\n';
    query += '  FROM sorted_shapes\n';
    query += ')\n';
    query += 'SELECT filtered_shapes.' + annotations[0].name + '_id\n';
    query += 'FROM filtered_shapes\n';
    query += 'WHERE filtered_shapes.row < GREATEST((filtered_shapes.count * 0.01), 500)\n';
    query += 'ORDER BY row ASC';
  }
  query += ';';

  return query;
}

// Example Query for Disjoint
/*
WITH sorted_shapes AS
(
  SELECT
    sqrt
    (
      pow(
        sqrt(pow(shape1.hu1 - 1.5733173076923075, 2) + pow(shape1.hu2 - 0.324551808672033, 2) + pow(shape1.hu3 - 0.9423223732061282, 2) + pow(shape1.hu4 - 0.04076357752790922, 2) + pow(shape1.hu5 - 0.007773110612955471, 2) + pow(shape1.hu6 - 0.021820327987814064, 2) + pow(shape1.hu7 - -0.0018459434208921142, 2))
        , 2
      ) +
      pow(
        sqrt(pow(shape2.hu1 - 1.5846498873027794, 2) + pow(shape2.hu2 - 0.017399393958774146, 2) + pow(shape2.hu3 - 1.202141013334282, 2) + pow(shape2.hu4 - 0.003305741482351561, 2) + pow(shape2.hu5 - 0.00013059068294749503, 2) + pow(shape2.hu6 - -0.00003860122739888982, 2) + pow(shape2.hu7 - -0.00016239857863435821, 2))
        , 2
      )
    ) AS distance,
  replace(replace(shape1.osm_type, 'N', 'www.openstreetmap.org/node/'), 'W', 'www.openstreetmap.org/way/') || shape1.osm_id AS shape1_id, 
  replace(replace(shape2.osm_type, 'N', 'www.openstreetmap.org/node/'), 'W', 'www.openstreetmap.org/way/') || shape2.osm_id AS shape2_id
FROM shapes AS shape1, shapes AS shape2
WHERE shape1.category = 'building' AND shape2.category = 'building' AND shape2.osm_id != shape1.osm_id AND ST_DWithin(shape1.geom, shape2.geom, 100)
  ORDER BY distance ASC
),
filtered_shapes AS
(
  SELECT
    sorted_shapes.shape1_id, sorted_shapes.shape2_id, COUNT(*) OVER () AS count, ROW_NUMBER() OVER () AS row
  FROM sorted_shapes
)
SELECT filtered_shapes.shape1_id, filtered_shapes.shape2_id
FROM filtered_shapes
WHERE filtered_shapes.row < GREATEST((filtered_shapes.count * 0.01), 500);
*/

function constructDisjointQuery(annotations, nodes, lines, shapes, displayUrls) {
  let query = '';

  if (shapes.length > 0) {
    query += 'WITH sorted_shapes AS\n';
    query += '(\n';
    query += '  ';
  }
  
  query += 'SELECT\n';

  if (shapes.length > 1) {
    query += '    sqrt\n';
    query += '    (\n';
    for (let i = 0; i < shapes.length; i++) {
      let moments = calculateHuMoments(shapes[i].points);
      query += '      pow(\n';
      query += '        sqrt(pow(' + shapes[i].name + '.hu1 - ' + moments[0] + ', 2) + pow(' + shapes[i].name + '.hu2 - ' + moments[1] + ', 2) + pow(' + shapes[i].name + '.hu3 - ' + moments[2] + ', 2) + pow(' + shapes[i].name + '.hu4 - ' + moments[3] + ', 2) + pow(' + shapes[i].name + '.hu5 - ' + moments[4] + ', 2) + pow(' + shapes[i].name + '.hu6 - ' + moments[5] + ', 2) + pow(' + shapes[i].name + '.hu7 - ' + moments[6] + ', 2))\n';
      query += '        , 2\n';
      const plus = (i == shapes.length - 1) ? '' : ' +';
      query += '      )' + plus + '\n';
    }
    query += '    ) AS distance,\n';
  } else if (shapes.length == 1) {
    let moments = calculateHuMoments(shapes[0].points);
    query += '  sqrt(pow(' + shapes[0].name + '.hu1 - ' + moments[0] + ', 2) + pow(' + shapes[0].name + '.hu2 - ' + moments[1] + ', 2) + pow(' + shapes[0].name + '.hu3 - ' + moments[2] + ', 2) + pow(' + shapes[0].name + '.hu4 - ' + moments[3] + ', 2) + pow(' + shapes[0].name + '.hu5 - ' + moments[4] + ', 2) + pow(' + shapes[0].name + '.hu6 - ' + moments[5] + ', 2) + pow(' + shapes[0].name + '.hu7 - ' + moments[6] + ', 2)) AS distance,\n';
  }

  for (let i = 0; i < annotations.length; i++) {
    const comma = (i == annotations.length - 1) ? '' : ', ';
    let wayPrefix = displayUrls ? 'www.openstreetmap.org/way/' : 'way ';
    let nodePrefix = displayUrls ? 'www.openstreetmap.org/node/' : 'node ';
    query += '  replace(replace(' + annotations[i].name + ".osm_type, 'N', '" + nodePrefix + "'), 'W', '" + wayPrefix + "') || ";
    query += annotations[i].name + '.osm_id AS ' + annotations[i].name + '_id' + comma + '\n';
  }

  query += 'FROM ';
  for (let i = 0; i < annotations.length; i++) {
    const comma = (i == annotations.length - 1) ? '\n' : ', ';
    query += annotations[i].geometryType + 's AS ' + annotations[i].name + comma;
  }

  query += 'WHERE ';
  for (let i = 0; i < annotations.length; i++) {
    // Filters results by category and subcategory
    let category = annotations[i].category;
    let subcategory = annotations[i].subcategory;
    let subcategoryString = (subcategory == '' ? '' : annotations[i].name + '.subcategory = \'' + subcategory + '\' AND ');
    query += annotations[i].name + '.category = \'' + category + '\' AND ' + subcategoryString;

    // Adds any additional tags entered by the user to the WHERE
    if (annotations[i].tags.length != 0) {
      query += createTagsQuery(annotations[i]);
    }
  }

  query += createNoOverlappingQuery(annotations);
  query += createMaxDistanceQuery(annotations);
  query += createMinDistanceQuery(annotations);

  query += '\n';

  // Calculates the angle and error parameters and adds them to the query
  for (let i = 0; i < lines.length; i++) {
    const keys = Object.keys(lines[i].relations)
    for (let k = 0; k < keys.length; k++) {
      const relation = lines[i].relations[keys[k]];

      if (relation.angle != null) {
        let angle = relation.angle;
        let error = relation.error ? relation.error : 0;

        let bounds = calculateBounds(angle, error);

        query += '(\n';
        for (let b = 0; b < bounds.lower.length; b++) {
          query += '  (\n';
          query += '    abs((\n';
          query += '      degrees(ST_Azimuth(ST_StartPoint(' + keys[k] + '.geom), ST_EndPoint(' + keys[k] + '.geom)))\n';
          query += '      -\n';
          query += '      degrees(ST_Azimuth(ST_StartPoint(' + lines[i].name + '.geom), ST_EndPoint(' + lines[i].name + '.geom)))\n';
          query += '    )::decimal % 180.0) ';

          if (bounds.lower[b] === bounds.upper[b])
            query += '= ' + bounds.lower[b] + '\n';
          else
            query += 'BETWEEN ' + bounds.lower[b] + ' AND ' + bounds.upper[b] + '\n';

          query += '  ) ' + ((bounds.lower.length > 1 && b == 0) ? '\n  OR' : '') + '\n';
        }
        query += ')\n';
        query += ' AND \n';
      }
    }
  }

  query = query.slice(0, query.length - 6); // remove last AND

  if (shapes.length > 0) {
    query += '\n';
    query += '),\n';
    query += 'filtered_shapes AS\n';
    query += '(\n';
    query += '  SELECT\n';
    query += '    ';
    for (let i = 0; i < annotations.length; i++) {
      query += 'sorted_shapes.' + annotations[i].name + '_id, ';
    }
    query += 'COUNT(*) OVER () AS count, ROW_NUMBER() OVER (ORDER BY distance ASC) AS row\n';
    query += '  FROM sorted_shapes\n';
    query += ')\n';
    query += 'SELECT '
    for (let i = 0; i < annotations.length; i++) {
      const comma = (i == annotations.length - 1) ? '\n' : ', ';
      query += 'filtered_shapes.' + annotations[i].name + '_id' + comma;
    }
    query += 'FROM filtered_shapes\n';
    query += 'WHERE filtered_shapes.row < GREATEST((filtered_shapes.count * 0.01), 500)\n';
    query += 'ORDER BY row ASC';
  }

  query += ';'

  return query;
}

// Example Query for Intersecting
/*
WITH intersections AS
(
  SELECT
    ((ST_DumpPoints(	
      ST_Intersection(line1.geom, line3.geom)
    )).geom) AS intersection1,
    ((ST_DumpPoints(	
      ST_Intersection(line2.geom, line3.geom)
    )).geom) AS intersection2,
    line1.geom AS line1_geom,
    line2.geom AS line2_geom,
    line3.geom AS line3_geom,
    line1.id AS line1_id,
    line2.id AS line2_id,
    line3.id AS line3_id
  FROM linestrings AS line1, linestrings AS line2, linestrings as line3
  WHERE line1.tags->>'bridge' = 'yes' AND line1.category = 'highway' AND line1.subcategory = 'vehicle' AND 
    line2.tags->>'bridge' = 'yes' AND line2.category = 'highway' AND line2.subcategory = 'vehicle' AND 
    line1.id != line2.id AND line3.category = 'highway' AND line3.subcategory = 'vehicle' AND 
    ST_Intersects(line1.geom, line3.geom) AND ST_Intersects(line2.geom, line3.geom) AND 
    ST_DWithin(line1.geom, line2.geom, 1000) AND ST_Distance(line1.geom, line2.geom) > 200
),
buffers AS 
(
  SELECT
    intersections.intersection1,
    intersections.intersection2,
    ST_ExteriorRing(ST_Buffer(intersections.intersection1, 0.5)) AS ring1,
    ST_ExteriorRing(ST_Buffer(intersections.intersection2, 0.5)) AS ring2,
    intersections.line1_geom,
    intersections.line2_geom,
    intersections.line3_geom,
    intersections.line1_id,
    intersections.line2_id,
    intersections.line3_id
  FROM intersections
),
points AS
(
  SELECT 
    ST_GeometryN
    (
      ST_Intersection(buffers.ring1, buffers.line1_geom)
      , 1
    ) AS ring1_p1,
    ST_GeometryN
    (
      ST_Intersection(buffers.ring1, buffers.line3_geom)
      , 1
    ) AS ring1_p2,
    ST_GeometryN
    (
      ST_Intersection(buffers.ring2, buffers.line2_geom)
      , 1
    ) AS ring2_p1,
    ST_GeometryN
    (
      ST_Intersection(buffers.ring2, buffers.line3_geom)
      , 1
    ) AS ring2_p2,
    buffers.intersection1,
    buffers.intersection2,
    buffers.ring1,
    buffers.ring2,
    buffers.line1_geom,
    buffers.line2_geom,
    buffers.line3_geom,
    buffers.line1_id,
    buffers.line2_id,
    buffers.line3_id
  FROM buffers
)
SELECT 
  points.line1_id,
  points.line2_id,
  points.line3_id
FROM points
WHERE
  (
    abs(round(degrees(
      ST_Azimuth(points.ring1_p2, points.intersection1)
      -
      ST_Azimuth(points.ring1_p1, points.intersection1)
    ))::decimal % 180.0) BETWEEN 88 AND 92
  )
  AND
  (
    abs(round(degrees(
      ST_Azimuth(points.ring2_p2, points.intersection2)
      -
      ST_Azimuth(points.ring2_p1, points.intersection2)
    ))::decimal % 180.0) BETWEEN 45 AND 85
    OR
    abs(round(degrees(
      ST_Azimuth(points.ring2_p2, points.intersection2)
      -
      ST_Azimuth(points.ring2_p1, points.intersection2)
    ))::decimal % 180.0) BETWEEN 95 AND 135
  )
;
*/
function constructIntersectingQuery(annotations, nodes, lines, shapes, displayUrls) {
  // Generates an array that consists of pairs of intersecting lines
  let intersections = [];
  let dbd = [];
  for (let i = 0; i < lines.length; i++) { 
    for (let k = 0; k < lines.length; k++) {
      if (i == k) continue;
      
      // The line whose name comes first when sorted holds the relation information. Find it.
      const index1 = lines[i].name > lines[k].name ? k : i;
      const index2 = lines[i].name > lines[k].name ? i : k;
      const relation = lines[index1].relations[lines[index2].name];

      const line1 = lines[i].points;
      const line2 = lines[k].points;
      const intersection = calculateIntersection(line1, line2);
      if (intersection && intersection.intersects) {
        // Ensures that the pair hasn't already been pushed
        const pair = [lines[i].name, lines[k].name];
        const match = intersections.filter(a => pair.includes(a.line1) && pair.includes(a.line2));
        if (match.length != 0) continue;

        let isAngle = false;
        let angle = null;
        let error = null;

        if (relation && relation.angle != null) {
          isAngle = true;
          angle = relation.angle;
          error = relation.error;
        }

        const description = {
          id: intersections.filter(a => a.isAngle == true).length + 1,
          isPseudo: false,
          isAngle: isAngle,
          node: null,
          line1: lines[i].name,
          line2: lines[k].name,
          angle: angle,
          error: error,
          pseudoAngle: null,
          pseudoError: null,
          minDistance: null,
          maxDistance: null,
        }
        intersections.push(description)
      } else if (relation && relation.angle != null) {
        // Handles disjoint but directional (DBD) relations

        // Ensures that the pair hasn't already been pushed
        const pair = [lines[i].name, lines[k].name];
        const match = dbd.filter(a => pair.includes(a.line1) && pair.includes(a.line2));
        if (match.length != 0) continue;

        dbd.push({
          line1: lines[i].name,
          line2: lines[k].name,
          angle: relation.angle,
          error: relation.error,
        });
      }
    }
  }

  // Generates an array containing the 'pseudo' intersections created by temporary lines drawn
  // between individual nodes/shapes and intersections.
  let pseudoNodes = nodes.concat(shapes);
  for (let i = 0; i < pseudoNodes.length; i++) {
    const keys = Object.keys(pseudoNodes[i].relations);
    for (let k = 0; k < keys.length; k++) {
      if (!keys[k].includes('&')) continue;

      const key = keys[k];
      const line1 = key.split('&')[0];
      const line2 = key.split('&')[1];
      const relation = pseudoNodes[i].relations[key];

      if (relation) {
        const pair = [line1, line2];
        const index = intersections.findIndex(a => pair.includes(a.line1) && pair.includes(a.line2));

        let isAngle = relation.angle ? true : false;
        if (index >= 0 && isAngle == false)
          isAngle = intersections[index].isAngle;

        const id = intersections.filter(a => a.isAngle == true).length + 1;

        const description = {
          id: index >= 0 ? intersections[index].id : id,
          isPseudo: true,
          isAngle: isAngle,
          node: pseudoNodes[i].name,
          line1: line1,
          line2: line2,
          angle: index >= 0 ? intersections[index].angle : null,
          error: index >= 0 ? intersections[index].error : null,
          pseudoAngle: relation.angle,
          pseudoError: relation.error,
          minDistance: relation.minDistance,
          maxDistance: relation.maxDistance,
        }

        if (index >= 0) {
          intersections[index] = description;
        } else {
          intersections.push(description);
        }
      }
    }
  }

  let query = 'WITH intersections AS\n';
  query += '(\n';
  query += '  SELECT\n';

  for (let i = 0; i < intersections.length; i++) { 
    const item = intersections[i];

    query += '    ((ST_DumpPoints(\n';
    query += '      ST_Intersection(' + item.line1 + '.geom, ' + item.line2 + '.geom)\n';
    query += '    )).geom) AS intersection' + item.id + ',\n';
  }

  if (shapes.length > 1) {
    query += '    sqrt\n';
    query += '    (\n';
    for (let i = 0; i < shapes.length; i++) {
      let moments = calculateHuMoments(shapes[i].points);
      query += '      pow(\n';
      query += '        sqrt(pow(' + shapes[i].name + '.hu1 - ' + moments[0] + ', 2) + pow(' + shapes[i].name + '.hu2 - ' + moments[1] + ', 2) + pow(' + shapes[i].name + '.hu3 - ' + moments[2] + ', 2) + pow(' + shapes[i].name + '.hu4 - ' + moments[3] + ', 2) + pow(' + shapes[i].name + '.hu5 - ' + moments[4] + ', 2) + pow(' + shapes[i].name + '.hu6 - ' + moments[5] + ', 2) + pow(' + shapes[i].name + '.hu7 - ' + moments[6] + ', 2))\n';
      query += '        , 2\n';
      const plus = (i == shapes.length - 1) ? '' : ' +';
      query += '      )' + plus + '\n';
    }
    query += '    ) AS distance,\n';
  } else if (shapes.length == 1) {
    let moments = calculateHuMoments(shapes[0].points);
    query += '    sqrt(pow(' + shapes[0].name + '.hu1 - ' + moments[0] + ', 2) + pow(' + shapes[0].name + '.hu2 - ' + moments[1] + ', 2) + pow(' + shapes[0].name + '.hu3 - ' + moments[2] + ', 2) + pow(' + shapes[0].name + '.hu4 - ' + moments[3] + ', 2) + pow(' + shapes[0].name + '.hu5 - ' + moments[4] + ', 2) + pow(' + shapes[0].name + '.hu6 - ' + moments[5] + ', 2) + pow(' + shapes[0].name + '.hu7 - ' + moments[6] + ', 2)) AS distance,\n';
  }

  for (let i = 0; i < shapes.length; i++) {
    if (intersections.some(a => a.isPseudo && a.node === shapes[i].name)) {
      // We only need to carry the geometries of shapes that intersect at defined angles
      query += '    ' + shapes[i].name + '.geom AS ' + shapes[i].name + '_geom,\n';
    }
    const comma = (i == shapes.length - 1 && lines.length == 0 && nodes.length == 0) ? '' : ',';
    query += '    ' + shapes[i].name + '.osm_id AS ' + shapes[i].name + '_id' + comma + '\n';
    query += '    ' + shapes[i].name + '.osm_type AS ' + shapes[i].name + '_type' + comma + '\n';
  }

  for (let i = 0; i < lines.length; i++) {
    if (intersections.some(a => a.isAngle && [a.line1, a.line2].includes(lines[i].name))) {
      // We only need to carry the geometries of lines that intersect at defined angles
      query += '    ' + lines[i].name + '.geom AS ' + lines[i].name + '_geom,\n';
    }
    const comma = (i == lines.length - 1 && nodes.length == 0) ? '' : ',';
    query += '    ' + lines[i].name + '.osm_id AS ' + lines[i].name + '_id,\n';
    query += '    ' + lines[i].name + '.osm_type AS ' + lines[i].name + '_type' + comma + '\n';
  }

  for (let i = 0; i < nodes.length; i++) {
    if (intersections.some(a => a.isPseudo && a.node === nodes[i].name)) {
      // We only need to carry the geometries of nodes that intersect at defined angles
      query += '    ' + nodes[i].name + '.geom AS ' + nodes[i].name + '_geom,\n';
    }
    const comma = (i == nodes.length - 1) ? '' : ',';
    query += '    ' + nodes[i].name + '.osm_id AS ' + nodes[i].name + '_id,\n';
    query += '    ' + nodes[i].name + '.osm_type AS ' + nodes[i].name + '_type' + comma + '\n';
  }

  query += '  FROM ';

  for (let i = 0; i < shapes.length; i++) {
    const comma = (i == shapes.length - 1 && lines.length == 0 && nodes.length == 0) ? '\n' : ', ';
    query += shapes[i].geometryType + 's AS ' + shapes[i].name + comma;
  }
  
  for (let i = 0; i < lines.length; i++) {
    const comma = (i == lines.length - 1 && nodes.length == 0) ? '\n' : ', ';
    query += lines[i].geometryType + 's AS ' + lines[i].name + comma;
  }

  for (let i = 0; i < nodes.length; i++) {
    const comma = (i == nodes.length - 1) ? '\n' : ', ';
    query += nodes[i].geometryType + 's AS ' + nodes[i].name + comma;
  }

  query += '  WHERE ';

  for (let i = 0; i < annotations.length; i++) {
    // Filters results by category and subcategory
    let category = annotations[i].category;
    let subcategory = annotations[i].subcategory;
    let subcategoryString = (subcategory == '' ? '' : annotations[i].name + '.subcategory = \'' + subcategory + '\' AND ');
    query += annotations[i].name + '.category = \'' + category + '\' AND ' + subcategoryString;

    // Adds any additional tags entered by the user to the WHERE
    if (annotations[i].tags.length != 0) {
      query += createTagsQuery(annotations[i]);
    }
  }

  query += createNoOverlappingQuery(annotations);

  // Filters results early by ensuring that all of the lines that are supposed to intersect, do intersect
  for (let i = 0; i < intersections.length; i++) {
    const item = intersections[i];
    if (item.isAngle == false || (item.isPseudo == true && item.angle == null)) continue;

    query += 'ST_Intersects(' + item.line1 + '.geom, ' + item.line2 + '.geom) AND '
  }

  query += createMaxDistanceQuery(annotations);
  query += createMinDistanceQuery(annotations);
  
  // Accounts for all of the lines that have angle information entered, but don't intersect.
  // In other words, disjoint but directional (dbd) relations.
  for (let i = 0; i < dbd.length; i++) {
    const item = dbd[i];
    if (item.angle != null) {
      const error = item.error ? item.error : 0;

      let bounds = calculateBounds(item.angle, error);

      query += '\n  (\n';
      for (let b = 0; b < bounds.lower.length; b++) {
        query += '    (\n';
        query += '      abs(round(degrees(\n';
        query += '        ST_Azimuth(ST_StartPoint(' + item.line1 + '.geom), ST_EndPoint(' + item.line2 + '.geom))\n';
        query += '        -\n';
        query += '        ST_Azimuth(ST_StartPoint(' + item.line1 + '.geom), ST_EndPoint(' + item.line2 + '.geom))\n';
        query += '      ))::decimal % 180.0) ';

        if (bounds.lower[b] === bounds.upper[b])
          query += '= ' + bounds.lower[b] + '\n';
        else
          query += 'BETWEEN ' + bounds.lower[b] + ' AND ' + bounds.upper[b] + '\n';

        query += '    ) ' + ((bounds.lower.length > 1 && b == 0) ? '\n    OR' : '') + '\n';
      }
      query += '  )\n';
      query += '  AND';
    }
  }

  query = query.slice(0, query.length - 4); // remove last AND
  query += '\n';

  query += '),\n';
  query += 'buffers AS\n';
  query += '(\n';
  query += '  SELECT\n';

  for (let i = 0; i < intersections.length; i++) {
    const item = intersections[i];
    if (item.isAngle == false) continue;

    query += '    intersections.intersection' + item.id + ',\n';
    query += '    ST_ExteriorRing(ST_Buffer(intersections.intersection' + item.id + ', 0.5)) AS ring' + item.id + ',\n';
  }

  if (shapes.length > 0) {
    query += '    intersections.distance,\n';
  }

  for (let i = 0; i < lines.length; i++) {
    if (intersections.some(a => a.isAngle && [a.line1, a.line2].includes(lines[i].name))) {
      // We only need to carry the geometries of lines that intersect at defined angles
      query += '    intersections.' + lines[i].name + '_geom,\n';
    }
  }

  for (let i = 0; i < pseudoNodes.length; i++) {
    if (intersections.some(a => a.isAngle && a.isPseudo && a.node === pseudoNodes[i].name)) {
      // We only need to carry the geometries of nodes and shapes that intersect at defined angles
      query += '    intersections.' + pseudoNodes[i].name + '_geom,\n';
    }
  }

  for (let i = 0; i < annotations.length; i++) {
    query += '    intersections.' + annotations[i].name + '_id,\n';
    const comma = (i == annotations.length - 1) ? '' : ','
    query += '    intersections.' + annotations[i].name + '_type' + comma + '\n';
  }

  query += '  FROM intersections\n';

  // Queries for nodes that are defined distances from intersections
  const minDistances = intersections.filter(a => a.isPseudo && a.minDistance != null)
  const maxDistances = intersections.filter(a => a.isPseudo && a.maxDistance != null)

  if (minDistances.length > 0 || maxDistances.length > 0) {
    query += '  WHERE '

    for (let i = 0; i < maxDistances.length; i++) {
      const item = maxDistances[i];
      query += 'ST_DWithin(intersections.intersection' + item.id + ', intersections.' + item.node + '_geom, ' + item.maxDistance + ') AND ';
    }
    for (let i = 0; i < minDistances.length; i++) {
      const item = minDistances[i];
      query += 'ST_Distance(intersections.intersection' + item.id + ', intersections.' + item.node + '_geom) > ' + item.minDistance + ' AND ';
    }
    
    query = query.slice(0, query.length - 5); // remove last AND
    query += '\n';
  }

  query += '),\n';

  query += 'points AS\n';
  query += '(\n';
  query += '  SELECT\n';

  for (let i = 0; i < intersections.length; i++) {
    const item = intersections[i];
    if (item.isAngle == false) continue;

    query += '    ST_GeometryN\n';
    query += '    (\n';
    query += '      ST_Intersection(buffers.ring' + item.id + ', buffers.' + item.line1 + '_geom)\n';
    query += '      , 1\n';
    query += '    ) AS ring' + item.id + '_p1,\n';
    query += '    ST_GeometryN\n';
    query += '    (\n';
    query += '      ST_Intersection(buffers.ring' + item.id + ', buffers.' + item.line2 + '_geom)\n';
    query += '      , 1\n';
    query += '    ) AS ring' + item.id + '_p2,\n';
  }

  if (shapes.length > 0) {
    query += '    buffers.distance,\n';
  }

  for (let i = 0; i < intersections.length; i++) {
    const item = intersections[i];
    if (item.isAngle == false) continue;

    query += '    buffers.intersection' + item.id + ',\n';
    query += '    buffers.ring' + item.id + ',\n';
  }

  for (let i = 0; i < lines.length; i++) {
    if (intersections.some(a => a.isAngle && [a.line1, a.line2].includes(lines[i].name))) {
      // We only need to carry the geometries of lines that intersect at defined angles
      query += '    buffers.' + lines[i].name + '_geom,\n';
    }
  }

  for (let i = 0; i < pseudoNodes.length; i++) {
    if (intersections.some(a => a.isAngle && a.isPseudo && a.node === pseudoNodes[i].name)) {
      // We only need to carry the geometries of nodes and shapes that intersect at defined angles
      query += '    buffers.' + pseudoNodes[i].name + '_geom,\n';
    }
  }

  for (let i = 0; i < annotations.length; i++) {
    query += '    buffers.' + annotations[i].name + '_id,\n';
    const comma = (i == annotations.length - 1) ? '' : ','
    query += '    buffers.' + annotations[i].name + '_type' + comma + '\n';
  }

  query += '  FROM buffers\n';
  query += ')';

  if (shapes.length > 0) {
    query += ',\n';
    query += 'IDs AS\n';
    query += '(';
  }

  query += '\n';
  query += 'SELECT\n';

  if (shapes.length > 0) {
    query += '  points.distance,\n';
  }

  for (let i = 0; i < annotations.length; i++) {
    const comma = (i == annotations.length - 1) ? '' : ','
    let wayPrefix = displayUrls ? 'www.openstreetmap.org/way/' : 'way ';
    let nodePrefix = displayUrls ? 'www.openstreetmap.org/node/' : 'node ';
    query += '  replace(replace(points.' + annotations[i].name + "_type, 'N', '" + nodePrefix + "'), 'W', '" + wayPrefix + "') || ";
    query += 'points.' + annotations[i].name + '_id AS ' + annotations[i].name + '_id' + comma + '\n';
  }

  query += 'FROM points\n';
  query += 'WHERE\n';
  
  // Performs final angle comparison between normal intersections with defined angles
  for (let i = 0; i < intersections.length; i++) {
    const item = intersections[i];
    if (item.isAngle == false) continue;

    if (item.angle != null) {
      const error = item.error ? item.error : 0;

      let bounds = calculateBounds(item.angle, error);

      query += '(\n';
      for (let b = 0; b < bounds.lower.length; b++) {
        query += '  (\n';
        query += '    abs(round(degrees(\n';
        query += '      ST_Azimuth(points.ring' + item.id + '_p2, points.intersection' + item.id + ')\n';
        query += '      -\n';
        query += '      ST_Azimuth(points.ring' + item.id + '_p1, points.intersection' + item.id + ')\n';
        query += '    ))::decimal % 180.0) ';

        if (bounds.lower[b] === bounds.upper[b])
          query += '= ' + bounds.lower[b] + '\n';
        else
          query += 'BETWEEN ' + bounds.lower[b] + ' AND ' + bounds.upper[b] + '\n';

        query += '  ) ' + ((bounds.lower.length > 1 && b == 0) ? '\n  OR' : '') + '\n';
      }
      query += ')\n';
      query += 'AND \n';
    }
  }

  for (let i = 0; i < intersections.length; i++) {
    const item = intersections[i];
    if (item.isAngle == false || item.isPseudo == false) continue;

    if (item.pseudoAngle != null) {
      const error = item.pseudoError ? item.pseudoError : 0;

      let bounds = calculateBounds(item.pseudoAngle, error);

      query += '(\n';
      for (let b = 0; b < bounds.lower.length; b++) {
        let nodeIsShape = shapes.some((sh) => sh.name === item.node);

        query += '  (\n';
        query += '    abs(round(degrees(\n';
        query += '      ST_Azimuth(points.ring' + item.id + '_p1, points.intersection' + item.id + ')\n';
        query += '      -\n';
        if (nodeIsShape) {
          query += '      ST_Azimuth(points.intersection' + item.id + ', ST_Centroid(' + item.node + '_geom))\n';
        } else {
          query += '      ST_Azimuth(points.intersection' + item.id + ', ' + item.node + '_geom)\n';
        }
        query += '    ))::decimal % 180.0) ';

        if (bounds.lower[b] === bounds.upper[b])
          query += '= ' + bounds.lower[b] + '\n';
        else
          query += 'BETWEEN ' + bounds.lower[b] + ' AND ' + bounds.upper[b] + '\n';

        query += '  ) \n  OR\n';
      }
      
      for (let b = 0; b < bounds.lower.length; b++) {
        let nodeIsShape = shapes.some((sh) => sh.name === item.node);

        query += '  (\n';
        query += '    abs(round(degrees(\n';
        query += '      ST_Azimuth(points.ring' + item.id + '_p2, points.intersection' + item.id + ')\n';
        query += '      -\n';
        if (nodeIsShape) {
          query += '      ST_Azimuth(points.intersection' + item.id + ', ST_Centroid(' + item.node + '_geom))\n';
        } else {
          query += '      ST_Azimuth(points.intersection' + item.id + ', ' + item.node + '_geom)\n';
        }
        query += '    ))::decimal % 180.0) ';

        if (bounds.lower[b] === bounds.upper[b])
          query += '= ' + bounds.lower[b] + '\n';
        else
          query += 'BETWEEN ' + bounds.lower[b] + ' AND ' + bounds.upper[b] + '\n';

        query += '  ) ' + ((bounds.lower.length > 1 && b == 0) ? '\n  OR' : '') + '\n';
      }
      query += ')\n';
      query += 'AND \n';
    }
  }

  query = query.slice(0, query.length - 6); // remove last AND

  if (shapes.length > 0) {
    query += '),\n';
    query += 'numbered AS\n';
    query += '(\n';
    query += '  SELECT\n';

    for (let i = 0; i < annotations.length; i++) {
      query += '    IDs.' + annotations[i].name + '_id,\n';
    }

    query += '    COUNT(*) OVER () AS count, ROW_NUMBER() OVER (ORDER BY IDs.distance) AS row\n';
    
    query += '  FROM IDs\n';
    query += ')\n';
    query += 'SELECT\n';

    for (let i = 0; i < annotations.length; i++) {
      const comma = (i == annotations.length - 1) ? '' : ','
      query += '  numbered.' + annotations[i].name + '_id' + comma + '\n';
    }

    query += 'FROM numbered\n';
    query += 'WHERE numbered.row < GREATEST((numbered.count * 0.01), 500)\n';
    query += 'ORDER BY numbered.row ASC';
  }

  query += ';\n'

  return query;
}

function constructQuery(annotations, displayUrls = true) {
  // Uncomment to print the details of annotations, which can be used by the unit testing script.
  // console.log(JSON.stringify(annotations));

  let nodes = [];
  let lines = [];
  let shapes = [];

  if (annotations.length == 1) {
    return constructSingleObjectQuery(annotations, displayUrls);
  }

  for (let i = 0; i < annotations.length; i++) { 
    if (annotations[i].geometryType == 'linestring') {
      lines.push(annotations[i]);
    } else if (annotations[i].geometryType == 'node') {
      nodes.push(annotations[i]);
    } else if (annotations[i].geometryType == 'shape') {
      shapes.push(annotations[i]);
    }
  }

  // If at least two of the lines intersect, then call constructIntersectingQuery
  for (let i = 0; i < lines.length; i++) { 
    for (let k = 0; k < lines.length; k++) {
      if (i == k) continue;

      const intersection = calculateIntersection(lines[i].points, lines[k].points);
      if (intersection && intersection.intersects) {
        return constructIntersectingQuery(annotations, nodes, lines, shapes, displayUrls);
      }
    }
  }

  return constructDisjointQuery(annotations, nodes, lines, shapes, displayUrls);
}

export {constructQuery}