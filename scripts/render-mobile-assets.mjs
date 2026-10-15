import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const workspaceRoot = path.resolve(import.meta.dirname, '..');
const imageDirectory = path.join(workspaceRoot, 'apps/mobile/assets/images');
const brandDirectory = path.join(workspaceRoot, 'apps/mobile/assets/brand');
const iconSource = path.join(brandDirectory, 'brand-icon.svg');
const monochromeSource = path.join(brandDirectory, 'brand-symbol-monochrome.svg');
const symbolSource = path.join(brandDirectory, 'brand-symbol.svg');

await mkdir(imageDirectory, { recursive: true });

await sharp(iconSource)
  .resize(1024, 1024)
  .flatten({ background: '#0E7C7B' })
  .png()
  .toFile(path.join(imageDirectory, 'icon.png'));
await sharp(iconSource).resize(128, 128).png().toFile(path.join(imageDirectory, 'favicon.png'));
await sharp(symbolSource)
  .resize(640, 640, { fit: 'contain' })
  .extend({
    background: { alpha: 0, b: 0, g: 0, r: 0 },
    bottom: 192,
    left: 192,
    right: 192,
    top: 192,
  })
  .resize(1024, 1024)
  .png()
  .toFile(path.join(imageDirectory, 'splash-icon.png'));
await sharp(symbolSource)
  .resize(620, 620, { fit: 'contain' })
  .extend({
    background: { alpha: 0, b: 0, g: 0, r: 0 },
    bottom: 202,
    left: 202,
    right: 202,
    top: 202,
  })
  .resize(1024, 1024)
  .png()
  .toFile(path.join(imageDirectory, 'android-icon-foreground.png'));
await sharp({
  create: {
    background: '#0E7C7B',
    channels: 4,
    height: 1024,
    width: 1024,
  },
})
  .png()
  .toFile(path.join(imageDirectory, 'android-icon-background.png'));
await sharp(monochromeSource)
  .resize(620, 620, { fit: 'contain' })
  .extend({
    background: { alpha: 0, b: 0, g: 0, r: 0 },
    bottom: 202,
    left: 202,
    right: 202,
    top: 202,
  })
  .resize(1024, 1024)
  .png()
  .toFile(path.join(imageDirectory, 'android-icon-monochrome.png'));

console.log(`Rendered Conexao Favela assets in ${imageDirectory}`);
