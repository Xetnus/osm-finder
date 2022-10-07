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

export {calculateImageConfig}