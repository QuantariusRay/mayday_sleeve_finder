import { useMemo } from 'react';
import { ShelfHighlight } from './ShelfHighlight';
import {
  floorLayoutToSvg,
  resolveFloorLayout,
  type FloorLayout,
} from '../lib/floorLayout';

type Props = {
  /** Stored SVG (may embed data-mayday-layout) or empty for default. */
  layoutMap?: string | null;
  /** Optional structured override (editor live preview). */
  layout?: FloorLayout | null;
  highlightShelves?: number[];
  title?: string;
  height?: number;
};

export function FloorLayoutView({
  layoutMap,
  layout,
  highlightShelves = [],
  title = 'Floor layout',
  height = 180,
}: Props) {
  const svg = useMemo(() => {
    const resolved = layout ?? resolveFloorLayout(layoutMap);
    return floorLayoutToSvg(resolved, { highlightShelves });
  }, [layout, layoutMap, highlightShelves]);

  return (
    <ShelfHighlight
      title={title}
      svgMarkup={svg}
      highlightShelves={highlightShelves}
      height={height}
    />
  );
}
