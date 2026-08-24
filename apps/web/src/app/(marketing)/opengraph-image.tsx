import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from '@/lib/ogImage';

export const alt = 'Astrology software that shows its working. — Jade, Vedic astrology software';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return ogImage({
    eyebrow: 'SIDEREAL · VEDIC ASTROLOGY · PROFESSIONAL',
    title: 'Astrology software that shows its working.',
    subtitle:
      'Verified classical mathematics, a modern interface, and the practice layer around them.',
  });
}
