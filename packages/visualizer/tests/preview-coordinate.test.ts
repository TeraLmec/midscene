import { describe, expect, it } from 'vitest';
import { mapPreviewPointToImagePoint } from '../src/utils/preview-coordinate';

describe('mapPreviewPointToImagePoint', () => {
  it('maps a centered click to natural image coordinates', () => {
    expect(
      mapPreviewPointToImagePoint({
        clientX: 150,
        clientY: 100,
        imageRect: { left: 50, top: 25, width: 200, height: 150 },
        naturalWidth: 1000,
        naturalHeight: 750,
      }),
    ).toEqual({ x: 500, y: 375 });
  });

  it('returns null outside the rendered image rect', () => {
    expect(
      mapPreviewPointToImagePoint({
        clientX: 10,
        clientY: 100,
        imageRect: { left: 50, top: 25, width: 200, height: 150 },
        naturalWidth: 1000,
        naturalHeight: 750,
      }),
    ).toBeNull();
  });
});
