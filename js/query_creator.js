var parameters = {'lines': {}, 'intersections': {}, 'nodes': {}};

function initializeParameters(elementName, params) {
    if (elementName.startsWith('line')) {
        parameters['lines'][[elementName]] = params;
    } else if (elementName.startsWith('intersection')) {
        parameters['intersections'][[elementName]] = params;
    } else if (elementName.startsWith('node')) {
        parameters['nodes'][[elementName]] = params;
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
    
    query += 'FROM '
    for (var i = lines.length - 1; i >= 0; i--) {
        query += 'linestrings AS ' + lines[i] + (i == 0 ? '\n' : ', ');
    }

    query += 'WHERE '
    for (var i = lines.length - 1; i >= 0; i--) {
        var generic_type = parameters['lines'][lines[i]]['generic_type'];
        var subtype = parameters['lines'][lines[i]]['subtype'];
        var subtypeString = (subtype == '' ? '' : lines[i] + '.subtype = \'' + subtype + '\' AND ');
        query += lines[i] + '.generic_type = \'' + generic_type + '\' AND ' + subtypeString;
    }

    for (var i = lines.length - 1; i > 0; i--) {
        query += 'ST_DWithin(' + lines[i] + '.geom, ' + lines[i - 1] + '.geom, 50) AND ';
    }

    query += '\n';

    for (var i = lines.length - 1; i > 0; i--) {
        query += '(\n';
        query += '  abs((\n';
        query += '    degrees(ST_Azimuth(ST_StartPoint(' + lines[i - 1] + '.geom), ST_EndPoint(' + lines[i - 1] + '.geom)))\n';
        query += '-\n'
        query += '    degrees(ST_Azimuth(ST_StartPoint(' + lines[i] + '.geom), ST_EndPoint(' + lines[i] + '.geom)))\n';
        query += '  )::decimal % 180.0) BETWEEN 60 AND 120\n'
        query += ')\n';
        query += ' AND \n';
    }

    query = query.slice(0, query.length - 7); // remove last AND
    query += ';'

    return query;
}

function constructQuery() {
    var intersections = Object.keys(parameters['intersections']);
    var nodes = Object.keys(parameters['nodes']);
    var lines = Object.keys(parameters['lines']);
    if (intersections.length == 0) {
        console.log('no intersections');
        console.log(lines.length + ' lines and ' + nodes.length + ' nodes')
        return constructNonIntersectingQuery(nodes, lines);
    } else {
        console.log(Object.keys(parameters['intersections']).length + ' intersections')
        console.log(lines.length + ' lines and ' + nodes.length + ' nodes')
    }
}