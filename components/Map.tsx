'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const COUNTRIES_GEOJSON_URL = 'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_admin_0_countries.geojson';

const Map = () => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const countriesLayerRef = useRef<L.GeoJSON | null>(null);
  const labelsLayerRef = useRef<L.LayerGroup | null>(null);
  const labelMarkersRef = useRef<Record<string, L.Marker>>({});

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map
    const map = L.map(mapContainerRef.current, {
      center: [45, 20],
      zoom: 1,
      zoomControl: true,
      attributionControl: true,
      minZoom: 2,
      maxZoom: 19,
      maxBounds: L.latLngBounds(
        L.latLng(-90, -180),
        L.latLng(90, 180)
      ),
      maxBoundsViscosity: 1.0,
      preferCanvas: true
    });

    // Add dark theme tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      noWrap: true,
      crossOrigin: true,
      detectRetina: true,
      subdomains: 'abcd'
    }).addTo(map);

    // Force the map to stay full screen
    const forceFullScreen = () => {
      const container = mapContainerRef.current;
      if (container) {
        container.style.width = '100%';
        container.style.height = '100%';
        map.invalidateSize();
      }
    };

    // Call on mount and window resize
    forceFullScreen();
    window.addEventListener('resize', forceFullScreen);

    mapRef.current = map;
    
    // Create labels layer group
    const labelsLayer = L.layerGroup().addTo(map);
    labelsLayerRef.current = labelsLayer;

    // Function to update label visibility based on zoom and viewport
    const updateLabelVisibility = () => {
      if (!countriesLayerRef.current || !labelsLayerRef.current) return;
      
      const zoom = map.getZoom();
      const bounds = map.getBounds();
      
      // Only show labels when zoomed in (zoom >= 4)
      if (zoom < 4) {
        // Hide all labels
        Object.values(labelMarkersRef.current).forEach(marker => {
          if (labelsLayerRef.current) {
            labelsLayerRef.current.removeLayer(marker);
          }
        });
        return;
      }
      
      // Collect visible countries with their centers and areas
      const visibleCountries: Array<{
        name: string;
        center: L.LatLng;
        bounds: L.LatLngBounds;
        area: number;
      }> = [];
      
      countriesLayerRef.current.eachLayer((layer: any) => {
        const feature = layer.feature;
        if (!feature?.properties?.name || !layer.getBounds) return;
        
        const layerBounds = layer.getBounds();
        if (!bounds.intersects(layerBounds)) return;
        
        // Calculate approximate area (in meters squared)
        const ne = layerBounds.getNorthEast();
        const sw = layerBounds.getSouthWest();
        const area = ne.distanceTo([ne.lat, sw.lng]) * sw.distanceTo([sw.lat, ne.lng]);
        
        visibleCountries.push({
          name: feature.properties.name,
          center: layerBounds.getCenter(),
          bounds: layerBounds,
          area: area
        });
      });
      
      // Sort by area (largest first) - prioritize showing larger countries
      visibleCountries.sort((a, b) => b.area - a.area);
      
      // Calculate minimum distance between labels based on zoom
      // Much more aggressive spacing when zoomed out to prevent clustering
      const minDistance = zoom >= 6 ? 50000 : zoom >= 5 ? 150000 : zoom >= 4 ? 400000 : 800000;
      
      // Limit total number of labels at lower zoom levels
      const maxLabels = zoom >= 6 ? Infinity : zoom >= 5 ? 50 : zoom >= 4 ? 30 : 15;
      
      const placedLabels: L.LatLng[] = [];
      let labelCount = 0;
      
      // Show labels with collision detection
      visibleCountries.forEach((country) => {
        // Limit total labels at lower zoom levels
        if (labelCount >= maxLabels) return;
        
        // Check if too close to existing labels
        let tooClose = false;
        for (const placed of placedLabels) {
          if (country.center.distanceTo(placed) < minDistance) {
            tooClose = true;
            break;
          }
        }
        
        if (tooClose) return;
        
        // Get or create label marker
        let labelMarker = labelMarkersRef.current[country.name];
        
        if (!labelMarker) {
          // Create new label marker
          const divIcon = L.divIcon({
            className: 'country-label-marker',
            html: `<div class="country-label-text">${country.name}</div>`,
            iconSize: [1, 1],
            iconAnchor: [0, 0]
          });
          
          labelMarker = L.marker(country.center, {
            icon: divIcon,
            interactive: false,
            keyboard: false,
            zIndexOffset: 1000,
            pane: 'overlayPane'
          });
          labelMarkersRef.current[country.name] = labelMarker;
        }
        
        // Update position and add to map
        if (labelsLayerRef.current) {
          labelMarker.setLatLng(country.center);
          if (!labelsLayerRef.current.hasLayer(labelMarker)) {
            labelMarker.addTo(labelsLayerRef.current);
          }
          placedLabels.push(country.center);
          labelCount++;
        }
      });
      
      // Remove labels that are no longer visible
      Object.keys(labelMarkersRef.current).forEach(countryName => {
        const marker = labelMarkersRef.current[countryName];
        const isStillVisible = visibleCountries.some(c => c.name === countryName);
        if (!isStillVisible && labelsLayerRef.current && labelsLayerRef.current.hasLayer(marker)) {
          labelsLayerRef.current.removeLayer(marker);
        }
      });
    };

    // Wait for map to be ready before adding layers
    map.whenReady(() => {
      // Fetch and add real country polygons
      fetch(COUNTRIES_GEOJSON_URL)
        .then(res => res.json())
        .then((geojson) => {
          const geoJsonLayer = L.geoJSON(geojson, {
            style: {
              color: '#ffffff',
              weight: 1,
              fillColor: '#1a1a1a',
              fillOpacity: 0.3
            },
            onEachFeature: (feature, layer) => {
              if (!feature?.properties?.name) return;

              // Add tooltip with country name
              layer.bindTooltip(feature.properties.name, {
                permanent: false,
                direction: 'top',
                className: 'custom-tooltip'
              });

              // Add click interaction
              layer.on('click', function () {
                if (countriesLayerRef.current) {
                  countriesLayerRef.current.resetStyle();
                }
                (layer as L.Path).setStyle({ 
                  fillColor: '#FF6666', 
                  color: '#ffffff', 
                  fillOpacity: 0.7 
                });
              });
            }
          }).addTo(map);

          countriesLayerRef.current = geoJsonLayer;
          
          // Initial label update after a brief delay
          setTimeout(() => {
            updateLabelVisibility();
          }, 200);
          
          // Update labels when zoom or pan changes
          map.on('zoomend', updateLabelVisibility);
          map.on('moveend', updateLabelVisibility);
        })
        .catch((error) => {
          console.error('Error loading GeoJSON:', error);
        });
    });

    return () => {
      window.removeEventListener('resize', forceFullScreen);
      map.remove();
    };
  }, []);

  return (
    <div className="w-full h-full">
      <div 
        ref={mapContainerRef} 
        className="w-full h-full"
      />
    </div>
  );
};

export default Map;
