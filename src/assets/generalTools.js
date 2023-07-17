import PolygonClipping from 'polygon-clipping';

/*
Thanks vbarbarosh!
https://stackoverflow.com/a/38977789/1941353
*/
function calculateIntersection(line1, line2) {
  if (line1.length != 2 || line2.length != 2)
    return;
  const [x1, y1] = line1[0];
  const [x2, y2] = line1[1];
  const [x3, y3] = line2[0];
  const [x4, y4] = line2[1];
  let ua, ub, denom = (y4 - y3)*(x2 - x1) - (x4 - x3)*(y2 - y1);
  if (denom == 0) {
      return null;
  }
  ua = ((x4 - x3)*(y1 - y3) - (y4 - y3)*(x1 - x3))/denom;
  ub = ((x2 - x1)*(y1 - y3) - (y2 - y1)*(x1 - x3))/denom;
  return {
    // Returns true if the two lines intersect, false otherwise.
    intersects: ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1,
    // Returns the X and Y coords of the (potential) intersection
    x: x1 + ua * (x2 - x1),
    y: y1 + ua * (y2 - y1)
  };
}

function getLineLength(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

function getPointAtDistance(point1, point2, distance) {
  const d = getLineLength(point1[0], point1[1], point2[0], point2[1]);
  const t = distance / d;
  const x = (1 - t) * point1[0] + t * point2[0];
  const y = (1 - t) * point1[1] + t * point2[1];
  return {x: x, y: y};
}

// Thanks Ondrej! https://www.freecodecamp.org/news/javascript-debounce-example/
function debounce(func, timeout = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => { func.apply(this, args); }, timeout);
  };
}

function getUniquePairs(list) {
  let pairs = []
  let primaryRemaining = list.slice(0);
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
    pairs.push({first: current1, second: current2});
  }
  return pairs;
}

// Thanks pragmar! https://stackoverflow.com/a/43747218/1941353
function calculatePolygonCentroid(points) {
  let first = points[0], last = points[points.length-1];
  if (first[0] != last[0] || first[1] != last[1]) points.push(first);
  let twicearea=0, x=0, y=0, nPts = points.length, p1, p2, f;
  for ( let i=0, j=nPts-1 ; i<nPts ; j=i++ ) {
    p1 = points[i]; p2 = points[j];
    f = (p1[1] - first[1]) * (p2[0] - first[0]) - (p2[1] - first[1]) * (p1[0] - first[0]);
    twicearea += f;
    x += (p1[0] + p2[0] - 2 * first[0]) * f;
    y += (p1[1] + p2[1] - 2 * first[1]) * f;
  }
  f = twicearea * 3;
  return { x:x/f + first[0], y:y/f + first[1] };
}

function clipPolygons(originalShape, newShape, mode) {
  let results = [];
  if (mode === 'add') {
    results = PolygonClipping.union([originalShape], [newShape]);
  } else if (mode === 'sub') {
    results = PolygonClipping.difference([originalShape], [newShape]);
  }

  // Checks that both arrays have the same [x, y] coordinates as elements.
  // Due to an inconsistency in the PolygonClipping library, the coordinates
  // may not be exactly the same, so we account for some margin of error.
  const checkArrayEquality = (a1, a2) => a1.length === a2.length &&
      a1.every((o1) => a2.some(o2 => Math.abs(o2[0] - o1[0]) < 0.00001 && Math.abs(o2[1] - o1[1]) < 0.00001));

  // Thanks Andrii! https://stackoverflow.com/a/33670691/1941353
  const calculatePolygonArea = (vertices) => {
    let total = 0;
    for (let i = 0, l = vertices.length; i < l; i++) {
      let addX = vertices[i][0];
      let addY = vertices[i == vertices.length - 1 ? 0 : i + 1][1];
      let subX = vertices[i == vertices.length - 1 ? 0 : i + 1][0];
      let subY = vertices[i][1];
      total += (addX * addY * 0.5);
      total -= (subX * subY * 0.5);
    }
    return Math.abs(total);
  }

  // In the event that two or more geometries were returned with the clipping operation,
  // keep the one that exactly matches the original geometry (i.e., the newly drawn geometry
  // didn't overlap with the original geometry, leaving the original geometry unmodified) or
  // that has the highest area (i.e., the subtractive clipping operation resulted in 2+ 
  // geometries and we decided to only keep the geometry with the highest polygonal area).
  let maxArea = 0;
  let shape = [];
  let warn = false;
  for (let i = 0; i < results.length; i++) {
    let r = results[i][0];
    if (checkArrayEquality(r, originalShape)) {
      warn = true;
      shape = r;
      break;
    } else if (calculatePolygonArea(r) > maxArea) {
      maxArea = calculatePolygonArea(r);
      shape = r;
    }
  }

  return {'points': shape, 'warn': warn};
}

export {calculateIntersection, calculatePolygonCentroid,
        getLineLength, getPointAtDistance, getUniquePairs, 
        debounce, clipPolygons}