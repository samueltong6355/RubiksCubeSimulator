import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Polygon, Text as SvgText } from 'react-native-svg';

import { CORNER_FACELETS, CORNER_LETTERS, EDGE_FACELETS, EDGE_LETTERS } from '../core/blind';
import { FACE_NAMES } from '../core/cube';

type Vec3 = [number, number, number];
type Point2 = [number, number];
type Tool = 'brush' | 'fill';

const PADDING = 24;
const DRAG_THRESHOLD = 5;
const ROTATION_SENSITIVITY = 0.012;
const MIN_PITCH = (-82 * Math.PI) / 180;
const MAX_PITCH = (82 * Math.PI) / 180;

const COLORS: Record<string, string> = {
  U: '#FFFFFF',
  R: '#E83030',
  F: '#30B030',
  D: '#F0D000',
  L: '#F07800',
  B: '#3070F0',
  '?': '#444455',
};

const TEXT_FG: Record<string, string> = {
  U: '#111111',
  R: '#ffffff',
  F: '#ffffff',
  D: '#111111',
  L: '#111111',
  B: '#ffffff',
  '?': '#cdd6f4',
};

const FACE_GEOMETRY: Record<number, [Vec3, Vec3, Vec3, Vec3]> = {
  0: [[0, 1, 0], [-1, 1, -1], [1, 0, 0], [0, 0, 1]],
  1: [[1, 0, 0], [1, 1, 1], [0, 0, -1], [0, -1, 0]],
  2: [[0, 0, 1], [-1, 1, 1], [1, 0, 0], [0, -1, 0]],
  3: [[0, -1, 0], [-1, -1, 1], [1, 0, 0], [0, 0, -1]],
  4: [[-1, 0, 0], [-1, 1, -1], [0, 0, 1], [0, -1, 0]],
  5: [[0, 0, -1], [1, 1, -1], [-1, 0, 0], [0, -1, 0]],
};

type StickerItem = {
  depth: number;
  face: number;
  cell: number;
  points: Point2[];
  color: string;
};

type RawStickerItem = Omit<StickerItem, 'points'> & {
  projected: Point2[];
};

export type CubeViewProps = {
  state: string;
  paintColor: string;
  tool: Tool;
  showSpeffz: boolean;
  onChange: (nextState: string) => void;
};

const SPEFFZ_LABELS = buildSpeffzLabels();

