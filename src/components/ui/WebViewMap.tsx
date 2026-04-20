import React from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

export type MapMarker = {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
  color?: string;
};

type WebViewMapProps = {
  center: { latitude: number; longitude: number };
  zoom?: number;
  markers?: MapMarker[];
  style?: any;
};

export const WebViewMap: React.FC<WebViewMapProps> = ({
  center,
  zoom = 15,
  markers = [],
  style
}) => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body { margin: 0; padding: 0; }
          #map { height: 100vh; width: 100vw; background: #f0f0f0; }
          .leaflet-div-icon { background: none; border: none; }
          .marker-pin {
            width: 30px;
            height: 30px;
            border-radius: 50% 50% 50% 0;
            background: #c30b0b;
            position: absolute;
            transform: rotate(-45deg);
            left: 50%;
            top: 50%;
            margin: -15px 0 0 -15px;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const map = L.map('map', {
            zoomControl: false,
            attributionControl: false,
            dragging: true,
            touchZoom: true,
            scrollWheelZoom: false,
            doubleClickZoom: true
          }).setView([${center.latitude}, ${center.longitude}], ${zoom});

          // Move the zoom control to the bottom-right for easier thumb access
          L.control.zoom({
            position: 'bottomright'
          }).addTo(map);

          L.tileLayer('https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
          }).addTo(map);

          const markers = ${JSON.stringify(markers)};
          
          markers.forEach(m => {
            const icon = L.divIcon({
              className: 'custom-div-icon',
              html: \`<div class="marker-pin" style="background: \${m.color || '#c30b0b'}"></div>\`,
              iconSize: [30, 42],
              iconAnchor: [15, 42]
            });

            const marker = L.marker([m.latitude, m.longitude], { icon }).addTo(map);
            if (m.title) {
              marker.bindPopup(\`<b>\${m.title}</b>\${m.description ? '<br/>' + m.description : ''}\`);
            }
          });

          // Update view when center changes (passed via initial render)
          map.setView([${center.latitude}, ${center.longitude}], ${zoom});
        </script>
      </body>
    </html>
  `;

  return (
    <View 
      style={[styles.container, style]}
      onStartShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
    >
      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        style={styles.webview}
        scrollEnabled={true}
        domStorageEnabled={true}
        javaScriptEnabled={true}
        nestedScrollEnabled={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden"
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent"
  }
});
