var parameters = {'lines': {}, 'nodes': {}};

function initializeParameters(elementName, params) {
    if (elementName.startsWith('line')) {
        parameters['lines'][[elementName]] = params;
    } else if (elementName.startsWith('node')) {
        parameters['nodes'][[elementName]] = params;
    }
    console.log(parameters);
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

var nonintersecting_query = `
SELECT line1.way_id, line2.way_id
FROM linestrings AS line1, linestrings as line2

WHERE line1.generic_type = 'highway' AND line1.subtype = 'vehicle' AND line2.generic_type = 'highway' AND line2.subtype = 'vehicle' AND ST_DWithin(line1.geom, line2.geom, 50) AND 
(
  abs((
    degrees(ST_Azimuth(ST_StartPoint(line2.geom), ST_EndPoint(line2.geom)))
    -
    degrees(ST_Azimuth(ST_StartPoint(line1.geom), ST_EndPoint(line1.geom)))
  )::decimal % 180.0) BETWEEN 60 AND 120
);`;

function constructNonIntersectingQuery(nodes, lines) {
    var query = 'SELECT ';
    for (var i = lines.length - 1; i >= 0; i--) {
        query += lines[i] + '.way_id' + (i == 0 ? '\n' : ', ');
    }
    
    query += 'FROM ';
    for (var i = lines.length - 1; i >= 0; i--) {
        query += 'linestrings AS ' + lines[i] + (i == 0 ? '\n' : ', ');
    }

    query += 'WHERE ';
    for (var i = lines.length - 1; i >= 0; i--) {
        // Adds any additional tag entered by the user to the WHERE
        if (parameters['lines'][lines[i]]['tag'] != '') {
            var results = parameters['lines'][lines[i]]['tag'].split(' ');
            query += lines[i] + '.tags->>\'' + results[0] + '\' ';

            if (results.length > 1)
                query += '= \'' + results[1] + '\' '
        }

        var generic_type = parameters['lines'][lines[i]]['generic_type'];
        var subtype = parameters['lines'][lines[i]]['subtype'];
        var subtypeString = (subtype == '' ? '' : lines[i] + '.subtype = \'' + subtype + '\' AND ');
        query += lines[i] + '.generic_type = \'' + generic_type + '\' AND ' + subtypeString;
    }

    for (var i = lines.length - 1; i >= 0; i--) {
        for (var j = lines.length - 1; j >= 0; j--) {
            if (i == j) continue;

            if (parameters['lines'][lines[i]][[lines[j]]]) {
                var distance = parameters['lines'][lines[i]][[lines[j]]].split(' ')[0];
                query += 'ST_DWithin(' + lines[i] + '.geom, ' + lines[j] + '.geom, ' + distance + ') AND  ';
            }
        }
    }

    query += '\n';

    for (var i = lines.length - 1; i >= 0; i--) {
        for (var j = lines.length - 1; j >= 0; j--) {
            if (i == j) continue;

            var relationParams = parameters['lines'][lines[i]][[lines[j]]];

            if (relationParams && relationParams.split(' ').length > 2) {
                var angle = parseInt(relationParams.split(' ')[1]);
                var error = parseInt(relationParams.split(' ')[2]);

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

                var conditionals = lowerBounds.length > 1 ? ['OR', 'AND'] : ['AND']
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

function constructQuery() {
    var nodes = Object.keys(parameters['nodes']);
    var lines = Object.keys(parameters['lines']);

    var intersectionsCount = 0;

    for (var i = 0; i < lines.length; i++) {
        intersectionsCount += parameters['lines'][lines[i]]['intersections'] ? parameters['lines'][lines[i]]['intersections'].length : 0;
    }

    if (intersectionsCount == 0) {
        console.log('no intersections');
        console.log(lines.length + ' lines and ' + nodes.length + ' nodes')
        return constructNonIntersectingQuery(nodes, lines);
    } else {
        console.log(lines.length + ' lines and ' + nodes.length + ' nodes')
    }
}