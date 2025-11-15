'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import centroid from '@turf/centroid';
import { Feature, Geometry } from 'geojson';

const COUNTRIES_GEOJSON_URL = 'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_admin_0_countries.geojson';

const Map = () => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const countriesLayerRef = useRef<L.GeoJSON | null>(null);
  const labelsLayerRef = useRef<L.LayerGroup | null>(null);
  const labelMarkersRef = useRef<Record<string, L.Marker>>({});
  const countryDataRef = useRef<Record<string, { center: L.LatLng; area: number }>>({});

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map
    const map = L.map(mapContainerRef.current, {
      center: [20, 0],
      zoom: 2,
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

    const forceFullScreen = () => {
      const container = mapContainerRef.current;
      if (container) {
        container.style.width = '100%';
        container.style.height = '100%';
        map.invalidateSize();
      }
    };

    forceFullScreen();
    window.addEventListener('resize', forceFullScreen);

    mapRef.current = map;
    
    const labelsLayer = L.layerGroup().addTo(map);
    labelsLayerRef.current = labelsLayer;

    // Function to update label visibility based on zoom and viewport
    const updateLabelVisibility = () => {
      if (!countriesLayerRef.current || !labelsLayerRef.current) return;
      
      const zoom = map.getZoom();
      const bounds = map.getBounds();
      
      // Show labels starting from zoom 3
      if (zoom < 3) {
        Object.values(labelMarkersRef.current).forEach(marker => {
          if (labelsLayerRef.current) {
            labelsLayerRef.current.removeLayer(marker);
          }
        });
        return;
      }
      
      // Collect visible countries
      const visibleCountries: Array<{
        name: string;
        center: L.LatLng;
        area: number;
      }> = [];
      
      Object.keys(countryDataRef.current).forEach(countryName => {
        const data = countryDataRef.current[countryName];
        if (bounds.contains(data.center)) {
          visibleCountries.push({
            name: countryName,
            center: data.center,
            area: data.area
          });
        }
      });
      
      // Sort by area (largest first)
      visibleCountries.sort((a, b) => b.area - a.area);
      
      // Adaptive spacing and limits based on zoom
      const minDistance = zoom >= 7 ? 30000 : 
                         zoom >= 6 ? 80000 : 
                         zoom >= 5 ? 200000 : 
                         zoom >= 4 ? 500000 : 1000000;
      
      const maxLabels = zoom >= 7 ? Infinity : 
                       zoom >= 6 ? 80 : 
                       zoom >= 5 ? 50 : 
                       zoom >= 4 ? 30 : 20;
      
      const placedLabels: L.LatLng[] = [];
      let labelCount = 0;
      
      // Show labels with collision detection
      visibleCountries.forEach((country) => {
        if (labelCount >= maxLabels) return;
        
        // Check collision
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

    map.whenReady(() => {
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
              if (!feature?.properties?.name || !feature.geometry) return;

              // Calculate proper geometric centroid using turf
              try {
                const center = centroid(feature as Feature<Geometry>);
                let [lng, lat] = center.geometry.coordinates;
                
                // Manual adjustments for specific countries
                const countryName = feature.properties.name;
                if (countryName === 'United States of America' || countryName === 'United States') {
                  // Adjust US label to be more centered (shift south and right)
                  lat = lat - 3; // Shift south
                  lng = lng + 8; // Shift right significantly
                } else if (countryName === 'Canada') {
                  // Adjust Canada label to be more centered (shift south and left)
                  lat = lat - 5; // Shift south significantly
                  lng = lng - 10; // Shift left by a lot
                }
                
                // Calculate area
                const layerBounds = (layer as any).getBounds();
                const ne = layerBounds.getNorthEast();
                const sw = layerBounds.getSouthWest();
                const area = ne.distanceTo([ne.lat, sw.lng]) * sw.distanceTo([sw.lat, ne.lng]);
                
                // Store country data
                countryDataRef.current[countryName] = {
                  center: L.latLng(lat, lng),
                  area: area
                };
              } catch (error) {
                console.error(`Error calculating centroid for ${feature.properties.name}:`, error);
              }

              // Add tooltip
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
          
          // Initial label update
          setTimeout(() => {
            updateLabelVisibility();
          }, 200);
          
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
