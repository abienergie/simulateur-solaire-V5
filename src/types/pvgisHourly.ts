export interface PVGISHourlyParams {
  lat: number;
  lon: number;
  peakpower: number;
  loss: number;
  startyear: number;
  endyear: number;
  angle: number;
  aspect: number;
}

export interface PVGISHourlyDataPoint {
  time: string; // Format: YYYYMMDDHHMM
  P: number;    // Production PV en W
  G_i: number;  // Irradiance sur plan incliné (W/m²)
  H_sun: number; // Hauteur du soleil (degrés)
  T2m: number;   // Température à 2m (°C)
  WS10m: number; // Vitesse du vent à 10m (m/s)
  Int: number;   // Interpolation flag
}

export interface PVGISHourlyResponse {
  inputs: {
    location: {
      latitude: number;
      longitude: number;
      elevation: number;
    };
    meteo_data: {
      radiation_db: string;
      meteo_db: string;
      year_min: number;
      year_max: number;
      use_horizon: boolean;
      horizon_db: string;
    };
    mounting_system: {
      fixed: {
        slope: {
          value: number;
          optimal: boolean;
        };
        azimuth: {
          value: number;
          optimal: boolean;
        };
      };
    };
    pv_module: {
      technology: string;
      peak_power: number;
      system_loss: number;
    };
  };
  outputs: {
    hourly: PVGISHourlyDataPoint[];
  };
  meta: {
    inputs: any;
    outputs: any;
  };
}

export interface ProcessedHourlyData {
  timestamp: string;
  date: string;
  time: string;
  production: number; // kWh
  irradiance?: number; // W/m²
  temperature?: number; // °C
}