import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from '@/lib/ogImage';

export const alt =
  'Everything is decomposable, or it is not printed. — Jade, Vedic astrology software';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return ogImage({
    eyebrow: 'FEATURES',
    title: 'Everything is decomposable, or it is not printed.',
    subtitle:
      'Sixteen vargas, aṣṭakavarga with every contributor named, daśās and bisected transits.',
  });
}
