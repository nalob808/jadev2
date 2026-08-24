import { ImageResponse } from 'next/og';

/**
 * The favicon: the North Indian diamond, which is Jade's mark.
 *
 * Generated rather than a checked-in .ico so it stays in step with the palette
 * and renders crisply at every size a browser asks for. A letter in a box is
 * what every other tool does; the diamond is recognisable at 16px and says
 * what the product is.
 */
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#16222E',
      }}
    >
      <svg width="26" height="26" viewBox="0 0 100 100">
        <rect x="4" y="4" width="92" height="92" fill="none" stroke="#7FADD4" strokeWidth="6" />
        <polygon points="50,4 96,50 50,96 4,50" fill="none" stroke="#EFEFE9" strokeWidth="7" />
      </svg>
    </div>,
    size,
  );
}
