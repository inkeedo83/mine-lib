import { Logger } from "@nestjs/common";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { NestInstrumentation } from "@opentelemetry/instrumentation-nestjs-core";
import { Resource } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { PrismaInstrumentation } from "@prisma/instrumentation";
import { TelemetryBootstrapConfigs, TelemetryConfigs } from "../types/types";
import { OTEL_SERVICE_NAME, DEPLOYMENT_ENVIRONMENT } from "./constants"

export class Telemetry {
  private static instance: Telemetry | null = null;
  private otelSDK: NodeSDK | null = null;
  private isInitializing = false;
  private config: TelemetryConfigs;
  private logger = new Logger(Telemetry.name);

  constructor(config: TelemetryConfigs) {
    this.config = config;
    this.initialize();
  }

  public static getInstance(configs: TelemetryConfigs): Telemetry {
    if (!Telemetry.instance) Telemetry.instance = new Telemetry(configs);

    return Telemetry.instance;
  }

  initialize(): void {
    if (this.otelSDK || this.isInitializing) {
      this.logger.log(
        "Телеметрия уже инициализирована или в процессе инициализации"
      );

      return;
    }

    try {
      this.isInitializing = true;

      const resource = new Resource({
        [OTEL_SERVICE_NAME]: this.config.OTEL_SERVICE_NAME,
        [DEPLOYMENT_ENVIRONMENT]: this.config.OTEL_SERVICE_NAME,
      });

      const { traceExporter } = this.createExporters();

      const traceProcessor = new BatchSpanProcessor(traceExporter);

      const instrumentations = this.createInstrumentations();

      this.otelSDK = new NodeSDK({
        resource,
        spanProcessor: traceProcessor,
        instrumentations,
      });

      this.otelSDK.start();
      this.logger.log("Телеметрия успешно инициализирована");

      this.setupShutdownHandlers();
    } catch (error) {
      this.logger.error("Ошибка при инициализации телеметрии:", error);
    } finally {
      this.isInitializing = false;
    }
  }

  private setupShutdownHandlers(): void {
    const shutdownHandler = (): void => {
      if (this.otelSDK)
        this.otelSDK
          .shutdown()
          .then(
            () => this.logger.log("SDK успешно завершил работу"),
            (err) => this.logger.error("Ошибка при завершении работы SDK", err)
          )
          .finally(() => {
            this.otelSDK = null;
            process.exit(0);
          });
      else process.exit(0);
    };

    process.on("SIGTERM", shutdownHandler);
    process.on("SIGINT", shutdownHandler);
  }

  private createExporters(): {
    traceExporter: OTLPTraceExporter;
  } {
    return {
      traceExporter: new OTLPTraceExporter({
        url: this.config.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
      }),
    };
  }

  private createInstrumentations(): (
    | HttpInstrumentation
    | ExpressInstrumentation
    | NestInstrumentation
    | PrismaInstrumentation
  )[] {
    return [
      new HttpInstrumentation({
        ignoreIncomingRequestHook: (request): boolean => {
          return request.url === "/api/live/ws" || request.url === "/health";
        },
      }),
      new ExpressInstrumentation(),
      new NestInstrumentation(),
      new PrismaInstrumentation(),
    ];
  }
}

export function bootstrapTelemetry({
  NODE_ENV,
  ENABLE_OTEL,
  ...configs
}: TelemetryBootstrapConfigs): void {
  if (NODE_ENV === "test" || !ENABLE_OTEL) return;

  Telemetry.getInstance(configs as TelemetryConfigs);
}
