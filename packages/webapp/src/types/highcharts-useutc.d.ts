// src/types/highcharts-useutc.d.ts
import 'highcharts';

declare module 'highcharts' {
  interface TimeOptions {
    /** Usa horário UTC (true) ou local (false). */
    useUTC?: boolean;
  }
}
