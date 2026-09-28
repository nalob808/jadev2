'use client';

import { useEffect, useRef } from 'react';
import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Line,
  LineBasicMaterial,
  LineDashedMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Points,
  RingGeometry,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Vector3,
  WebGLRenderer,
  type Material,
  type Object3D,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Text, preloadFont } from 'troika-three-text';
import { NAKSHATRA_SPAN, norm360, type PointId } from '@jade/astro';
import type { RingFrame } from '@/lib/transitRing';
import { SKY } from '@/lib/skyPalette';
import {
  NAKSHATRA_CENTRES,
  NAKSHATRA_IAST,
  NAMED_STARS,
  PATH_BODIES,
  RASHI_CENTRES,
  RASHI_IAST,
  bodyPath,
  decodeStars,
  directionOf,
  eclipticFromEquatorial,
  equinoxSiderealLongitude,
  labelOpacity,
  sphereBodies,
  starFrameShift,
} from '@/lib/sky3d';

/**
 * SPIKE — the celestial sphere in 3D. Read docs/10-sphere-spike.md first.
 *
 * Plain three.js, driven imperatively from effects. The scene is static
 * structure (band, dividers, stars, labels) built once on mount, plus nine
 * bodies whose transforms are mutated when the date changes. Nothing else
 * moves when the date moves, the same rule the 2D scrubber keeps.
 *
 * Renders on demand: a frame is drawn only when the camera moved, the date
 * changed or a label finished laying out. A still sphere costs nothing.
 */

const GRAHA_IAST: Record<string, string> = {
  Sun: 'Sūrya',
  Moon: 'Candra',
  Mars: 'Maṅgala',
  Mercury: 'Budha',
  Jupiter: 'Guru',
  Venus: 'Śukra',
  Saturn: 'Śani',
  Rahu: 'Rāhu',
  Ketu: 'Ketu',
};

const FONT = '/sky/fira-sans-condensed-500-iast.woff';
const STARS = '/sky/bsc-v6.0.bin';

/** Radii, in scene units. The band is the spec's RingGeometry(9.6, 10). */
const R_BAND_IN = 9.6;
const R_BAND_OUT = 10;
const R_BODY = 9.8;
const R_STARS = 1000;

export interface SphereStats {
  readonly calls: number;
  readonly triangles: number;
  readonly points: number;
  readonly lines: number;
  readonly labels: number;
}

export interface SphereHandle {
  /** Fly the camera: the viewer's seat, the armillary view, or down from the north ecliptic pole. */
  view(kind: 'centre' | 'outside' | 'pole'): void;
  /** Force a WebGL context loss and restore, to exercise the handlers. */
  loseContext(): void;
  restoreContext(): void;
  stats(): SphereStats;
}

export interface CelestialSphereProps {
  readonly jdUt: number;
  readonly frame: RingFrame;
  readonly showPaths: boolean;
  readonly onHandle?: (handle: SphereHandle | null) => void;
  readonly onContextState?: (state: 'ok' | 'lost') => void;
}

/** A soft round sprite, shared by every body's halo. */
function haloTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const context = canvas.getContext('2d')!;
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
  gradient.addColorStop(0.25, 'rgba(255,255,255,0.35)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  return new CanvasTexture(canvas);
}

/** Muted star tint from colour temperature — halfway to white, so the sky stays in Jade's register. */
function starTint(kelvin: number): [number, number, number] {
  let rgb: [number, number, number];
  if (kelvin === 0) rgb = [1, 1, 1];
  else if (kelvin < 3600) rgb = [1, 0.7, 0.48];
  else if (kelvin < 5000) rgb = [1, 0.84, 0.66];
  else if (kelvin < 6000) rgb = [1, 0.95, 0.85];
  else if (kelvin < 7500) rgb = [0.97, 0.97, 1];
  else if (kelvin < 10000) rgb = [0.84, 0.9, 1];
  else rgb = [0.72, 0.8, 1];
  return rgb.map((channel) => 0.5 + channel * 0.5) as [number, number, number];
}

function scaled(direction: [number, number, number], radius: number): Vector3 {
  return new Vector3(direction[0] * radius, direction[1] * radius, direction[2] * radius);
}

