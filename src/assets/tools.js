function calculateImageConfig(image, stageWidth, stageHeight) {
  const widthRatio = (stageWidth - 50) / image.width;
  const heightRatio = (stageHeight - 50) / image.height;
  const scale = Math.min(widthRatio, heightRatio);
  const height = image.height * scale;
  const width = image.width * scale;

  // Centers image
  const x = Math.abs(stageWidth - width) / 2;
  const y = Math.abs(stageHeight - height) / 2;

  return {image: image, height: height, width: width, x: x, y: y};
}


/*
Thanks vbarbarosh!
https://stackoverflow.com/a/38977789/1941353
*/
function calculateIntersection(x1, y1, x2, y2, x3, y3, x4, y4)
{
    var ua, ub, denom = (y4 - y3)*(x2 - x1) - (x4 - x3)*(y2 - y1);
    if (denom == 0) {
        return null;
    }
    ua = ((x4 - x3)*(y1 - y3) - (y4 - y3)*(x1 - x3))/denom;
    ub = ((x2 - x1)*(y1 - y3) - (y2 - y1)*(x1 - x3))/denom;
    return {
        x: x1 + ua * (x2 - x1),
        y: y1 + ua * (y2 - y1),
        seg1: ua >= 0 && ua <= 1,
        seg2: ub >= 0 && ub <= 1
    };
}

export {calculateImageConfig, calculateIntersection}