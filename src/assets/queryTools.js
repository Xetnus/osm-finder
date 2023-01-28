
// Returns a partial query that filters by maximum distance
function createMaxDistanceQuery(annotations) {
  let query = '';
  for (let i = 0; i < annotations.length; i++) {
    const keys = Object.keys(annotations[i].relations);
    for (let k = 0; k < keys.length; k++) {
      const relation = annotations[i].relations[keys[k]];
      const dist = parseInt(relation.maxDistance);
      if (dist && !keys[k].includes('&'))
        query += 'ST_DWithin(' + annotations[i].name + '.geom, ' + keys[k] + '.geom, ' + dist + ') AND ';
    }
  }
  return query;
}

// Returns a partial query that filters by minimum distance
function createMinDistanceQuery(annotations) {
  let query = '';
  for (let i = 0; i < annotations.length; i++) {
    const keys = Object.keys(annotations[i].relations);
    for (let k = 0; k < keys.length; k++) {
      const relation = annotations[i].relations[keys[k]];
      const dist = parseInt(relation.minDistance);
      if (dist && !keys[k].includes('&'))
        query += 'ST_Distance(' + annotations[i].name + '.geom, ' + keys[k] + '.geom' + ') > ' + dist + ' AND ';
    }
  }
  return query;
}

// Returns a partial query that filters out overlapping comparisons
function createNoOverlappingQuery(annotations) {
  let identicalTypes = {};

  for (let i = 0; i < annotations.length; i++) {
    let category = annotations[i].category;
    let subcategory = annotations[i].subcategory;
    let key = category + ' ' + subcategory;

    if (identicalTypes[key] == undefined) {
      identicalTypes[key] = [annotations[i].name];
    } else {
      identicalTypes[key].push(annotations[i].name);
    }
  }

  let query = '';
  let keys = Object.keys(identicalTypes);
  for (let i = 0; i < keys.length; i++) {
    let primaryRemaining = identicalTypes[keys[i]].slice(0);
    let secondaryRemaining = [];
    let current1 = null;
    let current2 = null;

    while (primaryRemaining.length > 1) {
      if (secondaryRemaining.length > 0) {
        current2 = secondaryRemaining.pop();
      } else {
        current1 = primaryRemaining.pop();
        secondaryRemaining = primaryRemaining.slice(0);
        current2 = secondaryRemaining.pop();
      }
      query += current1 + '.osm_id != ' + current2 + '.osm_id AND ';
    }
  }
  return query;
}

// Returns a partial query that filters by OSM tags
function createTagsQuery(ann) {
  let query = '';
  for (var j = 0; j < ann.tags.length; j++) {
    // Splits the tag into a key and value. Also escapes single
    // quotes so PostgreSQL doesn't get confused.
    let tag = ann.tags[j].replaceAll("'", "''").split('=');

    if (tag.length == 1) {
      query += ann.name + '.tags ? \'' + tag[0] + '\' ';
    } else if (tag.length == 2) {
      query += ann.name + '.tags->>\'' + tag[0] + '\' ';
      query += '= \'' + tag[1] + '\' ';
    }

    query += 'AND ';
  }
  return query;
}

// Calculates the lower and upper bounds given an angle and error,
// assuming maximum angle is 180 and minimum angle is 0.
function calculateBounds(angle, error) {
  angle = Math.abs(angle);
  error = Math.abs(error);
  let lowerBounds = [angle - error]; 
  let upperBounds = [angle + error];

  if (upperBounds[0] > 180) {
    if (lowerBounds[0] > 180) {
      lowerBounds[0] %= 180;
      upperBounds[0] %= 180;
    } else if (lowerBounds[0] < 0) {
      lowerBounds[0] = 0;
      upperBounds[0] = 180;
    } else {
      const up = upperBounds[0];
      upperBounds[0] = 180;
      lowerBounds[1] = 0;
      upperBounds[1] = up % 180;
    }
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

export {createMaxDistanceQuery, createMinDistanceQuery, createNoOverlappingQuery, createTagsQuery, calculateBounds}