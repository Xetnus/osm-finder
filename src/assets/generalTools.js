/*
Thanks vbarbarosh!
https://stackoverflow.com/a/38977789/1941353
*/
function calculateIntersection(line1, line2) {
  if (line1.length != 4 || line2.length != 4)
    return;
  const [x1, y1, x2, y2] = line1;
  const [x3, y3, x4, y4] = line2;
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

export {calculateIntersection, getLineLength, getPointAtDistance, debounce, getUniquePairs}