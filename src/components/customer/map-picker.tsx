"use client";

import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Props {
  center: [number, number];
  selected: [number, number] | null;
  onSelect: (lat: number, lng: number) => void;
}

// Fix default marker icon paths (Leaflet + Webpack issue)
const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Custom green pin icon
const greenPin = L.divIcon({
  html: `<div style="
    width: 36px; height: 36px;
    background: linear-gradient(135deg, oklch(0.75 0.26 145) 0%, oklch(0.67 0.22 178) 50%, oklch(0.79 0.13 218) 100%);
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 3px solid white;
    box-shadow: 0 4px 12px oklch(0.55 0.22 145 / 0.5);
  "></div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  className: "",
});

export default function MapPicker({ center, selected, onSelect }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center,
      zoom: 15,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    // Attribution minimal
    L.control.attribution({ prefix: "© OpenStreetMap" }).addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { icon: greenPin, draggable: true }).addTo(map);
        markerRef.current.on("dragend", (ev) => {
          const pos = (ev.target as L.Marker).getLatLng();
          onSelect(pos.lat, pos.lng);
        });
      }
      onSelect(lat, lng);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update center when prop changes
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView(center, 16, { animate: true });
  }, [center]);

  // Place/move marker when selected changes from outside
  useEffect(() => {
    if (!mapRef.current || !selected) return;
    if (markerRef.current) {
      markerRef.current.setLatLng(selected);
    } else {
      markerRef.current = L.marker(selected, { icon: greenPin, draggable: true }).addTo(mapRef.current);
      markerRef.current.on("dragend", (ev) => {
        const pos = (ev.target as L.Marker).getLatLng();
        onSelect(pos.lat, pos.lng);
      });
    }
  }, [selected, onSelect]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", minHeight: "260px" }}
    />
  );
}
