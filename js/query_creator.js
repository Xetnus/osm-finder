var parameters = {'lines': {}, 'nodes': {}};

function initializeParameters(elementName, params) {
    if (elementName.startsWith('line')) {
        parameters['lines'][[elementName]] = params;
    } else if (elementName.startsWith('node')) {
        parameters['nodes'][[elementName]] = params;
    }
    // console.log(parameters);
}

function getParametersByName(name) {
    var nodes = Object.keys(parameters['nodes']);

    if (nodes.includes(name)) {
        return parameters['nodes'][[name]];
    }

    var lines = Object.keys(parameters['lines']);
    
    if (lines.includes(name)) {
        return parameters['lines'][[name]];
    }

}

// Example Query for NonIntersecting
/*
SELECT line1.way_id, line2.way_id
FROM linestrings AS line1, linestrings as line2

WHERE line1.generic_type = 'highway' AND line1.subtype = 'vehicle' AND line2.generic_type = 'highway' AND line2.subtype = 'vehicle' AND ST_DWithin(line1.geom, line2.geom, 50) AND 
(
  abs((
    degrees(ST_Azimuth(ST_StartPoint(line2.geom), ST_EndPoint(line2.geom)))
    -
    degrees(ST_Azimuth(ST_StartPoint(line1.geom), ST_EndPoint(line1.geom)))
  )::decimal % 180.0) BETWEEN 60 AND 120
);
*/

