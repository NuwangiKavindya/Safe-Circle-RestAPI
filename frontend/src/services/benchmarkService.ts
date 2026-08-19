export interface BenchmarkMetric {
  metricName: string;
  durationMs: number;
  timestamp: string;
  category: 'REST_API' | 'WEBSOCKET' | 'SENSOR_INFERENCE' | 'AUDIO_OVERRIDE' | 'GPS_FIX';
}

class BenchmarkService {
  private metricsLog: BenchmarkMetric[] = [];

  /**
   * Log a performance timing duration
   */
  public logTiming(
    metricName: string,
    durationMs: number,
    category: 'REST_API' | 'WEBSOCKET' | 'SENSOR_INFERENCE' | 'AUDIO_OVERRIDE' | 'GPS_FIX'
  ) {
    const entry: BenchmarkMetric = {
      metricName,
      durationMs: parseFloat(durationMs.toFixed(2)),
      timestamp: new Date().toISOString(),
      category,
    };
    this.metricsLog.push(entry);
    console.log(`[BenchmarkService] ⚡ ${category} - ${metricName}: ${entry.durationMs} ms`);
  }

  /**
   * Calculate summary metrics for client telemetry
   */
  public getSummary() {
    if (this.metricsLog.length === 0) return null;

    const categories = ['REST_API', 'WEBSOCKET', 'SENSOR_INFERENCE', 'AUDIO_OVERRIDE', 'GPS_FIX'] as const;
    const summary: Record<string, any> = {};

    categories.forEach(cat => {
      const filtered = this.metricsLog.filter(m => m.category === cat);
      if (filtered.length > 0) {
        const durations = filtered.map(m => m.durationMs);
        const sum = durations.reduce((a, b) => a + b, 0);
        summary[cat] = {
          count: filtered.length,
          avgMs: parseFloat((sum / filtered.length).toFixed(2)),
          minMs: Math.min(...durations),
          maxMs: Math.max(...durations),
        };
      }
    });

    return summary;
  }
}

export const benchmarkService = new BenchmarkService();
