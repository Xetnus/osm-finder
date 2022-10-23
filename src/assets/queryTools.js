
// Returns a partial query that filters by maximum distance
function createMaxDistanceQuery(lines) {
  let query = '';
  for (let i = 0; i < lines.length; i++) {
    for (let j = 0; j < lines[i].relations.length; j++) {
      const relation = lines[i].relations[j];
      const dist = parseInt(relation.maxDistance);
      if (dist)
        query += 'ST_DWithin(' + lines[i].name + '.geom, ' + relation.name + '.geom, ' + dist + ') AND ';
    }
  }
  return query;
}

// Returns a partial query that filters by minimum distance
function createMinDistanceQuery(lines) {
  let query = '';
  for (let i = 0; i < lines.length; i++) {
    for (let j = 0; j < lines[i].relations.length; j++) {
      const relation = lines[i].relations[j];
      const dist = parseInt(relation.minDistance);
      if (dist)
        query += 'ST_Distance(' + lines[i].name + '.geom, ' + relation.name + '.geom' + ') > ' + dist + ' AND ';
    }
  }
  return query;
}

// Returns a partial query that filters out overlapping comparisons
function createNoOverlappingQuery(lines) {
  let identicalTypes = {};

  for (let i = 0; i < lines.length; i++) {
    let genericType = lines[i].genericType;
    let subtype = lines[i].subtype;
    let key = genericType + ' ' + subtype;

    if (identicalTypes[key] == undefined) {
      identicalTypes[key] = [lines[i].name];
    } else {
      identicalTypes[key].push(lines[i].name);
    }
  }

  let query = '';
  let keys = Object.keys(identicalTypes);
  for (let i = 0; i < keys.length; i++) {
    let primaryRemaining = identicalTypes[keys[i]].slice(0);
    let secondaryRemaining = [];
    let current1 = null;
    let current2 = null;

    while (true) {
      if (secondaryRemaining.length > 0) {
        current2 = secondaryRemaining.pop();
        query += current1 + '.way_id != ' + current2 + '.way_id AND ';
      } else if (primaryRemaining.length > 1) {
        current1 = primaryRemaining.pop();
        secondaryRemaining = primaryRemaining.slice(0);
        current2 = secondaryRemaining.pop();
        query += current1 + '.way_id != ' + current2 + '.way_id AND ';
      } else {
        break;
      }
    }
  }
  return query;
}

// Returns a partial query that filters by OSM tags
function createLineTagsQuery(line) {
  let query = '';
  for (var j = 0; j < line.tags.length; j++) {
    let tag = line.tags[j].split('=');

    query += line.name + '.tags->>\'' + tag[0] + '\' ';

    if (tag.length == 2)
      query += '= \'' + tag[1] + '\' ';
    query += 'AND ';
  }
  return query;
}

// Calculates the lower and upper bounds given an angle and error,
// assuming maximum angle is 180 and minimum angle is 0.
function calculateBounds(angle, error) {
  let lowerBounds = [angle - error]; 
  let upperBounds = [angle + error];

  if (lowerBounds[0] / 180 > 1 && upperBounds[0] / 180 > 1) {
    lowerBounds[0] %= 180;
    upperBounds[0] %= 180;
  } else if (upperBounds[0] / 180 > 1) {
    let up = upperBounds[0];
    let low = lowerBounds[0];
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

  return {lower: lowerBounds, upper: upperBounds};
}

export {createMaxDistanceQuery, createMinDistanceQuery, createNoOverlappingQuery, createLineTagsQuery, calculateBounds}