function constructNonIntersectingQuery(nodes, lines) {
    var query = 'SELECT ';
    for (var i = lines.length - 1; i >= 0; i--) {
        query += lines[i] + '.way_id' + (i == 0 ? '\n' : ', ');
    }
    
    query += 'FROM ';
    for (var i = lines.length - 1; i >= 0; i--) {
        query += 'linestrings AS ' + lines[i] + (i == 0 ? '\n' : ', ');
    }

    var identicalTypes = {};
    // TODO: imperfect solution. Doesn't include any additional tags added by user.
    for (var i = lines.length - 1; i >= 0; i--) {
        var generic_type = parameters['lines'][lines[i]]['generic_type'];
        var subtype = parameters['lines'][lines[i]]['subtype'];
        var key = generic_type + ' ' + subtype;

        if (identicalTypes[key] == undefined) {
            identicalTypes[key] = [lines[i]];
        } else {
            var array = identicalTypes[key];
            identicalTypes[key] = array.concat([lines[i]]);
        }
    }

    query += 'WHERE ';
    for (var i = lines.length - 1; i >= 0; i--) {
        // Adds any additional tag entered by the user to the WHERE
        if (parameters['lines'][lines[i]]['tag'] != '') {
            var results = parameters['lines'][lines[i]]['tag'].split(' ');
            query += lines[i] + '.tags->>\'' + results[0] + '\' ';

            if (results.length > 1)
                query += '= \'' + results[1] + '\' ';
            query += 'AND ';
        }

        var generic_type = parameters['lines'][lines[i]]['generic_type'];
        var subtype = parameters['lines'][lines[i]]['subtype'];
        var subtypeString = (subtype == '' ? '' : lines[i] + '.subtype = \'' + subtype + '\' AND ');
        query += lines[i] + '.generic_type = \'' + generic_type + '\' AND ' + subtypeString;
    }

    // TODO: imperfect solution. Doesn't cover every nested case.
    var keys = Object.keys(identicalTypes);
    for (var i = keys.length - 1; i >= 0; i--) {
        for (var j = identicalTypes[keys[i]].length - 1; j > 0; j--) {
            query += identicalTypes[keys[i]][j] + '.way_id != ' + identicalTypes[keys[i]][j - 1] + '.way_id AND ';
        }
    }

    for (var i = lines.length - 1; i >= 0; i--) {
        for (var j = lines.length - 1; j >= 0; j--) {
            if (i == j) continue;

            if (parameters['lines'][lines[i]][[lines[j]]]) {
                var maxDistance = parameters['lines'][lines[i]][[lines[j]]]['max_distance'];
                query += 'ST_DWithin(' + lines[i] + '.geom, ' + lines[j] + '.geom, ' + maxDistance + ') AND  ';
            }
        }
    }

    query += '\n';

    for (var i = lines.length - 1; i >= 0; i--) {
        for (var j = lines.length - 1; j >= 0; j--) {
            if (i == j) continue;

            var relationParams = parameters['lines'][lines[i]][[lines[j]]];

            if (relationParams && relationParams['angle'] != null) {
                var angle = parseInt(relationParams['angle']);
                var error = parseInt(relationParams['error']);

                var lowerBounds = [angle - error]; 
                var upperBounds = [angle + error];

                if (lowerBounds[0] / 180 > 1 && upperBounds[0] / 180 > 1) {
                    lowerBounds[0] %= 180;
                    upperBounds[0] %= 180;
                } else if (upperBounds[0] / 180 > 1) {
                    up = upperBounds[0];
                    low = lowerBounds[0];
                    lowerBounds[0] = low;
                    upperBounds[0] = 180;
                    lowerBounds[1] = 0;
                    upperBounds[1] = up % 180;
                } else if (lowerBounds[0] < 0) {
                    lowerBounds[1] = 180 + lowerBounds[0];
                    lowerBounds[0] = 0;
                    upperBounds[1] = 180;
                }

                if (lowerBounds.length == 1 && (upperBounds[0] < 90 || lowerBounds[0] > 90)) {
                    lowerBounds[1] = 180 - upperBounds[0];
                    upperBounds[1] = 180 - lowerBounds[0];
                }

                query += '(\n';
                for (var b = 0; b < lowerBounds.length; b++) {
                    query += '  (\n';
                    query += '    abs((\n';
                    query += '      degrees(ST_Azimuth(ST_StartPoint(' + lines[j] + '.geom), ST_EndPoint(' + lines[j] + '.geom)))\n';
                    query += '      -\n';
                    query += '      degrees(ST_Azimuth(ST_StartPoint(' + lines[i] + '.geom), ST_EndPoint(' + lines[i] + '.geom)))\n';
                    query += '    )::decimal % 180.0) BETWEEN ' + lowerBounds[b] + ' AND ' + upperBounds[b] + '\n';
                    query += '  ) ' + ((lowerBounds.length > 1 && b == 0) ? '\n  OR' : '') + '\n';
                }
                query += ')\n';
                query += ' AND \n';
            }
        }
    }

    query = query.slice(0, query.length - 7); // remove last AND
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
  WHERE line1.tags->>'bridge' = 'yes' AND line1.generic_type = 'highway' AND line1.subtype = 'vehicle' AND line2.tags->>'bridge' = 'yes' AND line2.generic_type = 'highway' AND line2.subtype = 'vehicle' AND line1.way_id != line2.way_id AND line3.generic_type = 'highway' AND line3.subtype = 'vehicle' AND ST_Intersects(line1.geom, line3.geom) AND ST_Intersects(line2.geom, line3.geom) AND ST_DWithin(line1.geom, line2.geom, 1000) AND ST_Distance(line1.geom, line2.geom) > 200
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
function constructIntersectingQuery(nodes, lines) {
    var allIntersectingPairs = [];
    var allIntersectingLines = new Set();
    var intersectingPairsWithAngles = [];
    for (var i = 0; i < lines.length; i++) {
        intersections = parameters['lines'][lines[i]]['intersections'];
        if (intersections && intersections.length > 0) {
            for (var j = 0; j < intersections.length; j++) {
                allIntersectingLines.add(lines[i]);
                allIntersectingLines.add(intersections[j]);
                allIntersectingPairs.push({[lines[i]]: intersections[j]});

                if (parameters['lines'][lines[i]][intersections[j]]['angle'] != null)
                    intersectingPairsWithAngles.push({[lines[i]]: intersections[j]});
            }
        }
    }

    // not used at this point
    var disjointLines = lines.filter(value => !allIntersectingLines.has(value));

    var query = 'WITH intersections AS\n';
    query += '(\n';
    query += '  SELECT\n';

    for (var i = intersectingPairsWithAngles.length - 1; i >= 0; i--) {
        var key = Object.keys(intersectingPairsWithAngles[i])[0];
        var val = intersectingPairsWithAngles[i][key];

        query += '    ((ST_DumpPoints(\n';
        query += '      ST_Intersection(' + key + '.geom, ' + val + '.geom)\n';
        query += '    )).geom) AS intersection' + (i + 1) + ',\n';
    }

    for (var i = lines.length - 1; i >= 0; i--) {
        var comma = (i == 0) ? '' : ','
        // TODO: we only need the geometry of lines with angles, but for now we're including everything
        query += '    ' + lines[i] + '.geom AS ' + lines[i] + '_geom,\n';
        query += '    ' + lines[i] + '.way_id AS ' + lines[i] + '_way_id' + comma + '\n';
    }

    query += '  FROM ';
    for (var i = lines.length - 1; i >= 0; i--) {
        var comma = (i == 0) ? '\n' : ', '
        query += 'linestrings AS ' + lines[i] + comma
    }

    var identicalTypes = {};
    // TODO: imperfect solution. Doesn't include any additional tags added by user.
    for (var i = lines.length - 1; i >= 0; i--) {
        var generic_type = parameters['lines'][lines[i]]['generic_type'];
        var subtype = parameters['lines'][lines[i]]['subtype'];
        var key = generic_type + ' ' + subtype;

        if (identicalTypes[key] == undefined) {
            identicalTypes[key] = [lines[i]];
        } else {
            var array = identicalTypes[key];
            identicalTypes[key] = array.concat([lines[i]]);
        }
    }

    query += '  WHERE ';
    for (var i = lines.length - 1; i >= 0; i--) {
        // Adds any additional tag entered by the user to the WHERE
        if (parameters['lines'][lines[i]]['tag'] != '') {
            var results = parameters['lines'][lines[i]]['tag'].split(' ');
            query += lines[i] + '.tags->>\'' + results[0] + '\' ';

            if (results.length > 1)
                query += '= \'' + results[1] + '\' ';
            query += 'AND ';
        }

        var generic_type = parameters['lines'][lines[i]]['generic_type'];
        var subtype = parameters['lines'][lines[i]]['subtype'];
        var subtypeString = (subtype == '' ? '' : lines[i] + '.subtype = \'' + subtype + '\' AND ');
        query += lines[i] + '.generic_type = \'' + generic_type + '\' AND ' + subtypeString;
    }

    // TODO: imperfect solution. Doesn't cover every nested case.
    var keys = Object.keys(identicalTypes);
    for (var i = keys.length - 1; i >= 0; i--) {
        for (var j = identicalTypes[keys[i]].length - 1; j > 0; j--) {
            query += identicalTypes[keys[i]][j] + '.way_id != ' + identicalTypes[keys[i]][j - 1] + '.way_id AND ';
        }
    }

    for (var i = allIntersectingPairs.length - 1; i >= 0; i--) {
        var key = Object.keys(allIntersectingPairs[i])[0];
        var val = allIntersectingPairs[i][key];
        query += 'ST_Intersects(' + key + '.geom, ' + val + '.geom) AND '
    }

    for (var i = lines.length - 1; i >= 0; i--) {
        for (var j = lines.length - 1; j >= 0; j--) {
            if (i == j) continue;

            if (parameters['lines'][lines[i]][[lines[j]]]) {
                var maxDistance = parameters['lines'][lines[i]][[lines[j]]]['max_distance'];
                if (maxDistance != 0) {
                    query += 'ST_DWithin(' + lines[i] + '.geom, ' + lines[j] + '.geom, ' + maxDistance + ') AND ';
                }

                var minDistance = parameters['lines'][lines[i]][[lines[j]]]['min_distance'];
                if (minDistance != 0) {
                    query += 'ST_Distance(' + lines[i] + '.geom, ' + lines[j] + '.geom) > ' + minDistance + ' AND ';
                }
            }
        }
    }

    query = query.slice(0, query.length - 4); // remove last AND
    query += '\n';
    query += '),\n';
    query += 'buffers AS\n';
    query += '(\n';
    query += '  SELECT\n';

    for (var i = intersectingPairsWithAngles.length - 1; i >= 0; i--) {
        query += '    intersections.intersection' + (i + 1)+ ',\n';
        query += '    ST_ExteriorRing(ST_Buffer(intersections.intersection' + (i + 1) + ', 0.5)) AS ring' + (i + 1) + ',\n';
    }

    for (var i = lines.length - 1; i >= 0; i--) {
        var comma = (i == 0) ? '' : ',';
        // TODO: we only need the geometry of lines with angles, but for now we're including everything
        query += '    intersections.' + lines[i] + '_geom,\n';
        query += '    intersections.' + lines[i] + '_way_id' + comma + '\n';
    }
    query += '  FROM intersections\n';
    query += '),\n';

    query += 'points AS\n';
    query += '(\n';
    query += '  SELECT\n';

    for (var i = intersectingPairsWithAngles.length - 1; i >= 0; i--) {
        var key = Object.keys(intersectingPairsWithAngles[i])[0];
        var val = intersectingPairsWithAngles[i][key];

        query += '    ST_GeometryN\n';
        query += '    (\n';
        query += '      ST_Intersection(buffers.ring' + (i + 1) + ', buffers.' + val + '_geom)\n';
        query += '      , 1\n';
        query += '    ) AS ring' + (i + 1) + '_p1,\n';
        query += '    ST_GeometryN\n';
        query += '    (\n';
        query += '      ST_Intersection(buffers.ring' + (i + 1) + ', buffers.' + key + '_geom)\n';
        query += '      , 1\n';
        query += '    ) AS ring' + (i + 1) + '_p2,\n';
    }

    for (var i = intersectingPairsWithAngles.length - 1; i >= 0; i--) {
        query += '    buffers.intersection' + (i + 1) + ',\n';
        query += '    buffers.ring' + (i + 1) + ',\n';
    }

    for (var i = lines.length - 1; i >= 0; i--) {
        var comma = (i == 0) ? '' : ',';
        // TODO: we only need the geometry of lines with angles, but for now we're including everything
        query += '    buffers.' + lines[i] + '_geom,\n';
        query += '    buffers.' + lines[i] + '_way_id' + comma + '\n';
    }

    query += '  FROM buffers\n';
    query += ')\n';

    query += 'SELECT\n';
    for (var i = lines.length - 1; i >= 0; i--) {
        var comma = (i == 0) ? '' : ',';
        query += '  points.' + lines[i] + '_way_id' + comma + '\n';
    }
    query += 'FROM points\n';
    query += 'WHERE\n';
    
    for (var i = intersectingPairsWithAngles.length - 1; i >= 0; i--) {
        var key = Object.keys(intersectingPairsWithAngles[i])[0];
        var val = intersectingPairsWithAngles[i][key];

        var relationParams = parameters['lines'][key][val];

        if (relationParams && relationParams['angle'] != null) {
            var angle = parseInt(relationParams['angle']);
            var error = parseInt(relationParams['error']);

            var lowerBounds = [angle - error]; 
            var upperBounds = [angle + error];

            if (lowerBounds[0] / 180 > 1 && upperBounds[0] / 180 > 1) {
                lowerBounds[0] %= 180;
                upperBounds[0] %= 180;
            } else if (upperBounds[0] / 180 > 1) {
                up = upperBounds[0];
                low = lowerBounds[0];
                lowerBounds[0] = low;
                upperBounds[0] = 180;
                lowerBounds[1] = 0;
                upperBounds[1] = up % 180;
            } else if (lowerBounds[0] < 0) {
                lowerBounds[1] = 180 + lowerBounds[0];
                lowerBounds[0] = 0;
                upperBounds[1] = 180;
            }

            if (lowerBounds.length == 1 && (upperBounds[0] < 90 || lowerBounds[0] > 90)) {
                lowerBounds[1] = 180 - upperBounds[0];
                upperBounds[1] = 180 - lowerBounds[0];
            }

            query += '(\n';
            for (var b = 0; b < lowerBounds.length; b++) {
                query += '  (\n';
                query += '    abs(round(degrees(\n';
                query += '      ST_Azimuth(points.ring' + (i + 1) + '_p2, points.intersection' + (i + 1) + ')\n';
                query += '      -\n';
                query += '      ST_Azimuth(points.ring' + (i + 1) + '_p1, points.intersection' + (i + 1) + ')\n';
                query += '    ))::decimal % 180.0) BETWEEN ' + lowerBounds[b] + ' AND ' + upperBounds[b] + '\n';
                query += '  ) ' + ((lowerBounds.length > 1 && b == 0) ? '\n  OR' : '') + '\n';
            }
            query += ')\n';
            query += 'AND \n';
        }
    }

    query = query.slice(0, query.length - 6); // remove last AND
    query += ';\n'


    return query;
}

function constructQuery() {
    var nodes = Object.keys(parameters['nodes']);
    var lines = Object.keys(parameters['lines']);

    var intersectionsCount = 0;

    for (var i = 0; i < lines.length; i++) {
        intersectionsCount += parameters['lines'][lines[i]]['intersections'] ? parameters['lines'][lines[i]]['intersections'].length : 0;
    }

    if (intersectionsCount == 0) {
        return constructNonIntersectingQuery(nodes, lines);
    } else {
        return constructIntersectingQuery(nodes, lines);
    }
}