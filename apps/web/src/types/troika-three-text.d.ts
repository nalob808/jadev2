/**
 * The slice of troika-three-text the 3D sphere spike uses. The package ships
 * no types; this is deliberately narrow rather than a full transcription.
 */
declare module 'troika-three-text' {
  import type { Color, Mesh } from 'three';

  export interface TextRenderInfo {
    /** [minX, minY, maxX, maxY] in local units. */
    readonly blockBounds: readonly [number, number, number, number];
  }

  export class Text extends Mesh {
    text: string;
    font: string | null;
    fontSize: number;
    anchorX: number | 'left' | 'center' | 'right' | string;
    anchorY: number | 'top' | 'middle' | 'bottom' | string;
    color: Color | string | number;
    fillOpacity: number;
    outlineWidth: number | string;
    outlineColor: Color | string | number;
    outlineOpacity: number;
    outlineBlur: number | string;
    letterSpacing: number;
    depthOffset: number;
    readonly textRenderInfo: TextRenderInfo | null;
    sync(callback?: () => void): void;
    dispose(): void;
  }

  export function preloadFont(
    options: { font?: string; characters?: string | string[] },
    callback: () => void,
  ): void;
}
