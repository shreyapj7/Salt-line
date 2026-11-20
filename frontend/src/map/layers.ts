import type { MonitoringLocation } from '@/types';

export type LayerId =
  | 'boundary'
  | 'stations'
  | 'community'
  | 'rainfall'
  | 'elevation'
  | 'coastDist'
  | 'ndmi'
  | 'vulnerability'
  | 'priority';

export type LayerStatus = 'available' | 'simulated' | 'demo' | 'provisional' | 'unavailable';

export interface LayerMeta {
  id: LayerId;
  labelKey: string;
  sourceKey: string;
  unitKey: string;
  whatKey: string;
  status: LayerStatus;
  kind: 'overlay' | 'markers' | 'boundary';
  legendLow: string;
  legendHigh: string;
}

export const LAYERS: LayerMeta[] = [
  {
    id: 'boundary',
    labelKey: 'layers.boundary',
    sourceKey: 'src.boundary',
    unitKey: '',
    whatKey: 'what.boundary',
    status: 'available',
    kind: 'boundary',
    legendLow: '#4D9B89',
    legendHigh: '#315D50',
  },
  {
    id: 'stations',
    labelKey: 'layers.stations',
    sourceKey: 'src.stations',
    unitKey: '',
    whatKey: 'what.stations',
    status: 'available',
    kind: 'markers',
    legendLow: '#4D9B89',
    legendHigh: '#B4483C',
  },
  {
    id: 'community',
    labelKey: 'layers.community',
    sourceKey: 'src.community',
    unitKey: '',
    whatKey: 'what.community',
    status: 'available',
    kind: 'markers',
    legendLow: '#4D9B89',
    legendHigh: '#A75030',
  },
  {
    id: 'rainfall',
    labelKey: 'layers.rainfall',
    sourceKey: 'src.rainfall',
    unitKey: 'unit.mmPct',
    whatKey: 'what.rainfall',
    status: 'demo',
    kind: 'overlay',
    legendLow: '#4D9B89',
    legendHigh: '#B4483C',
  },
  {
    id: 'elevation',
    labelKey: 'layers.elevation',
    sourceKey: 'src.elevation',
    unitKey: 'unit.m',
    whatKey: 'what.elevation',
    status: 'demo',
    kind: 'overlay',
    legendLow: '#B4483C',
    legendHigh: '#4D9B89',
  },
  {
    id: 'coastDist',
    labelKey: 'layers.coastDist',
    sourceKey: 'src.coastDist',
    unitKey: 'unit.km',
    whatKey: 'what.coastDist',
    status: 'demo',
    kind: 'overlay',
    legendLow: '#A75030',
    legendHigh: '#4D9B89',
  },
  {
    id: 'ndmi',
    labelKey: 'layers.ndmi',
    sourceKey: 'src.ndmi',
    unitKey: 'unit.ndmi',
    whatKey: 'what.ndmi',
    status: 'simulated',
    kind: 'overlay',
    legendLow: '#A75030',
    legendHigh: '#4D9B89',
  },
  {
    id: 'vulnerability',
    labelKey: 'layers.vulnerability',
    sourceKey: 'src.vulnerability',
    unitKey: 'unit.score',
    whatKey: 'what.vulnerability',
    status: 'demo',
    kind: 'overlay',
    legendLow: '#4D9B89',
    legendHigh: '#B4483C',
  },
  {
    id: 'priority',
    labelKey: 'layers.priority',
    sourceKey: 'src.priority',
    unitKey: 'unit.score',
    whatKey: 'what.priority',
    status: 'provisional',
    kind: 'overlay',
    legendLow: '#4D9B89',
    legendHigh: '#B4483C',
  },
];

/**
 * Normalised concern score (0 = low concern, 1 = high concern) used to colour
 * demonstration grid cells. Higher score = higher exposure / deficit / priority.
 */
export function layerField(id: LayerId, loc: MonitoringLocation): number | undefined {
  switch (id) {
    case 'rainfall':
      return loc.rainfallDeficitPct === undefined ? undefined : Math.min(1, Math.max(0, -loc.rainfallDeficitPct / 25));
    case 'elevation':
      return loc.elevation === undefined ? undefined : Math.min(1, Math.max(0, 1 - loc.elevation / 40));
    case 'coastDist':
      return loc.distanceToCoast === undefined ? undefined : Math.min(1, Math.max(0, 1 - loc.distanceToCoast / 8));
    case 'ndmi':
      return loc.ndmi === undefined ? undefined : Math.min(1, Math.max(0, 1 - (loc.ndmi + 0.05) / 0.5));
    case 'vulnerability': {
      const map = { low: 0.2, moderate: 0.5, elevated: 0.75, high: 0.92 };
      return loc.risk ? map[loc.risk] : undefined;
    }
    case 'priority':
      return loc.provisionalPriority;
    default:
      return undefined;
  }
}

/** Raw physical value used for grid cell inspection tooltips */
export function rawLayerValue(id: LayerId, loc: MonitoringLocation): number | undefined {
  switch (id) {
    case 'rainfall':
      return loc.rainfallDeficitPct;
    case 'elevation':
      return loc.elevation;
    case 'coastDist':
      return loc.distanceToCoast;
    case 'ndmi':
      return loc.ndmi;
    case 'vulnerability': {
      const map = { low: 0.2, moderate: 0.5, elevated: 0.75, high: 0.92 };
      return loc.risk ? map[loc.risk] : undefined;
    }
    case 'priority':
      return loc.provisionalPriority;
    default:
      return undefined;
  }
}
