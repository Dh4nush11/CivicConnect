import { useCallback, useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { ArrowUpRight, MapPin } from 'lucide-react';
import { StatusBadge, CategoryBadge } from '../components/ui/Badge';
import { INDORE_CENTER, INDORE_MAP_ZOOM } from '../constants/location';

function makePinIcon(status) {
  const classStatus = status === 'submitted' ? 'reported' : status === 'in_progress' ? 'in-progress' : status;
  const cls = `cc-pin cc-pin-${classStatus || 'reported'}`;
  return L.divIcon({
    className: 'cc-pin-wrap',
    html: `<div class="${cls}"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function makeDropPinIcon() {
  return L.divIcon({
    className: 'cc-pin-wrap',
    html: `<div class="cc-pin cc-pin-drop"></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function makeEvidenceIcon(type) {
  return L.divIcon({
    className: 'cc-evidence-pin-wrap',
    html: `<div class="cc-evidence-pin cc-evidence-pin-${type}">${type === 'device' ? 'G' : 'E'}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function ClickPickMarker({ onPick, picking }) {
  useMapEvents({
    click(e) {
      if (picking && onPick) onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapPositioner({ center, zoom, fitPointsKey }) {
  const map = useMap();

  useEffect(() => {
    const fitPoints = fitPointsKey
      ? fitPointsKey.split('|').map((point) => point.split(',').map(Number))
      : [];
    if (fitPoints.length > 1) {
      map.fitBounds(L.latLngBounds(fitPoints), { padding: [32, 32], maxZoom: zoom ?? 15 });
      return;
    }
    map.setView(center, zoom ?? map.getZoom() ?? 13, { animate: true });
  }, [center[0], center[1], fitPointsKey, map, zoom]);

  return null;
}

const popupTone = {
  reported: 'border-blue-200/70',
  submitted: 'border-blue-200/70',
  'in-progress': 'border-amber-200/70',
  in_progress: 'border-amber-200/70',
  resolved: 'border-emerald-200/70',
  rejected: 'border-red-200/70',
  duplicate: 'border-violet-200/70',
};

function IssuePopup({ issue }) {
  const tone = popupTone[issue.status] || 'border-paper-200';
  return (
    <div className={`min-w-[230px] rounded-md-plus overflow-hidden -mx-2 -my-[10px] border-l-4 ${tone}`}>
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          <CategoryBadge category={issue.category} categoryDetails={issue.categoryDetails} showIcon size="sm" />
          <StatusBadge status={issue.status} showIcon={false} size="sm" />
        </div>
        <Link
          to={`/issues/${issue._id}`}
          className="group flex items-start gap-2"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[0.86rem] font-semibold leading-snug text-brand-900 dark:text-white line-clamp-2 group-hover:text-brand-700 dark:group-hover:text-brand-200">
              {issue.title}
            </p>
            <p className="mt-1 text-[0.74rem] text-brand-600/80 dark:text-paper-300 line-clamp-2 flex items-start gap-1">
              <MapPin className="h-3 w-3 mt-0.5 shrink-0 opacity-70" />
              <span>{issue.location?.address || 'Map location selected'}</span>
            </p>
          </div>
          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 mt-0.5 text-brand-400 group-hover:text-brand-700 dark:group-hover:text-brand-200" />
        </Link>
      </div>
    </div>
  );
}

export default function MapView({
  issues = [],
  onPickLocation,
  initialCenter = INDORE_CENTER,
  initialZoom = INDORE_MAP_ZOOM,
  height = 'h-96',
  picking = false,
  selectedMarker = null,
  evidenceMarkers = [],
  className = '',
}) {
  const center = selectedMarker
    ? [selectedMarker.lat, selectedMarker.lng]
    : initialCenter;
  const zoom = selectedMarker ? 14 : initialZoom;
  const fitPoints = useMemo(() => [
    ...(selectedMarker ? [[selectedMarker.lat, selectedMarker.lng]] : []),
    ...evidenceMarkers.map(({ lat, lng }) => [lat, lng]),
  ], [selectedMarker?.lat, selectedMarker?.lng, evidenceMarkers]);
  const fitPointsKey = fitPoints.map(([lat, lng]) => `${lat},${lng}`).join('|');

  return (
    <div
      className={`surface overflow-hidden !p-0 shadow-card relative ${height} ${className}`}
    >
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        className={picking ? 'cursor-crosshair' : ''}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <MapPositioner center={center} zoom={zoom} fitPointsKey={fitPointsKey} />
        {issues.map((issue) => {
          const [lng, lat] = issue.location?.coordinates || [0, 0];
          return (
            <Marker
              key={issue._id}
              position={[lat, lng]}
              icon={makePinIcon(issue.status)}
            >
              <Popup closeButton={false} maxWidth={280} minWidth={230}>
                <IssuePopup issue={issue} />
              </Popup>
            </Marker>
          );
        })}
        {selectedMarker && (
          <Marker
            position={[selectedMarker.lat, selectedMarker.lng]}
            icon={makeDropPinIcon()}
          >
            <Popup closeButton={false}>
              <div className="flex items-center gap-2 text-[0.82rem] font-medium text-brand-900 dark:text-white px-1">
                <MapPin className="h-3.5 w-3.5 text-brand-700 dark:text-brand-200" />
                Selected location
              </div>
            </Popup>
          </Marker>
        )}
        {evidenceMarkers.map((marker) => (
          <Marker
            key={marker.type}
            position={[marker.lat, marker.lng]}
            icon={makeEvidenceIcon(marker.type)}
          >
            <Popup closeButton={false}>
              <div className="space-y-1 px-1 text-[0.8rem] text-brand-900">
                <p className="font-semibold">{marker.label}</p>
                <p>{marker.lat.toFixed(5)}, {marker.lng.toFixed(5)}</p>
              </div>
            </Popup>
          </Marker>
        ))}
        <ClickPickMarker picking={picking} onPick={onPickLocation} />
      </MapContainer>
      {picking && (
        <div className="absolute left-3 top-3 z-[400] pointer-events-none">
          <div className="inline-flex items-center gap-1.5 rounded-md-plus border border-brand-200/70 bg-white/95 dark:bg-brand-900/95 dark:border-white/10 px-2.5 py-1.5 text-[0.74rem] font-semibold text-brand-800 dark:text-paper-100 shadow-card backdrop-blur">
            <MapPin className="h-3.5 w-3.5 text-accent-600 dark:text-accent-400" />
            Click anywhere on the map to drop a pin
          </div>
        </div>
      )}
    </div>
  );
}
