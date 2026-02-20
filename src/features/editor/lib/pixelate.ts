const MIN_INTENSITY = 0;
const MAX_INTENSITY = 100;
const MIN_BLOCK_SIZE = 2;
const CURVE_MAX_BLOCK_SIZE = 16;
const MAX_BLOCK_SIZE = 20;
const CURVE_EXPONENT = 1.2;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(min: number, max: number, t: number): number {
  return min + (max - min) * t;
}

export function clampPixelateBlockSize(blockSize: number): number {
  return clamp(Math.round(blockSize), MIN_BLOCK_SIZE, MAX_BLOCK_SIZE);
}

export function intensityToBlockSize(intensity: number): number {
  const t = clamp(intensity, MIN_INTENSITY, MAX_INTENSITY) / MAX_INTENSITY;
  const curved = t ** CURVE_EXPONENT;
  const blockSize = Math.round(
    lerp(MIN_BLOCK_SIZE, CURVE_MAX_BLOCK_SIZE, curved),
  );

  return clampPixelateBlockSize(blockSize);
}

export function blockSizeToIntensity(blockSize: number): number {
  const clamped = clamp(blockSize, MIN_BLOCK_SIZE, CURVE_MAX_BLOCK_SIZE);
  const normalized =
    (clamped - MIN_BLOCK_SIZE) / (CURVE_MAX_BLOCK_SIZE - MIN_BLOCK_SIZE);
  const t = normalized ** (1 / CURVE_EXPONENT);

  return clamp(Math.round(t * MAX_INTENSITY), MIN_INTENSITY, MAX_INTENSITY);
}

export function computePixelateGrid(params: {
  boundsWidth: number;
  boundsHeight: number;
  blockSize: number;
}): { gridWidth: number; gridHeight: number } {
  const blockSize = clampPixelateBlockSize(params.blockSize);

  return {
    gridWidth: Math.max(4, Math.ceil(params.boundsWidth / blockSize)),
    gridHeight: Math.max(4, Math.ceil(params.boundsHeight / blockSize)),
  };
}

function getQuantizeLevels(blockSize: number): number {
  const normalized =
    (clampPixelateBlockSize(blockSize) - MIN_BLOCK_SIZE) /
    (MAX_BLOCK_SIZE - MIN_BLOCK_SIZE);

  return clamp(Math.round(6 - normalized * 2), 4, 6);
}

function quantizeChannel(value: number, levels: number): number {
  const step = 255 / (levels - 1);

  return Math.round(Math.round(value / step) * step);
}

export function quantizeImageData(params: {
  imageData: ImageData;
  blockSize: number;
}): void {
  const levels = getQuantizeLevels(params.blockSize);
  const { data } = params.imageData;

  for (let index = 0; index < data.length; index += 4) {
    data[index] = quantizeChannel(data[index], levels);
    data[index + 1] = quantizeChannel(data[index + 1], levels);
    data[index + 2] = quantizeChannel(data[index + 2], levels);
  }
}

export function getPixelateBlockSizeBounds(): {
  min: number;
  max: number;
} {
  return {
    min: MIN_BLOCK_SIZE,
    max: MAX_BLOCK_SIZE,
  };
}

export function pixelateImageData(params: {
  source: ImageData;
  blockSize: number;
}): ImageData {
  const blockSize = clampPixelateBlockSize(params.blockSize);
  const { width, height, data } = params.source;
  const output = new Uint8ClampedArray(data);

  for (let y = 0; y < height; y += blockSize) {
    for (let x = 0; x < width; x += blockSize) {
      let red = 0;
      let green = 0;
      let blue = 0;
      let alpha = 0;
      let count = 0;

      for (let offsetY = 0; offsetY < blockSize; offsetY += 1) {
        const currentY = y + offsetY;

        if (currentY >= height) {
          break;
        }

        for (let offsetX = 0; offsetX < blockSize; offsetX += 1) {
          const currentX = x + offsetX;

          if (currentX >= width) {
            break;
          }

          const index = (currentY * width + currentX) * 4;
          red += data[index];
          green += data[index + 1];
          blue += data[index + 2];
          alpha += data[index + 3];
          count += 1;
        }
      }

      if (!count) {
        continue;
      }

      const blockRed = Math.round(red / count);
      const blockGreen = Math.round(green / count);
      const blockBlue = Math.round(blue / count);
      const blockAlpha = Math.round(alpha / count);

      for (let offsetY = 0; offsetY < blockSize; offsetY += 1) {
        const currentY = y + offsetY;

        if (currentY >= height) {
          break;
        }

        for (let offsetX = 0; offsetX < blockSize; offsetX += 1) {
          const currentX = x + offsetX;

          if (currentX >= width) {
            break;
          }

          const index = (currentY * width + currentX) * 4;
          output[index] = blockRed;
          output[index + 1] = blockGreen;
          output[index + 2] = blockBlue;
          output[index + 3] = blockAlpha;
        }
      }
    }
  }

  return new ImageData(output, width, height);
}
