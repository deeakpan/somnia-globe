'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getTop194Projects, Project } from '@/lib/supabase';
import { getCategoryColor } from '@/lib/category-colors';
import { centroid } from '@turf/centroid';

const COUNTRIES_GEOJSON_URL = 'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_admin_0_countries.geojson';

const Map = () => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const countriesLayerRef = useRef<L.GeoJSON | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const labelsLayerRef = useRef<L.LayerGroup | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsByCountry, setProjectsByCountry] = useState<Record<string, Project[]>>({});
  const [currentZoom, setCurrentZoom] = useState(2);

  // Fetch projects from Supabase
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const topProjects = await getTop194Projects();
        setProjects(topProjects);
        
        // Group projects by country_iso
        const byCountry: Record<string, Project[]> = {};
        topProjects.forEach(project => {
          if (project.country_iso) {
            if (!byCountry[project.country_iso]) {
              byCountry[project.country_iso] = [];
            }
            byCountry[project.country_iso].push(project);
          }
        });
        setProjectsByCountry(byCountry);
      } catch (error) {
        console.error('Error fetching projects:', error);
      }
    };

    fetchProjects();
    
    // Refresh every 30 seconds to get real-time updates
    const interval = setInterval(fetchProjects, 30000);
    return () => clearInterval(interval);
  }, []);

  // Function to get ISO code from feature properties or country name
  const getISOCode = useCallback((feature: any, countryName: string): string | null => {
    // First try to get ISO code from GeoJSON properties
    if (feature?.properties?.ISO_A2) {
      return feature.properties.ISO_A2;
    }
    if (feature?.properties?.iso_a2) {
      return feature.properties.iso_a2;
    }
    if (feature?.properties?.ISO_A2_EH) {
      return feature.properties.ISO_A2_EH;
    }
    
    // Fallback to name mapping (simplified - GeoJSON should have ISO codes)
    const nameToISO: Record<string, string> = {
      'United States of America': 'US',
      'United States': 'US',
    };
    
    return nameToISO[countryName] || null;
  }, []);

  // Function to update country labels based on zoom level
  const updateCountryLabels = useCallback(() => {
    if (!countriesLayerRef.current || !labelsLayerRef.current || !mapRef.current) return;

    const zoom = mapRef.current.getZoom();
    labelsLayerRef.current.clearLayers();

    // Show labels when zoomed in (zoom >= 4)
    if (zoom >= 4) {
      countriesLayerRef.current.eachLayer((layer) => {
        const feature = (layer as any).feature;
        if (!feature?.properties?.name || !feature.geometry) return;

        const countryName = feature.properties.name;
        const isoCode = getISOCode(feature, countryName);
        
        // Only show labels for countries with projects
        if (isoCode && projectsByCountry[isoCode]) {
          const countryProjects = projectsByCountry[isoCode];
          // Show the primary project name (first/highest ranked)
          const primaryProject = countryProjects[0];
          const projectName = primaryProject.project_name;
          
          const centroidPoint = centroid(feature.geometry);
          const labelLat = centroidPoint.geometry.coordinates[1];
          const labelLng = centroidPoint.geometry.coordinates[0];
          
          const labelDiv = L.divIcon({
            className: 'country-label-marker',
            html: `<div class="country-label-text">${projectName}</div>`,
            iconSize: [150, 20],
            iconAnchor: [75, 10],
          });
          
          L.marker([labelLat, labelLng], { icon: labelDiv })
            .addTo(labelsLayerRef.current!);
        }
      });
    }
  }, [projectsByCountry, getISOCode]);

  // Function to update country colors and markers based on projects
  const updateMapWithProjects = useCallback(() => {
    if (!countriesLayerRef.current || !markersLayerRef.current) return;

    // Clear existing markers
    markersLayerRef.current.clearLayers();

    // Update country colors and add markers
    countriesLayerRef.current.eachLayer((layer) => {
      const feature = (layer as any).feature;
      if (!feature?.properties?.name) return;

      const countryName = feature.properties.name;
      const isoCode = getISOCode(feature, countryName);
      
      if (isoCode && projectsByCountry[isoCode]) {
        const countryProjects = projectsByCountry[isoCode];
        
        // Get the primary project (first one, or highest ranked)
        const primaryProject = countryProjects[0];
        const category = primaryProject.category;
        const color = getCategoryColor(category);
        
        // Style the country with category color
        (layer as L.Path).setStyle({
          fillColor: color,
          fillOpacity: 0.6,
          color: color,
          weight: 1,
        });

        // Calculate accurate centroid using Turf.js
        const centroidPoint = centroid(feature.geometry);
        const center = L.latLng(centroidPoint.geometry.coordinates[1], centroidPoint.geometry.coordinates[0]);
        
        const marker = L.circleMarker(center, {
          radius: Math.min(8 + countryProjects.length * 2, 20),
          fillColor: color,
          color: '#fff',
          weight: 2,
          fillOpacity: 0.8,
        });

        // Create dark-themed popup with project info
        const popupContent = `
          <div style="color: #fff; min-width: 250px; background: #1a1a1d; padding: 12px; border-radius: 8px;">
            <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #fff; font-size: 16px;">${countryName}</h3>
            <p style="margin: 0 0 12px 0; color: #9ca3af; font-size: 13px;">${countryProjects.length} project${countryProjects.length > 1 ? 's' : ''}</p>
            ${countryProjects.map(p => `
              <div style="margin: 8px 0; padding: 10px; background: #262629; border-radius: 6px; border-left: 3px solid ${color};">
                <strong style="color: #fff; font-size: 14px; display: block; margin-bottom: 4px;">${p.project_name}</strong>
                <span style="font-size: 12px; color: #9ca3af;">${p.category} • ${p.unique_wallets} wallets</span>
                ${p.description ? `<p style="font-size: 11px; color: #6b7280; margin: 4px 0 0 0; line-height: 1.4;">${p.description.substring(0, 100)}${p.description.length > 100 ? '...' : ''}</p>` : ''}
                ${p.socials?.website ? `<a href="${p.socials.website}" target="_blank" style="color: ${color}; font-size: 11px; text-decoration: none; margin-top: 4px; display: inline-block;">Visit Website →</a>` : ''}
              </div>
            `).join('')}
          </div>
        `;
        
        marker.bindPopup(popupContent, {
          className: 'dark-popup',
          maxWidth: 300,
        });
        marker.addTo(markersLayerRef.current);
      } else {
        // Default style for countries without projects
        (layer as L.Path).setStyle({
          fillColor: '#1a1a1a',
          fillOpacity: 0.3,
          color: '#ffffff',
          weight: 1,
        });
      }
    });

    // Update labels after markers
    updateCountryLabels();
  }, [projectsByCountry, getISOCode, updateCountryLabels]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map
    const map = L.map(mapContainerRef.current, {
      center: [20, 0],
      zoom: 2,
      zoomControl: false,
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
    
    // Create markers layer
    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;

    // Create labels layer
    const labelsLayer = L.layerGroup().addTo(map);
    labelsLayerRef.current = labelsLayer;

    // Update labels on zoom and move
    const handleZoomEnd = () => {
      const newZoom = map.getZoom();
      setCurrentZoom(newZoom);
    };
    
    const handleMoveEnd = () => {
      // Trigger label update on move (for visibility changes)
      if (map.getZoom() >= 4) {
        setTimeout(() => {
          updateCountryLabels();
        }, 50);
      }
    };

    map.on('zoomend', handleZoomEnd);
    map.on('moveend', handleMoveEnd);

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

              // Add click interaction
              layer.on('click', function () {
                if (countriesLayerRef.current) {
                  countriesLayerRef.current.resetStyle();
                }
                (layer as L.Path).setStyle({ 
                  fillColor: '#FF6666', 
                  color: '#ffffff', 
                  fillOpacity: 0.7,
                  weight: 2
                });
              });
            }
          }).addTo(map);

          countriesLayerRef.current = geoJsonLayer;
          
          // Update map with projects once loaded
          if (projects.length > 0) {
            setTimeout(() => updateMapWithProjects(), 100);
          }
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

  // Update map when projects change
  useEffect(() => {
    if (mapRef.current && countriesLayerRef.current && projects.length > 0) {
      setTimeout(() => {
        updateMapWithProjects();
      }, 100);
    }
  }, [projects, projectsByCountry, updateMapWithProjects]);

  // Update labels when zoom changes
  useEffect(() => {
    if (mapRef.current && labelsLayerRef.current) {
      updateCountryLabels();
    }
  }, [currentZoom, updateCountryLabels]);

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
