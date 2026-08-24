import { ImageResponse } from 'next/og';

/** The same mark, at the size iOS uses for a home-screen bookmark. */
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
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
      <svg width="132" height="132" viewBox="0 0 100 100">
        <rect x="3" y="3" width="94" height="94" fill="none" stroke="#7FADD4" strokeWidth="3" />
        <line x1="3" y1="3" x2="97" y2="97" stroke="#33668F" strokeWidth="1.6" />
        <line x1="97" y1="3" x2="3" y2="97" stroke="#33668F" strokeWidth="1.6" />
        <polygon points="50,3 97,50 50,97 3,50" fill="none" stroke="#EFEFE9" strokeWidth="3.4" />
      </svg>
    </div>,
    size,
  );
}
