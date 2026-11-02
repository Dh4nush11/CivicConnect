const fs = require('fs');
const path = require('path');
const spamConfig = require('../config/spam');

const pointOnSegment = (point, a, b) => {
  const cross = (point[1] - a[1]) * (b[0] - a[0]) -
    (point[0] - a[0]) * (b[1] - a[1]);
  if (Math.abs(cross) > 1e-10) return false;
  const dot = (point[0] - a[0]) * (b[0] - a[0]) +
    (point[1] - a[1]) * (b[1] - a[1]);
  if (dot < -1e-10) return false;
  const lengthSquared = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2;
  return dot <= lengthSquared + 1e-10;
};

const pointInRing = (point, ring) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const a = ring[j];
    const b = ring[i];
    if (pointOnSegment(point, a, b)) return true;
    const intersects = ((b[1] > point[1]) !== (a[1] > point[1])) &&
      point[0] < ((a[0] - b[0]) * (point[1] - b[1])) / (a[1] - b[1]) + b[0];
    if (intersects) inside = !inside;
  }
  return inside;
};

const pointInPolygon = ([lng, lat], coordinates) => {
  if (!coordinates?.length || !pointInRing([lng, lat], coordinates[0])) return false;
  return !coordinates.slice(1).some((hole) => pointInRing([lng, lat], hole));
};

const pointInGeometry = (point, geometry) => {
  if (geometry?.type === 'Polygon') return pointInPolygon(point, geometry.coordinates);
  if (geometry?.type === 'MultiPolygon') {
    return geometry.coordinates.some((polygon) => pointInPolygon(point, polygon));
  }
  return false;
};

const getBoundary = () => {
  if (!spamConfig.indoreBoundaryEnforcement) return null;
  const configuredPath = process.env.INDORE_BOUNDARY_GEOJSON_PATH;
  if (!configuredPath) {
    throw new Error('Indore boundary enforcement is enabled but INDORE_BOUNDARY_GEOJSON_PATH is not configured');
  }
  const absolutePath = path.resolve(configuredPath);
  const data = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  const features = data.type === 'FeatureCollection' ? data.features : [data.type === 'Feature' ? data : { geometry: data }];
  const supported = features.filter((feature) =>
    ['Polygon', 'MultiPolygon'].includes(feature.geometry?.type)
  );
  if (!supported.length) throw new Error('Configured Indore boundary GeoJSON contains no Polygon or MultiPolygon');
  return supported;
};

const isInsideIndore = (lat, lng, features) =>
  features.some((feature) => pointInGeometry([lng, lat], feature.geometry));

module.exports = { pointInRing, pointInPolygon, pointInGeometry, getBoundary, isInsideIndore };
