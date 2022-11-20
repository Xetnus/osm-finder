import {calculateIntersection} from './generalTools.js'
import {calculateBounds, createTagsQuery, createMaxDistanceQuery, createMinDistanceQuery, createNoOverlappingQuery} from './queryTools.js'

// Example Query for Disjoint
/*
SELECT line1.id, line2.id
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

function constructDisjointQuery(annotations, nodes, lines) {
  let query = 'SELECT ';
  for (let i = 0; i < annotations.length; i++) {
    const comma = (i == annotations.length - 1) ? '\n' : ', ';
    query += annotations[i].name + '.id' + comma;
  }

  query += 'FROM ';
  for (let i = 0; i < annotations.length; i++) {
    const comma = (i == annotations.length - 1) ? '\n' : ', ';
    query += annotations[i].geometryType + 's AS ' + annotations[i].name + comma;
  }

  query += 'WHERE ';
  for (let i = 0; i < annotations.length; i++) {
    // Filters results by generic type and subtype
    let genericType = annotations[i].genericType;
    let subtype = annotations[i].subtype;
    let subtypeString = (subtype == '' ? '' : annotations[i].name + '.subtype = \'' + subtype + '\' AND ');
    query += annotations[i].name + '.generic_type = \'' + genericType + '\' AND ' + subtypeString;

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
  WHERE line1.tags->>'bridge' = 'yes' AND line1.generic_type = 'highway' AND line1.subtype = 'vehicle' AND 
    line2.tags->>'bridge' = 'yes' AND line2.generic_type = 'highway' AND line2.subtype = 'vehicle' AND 
    line1.id != line2.id AND line3.generic_type = 'highway' AND line3.subtype = 'vehicle' AND 
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
function constructIntersectingQuery(annotations, nodes, lines) {
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
  // between individual nodes and intersections.
  for (let i = 0; i < nodes.length; i++) {
    const keys = Object.keys(nodes[i].relations);
    for (let k = 0; k < keys.length; k++) {
      if (!keys[k].includes('&')) continue;

      const key = keys[k];
      const line1 = key.split('&')[0];
      const line2 = key.split('&')[1];
      const relation = nodes[i].relations[key];

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
          node: nodes[i].name,
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
    if (item.isAngle == false) continue;

    query += '    ((ST_DumpPoints(\n';
    query += '      ST_Intersection(' + item.line1 + '.geom, ' + item.line2 + '.geom)\n';
    query += '    )).geom) AS intersection' + item.id + ',\n';
  }

  for (let i = 0; i < lines.length; i++) {
    if (intersections.some(a => a.isAngle && [a.line1, a.line2].includes(lines[i].name))) {
      // We only need to carry the geometries of lines that intersect at defined angles
      query += '    ' + lines[i].name + '.geom AS ' + lines[i].name + '_geom,\n';
    }

    if (i == lines.length - 1 && nodes.length == 0) {
      query += '    ' + lines[i].name + '.id AS ' + lines[i].name + '_id\n';
    } else {
      query += '    ' + lines[i].name + '.id AS ' + lines[i].name + '_id,\n';
    }
  }

  for (let i = 0; i < nodes.length; i++) {
    if (intersections.some(a => a.isPseudo && a.node === nodes[i].name)) {
      // We only need to carry the geometries of nodes that intersect at defined angles
      query += '    ' + nodes[i].name + '.geom AS ' + nodes[i].name + '_geom,\n';
    }
    const comma = (i == nodes.length - 1) ? '' : ',';
    query += '    ' + nodes[i].name + '.id AS ' + nodes[i].name + '_id' + comma + '\n';
  }

  query += '  FROM ';
  for (let i = 0; i < annotations.length; i++) {
    const comma = (i == annotations.length - 1) ? '\n' : ', ';
    query += annotations[i].geometryType + 's AS ' + annotations[i].name + comma;
  }

  query += '  WHERE ';
  for (let i = 0; i < annotations.length; i++) {
    // Filters results by generic type and subtype
    let genericType = annotations[i].genericType;
    let subtype = annotations[i].subtype;
    let subtypeString = (subtype == '' ? '' : annotations[i].name + '.subtype = \'' + subtype + '\' AND ');
    query += annotations[i].name + '.generic_type = \'' + genericType + '\' AND ' + subtypeString;

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

  for (let i = 0; i < lines.length; i++) {
    if (intersections.some(a => a.isAngle && [a.line1, a.line2].includes(lines[i].name))) {
      // We only need to carry the geometries of lines that intersect at defined angles
      query += '    intersections.' + lines[i].name + '_geom,\n';
    }

    if (i == lines.length - 1 && nodes.length == 0) {
      query += '    intersections.' + lines[i].name + '_id\n';
    } else {
      query += '    intersections.' + lines[i].name + '_id,\n';
    }
  }

  for (let i = 0; i < nodes.length; i++) {
    if (intersections.some(a => a.isAngle && a.isPseudo && a.node === nodes[i].name)) {
      // We only need to carry the geometries of nodes that intersect at defined angles
      query += '    intersections.' + nodes[i].name + '_geom,\n';
    }
    const comma = (i == nodes.length - 1) ? '' : ','
    query += '    intersections.' + nodes[i].name + '_id' + comma + '\n';
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

    if (i == lines.length - 1 && nodes.length == 0) {
      query += '    buffers.' + lines[i].name + '_id\n';
    } else {
      query += '    buffers.' + lines[i].name + '_id,\n';
    }
  }

  for (let i = 0; i < nodes.length; i++) {
    if (intersections.some(a => a.isAngle && a.isPseudo && a.node === nodes[i].name)) {
      // We only need to carry the geometries of nodes that intersect at defined angles
      query += '    buffers.' + nodes[i].name + '_geom,\n';
    }
    const comma = (i == nodes.length - 1) ? '' : ','
    query += '    buffers.' + nodes[i].name + '_id' + comma + '\n';
  }

  query += '  FROM buffers\n';
  query += ')\n';

  query += 'SELECT\n';
  for (let i = 0; i < lines.length; i++) {
    const comma = (i == lines.length - 1 && nodes.length == 0) ? '' : ',';
    query += '  points.' + lines[i].name + '_id AS ' + lines[i].name + '_way_id' + comma + '\n';
  }
  for (let i = 0; i < nodes.length; i++) {
    const comma = (i == nodes.length - 1) ? '' : ','
    query += '  points.' + nodes[i].name + '_id AS ' + nodes[i].name + '_node_id' + comma + '\n';
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
        query += '  (\n';
        query += '    abs(round(degrees(\n';
        query += '      ST_Azimuth(points.ring' + item.id + '_p1, points.intersection' + item.id + ')\n';
        query += '      -\n';
        query += '      ST_Azimuth(points.intersection' + item.id + ', ' + item.node + '_geom)\n';
        query += '    ))::decimal % 180.0) ';

        if (bounds.lower[b] === bounds.upper[b])
          query += '= ' + bounds.lower[b] + '\n';
        else
          query += 'BETWEEN ' + bounds.lower[b] + ' AND ' + bounds.upper[b] + '\n';

        query += '  ) \n  OR\n';
      }
      
      for (let b = 0; b < bounds.lower.length; b++) {
        query += '  (\n';
        query += '    abs(round(degrees(\n';
        query += '      ST_Azimuth(points.ring' + item.id + '_p2, points.intersection' + item.id + ')\n';
        query += '      -\n';
        query += '      ST_Azimuth(points.intersection' + item.id + ', ' + item.node + '_geom)\n';
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
    } else if (annotations[i].geometryType == 'node') {
      nodes.push(annotations[i]);
    }
  }

  // If at least two of the lines intersect, then call constructIntersectingQuery
  for (let i = 0; i < lines.length; i++) { 
    for (let k = 0; k < lines.length; k++) {
      if (i == k) continue;

      const intersection = calculateIntersection(lines[i].points, lines[k].points);
      if (intersection && intersection.intersects) {
        return constructIntersectingQuery(annotations, nodes, lines);
      }
    }
  }

  return constructDisjointQuery(annotations, nodes, lines);
}

export {constructQuery}