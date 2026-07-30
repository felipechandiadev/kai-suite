"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import L from "leaflet";
import "leaflet-draw";
import {
  FeatureGroup,
  GeoJSON,
  MapContainer,
  TileLayer,
  useMap,
} from "react-leaflet";
import type {
  DeliveryZoneRow,
  GeoJsonPolygon,
  MauleCommunesFeatureCollection,
} from "@/features/e-shop-delivery/types/delivery.types";
import { communeSlug } from "@/features/e-shop-delivery/lib/commune-slug";
import {
  DEFAULT_MAP_ZOOM,
  MAULE_CENTER,
  defaultPolygon,
  zoneColor,
} from "./delivery-zones-map.constants";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "./delivery-zones-map.css";

export type DeliveryZonesMapHandle = {
  startNewZone: () => void;
  loadZone: (geometry: GeoJsonPolygon) => void;
  clearEdit: () => void;
  /** Geometría actual del polígono en edición (incluye vértices aún no confirmados con ✓). */
  getDraftGeometry: () => GeoJsonPolygon | null;
};

type DeliveryZonesMapProps = {
  zones: DeliveryZoneRow[];
  selectedZoneId: string | null;
  operationalGeoJson: MauleCommunesFeatureCollection | null;
  onDraftGeometryChange: (geometry: GeoJsonPolygon | null) => void;
};

function geometryFromLayer(layer: L.Layer): GeoJsonPolygon | null {
  if (!(layer instanceof L.Polygon) && !(layer instanceof L.Rectangle)) {
    return null;
  }
  const geo = layer.toGeoJSON();
  if (geo.type === "Feature" && geo.geometry.type === "Polygon") {
    return geo.geometry as GeoJsonPolygon;
  }
  return null;
}

function geometryFromFeatureGroup(group: L.FeatureGroup): GeoJsonPolygon | null {
  const layers = group.getLayers();
  if (layers.length === 0) return null;
  return geometryFromLayer(layers[0]!);
}

function syncFeatureGroup(group: L.FeatureGroup, geometry: GeoJsonPolygon | null): void {
  group.clearLayers();
  if (!geometry) return;
  L.geoJSON(geometry).eachLayer((layer) => {
    group.addLayer(layer);
  });
}

type DrawControlProps = {
  featureGroup: L.FeatureGroup;
  onGeometryChange: (geometry: GeoJsonPolygon | null) => void;
};

function DrawControl({ featureGroup, onGeometryChange }: DrawControlProps) {
  const map = useMap();

  useEffect(() => {
    const drawControl = new L.Control.Draw({
      edit: {
        featureGroup,
      },
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: false,
        },
        rectangle: false,
        circle: false,
        circlemarker: false,
        marker: false,
        polyline: false,
      },
    });

    map.addControl(drawControl);

    const emitCurrentGeometry = () => {
      onGeometryChange(geometryFromFeatureGroup(featureGroup));
    };

    const handleCreated = (event: L.LeafletEvent) => {
      const created = event as L.DrawEvents.Created;
      featureGroup.clearLayers();
      featureGroup.addLayer(created.layer);
      onGeometryChange(geometryFromLayer(created.layer));
    };

    const handleEdited = () => {
      emitCurrentGeometry();
    };

    const handleEditVertex = () => {
      // leaflet-draw solo dispara EDITED al confirmar con ✓; sincronizamos en cada cambio.
      emitCurrentGeometry();
    };

    const handleDeleted = () => {
      onGeometryChange(null);
    };

    map.on(L.Draw.Event.CREATED, handleCreated);
    map.on(L.Draw.Event.EDITED, handleEdited);
    map.on(L.Draw.Event.EDITVERTEX, handleEditVertex);
    map.on(L.Draw.Event.EDITMOVE, handleEditVertex);
    map.on(L.Draw.Event.EDITRESIZE, handleEditVertex);
    map.on(L.Draw.Event.DELETED, handleDeleted);

    return () => {
      map.off(L.Draw.Event.CREATED, handleCreated);
      map.off(L.Draw.Event.EDITED, handleEdited);
      map.off(L.Draw.Event.EDITVERTEX, handleEditVertex);
      map.off(L.Draw.Event.EDITMOVE, handleEditVertex);
      map.off(L.Draw.Event.EDITRESIZE, handleEditVertex);
      map.off(L.Draw.Event.DELETED, handleDeleted);
      map.removeControl(drawControl);
    };
  }, [featureGroup, map, onGeometryChange]);

  return null;
}

