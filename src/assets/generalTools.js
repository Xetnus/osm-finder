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

/*
Performs polygon clipping (intersections, unions, differences) on the shapes drawn by the user.
Parameters
  currentShapes: an array of annotated shapes that may be modified by the clipping operation
  newShapePoints: an array of points that will be added/subtracted from the currentShapes
  mode: clipping mode (e.g., add or sub)
Returns
  {
    existingShapes: a copy of currentShapes, potentially with modified points
    newShape: if a new shape needs to be added to the annotations, the points of the new shape
      will be returned. Returns an empty array otherwise.
  }
*/
function clipPolygons(currentShapes, newShapePoints, mode) {
  let intersectingShapes = [];
  // Out of all shapes, find the ones that intersect the new shape
  for (let i = 0; i < currentShapes.length; i++) {
    if (PolygonClipping.intersection([currentShapes[i].points], [newShapePoints]).length > 0) {
      intersectingShapes.push(currentShapes[i]);
    }
  }

  let newShape = [];
  if (intersectingShapes.length > 0) {
    if (mode === 'add') {
      let intersectingPoints = intersectingShapes.map((s) => [s.points]);
      intersectingShapes[0].points = PolygonClipping.union([newShapePoints], ...intersectingPoints);
      for (let i = 1; i < intersectingShapes.length; i++) {
        intersectingShapes[i].points = [];
      }
    } else if (mode === 'sub') {
      for (let i = 0; i < intersectingShapes.length; i++) {
        let p = PolygonClipping.difference([intersectingShapes[i].points], [newShapePoints]);
        intersectingShapes[i].points = p;
      }
    }
  } else {
    newShape = newShapePoints;
  }

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

  // If the clipping operation resulted in a polygon being split into multiple polygons,
  // we only want to keep the polygon with the highest area, since we don't support
  // multipolygonal shapes at this point.
  for (let i = 0; i < intersectingShapes.length; i++) {
    let maxArea = 0;
    let pointSets = intersectingShapes[i].points;
    let newPoints = [];
    for (let j = 0; j < pointSets.length; j++) {
      let area = calculatePolygonArea(pointSets[j][0]);
      if (area > maxArea) {
        maxArea = area;
        newPoints = pointSets[j][0];
      }
    }
    intersectingShapes[i].points = newPoints;
  }

  return {'existingShapes': intersectingShapes, 'newShape': newShape}
}

export {calculateIntersection, calculatePolygonCentroid,
        getLineLength, getPointAtDistance, getUniquePairs, 
        debounce, clipPolygons}