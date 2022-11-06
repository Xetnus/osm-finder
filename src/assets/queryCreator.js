import {calculateIntersection} from './generalTools.js'
import {calculateBounds, createLineTagsQuery, createMaxDistanceQuery, createMinDistanceQuery, createNoOverlappingQuery} from './queryTools.js'

// Example Query for NonIntersecting
/*
SELECT line1.way_id, line2.way_id
FROM linestrings AS line1, linestrings as line2
WHERE line1.generic_type = 'highway' AND line1.subtype = 'vehicle' AND line2.generic_type = 'highway'
  AND line2.subtype = 'vehicle' AND ST_DWithin(line1.geom, line2.geom, 50) AND 
(
  abs((
    degrees(ST_Azimuth(ST_StartPoint(line2.geom), ST_EndPoint(line2.geom)))
    -
    degrees(ST_Azimuth(ST_StartPoint(line1.geom), ST_EndPoint(line1.geom)))
  )::decimal % 180.0) BETWEEN 60 AND 120
);
*/

function constructNonIntersectingQuery(nodes, lines) {
  let query = 'SELECT ';
  for (let i = 0; i < lines.length; i++) {
    query += lines[i].name + '.way_id' + (i == lines.length - 1 ? '\n' : ', ');
  }
  
  query += 'FROM ';
  for (let i = 0; i < lines.length; i++) {
    query += 'linestrings AS ' + lines[i].name + (i == lines.length - 1 ? '\n' : ', ');
  }

  query += 'WHERE ';
  for (let i = 0; i < lines.length; i++) {
    // Filters results by generic type and subtype
    let genericType = lines[i].genericType;
    let subtype = lines[i].subtype;
    let subtypeString = (subtype == '' ? '' : lines[i].name + '.subtype = \'' + subtype + '\' AND ');
    query += lines[i].name + '.generic_type = \'' + genericType + '\' AND ' + subtypeString;

    // Adds any additional tag entered by the user to the WHERE
    if (lines[i].tags.length != 0) {
      query += createLineTagsQuery(lines[i]);
    }
  }

  query += createNoOverlappingQuery(lines);
  query += createMaxDistanceQuery(lines);
  query += createMinDistanceQuery(lines);

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
    line1.way_id AS line1_way_id,
    line2.way_id AS line2_way_id,
    line3.way_id AS line3_way_id
  FROM linestrings AS line1, linestrings AS line2, linestrings as line3
  WHERE line1.tags->>'bridge' = 'yes' AND line1.generic_type = 'highway' AND line1.subtype = 'vehicle' AND 
    line2.tags->>'bridge' = 'yes' AND line2.generic_type = 'highway' AND line2.subtype = 'vehicle' AND 
    line1.way_id != line2.way_id AND line3.generic_type = 'highway' AND line3.subtype = 'vehicle' AND 
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
    intersections.line1_way_id,
    intersections.line2_way_id,
    intersections.line3_way_id
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
    buffers.line1_way_id,
    buffers.line2_way_id,
    buffers.line3_way_id
  FROM buffers
)
SELECT 
  points.line1_way_id,
  points.line2_way_id,
  points.line3_way_id
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
function constructIntersectingQuery(nodes, lines, intersectingPairs) {
  let intersectingPairsWithAngles = [];
  for (let i = 0; i < intersectingPairs.length; i++) {
    if (intersectingPairs[i].angle != null) {
      intersectingPairsWithAngles.push(intersectingPairs[i]);
    }
  }

  let query = 'WITH intersections AS\n';
  query += '(\n';
  query += '  SELECT\n';

  for (let i = 0; i < intersectingPairsWithAngles.length; i++) {
    const pair = intersectingPairsWithAngles[i];

    query += '    ((ST_DumpPoints(\n';
    query += '      ST_Intersection(' + pair.line1 + '.geom, ' + pair.line2 + '.geom)\n';
    query += '    )).geom) AS intersection' + (i + 1) + ',\n';
  }

  for (let i = 0; i < lines.length; i++) {
    const comma = (i == lines.length - 1) ? '' : ','
    if (intersectingPairsWithAngles.find(el => (el.line1 == lines[i].name || el.line2 == lines[i].name))) {
      // We only need to carry the geometry of lines that intersect at defined angles
      query += '    ' + lines[i].name + '.geom AS ' + lines[i].name + '_geom,\n';
    }
    query += '    ' + lines[i].name + '.way_id AS ' + lines[i].name + '_way_id' + comma + '\n';
  }

  query += '  FROM ';
  for (let i = 0; i < lines.length; i++) {
    const comma = (i == lines.length - 1) ? '\n' : ', ';
    query += 'linestrings AS ' + lines[i].name + comma;
  }

  query += '  WHERE ';
  for (let i = 0; i < lines.length; i++) {
    // Filters results by generic type and subtype
    let genericType = lines[i].genericType;
    let subtype = lines[i].subtype;
    let subtypeString = (subtype == '' ? '' : lines[i].name + '.subtype = \'' + subtype + '\' AND ');
    query += lines[i].name + '.generic_type = \'' + genericType + '\' AND ' + subtypeString;

    // Adds any additional tag entered by the user to the WHERE
    if (lines[i].tags.length != 0) {
      query += createLineTagsQuery(lines[i]);
    }
  }

  query += createNoOverlappingQuery(lines);

  // Filters results early by ensuring that all of the lines that are supposed to intersect, do intersect
  for (let i = 0; i < intersectingPairs.length; i++) {
    const pair = intersectingPairs[i];
    query += 'ST_Intersects(' + pair.line1 + '.geom, ' + pair.line2 + '.geom) AND '
  }

  query += createMaxDistanceQuery(lines);
  query += createMinDistanceQuery(lines);

  query = query.slice(0, query.length - 4); // remove last AND
  query += '\n';
  query += '),\n';
  query += 'buffers AS\n';
  query += '(\n';
  query += '  SELECT\n';

  for (let i = 0; i < intersectingPairsWithAngles.length; i++) {
    query += '    intersections.intersection' + (i + 1)+ ',\n';
    query += '    ST_ExteriorRing(ST_Buffer(intersections.intersection' + (i + 1) + ', 0.5)) AS ring' + (i + 1) + ',\n';
  }

  for (let i = 0; i < lines.length; i++) {
    const comma = (i == lines.length - 1) ? '' : ',';
    if (intersectingPairsWithAngles.find(el => (el.line1 == lines[i].name || el.line2 == lines[i].name))) {
      // We only need to carry the geometry of lines that intersect at defined angles
      query += '    intersections.' + lines[i].name + '_geom,\n';
    }
    query += '    intersections.' + lines[i].name + '_way_id' + comma + '\n';
  }
  query += '  FROM intersections\n';
  query += '),\n';

  query += 'points AS\n';
  query += '(\n';
  query += '  SELECT\n';

  for (let i = 0; i < intersectingPairsWithAngles.length; i++) {
    const pair = intersectingPairsWithAngles[i];

    query += '    ST_GeometryN\n';
    query += '    (\n';
    query += '      ST_Intersection(buffers.ring' + (i + 1) + ', buffers.' + pair.line1 + '_geom)\n';
    query += '      , 1\n';
    query += '    ) AS ring' + (i + 1) + '_p1,\n';
    query += '    ST_GeometryN\n';
    query += '    (\n';
    query += '      ST_Intersection(buffers.ring' + (i + 1) + ', buffers.' + pair.line2 + '_geom)\n';
    query += '      , 1\n';
    query += '    ) AS ring' + (i + 1) + '_p2,\n';
  }

  for (let i = 0; i < intersectingPairsWithAngles.length; i++) {
    query += '    buffers.intersection' + (i + 1) + ',\n';
    query += '    buffers.ring' + (i + 1) + ',\n';
  }

  for (let i = 0; i < lines.length; i++) {
    const comma = (i == lines.length - 1) ? '' : ',';
    if (intersectingPairsWithAngles.find(el => (el.line1 == lines[i].name || el.line2 == lines[i].name))) {
      // We only need to carry the geometry of lines that intersect at defined angles
      query += '    buffers.' + lines[i].name + '_geom,\n';
    }
    query += '    buffers.' + lines[i].name + '_way_id' + comma + '\n';
  }

  query += '  FROM buffers\n';
  query += ')\n';

  query += 'SELECT\n';
  for (let i = 0; i < lines.length; i++) {
      const comma = (i == lines.length - 1) ? '' : ',';
      query += '  points.' + lines[i].name + '_way_id' + comma + '\n';
  }
  query += 'FROM points\n';
  query += 'WHERE\n';
  
  // Performs final angle comparison between intersections with defined angles
  for (let i = 0; i < intersectingPairsWithAngles.length; i++) {
    const pair = intersectingPairsWithAngles[i];

    if (pair.angle != null) {
      const error = pair.error ? pair.error : 0;

      let bounds = calculateBounds(pair.angle, error);

      query += '(\n';
      for (let b = 0; b < bounds.lower.length; b++) {
        query += '  (\n';
        query += '    abs(round(degrees(\n';
        query += '      ST_Azimuth(points.ring' + (i + 1) + '_p2, points.intersection' + (i + 1) + ')\n';
        query += '      -\n';
        query += '      ST_Azimuth(points.ring' + (i + 1) + '_p1, points.intersection' + (i + 1) + ')\n';
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
  query += ';\n'

  return query;
}

function constructQuery(annotations) {
  // Uncomment to print the details of annotations, which can be used by the unit testing script.
  // console.log(JSON.stringify(annotations));

  let nodes = [];
  let lines = [];

  for (let i = 0; i < annotations.length; i++) { 
    if (annotations[i].geometryType == 'linestring') {
      lines.push(annotations[i]);
    } else {
      nodes.push(annotations[i]);
    }
  }

  // Generates an array that consists of pairs of intersecting lines
  let intersectingPairs = [];
  for (let i = 0; i < lines.length; i++) { 
    for (let k = 0; k < lines.length; k++) {
      if (i == k) continue;

      const line1 = lines[i].points;
      const line2 = lines[k].points;
      const intersection = calculateIntersection(line1[0], line1[1], line1[2], line1[3], line2[0], line2[1], line2[2], line2[3]);
      if (intersection && intersection.seg1 && intersection.seg2) {
        // The order of the lines doesn't matter
        const pair = [lines[i].name, lines[k].name];
        const match = intersectingPairs.filter((el) => pair.includes(el.line1) && pair.includes(el.line2));
        if (match.length != 0) continue;

        // The line whose name comes first when sorted holds the relation information. Find it.
        const index1 = lines[i].name > lines[k].name ? k : i;
        const index2 = lines[i].name > lines[k].name ? i : k;
        const find = lines[index1].relations[lines[index2].name];

        if (find) {
          intersectingPairs.push({line1: lines[i].name, line2: lines[k].name, 
            angle: find.angle, error: find.error});
        } else {
          intersectingPairs.push({line1: lines[i].name, line2: lines[k].name});
        }
      }
    }
  }

  if (intersectingPairs.length == 0) {
    return constructNonIntersectingQuery(nodes, lines);
  } else {
    return constructIntersectingQuery(nodes, lines, intersectingPairs);
  }
}

export {constructQuery}