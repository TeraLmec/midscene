export interface PreviewCoordinateInput {
  clientX: number;
  clientY: number;
  imageRect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>;
  naturalWidth: number;
  naturalHeight: number;
}

export interface PreviewCoordinate {
  x: number;
  y: number;
}

export function mapPreviewPointToImagePoint(
  input: PreviewCoordinateInput,
): PreviewCoordinate | null {
  const { clientX, clientY, imageRect, naturalWidth, naturalHeight } = input;
  if (
    imageRect.width <= 0 ||
    imageRect.height <= 0 ||
    naturalWidth <= 0 ||
    naturalHeight <= 0
  ) {
    return null;
  }

  const xRatio = (clientX - imageRect.left) / imageRect.width;
  const yRatio = (clientY - imageRect.top) / imageRect.height;
  if (xRatio < 0 || xRatio > 1 || yRatio < 0 || yRatio > 1) {
    return null;
  }

  return {
    x: Math.round(xRatio * naturalWidth),
    y: Math.round(yRatio * naturalHeight),
  };
}
