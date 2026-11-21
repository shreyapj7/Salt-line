
import { useEffect, useState } from 'react';
import { CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet';

interface Measurement {
  timestamp: string;
  groundwater_level_m: number;
}

interface CgwbStation {
  station: string;
  district: string;
  agency: string;
  latitude: number;
  longitude: number;
  rl_msl: string;
  latest_timestamp: string;
  latest_groundwater_level_m: number;
  record_count: number;
  measurements: Measurement[];
}

export default function CgwbStationsLayer() {
  const [stations, setStations] = useState<CgwbStation[]>([]);
  const map = useMap();

  useEffect(() => {
    fetch('/data/coastal_groundwater_stations.json')
      .then((res) => {
        if (!res.ok) throw new Error('CGWB data unavailable');
        return res.json();
      })
      .then((data: CgwbStation[]) => {
        setStations(data);
        if (data.length) {
          map.fitBounds(
            data.map((s) => [s.latitude, s.longitude] as [number, number]),
            { padding: [40, 40] }
          );
        }
      })
      .catch(console.error);
  }, [map]);

  return (
    <>
      {stations.map((station) => (
        <CircleMarker
          key={station.station}
          center={[station.latitude, station.longitude]}
          radius={7}
          pathOptions={{
            color: '#ffffff',
            weight: 2,
            fillColor: '#16a6a0',
            fillOpacity: 0.95,
          }}
        >
          <Tooltip>{station.station} · {station.district}</Tooltip>
          <Popup>
            <strong>{station.station}</strong>
            <br />
            District: {station.district}
            <br />
            Agency: {station.agency}
            <br />
            Groundwater level: {station.latest_groundwater_level_m} m
            <br />
            Latest observation: {station.latest_timestamp}
            <br />
            Records: {station.record_count}
            <br />
            <small>Source: CGWB telemetry data</small>
          </Popup>
        </CircleMarker>
      ))}
    </>
  );
}