export function CubeView({ state, paintColor, tool, showSpeffz, onChange }: CubeViewProps) {
  const { width: windowWidth } = useWindowDimensions();
  const width = Math.min(360, Math.max(280, windowWidth - 32));
  const height = Math.round(width * 0.86);
  const [yaw, setYaw] = useState(Math.PI / 4);
  const [pitch, setPitch] = useState(Math.asin(1 / Math.sqrt(3)));
  const startRef = useRef({ yaw, pitch, hit: null as null | [number, number], dragging: false });

  const stickers = useMemo(() => renderStickers(state, yaw, pitch, width, height), [height, state, width, yaw, pitch]);

  const paint = (hit: [number, number]) => {
    const [face, cell] = hit;
    if (cell === 4) return;
    const chars = state.split('');
    if (tool === 'fill') {
      let changed = false;
      for (let i = 0; i < 9; i += 1) {
        if (i === 4) continue;
        const idx = face * 9 + i;
        if (chars[idx] !== paintColor) {
          chars[idx] = paintColor;
          changed = true;
        }
      }
      if (changed) onChange(chars.join(''));
      return;
    }
    const idx = face * 9 + cell;
    if (chars[idx] !== paintColor) {
      chars[idx] = paintColor;
      onChange(chars.join(''));
    }
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          const { locationX, locationY } = event.nativeEvent;
          startRef.current = {
            yaw,
            pitch,
            hit: hitTest(stickers, locationX, locationY),
            dragging: false,
          };
        },
        onPanResponderMove: (_event, gesture) => {
          if (Math.hypot(gesture.dx, gesture.dy) < DRAG_THRESHOLD) return;
          startRef.current.dragging = true;
          setYaw(startRef.current.yaw - gesture.dx * ROTATION_SENSITIVITY);
          setPitch(clamp(startRef.current.pitch + gesture.dy * ROTATION_SENSITIVITY, MIN_PITCH, MAX_PITCH));
        },
        onPanResponderRelease: () => {
          if (!startRef.current.dragging && startRef.current.hit) paint(startRef.current.hit);
          startRef.current.hit = null;
          startRef.current.dragging = false;
        },
        onPanResponderTerminate: () => {
          startRef.current.hit = null;
          startRef.current.dragging = false;
        },
      }),
    [paintColor, pitch, state, stickers, tool, yaw],
  );

  return (
    <View style={[styles.shell, { width }]} {...panResponder.panHandlers}>
      <Svg width={width} height={height}>
        {stickers.map((item) => (
          <React.Fragment key={`${item.face}-${item.cell}`}>
            <Polygon
              points={item.points.map(([x, y]) => `${x},${y}`).join(' ')}
              fill={COLORS[item.color] ?? COLORS['?']}
              stroke={item.cell === 4 ? '#89b4fa' : '#171724'}
              strokeWidth={item.cell === 4 ? 2 : 1}
            />
            {item.cell === 4 ? <CenterLabel item={item} /> : null}
            {item.cell !== 4 && showSpeffz ? <SpeffzLabel item={item} /> : null}
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
}

function CenterLabel({ item }: { item: StickerItem }) {
  const [cx, cy] = center(item.points);
  return (
    <SvgText x={cx} y={cy + 5} textAnchor="middle" fill={TEXT_FG[item.color] ?? '#111'} fontSize="14" fontWeight="700">
      {FACE_NAMES[item.face] ?? ''}
    </SvgText>
  );
}

function SpeffzLabel({ item }: { item: StickerItem }) {
  const label = SPEFFZ_LABELS[`${item.face}:${item.cell}`];
  if (!label) return null;
  const [cx, cy] = center(item.points);
  return (
    <>
      <Circle cx={cx} cy={cy} r={8} fill="#f5f5f5" stroke="#111111" strokeWidth={1} />
      <SvgText x={cx} y={cy + 3} textAnchor="middle" fill="#111827" fontSize="8" fontWeight="700">
        {label.toLowerCase()}
      </SvgText>
    </>
  );
}

function renderStickers(state: string, yaw: number, pitch: number, width: number, height: number): StickerItem[] {
  const { forward, right, up } = basis(yaw, pitch);
  const visibleFaces = Object.entries(FACE_GEOMETRY)
    .filter(([, [normal]]) => dot(normal, forward) > 0.001)
    .map(([face]) => Number(face));

  const raw: Point2[] = [];
  const items: RawStickerItem[] = [];

  visibleFaces.forEach((face) => {
    for (let cell = 0; cell < 9; cell += 1) {
      const corners = shrink(cellCorners(face, cell));
      const projected = corners.map((point) => projectRaw(point, right, up));
      raw.push(...projected);
      const depth = corners.reduce((sum, point) => sum + dot(point, forward), 0) / corners.length;
      items.push({ depth, face, cell, color: state.charAt(face * 9 + cell) || '?', projected });
    }
  });

  const transform = screenTransform(raw, width, height);
  return items
    .sort((a, b) => a.depth - b.depth)
    .map((item) => ({
      depth: item.depth,
      face: item.face,
      cell: item.cell,
      color: item.color,
      points: item.projected.map((point) => toScreen(point, transform, width, height)),
    }));
}

function hitTest(stickers: StickerItem[], x: number, y: number): [number, number] | null {
  for (let i = stickers.length - 1; i >= 0; i -= 1) {
    const item = stickers[i];
    if (item && pointInPolygon([x, y], item.points)) return [item.face, item.cell];
  }
  return null;
}

function pointInPolygon(point: Point2, polygon: Point2[]): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i] ?? [0, 0];
    const [xj, yj] = polygon[j] ?? [0, 0];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function buildSpeffzLabels(): Record<string, string> {
  const labels: Record<string, string> = {};

  const assignLabels = (
    facelets: readonly (readonly number[])[],
    letters: readonly (readonly string[])[],
  ) => {
    facelets.forEach((pieceFacelets, pieceIdx) => {
      pieceFacelets.forEach((facelet, idx) => {
        labels[`${Math.floor(facelet / 9)}:${facelet % 9}`] = letters[pieceIdx]?.[idx] ?? '';
      });
    });
  };

  assignLabels(EDGE_FACELETS, EDGE_LETTERS);
  assignLabels(CORNER_FACELETS, CORNER_LETTERS);
  return labels;
}

function basis(yaw: number, pitch: number) {
  const forward = normalize([
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    Math.cos(yaw) * Math.cos(pitch),
  ]);
  const right = normalize(cross([0, 1, 0], forward));
  const up = normalize(cross(forward, right));
  return { forward, right, up };
}

function cellCorners(face: number, cell: number): Vec3[] {
  const geom = FACE_GEOMETRY[face];
  if (!geom) return [];
  const [, origin, right, down] = geom;
  const row = Math.floor(cell / 3);
  const col = cell % 3;
  const step = 2 / 3;
  const p0 = add(origin, add(scale(right, col * step), scale(down, row * step)));
  const p1 = add(p0, scale(right, step));
  const p2 = add(p1, scale(down, step));
  const p3 = add(p0, scale(down, step));
  return [p0, p1, p2, p3];
}

function shrink(points: Vec3[], factor = 0.94): Vec3[] {
  const c = points.reduce<Vec3>((acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]], [0, 0, 0]);
  const centerPoint: Vec3 = [c[0] / points.length, c[1] / points.length, c[2] / points.length];
  return points.map((p) => [
    centerPoint[0] + (p[0] - centerPoint[0]) * factor,
    centerPoint[1] + (p[1] - centerPoint[1]) * factor,
    centerPoint[2] + (p[2] - centerPoint[2]) * factor,
  ]);
}

function projectRaw(point: Vec3, right: Vec3, up: Vec3): Point2 {
  return [dot(point, right), -dot(point, up)];
}

function screenTransform(points: Point2[], width: number, height: number) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const scaleFactor = Math.min((width - PADDING * 2) / Math.max(maxX - minX, 1), (height - PADDING * 2) / Math.max(maxY - minY, 1));
  return { scale: scaleFactor, midX: (minX + maxX) / 2, midY: (minY + maxY) / 2 };
}

function toScreen(point: Point2, transform: { scale: number; midX: number; midY: number }, width: number, height: number): Point2 {
  return [
    width / 2 + (point[0] - transform.midX) * transform.scale,
    height / 2 + (point[1] - transform.midY) * transform.scale,
  ];
}

function center(points: Point2[]): Point2 {
  return [
    points.reduce((sum, p) => sum + p[0], 0) / points.length,
    points.reduce((sum, p) => sum + p[1], 0) / points.length,
  ];
}

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scale(v: Vec3, value: number): Vec3 {
  return [v[0] * value, v[1] * value, v[2] * value];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function normalize(v: Vec3): Vec3 {
  const length = Math.sqrt(dot(v, v));
  return length === 0 ? [0, 0, 0] : [v[0] / length, v[1] / length, v[2] / length];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const styles = StyleSheet.create({
  shell: {
    alignItems: 'center',
    backgroundColor: '#1e1e2e',
    borderRadius: 12,
    overflow: 'hidden',
  },
});
