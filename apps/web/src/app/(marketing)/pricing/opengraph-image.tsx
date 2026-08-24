import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from '@/lib/ogImage';

export const alt = 'Start free. Pay when it saves you an hour. — Jade, Vedic astrology software';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return ogImage({
    eyebrow: 'PRICING',
    title: 'Start free. Pay when it saves you an hour.',
    subtitle: 'Five tiers from free to institute. Accuracy is never a paid feature.',
  });
}