function FitCoverageBounds({
  zones,
  operationalGeoJson,
}: {
  zones: DeliveryZoneRow[];
  operationalGeoJson: MauleCommunesFeatureCollection | null;
}) {
  const map = useMap();

  const zonesBoundsKey = useMemo(() => {
    return zones
      .filter((z) => z.geometry)
      .map((z) => {
        const ring = z.geometry?.coordinates[0]?.[0];
        const anchor = ring ? `${ring[0]},${ring[1]}` : "";
        return `${z.id}:${anchor}`;
      })
      .sort()
      .join("|");
  }, [zones]);

  useEffect(() => {
    const zoneGeometries = zones
      .map((z) => z.geometry)
      .filter((g): g is GeoJsonPolygon => g != null);

    if (zoneGeometries.length > 0) {
      const layer = L.geoJSON({
        type: "FeatureCollection",
        features: zoneGeometries.map((geometry) => ({
          type: "Feature",
          properties: {},
          geometry,
        })),
      });
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [32, 32], maxZoom: 14, animate: false });
        return;
      }
    }

    if (operationalGeoJson && operationalGeoJson.features.length > 0) {
      const layer = L.geoJSON(operationalGeoJson);
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [24, 24], maxZoom: 12, animate: false });
        return;
      }
    }

    map.setView([MAULE_CENTER.lat, MAULE_CENTER.lng], DEFAULT_MAP_ZOOM, {
      animate: false,
    });
  }, [map, operationalGeoJson, zonesBoundsKey]);

  return null;
}

export const DeliveryZonesMap = forwardRef<DeliveryZonesMapHandle, DeliveryZonesMapProps>(
  function DeliveryZonesMap(
    { zones, selectedZoneId, operationalGeoJson, onDraftGeometryChange },
    ref,
  ) {
    const featureGroupRef = useRef<L.FeatureGroup | null>(null);
    const [editFeatureGroup, setEditFeatureGroup] = useState<L.FeatureGroup | null>(null);

    const operationalKey = useMemo(
      () =>
        operationalGeoJson
          ? operationalGeoJson.features
              .map((f) => communeSlug(f.properties.Comuna))
              .sort()
              .join(",")
          : "none",
      [operationalGeoJson],
    );

    useImperativeHandle(ref, () => ({
      startNewZone() {
        const group = featureGroupRef.current;
        if (!group) return;
        const geometry = defaultPolygon();
        syncFeatureGroup(group, geometry);
        onDraftGeometryChange(geometry);
      },
      loadZone(geometry) {
        const group = featureGroupRef.current;
        if (!group) return;
        // Solo sincroniza el mapa; el padre ya tiene draftGeometry / isDirty.
        syncFeatureGroup(group, geometry);
      },
      clearEdit() {
        const group = featureGroupRef.current;
        if (!group) return;
        group.clearLayers();
        onDraftGeometryChange(null);
      },
      getDraftGeometry() {
        const group = featureGroupRef.current;
        if (!group) return null;
        return geometryFromFeatureGroup(group);
      },
    }));

    return (
      <div className="h-full w-full overflow-hidden rounded-xl border border-border">
        <MapContainer
          center={[MAULE_CENTER.lat, MAULE_CENTER.lng]}
          zoom={DEFAULT_MAP_ZOOM}
          className="delivery-zones-map h-full w-full"
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom
          zoomControl
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <FitCoverageBounds zones={zones} operationalGeoJson={operationalGeoJson} />
          {operationalGeoJson ? (
            <GeoJSON
              key={`operational-${operationalKey}`}
              data={operationalGeoJson}
              style={{
                color: "#64748b",
                weight: 2,
                dashArray: "6 4",
                fillOpacity: 0.04,
              }}
              interactive={false}
            />
          ) : null}
          {zones.map((zone, index) =>
            zone.geometry && zone.id !== selectedZoneId ? (
              <GeoJSON
                key={zone.id}
                data={zone.geometry}
                style={{
                  color: zoneColor(index),
                  weight: 2,
                  fillOpacity: 0.15,
                }}
              />
            ) : null,
          )}
          <FeatureGroup
            ref={(layer) => {
              featureGroupRef.current = layer;
              setEditFeatureGroup(layer);
            }}
          >
            {editFeatureGroup ? (
              <DrawControl
                featureGroup={editFeatureGroup}
                onGeometryChange={onDraftGeometryChange}
              />
            ) : null}
          </FeatureGroup>
        </MapContainer>
      </div>
    );
  },
);

export default DeliveryZonesMap;
