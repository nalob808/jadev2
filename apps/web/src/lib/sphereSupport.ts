'use client';

import { useEffect, useState } from 'react';

/**
 * What the sphere lens needs to know about the browser before it mounts a
 * WebGL scene, as small functions the tests can drive without a browser.
 */

interface CanvasLike {
  getContext(kind: string): unknown;
}

/**
 * Whether WebGL is usable here. Checked before the scene mounts, because about
 * 3% of visitors have none — a blocklisted driver, a locked-down browser, a
 * remote desktop — and for them the page must show the wheel and the positions
 * table, not a blank rectangle.
 *
 * `create` is injectable so the test can stand in for a browser that has no
 * context, or one whose `getContext` throws (some do, rather than returning
 * null).
 */
export function detectWebgl(
  create: () => CanvasLike | null = () =>
    typeof document === 'undefined' ? null : document.createElement('canvas'),
): boolean {
  try {
    const canvas = create();
    if (!canvas) return false;
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

interface FocusableCanvas {
  tabIndex: number;
  className: string;
  style: { touchAction: string };
  setAttribute(name: string, value: string): void;
}

/**
 * Make the scene's canvas operable from a keyboard and named for a screen
 * reader (WCAG 2.1.1, 4.1.2). `touch-action: none` on the canvas alone, so a
 * one-finger drag orbits there and the page scrolls everywhere else.
 */
export function prepareSphereCanvas(canvas: FocusableCanvas, label: string): void {
  canvas.tabIndex = 0;
  canvas.className = 'jade-sphere-canvas';
  canvas.style.touchAction = 'none';
  canvas.setAttribute('role', 'application');
  canvas.setAttribute('aria-roledescription', '3D sky');
  canvas.setAttribute('aria-label', label);
}

/** `prefers-reduced-motion: reduce`, kept live — the setting can change mid-visit. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = (): void => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}
