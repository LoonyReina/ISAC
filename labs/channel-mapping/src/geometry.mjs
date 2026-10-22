import {C} from './config.mjs';
export function distance(a, b) { return Math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2); }
export function rangeFromNs(roundTripNs) { return C * roundTripNs * 1e-9 / 2; }
export function backproject(stationId, position, angleDeg, rangeM) {
  const theta = angleDeg * Math.PI / 180;
  return [position[0] + (stationId === 1 ? 1 : -1) * rangeM * Math.cos(theta), position[1] - rangeM * Math.sin(theta)];
}
export function excessDelayNs(point, p1, p2) { return (distance(point,p1)+distance(point,p2)-distance(p1,p2))*1e9/C; }
