export type PrismaConfigs = {
  datasourceUrl: string;
  enableLogging: boolean;
};

export type TelemetryConfigs = {
  OTEL_SERVICE_NAME: string;
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: string;
};

export type TelemetryBootstrapConfigs = {
  NODE_ENV: string;
  ENABLE_OTEL: boolean;
} & Partial<TelemetryConfigs>;
