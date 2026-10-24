import { sniffImage } from './image.js';

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const webp = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.alloc(4),
  Buffer.from('WEBPVP8 '),
]);

describe('sniffImage', () => {
  it('recognises PNG, JPEG and WebP by their bytes', () => {
    expect(sniffImage(png)).toBe('image/png');
    expect(sniffImage(jpeg)).toBe('image/jpeg');
    expect(sniffImage(webp)).toBe('image/webp');
  });

  it('refuses SVG, HTML and anything else', () => {
    expect(
      sniffImage(
        Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>'),
      ),
    ).toBeNull();
    expect(sniffImage(Buffer.from('<!doctype html>'))).toBeNull();
    expect(sniffImage(Buffer.alloc(0))).toBeNull();
    expect(
      sniffImage(
        Buffer.concat([
          Buffer.from('RIFF'),
          Buffer.alloc(4),
          Buffer.from('WAVE'),
        ]),
      ),
    ).toBeNull();
  });
});
