
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

function calculateHuMoments(nodes) {
  let maxX = 29;
  let maxY = 29;

  function dist2(v, w) {
    return Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2)
  }

  function distToSegmentSquared(p, v, w) {
    var l2 = dist2(v, w);
    if (l2 == 0) {
      return dist2(p, v);
    }
    var t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));

    return dist2(p, { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) });
  }

  // Calculates shortest distance between point and a line segment
  // p: point whose distance to line segment will be measured
  // v: point at one end of line segment
  // w: point at other end of line segment
  // https://stackoverflow.com/a/1501725/1941353
  function distToSegment(p, v, w) {
    return Math.sqrt(distToSegmentSquared(p, v, w));
  }

  function pDistance(x, y, x1, y1, x2, y2) {

  var A = x - x1;
  var B = y - y1;
  var C = x2 - x1;
  var D = y2 - y1;

  var dot = A * C + B * D;
  var len_sq = C * C + D * D;
  var param = -1;
  if (len_sq != 0) //in case of 0 length line
      param = dot / len_sq;

  var xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  }
  else if (param > 1) {
    xx = x2;
    yy = y2;
  }
  else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  var dx = x - xx;
  var dy = y - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

  // Determines binary value at given coordinates
  function calculateI(nodes, x, y) {
    // return nodes[x][y];

    let p = {x: x, y: y};

    for (let i = 0; i < nodes.length - 1; i++) {
      let segmentP1 = {x: nodes[i][0], y: nodes[i][1]};
      let segmentP2 = {x: nodes[i + 1][0], y: nodes[i + 1][1]};

      if (distToSegment(p, segmentP1, segmentP2) <= 0.5) {
      // if (pDistance(x, y, segmentP1.x, segmentP1.y, segmentP2.x, segmentP2.y) <= 0.5) {
        return 1;
      }
    }

    return 0;
  }

  function calculateM(nodes, p, q) {
    let m = 0;

    console.log();
    let res = "";

    for (let x = 0; x <= maxX; x++) {
      for (let y = 0; y <= maxY; y++) {
        m += (Math.pow(x, p) * Math.pow(y, q) * calculateI(nodes, x, y));
        res += "" + calculateI(nodes, x, y) + " ";
      }
      // console.log(res);
      res = "";
    }
    return m;
  }

  // Greek letter mu
  function calculateMu(nodes, centroidX, centroidY, p, q) {
    let mu = 0;

    for (let x = 0; x <= maxX; x++) {
      for (let y = 0; y <= maxY; y++) {
        mu += (Math.pow((x - centroidX), p) * Math.pow((y - centroidY), q) * calculateI(nodes, x, y));
      }
    }

    return mu;
  }

  // Greek letter eta
  function calculateEta(nodes, centroidX, centroidY, muDenominator, p, q) {
    let denominator = Math.pow(muDenominator, (1 + (p + q) / 2));
    let numerator = calculateMu(nodes, centroidX, centroidY, p, q);
    return numerator / denominator;
  }



  // nodes = [];
  // nodes = nodes.concat(["0 0 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0 0 0 0 0 0".split(" ")]);
  // nodes = nodes.concat(["0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0".split(" ")]);
  // nodes = nodes.concat(["0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0".split(" ")]);
  // nodes = nodes.concat(["0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0".split(" ")]);
  // nodes = nodes.concat(["0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0".split(" ")]);
  // nodes = nodes.concat(["0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0".split(" ")]);
  // nodes = nodes.concat(["0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0".split(" ")]);
  // nodes = nodes.concat(["0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0".split(" ")]);
  // nodes = nodes.concat(["0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0".split(" ")]);
  // nodes = nodes.concat(["0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0".split(" ")]);
  // nodes = nodes.concat(["0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0".split(" ")]);
  // nodes = nodes.concat(["0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0".split(" ")]);
  // nodes = nodes.concat(["0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0".split(" ")]);
  // nodes = nodes.concat(["0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0".split(" ")]);
  // nodes = nodes.concat(["0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0".split(" ")]);
  // nodes = nodes.concat(["0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0".split(" ")]);
  // nodes = nodes.concat(["0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0".split(" ")]);
  // nodes = nodes.concat(["0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0".split(" ")]);
  // nodes = nodes.concat(["0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0".split(" ")]);
  // nodes = nodes.concat(["0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0".split(" ")]);
  // nodes = nodes.concat(["1 1 1 1 1 0 0 0 0 0 0 0 0 0 0 0 1 1 1 1 1 1 1 1 0 0 0 0 0 0".split(" ")]);
  // nodes = nodes.concat(["1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 0".split(" ")]);
  // nodes = nodes.concat(["1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 0".split(" ")]);
  // nodes = nodes.concat(["1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 0".split(" ")]);
  // nodes = nodes.concat(["1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 0".split(" ")]);
  // nodes = nodes.concat(["1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 0".split(" ")]);
  // nodes = nodes.concat(["1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 0".split(" ")]);
  // nodes = nodes.concat(["1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 0".split(" ")]);
  // nodes = nodes.concat(["1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 0".split(" ")]);
  // nodes = nodes.concat(["1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0".split(" ")]);




  let maxCoords = [nodes[0][0], nodes[0][1]];
  let minCoords = [nodes[0][0], nodes[0][1]];
  for(let i = 0; i < nodes.length; i++) {
    if (nodes[i][0] > maxCoords[0]) {
        maxCoords[0] = nodes[i][0];
    } else if (nodes[i][0] < minCoords[0]) {
        minCoords[0] = nodes[i][0];
    }

    if (nodes[i][1] > maxCoords[1]) {
        maxCoords[1] = nodes[i][1];
    } else if (nodes[i][1] < minCoords[1]) {
        minCoords[1] = nodes[i][1];
    }
  }

  let xRange = maxCoords[0] - minCoords[0];
  let yRange = maxCoords[1] - minCoords[1];

  let xRatio = maxX / xRange;
  let yRatio = maxY / yRange;
  let scale = Math.min(xRatio, yRatio);

  for(let i = 0; i < nodes.length; i++) {
    // console.log(nodes[i][0], nodes[i][1]);
    nodes[i][0] -= minCoords[0];
    nodes[i][1] -= minCoords[1];

    nodes[i][0] *= scale;
    nodes[i][1] *= scale;
  }

  let h1 = 0, h2 = 0, h3 = 0, h4 = 0, h5 = 0, h6 = 0, h7 = 0;
  let mDenominator = calculateM(nodes, 0, 0);

  if (mDenominator != 0) {
    const centroidX = calculateM(nodes, 1, 0) / mDenominator;
    const centroidY = calculateM(nodes, 0, 1) / mDenominator;

    // let muDenominator = calculateMu(nodes, centroidX, centroidY, 0, 0);
    let muDenominator = mDenominator;

    let eta20 = calculateEta(nodes, centroidX, centroidY, muDenominator, 2, 0);
    let eta02 = calculateEta(nodes, centroidX, centroidY, muDenominator, 0, 2);
    let eta11 = calculateEta(nodes, centroidX, centroidY, muDenominator, 1, 1);
    let eta30 = calculateEta(nodes, centroidX, centroidY, muDenominator, 3, 0);
    let eta12 = calculateEta(nodes, centroidX, centroidY, muDenominator, 1, 2);
    let eta03 = calculateEta(nodes, centroidX, centroidY, muDenominator, 0, 3);
    let eta21 = calculateEta(nodes, centroidX, centroidY, muDenominator, 2, 1);

    // console.log("centroidX " + centroidX);
    // console.log("centroidY " + centroidY);
    // console.log("mDenom " + mDenominator);
    // console.log("muDenom " + muDenominator);

    // console.log("eta20 " + eta20);
    // console.log("eta02 " + eta02);
    // console.log("eta11 " + eta11);
    // console.log("eta30 " + eta30);
    // console.log("eta12 " + eta12);
    // console.log("eta03 " + eta03);
    // console.log("eta21 " + eta21);

    h1 = eta20 + eta02;

    h2 = Math.pow(
                (eta20 - eta02)
                , 2
            ) + 
            4 * Math.pow(
                eta11
                , 2
            );

    h3 = Math.pow(
                (eta30 - 3 * eta12)
                , 2
            ) + 
            Math.pow(
                (3 * eta21 - eta03)
                , 2
            );

    h4 = Math.pow(
                (eta30 + eta12)
                , 2
            ) + 
            Math.pow(
                (eta21 + eta03)
                , 2
            );

    h5 = (eta30 - 3 * eta12) * 
            (eta30 + eta12) * 
            (
                Math.pow(
                    (eta30 + eta12)
                    , 2
                ) - 
                3 * Math.pow(
                    (eta21 + eta03)
                    , 2
                )
            ) +
            (3 * eta21 - eta03) * 
            (eta21 + eta03) * 
            (
                3 * Math.pow(
                    (eta30 + eta12)
                    , 2
                ) - 
                Math.pow(
                    (eta21 + eta03)
                    , 2
                )
            );

    h6 = (eta20 - eta02) * 
            (
                Math.pow(
                    (eta30 + eta12)
                    , 2
                ) - 
                Math.pow(
                    (eta21 + eta03)
                    , 2
                )
            ) +
            4 * eta11 * 
            (eta30 + eta12) * 
            (eta21 + eta03);

    h7 = (3 * eta21 - eta03) * 
            (eta30 + eta12) * 
            (
                Math.pow(
                    (eta30 + eta12)
                    , 2
                ) - 
                3 * Math.pow(
                    (eta21 + eta03)
                    , 2
                )
            ) -
            (eta30 - 3 * eta12) * 
            (eta21 + eta03) * 
            (
                3 * Math.pow(
                    (eta30 + eta12)
                    , 2
                ) - 
                Math.pow(
                    (eta21 + eta03)
                    , 2
                )
            );
  }

  return [h1, h2, h3, h4, h5, h6, h7];
}

export {createMaxDistanceQuery, createMinDistanceQuery, createNoOverlappingQuery, createTagsQuery, calculateBounds, calculateHuMoments}