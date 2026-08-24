import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from '@/lib/ogImage';

export const alt = 'A wrong degree is the highest-severity bug. — Jade, Vedic astrology software';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return ogImage({
    eyebrow: 'THE ACCURACY PROGRAMME',
    title: 'A wrong degree is the highest-severity bug.',
    subtitle:
      'Checked against Swiss Ephemeris and Jagannātha Hora — with the disagreements published.',
  });
}