function smooth(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function formatDegrees(longitude: number): string {
  const inSign = longitude % 30;
  let whole = Math.floor(inSign);
  let minutes = Math.round((inSign - whole) * 60);
  if (minutes === 60) {
    whole += 1;
    minutes = 0;
  }
  return `${whole}°${String(minutes).padStart(2, '0')}′`;
}

interface Label {
  readonly text: Text;
  /** Where the label is pinned, in world space. */
  readonly anchor: Vector3;
  /** Rendered height in CSS pixels. */
  readonly px: number;
  /** Width at fontSize 1, known once troika has laid it out. */
  width: number;
  opacity: number;
  /** Base opacity before fading. */
  readonly strength: number;
}

interface World {
  update(jdUt: number, frame: RingFrame): void;
  updatePaths(jdUt: number, frame: RingFrame, show: boolean): void;
}

export default function CelestialSphere({
  jdUt,
  frame,
  showPaths,
  onHandle,
  onContextState,
}: CelestialSphereProps): React.ReactElement {
  const hostRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<World | null>(null);
  const callbacks = useRef({ onHandle, onContextState });
  callbacks.current = { onHandle, onContextState };

  /* ============================================================ the scene */
  useEffect(() => {
    const host = hostRef.current!;
    let disposed = false;

    const renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    /*
     * Fill rate is the lever that matters. A phone at dpr 3 pushes four times
     * the pixels of dpr 1.5 for a vector scene that looks the same.
     */
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, coarse ? 1.5 : 2));
    renderer.setClearColor(SKY.ground, 1);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';
    host.appendChild(renderer.domElement);

    const scene = new Scene();
    const camera = new PerspectiveCamera(50, 1, 0.01, 3000);
    camera.position.set(0, 10, 21);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false; // the target is the viewer; it does not move
    controls.minDistance = 0.05;
    controls.maxDistance = 60;
    controls.rotateSpeed = 0.55;

    let dirty = true;
    const requestRender = (): void => {
      dirty = true;
    };
    controls.addEventListener('change', requestRender);

    /**
     * The armillary view, framed so the labelled ring fits the narrower axis
     * of the canvas. Until the reader takes the camera, a resize re-frames.
     */
    let touched = false;
    controls.addEventListener('start', () => {
      touched = true;
    });
    const fitDistance = (radius: number): number => {
      const vertical = (camera.fov * Math.PI) / 180;
      const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * camera.aspect);
      return Math.min(58, radius / Math.sin(Math.min(vertical, horizontal) / 2));
    };
    const outsideView = (): Vector3 =>
      new Vector3(0, 0.45, 0.9).normalize().multiplyScalar(fitDistance(12.2));

    const disposables: { dispose(): void }[] = [];
    const halo = haloTexture();
    disposables.push(halo);

    /* ---------------------------------------------------------- the band */
    // Flat, as specified — it reads from outside. From the centre a flat
    // annulus is edge-on and vanishes, so a thin zone of the sphere itself
    // (β ±1°) takes over as the camera moves in. The two crossfade.
    const elementColour = (longitude: number): Color =>
      new Color(SKY.elements[Math.floor(norm360(longitude) / 30) % 4]!);

    const ringGeometry = new RingGeometry(R_BAND_IN, R_BAND_OUT, 360, 1);
    ringGeometry.rotateX(-Math.PI / 2); // XY → XZ: ring angle θ lands on sidereal θ
    {
      const position = ringGeometry.getAttribute('position');
      const colours: number[] = [];
      for (let index = 0; index < position.count; index += 1) {
        const longitude = (Math.atan2(-position.getZ(index), position.getX(index)) * 180) / Math.PI;
        colours.push(...elementColour(longitude + 1e-6).toArray());
      }
      ringGeometry.setAttribute('color', new Float32BufferAttribute(colours, 3));
    }
    const ringMaterial = new MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.3,
      side: DoubleSide,
      depthWrite: false,
    });
    const ring = new Mesh(ringGeometry, ringMaterial);
    scene.add(ring);

    const zoneGeometry = new SphereGeometry(
      R_BAND_OUT,
      360,
      1,
      0,
      Math.PI * 2,
      Math.PI / 2 - Math.PI / 180,
      (2 * Math.PI) / 180,
    );
    {
      const position = zoneGeometry.getAttribute('position');
      const colours: number[] = [];
      for (let index = 0; index < position.count; index += 1) {
        const longitude = (Math.atan2(-position.getZ(index), position.getX(index)) * 180) / Math.PI;
        colours.push(...elementColour(longitude + 1e-6).toArray());
      }
      zoneGeometry.setAttribute('color', new Float32BufferAttribute(colours, 3));
    }
    const zoneMaterial = new MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0,
      side: DoubleSide,
      depthWrite: false,
    });
    const zone = new Mesh(zoneGeometry, zoneMaterial);
    scene.add(zone);

    /* ------------------------------------------------------ the dividers */
    // One LineSegments: sign and nakṣatra boundaries, each drawn twice — a
    // radial tick that reads from outside and a meridian tick that reads from
    // the centre.
    {
      const points: number[] = [];
      const colours: number[] = [];
      const push = (a: Vector3, b: Vector3, colour: Color): void => {
        points.push(a.x, a.y, a.z, b.x, b.y, b.z);
        colours.push(...colour.toArray(), ...colour.toArray());
      };
      const signColour = new Color(SKY.inkMuted).multiplyScalar(0.85);
      const nakColour = new Color(SKY.inkFaint).multiplyScalar(0.75);
      for (let sign = 0; sign < 12; sign += 1) {
        const longitude = sign * 30;
        push(
          scaled(directionOf(longitude, 0), 9.25),
          scaled(directionOf(longitude, 0), 10.4),
          signColour,
        );
        push(
          scaled(directionOf(longitude, -2.2), R_BAND_OUT),
          scaled(directionOf(longitude, 2.2), R_BAND_OUT),
          signColour,
        );
      }
      for (let nak = 0; nak < 27; nak += 1) {
        if (nak % 9 === 0) continue; // coincides with a sign boundary
        const longitude = nak * NAKSHATRA_SPAN;
        push(
          scaled(directionOf(longitude, 0), R_BAND_IN),
          scaled(directionOf(longitude, 0), R_BAND_OUT),
          nakColour,
        );
        push(
          scaled(directionOf(longitude, -1), R_BAND_OUT),
          scaled(directionOf(longitude, 1), R_BAND_OUT),
          nakColour,
        );
      }
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute(points, 3));
      geometry.setAttribute('color', new Float32BufferAttribute(colours, 3));
      scene.add(new LineSegments(geometry, new LineBasicMaterial({ vertexColors: true })));
    }

    /* -------------------------------------------- the equator and equinox */
    // The celestial equator, dashed, crossing the band at the tropical
    // equinox. The gap from that crossing to Aśvinī 0° is the ayanāṁśa.
    const equatorGeometry = new BufferGeometry();
    equatorGeometry.setAttribute(
      'position',
      new Float32BufferAttribute(new Float32Array(181 * 3), 3),
    );
    const equator = new Line(
      equatorGeometry,
      new LineDashedMaterial({
        color: SKY.accentSoft,
        dashSize: 0.25,
        gapSize: 0.2,
        transparent: true,
        opacity: 0.55,
      }),
    );
    scene.add(equator);

    const earth = new Mesh(
      new SphereGeometry(0.08, 16, 12),
      new MeshBasicMaterial({ color: SKY.inkFaint }),
    );
    scene.add(earth);

    /* ---------------------------------------------------------- the stars */
    // One Points cloud, one draw call. Pinned to the camera so it sits at
    // infinity: seen from anywhere, a star is in the same direction.
    const starMaterial = new ShaderMaterial({
      uniforms: { pixelRatio: { value: renderer.getPixelRatio() } },
      vertexShader: /* glsl */ `
        attribute float size;
        attribute vec4 tint;
        uniform float pixelRatio;
        varying vec4 vTint;
        void main() {
          vTint = tint;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * pixelRatio;
        }`,
      fragmentShader: /* glsl */ `
        varying vec4 vTint;
        void main() {
          vec2 c = gl_PointCoord * 2.0 - 1.0;
          float d = dot(c, c);
          if (d > 1.0) discard;
          gl_FragColor = vec4(vTint.rgb, vTint.a * exp(-d * 5.0));
        }`,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    const starGeometry = new BufferGeometry();
    const stars = new Points(starGeometry, starMaterial);
    stars.renderOrder = -1;
    stars.frustumCulled = false;
    stars.visible = false;
    scene.add(stars);

    fetch(STARS)
      .then((response) => {
        if (!response.ok) throw new Error(`stars: HTTP ${response.status}`);
        return response.arrayBuffer();
      })
      .then((buffer) => {
        if (disposed) return;
        const catalogue = decodeStars(buffer);
        const positions = new Float32Array(catalogue.count * 3);
        const sizes = new Float32Array(catalogue.count);
        const tints = new Float32Array(catalogue.count * 4);
        for (let index = 0; index < catalogue.count; index += 1) {
          const ecliptic = eclipticFromEquatorial(catalogue.ra[index]!, catalogue.dec[index]!);
          const direction = directionOf(ecliptic.longitude, ecliptic.latitude);
          positions.set(
            direction.map((value) => value * R_STARS),
            index * 3,
          );
          const brightness = (6 - Math.max(-1.5, Math.min(6, catalogue.mag[index]!))) / 7.5;
          sizes[index] = 2.8 + 7.5 * brightness ** 1.7;
          const [r, g, b] = starTint(catalogue.kelvin[index]!);
          tints.set([r, g, b, 0.45 + 0.55 * brightness ** 0.8], index * 4);
        }
        starGeometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
        starGeometry.setAttribute('size', new Float32BufferAttribute(sizes, 1));
        starGeometry.setAttribute('tint', new Float32BufferAttribute(tints, 4));
        stars.visible = true;
        requestRender();
      })
      .catch((error: unknown) => {
        // A sky without stars is still a correct sky; say so in the console.
        console.error(error);
      });

    /* --------------------------------------------------------- the bodies */
    const bodyIds = [
      'Sun',
      'Moon',
      'Mars',
      'Mercury',
      'Jupiter',
      'Venus',
      'Saturn',
      'Rahu',
      'Ketu',
    ];
    const bodies = new Map<string, { mesh: Mesh; halo: Sprite }>();
    const sphere = new SphereGeometry(1, 24, 16);
    const nodeRing = new RingGeometry(0.55, 1, 28);
    for (const id of bodyIds) {
      const colour = SKY.drishti[id]!;
      const isNode = id === 'Rahu' || id === 'Ketu';
      const mesh = new Mesh(
        isNode ? nodeRing : sphere,
        new MeshBasicMaterial({ color: colour, side: DoubleSide }),
      );
      // Radius in CSS pixels — applied per frame, so a graha stays a few
      // pixels across from the centre and from outside alike.
      mesh.userData.px = id === 'Sun' || id === 'Moon' ? 8 : isNode ? 7 : 6;
      const glow = new Sprite(
        new SpriteMaterial({
          map: halo,
          color: colour,
          transparent: true,
          opacity: isNode ? 0 : 0.55,
          depthWrite: false,
        }),
      );
      glow.userData.px = id === 'Sun' ? 44 : 26;
      scene.add(mesh, glow);
      bodies.set(id, { mesh, halo: glow });
    }

    // Latitude stalks — the one number the wheel has nowhere to put.
    const stalkGeometry = new BufferGeometry();
    stalkGeometry.setAttribute(
      'position',
      new Float32BufferAttribute(new Float32Array(bodyIds.length * 6), 3),
    );
    {
      const colours: number[] = [];
      for (const id of bodyIds) {
        const colour = new Color(SKY.drishti[id]!).multiplyScalar(0.8);
        colours.push(...colour.toArray(), ...colour.toArray());
      }
      stalkGeometry.setAttribute('color', new Float32BufferAttribute(colours, 3));
    }
    scene.add(new LineSegments(stalkGeometry, new LineBasicMaterial({ vertexColors: true })));

    // The nodal axis passes through the viewer. If Rāhu and Ketu were ever
    // not opposite, this line would visibly miss the centre.
    const axisGeometry = new BufferGeometry();
    axisGeometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(6), 3));
    const axisLine = new Line(
      axisGeometry,
      new LineDashedMaterial({
        color: SKY.drishti.Rahu,
        dashSize: 0.3,
        gapSize: 0.3,
        transparent: true,
        opacity: 0.4,
      }),
    );
    scene.add(axisLine);

    /* ---------------------------------------------------------- the paths */
    const paths = new Map<PointId, Line>();
    for (const id of PATH_BODIES) {
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(241 * 3), 3));
      geometry.setAttribute('color', new Float32BufferAttribute(new Float32Array(241 * 3), 3));
      const line = new Line(geometry, new LineBasicMaterial({ vertexColors: true }));
      line.visible = false;
      scene.add(line);
      paths.set(id, line);
    }

    /* --------------------------------------------------------- the labels */
    const ringLabels: { signs: Label[]; naks: Label[] } = { signs: [], naks: [] };
    const grahaLabels = new Map<string, Label>();
    const starLabels: Label[] = [];
    let equinoxLabel: Label | null = null;
    let fontReadyAt = Infinity;

    const makeLabel = (
      content: string,
      anchor: Vector3,
      px: number,
      colour: string,
      strength = 1,
      anchorX: 'center' | 'left' = 'center',
    ): Label => {
      const text = new Text();
      text.text = content;
      text.font = FONT;
      text.fontSize = 1;
      text.anchorX = anchorX;
      text.anchorY = 'middle';
      text.color = colour;
      text.outlineWidth = '6%';
      text.outlineColor = SKY.ground;
      text.outlineOpacity = 0;
      text.fillOpacity = 0;
      text.renderOrder = 10;
      (text.material as Material).depthTest = false;
      const label: Label = { text, anchor, px, width: 0, opacity: 0, strength };
      // Width is read in the sync callback, never synchronously.
      text.sync(() => {
        const bounds = text.textRenderInfo?.blockBounds;
        if (bounds) label.width = bounds[2] - bounds[0];
        requestRender();
      });
      scene.add(text);
      return label;
    };

    const allCharacters = [
      ...RASHI_IAST,
      ...NAKSHATRA_IAST,
      ...Object.values(GRAHA_IAST),
      ...NAMED_STARS.map((star) => star.label),
      'Tropical 0° 0123456789′R',
    ].join('');

    preloadFont({ font: FONT, characters: allCharacters }, () => {
      if (disposed) return;
      RASHI_IAST.forEach((name, index) => {
        const anchor = scaled(directionOf(RASHI_CENTRES[index]!, 3), 11);
        ringLabels.signs.push(makeLabel(name, anchor, 15, SKY.ink, 0.95));
      });
      NAKSHATRA_IAST.forEach((name, index) => {
        const anchor = scaled(directionOf(NAKSHATRA_CENTRES[index]!, -3), 8.75);
        ringLabels.naks.push(makeLabel(name, anchor, 12, SKY.inkMuted, 0.9));
      });
      for (const id of bodyIds) {
        grahaLabels.set(id, makeLabel(GRAHA_IAST[id]!, new Vector3(), 12.5, SKY.drishti[id]!, 1));
      }
      for (const star of NAMED_STARS) {
        starLabels.push(makeLabel(star.label, new Vector3(), 11, SKY.inkFaint, 0.85, 'left'));
      }
      equinoxLabel = makeLabel('Tropical 0°', new Vector3(), 11, SKY.accent, 0.9);
      fontReadyAt = performance.now();
      if (lastSky) world.update(lastSky.jdUt, lastSky.frame);
      requestRender();
    });

    /* ------------------------------------------------------ sky updaters */
    let lastSky: { jdUt: number; frame: RingFrame } | null = null;
    let starShift = 0;

    const world: World = {
      update(jd, skyFrame) {
        lastSky = { jdUt: jd, frame: skyFrame };
        const positions = stalkGeometry.getAttribute('position');
        sphereBodies(jd, skyFrame).forEach((body, index) => {
          const entry = bodies.get(body.id)!;
          const at = scaled(directionOf(body.longitude, body.latitude), R_BODY);
          const foot = scaled(directionOf(body.longitude, 0), R_BODY);
          entry.mesh.position.copy(at);
          entry.halo.position.copy(at);
          positions.setXYZ(index * 2, at.x, at.y, at.z);
          positions.setXYZ(index * 2 + 1, foot.x, foot.y, foot.z);
          if (body.id === 'Rahu' || body.id === 'Ketu') {
            const axis = axisGeometry.getAttribute('position');
            axis.setXYZ(body.id === 'Rahu' ? 0 : 1, at.x, at.y, at.z);
            axis.needsUpdate = true;
          }
          const label = grahaLabels.get(body.id);
          if (label) {
            label.anchor.copy(at);
            const content = `${GRAHA_IAST[body.id]} ${formatDegrees(body.longitude)}${body.retrograde ? ' R' : ''}`;
            if (label.text.text !== content) {
              label.text.text = content;
              label.text.sync(() => {
                const bounds = label.text.textRenderInfo?.blockBounds;
                if (bounds) label.width = bounds[2] - bounds[0];
                requestRender();
              });
            }
          }
        });
        positions.needsUpdate = true;
        stalkGeometry.computeBoundingSphere();
        axisGeometry.computeBoundingSphere();
        axisLine.computeLineDistances();

        // Equator of date. Its sidereal position slides with the ayanāṁśa —
        // about 50″ a year, so invisible across the scrubber, but right.
        const equinox = equinoxSiderealLongitude(jd, skyFrame);
        const equatorPositions = equatorGeometry.getAttribute('position');
        for (let step = 0; step <= 180; step += 1) {
          const onEcliptic = eclipticFromEquatorial(step * 2, 0);
          const point = scaled(
            directionOf(onEcliptic.longitude + equinox, onEcliptic.latitude),
            R_BAND_OUT,
          );
          equatorPositions.setXYZ(step, point.x, point.y, point.z);
        }
        equatorPositions.needsUpdate = true;
        equatorGeometry.computeBoundingSphere();
        equator.computeLineDistances();
        equinoxLabel?.anchor.copy(scaled(directionOf(equinox, -6.5), R_BAND_OUT));

        // The stars move only if the frame does: rotate the cloud rather than
        // rebuild it. rotation.y = θ carries sidereal λ to λ + θ.
        starShift = starFrameShift(jd, skyFrame);
        stars.rotation.y = (starShift * Math.PI) / 180;
        requestRender();
      },

      updatePaths(jd, skyFrame, show) {
        for (const [id, line] of paths) {
          line.visible = show;
          if (!show) continue;
          const samples = bodyPath(id, jd, skyFrame, 120, 1);
          const positions = line.geometry.getAttribute('position');
          const colours = line.geometry.getAttribute('color');
          const base = new Color(SKY.drishti[id]!);
          const ground = new Color(SKY.ground);
          samples.forEach((sample, index) => {
            const point = scaled(directionOf(sample.longitude, sample.latitude), R_BODY);
            positions.setXYZ(index, point.x, point.y, point.z);
            // Past fades to the ground, future stays bright: the direction of
            // travel is readable without an arrowhead.
            const t = index / (samples.length - 1);
            const weight = t < 0.5 ? 0.25 + 0.7 * (t / 0.5) : 1;
            const colour = ground.clone().lerp(base, weight);
            colours.setXYZ(index, colour.r, colour.g, colour.b);
          });
          positions.needsUpdate = true;
          colours.needsUpdate = true;
          line.geometry.setDrawRange(0, samples.length);
          line.geometry.computeBoundingSphere();
        }
        requestRender();
      },
    };
    worldRef.current = world;

    /* -------------------------------------------------- label layout, 1D */
    const projected = new Vector3();
    const viewSpace = new Vector3();
    const toScreen = (
      world: Vector3,
      width: number,
      height: number,
    ): { x: number; y: number; behind: boolean } => {
      viewSpace.copy(world).applyMatrix4(camera.matrixWorldInverse);
      projected.copy(world).project(camera);
      return {
        x: ((projected.x + 1) / 2) * width,
        y: ((1 - projected.y) / 2) * height,
        behind: viewSpace.z > -camera.near,
      };
    };

    const cameraUp = new Vector3();
    const cameraRight = new Vector3();

    const layoutLabels = (now: number): void => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      const tanHalf = Math.tan((camera.fov * Math.PI) / 360);
      const cameraDistance = camera.position.length();
      const outside = smooth(9, 12, cameraDistance); // 0 at the centre, 1 outside the band
      const fadeIn = smooth(0, 450, now - fontReadyAt);
      cameraUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
      cameraRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
      const cameraDirection = camera.position.clone().normalize();

      /** Constant pixel size: scale a unit-size label by its distance. */
      const pxPerUnit = (at: Vector3): number =>
        height / (2 * tanHalf * Math.max(1e-3, at.distanceTo(camera.position)));

      const place = (label: Label, opacity: number, offset?: Vector3): void => {
        const perUnit = pxPerUnit(label.anchor);
        label.text.position.copy(label.anchor);
        if (offset) label.text.position.addScaledVector(offset, 1 / perUnit);
        label.text.quaternion.copy(camera.quaternion);
        label.text.scale.setScalar(label.px / perUnit);
        label.opacity = opacity * fadeIn * label.strength;
        label.text.fillOpacity = label.opacity;
        label.text.outlineOpacity = label.opacity * 0.85;
        label.text.visible = label.opacity > 0.01;
      };

      /*
       * The graha labels first, because they never fade — they are the data.
       * Conjunct grahas stack instead: each label wants to sit just above its
       * graha, and if that spot overlaps a label already placed, it moves up
       * past it, repeatedly, in absolute screen space. Their boxes are kept so
       * the ring labels can get out of their way.
       */
      const grahaBoxes: { x: number; y: number; halfWidth: number; halfHeight: number }[] = [];
      const grahas = [...grahaLabels.values()]
        .map((label) => ({ label, screen: toScreen(label.anchor, width, height) }))
        .filter((entry) => !entry.screen.behind && entry.label.width > 0)
        .sort((a, b) => b.screen.y - a.screen.y); // lowest first, so stacks grow upwards
      for (const label of grahaLabels.values()) place(label, 0);
      for (const { label, screen } of grahas) {
        const halfWidth = (label.width * label.px) / 2;
        const halfHeight = label.px * 0.6;
        let y = screen.y - 16;
        for (let guard = 0; guard < grahaBoxes.length + 1; guard += 1) {
          const blocking = grahaBoxes.find(
            (box) =>
              Math.abs(box.x - screen.x) < box.halfWidth + halfWidth + 4 &&
              Math.abs(box.y - y) < box.halfHeight + halfHeight + 1,
          );
          if (!blocking) break;
          y = blocking.y - (blocking.halfHeight + halfHeight + 2);
        }
        place(label, 1, cameraUp.clone().multiplyScalar(screen.y - y));
        grahaBoxes.push({ x: screen.x, y, halfWidth, halfHeight });
      }

      /** 0 when a ring label sits on a graha label, 1 once it is clear; smooth between. */
      const yieldToGrahas = (
        x: number,
        y: number,
        halfWidth: number,
        halfHeight: number,
      ): number => {
        let clear = Infinity;
        for (const box of grahaBoxes) {
          const gapX = Math.abs(box.x - x) - (box.halfWidth + halfWidth);
          const gapY = Math.abs(box.y - y) - (box.halfHeight + halfHeight);
          clear = Math.min(clear, Math.max(gapX, gapY));
        }
        return smooth(-2, 10, clear);
      };

      /*
       * The ring labels. Crowding on a ring is one-dimensional: a label can
       * only collide with its neighbours either side. So each label's room is
       * the on-screen distance to the nearer neighbour over the space the pair
       * needs, and opacity is a smooth function of that — computed, not
       * searched, and continuous under rotation.
       */
      const ringPass = (set: Label[], nearArcOnly: boolean, farDim: number): void => {
        const screens = set.map((label) => toScreen(label.anchor, width, height));
        set.forEach((label, index) => {
          const here = screens[index]!;
          if (here.behind || label.width === 0) {
            place(label, 0);
            return;
          }
          const needPx = (other: Label): number =>
            ((label.width + other.width) / 2) * label.px + 10;
          let room = Infinity;
          for (const step of [-1, 1]) {
            const neighbourIndex = (index + step + set.length) % set.length;
            const there = screens[neighbourIndex]!;
            if (there.behind) continue;
            const distance = Math.hypot(there.x - here.x, there.y - here.y);
            room = Math.min(room, distance / needPx(set[neighbourIndex]!));
          }
          // Outside the band, the far arc sits behind the near one. Nakṣatras
          // are shown on the near arc only; signs are dimmed on the far arc.
          const facing = label.anchor.clone().normalize().dot(cameraDirection);
          const near = nearArcOnly
            ? smooth(-0.3, -0.02, facing)
            : farDim + (1 - farDim) * smooth(-0.4, 0, facing);
          const arc = 1 - outside + outside * near;
          const clear = yieldToGrahas(here.x, here.y, (label.width * label.px) / 2, label.px * 0.6);
          place(label, labelOpacity(room) * arc * clear);
        });
      };
      ringPass(ringLabels.signs, false, 0.45);
      ringPass(ringLabels.naks, true, 0);

      // Named stars sit at infinity, like the cloud.
      NAMED_STARS.forEach((star, index) => {
        const label = starLabels[index];
        if (!label) return;
        const ecliptic = eclipticFromEquatorial(star.ra, star.dec);
        label.anchor
          .copy(
            scaled(directionOf(ecliptic.longitude + starShift, ecliptic.latitude), R_STARS * 0.9),
          )
          .add(camera.position);
        const screen = toScreen(label.anchor, width, height);
        const halfWidth = (label.width * label.px) / 2;
        const clear = yieldToGrahas(screen.x + 9 + halfWidth, screen.y, halfWidth, label.px * 0.6);
        place(label, screen.behind ? 0 : clear, cameraRight.clone().multiplyScalar(9));
      });

      if (equinoxLabel) {
        const screen = toScreen(equinoxLabel.anchor, width, height);
        const halfWidth = (equinoxLabel.width * equinoxLabel.px) / 2;
        const clear = yieldToGrahas(screen.x, screen.y, halfWidth, equinoxLabel.px * 0.6);
        place(equinoxLabel, screen.behind ? 0 : clear);
      }

      // Bands: the flat ring outside, the sphere zone from within.
      ringMaterial.opacity = 0.3 * outside;
      zoneMaterial.opacity = 0.34 * (1 - outside);
      ring.visible = outside > 0.01;
      zone.visible = outside < 0.99;
      earth.visible = cameraDistance > 1;

      // Bodies and halos hold a constant size on screen.
      for (const { mesh, halo: glow } of bodies.values()) {
        mesh.scale.setScalar((mesh.userData.px as number) / pxPerUnit(mesh.position));
        glow.scale.setScalar((glow.userData.px as number) / pxPerUnit(glow.position));
      }
      // The nodal axis runs through the viewer; from inside it is a smear.
      (axisLine.material as LineDashedMaterial).opacity = 0.4 * outside;
      axisLine.visible = outside > 0.01;

      // Node rings face the camera.
      for (const id of ['Rahu', 'Ketu']) bodies.get(id)!.mesh.quaternion.copy(camera.quaternion);
    };

    /* ------------------------------------------------------ camera flights */
    let flight: { from: Vector3; to: Vector3; start: number; duration: number } | null = null;
    const flyTo = (to: Vector3): void => {
      touched = true;
      flight = { from: camera.position.clone(), to, start: performance.now(), duration: 900 };
    };

    /* --------------------------------------------------------- the loop */
    let lost = false;
    let frameId = 0;
    let lastStats: SphereStats = { calls: 0, triangles: 0, points: 0, lines: 0, labels: 0 };

    const loop = (now: number): void => {
      frameId = requestAnimationFrame(loop);
      if (lost) return;
      if (flight) {
        const t = Math.min(1, (now - flight.start) / flight.duration);
        const eased = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
        // Slerp the direction and interpolate the distance logarithmically,
        // so a flight to the centre does not rush the last metre.
        const fromLength = flight.from.length();
        const toLength = flight.to.length();
        const direction = flight.from
          .clone()
          .normalize()
          .lerp(flight.to.clone().normalize(), eased)
          .normalize();
        camera.position.copy(
          direction.multiplyScalar(fromLength * (toLength / fromLength) ** eased),
        );
        camera.lookAt(0, 0, 0);
        if (t >= 1) flight = null;
        dirty = true;
      }
      const moved = controls.update();
      // Keep rendering through the label fade-in.
      const fading = now - fontReadyAt < 500;
      if (!moved && !dirty && !fading) return;
      dirty = false;
      stars.position.copy(camera.position);
      layoutLabels(now);
      renderer.render(scene, camera);
      const info = renderer.info.render;
      lastStats = {
        calls: info.calls,
        triangles: info.triangles,
        points: info.points,
        lines: info.lines,
        labels: [
          ...ringLabels.signs,
          ...ringLabels.naks,
          ...grahaLabels.values(),
          ...starLabels,
        ].filter((label) => label.text.visible).length,
      };
    };
    frameId = requestAnimationFrame(loop);

    /* ---------------------------------------------------- context loss */
    // Routine on mobile. preventDefault() is what allows a restore at all;
    // three rebuilds its GL state on restore and re-uploads what it needs.
    const onLost = (event: Event): void => {
      event.preventDefault();
      lost = true;
      callbacks.current.onContextState?.('lost');
    };
    const onRestored = (): void => {
      // three rebuilds its GL state on restore, clear colour included — which
      // comes back black. Found by the spike's own lose/restore buttons.
      renderer.setClearColor(SKY.ground, 1);
      lost = false;
      dirty = true;
      callbacks.current.onContextState?.('ok');
    };
    renderer.domElement.addEventListener('webglcontextlost', onLost);
    renderer.domElement.addEventListener('webglcontextrestored', onRestored);

    /* ---------------------------------------------------------- resize */
    const resize = (): void => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      if (!touched && !flight) camera.position.copy(outsideView());
      dirty = true;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    callbacks.current.onHandle?.({
      view(kind) {
        if (kind === 'centre') flyTo(new Vector3(0.02, 0, 0.05));
        else if (kind === 'pole') flyTo(new Vector3(0, fitDistance(12.4), 0.001));
        else flyTo(outsideView());
      },
      loseContext: () => renderer.forceContextLoss(),
      restoreContext: () => renderer.forceContextRestore(),
      stats: () => lastStats,
    });

    /* ----------------------------------------------------------- dispose */
    return () => {
      disposed = true;
      worldRef.current = null;
      callbacks.current.onHandle?.(null);
      cancelAnimationFrame(frameId);
      observer.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', onLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onRestored);
      controls.dispose();
      scene.traverse((object: Object3D) => {
        if (object instanceof Text) {
          object.dispose();
          return;
        }
        const mesh = object as Mesh;
        mesh.geometry?.dispose();
        const material = mesh.material as Material | Material[] | undefined;
        if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
        else material?.dispose();
      });
      for (const disposable of disposables) disposable.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  /* ======================================================= date changes */
  // Only the bodies (and the slow equinox) move. Everything else is fixed.
  const { ayanamsa, customAyanamsaAtJ2000, nodeType } = frame;
  useEffect(() => {
    worldRef.current?.update(jdUt, { ayanamsa, customAyanamsaAtJ2000, nodeType });
  }, [jdUt, ayanamsa, customAyanamsaAtJ2000, nodeType]);

  // Paths cost ~30 ms, so they are redrawn when the scrubber comes to rest
  // rather than on every frame of a drag.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      worldRef.current?.updatePaths(jdUt, { ayanamsa, customAyanamsaAtJ2000, nodeType }, showPaths);
    }, 160);
    return () => window.clearTimeout(timer);
  }, [jdUt, ayanamsa, customAyanamsaAtJ2000, nodeType, showPaths]);

  return <div ref={hostRef} className="h-full w-full" />;
}
