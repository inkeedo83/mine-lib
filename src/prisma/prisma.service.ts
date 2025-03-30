import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } from "./module-definition";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private logger = new Logger(PrismaService.name);
  constructor(
    @Inject(MODULE_OPTIONS_TOKEN) private readonly configs: typeof OPTIONS_TYPE
  ) {
    super({
      log: configs.enableLogging ? ["error"] : [],
      datasourceUrl: configs.datasourceUrl,
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();

    // ПРИМЕЧАНИЕ: метод $use помечен как устаревший, но пока еще поддерживается
    // В будущем его нужно будет заменить на Prisma Extensions
    // @see https://www.prisma.io/docs/orm/prisma-client/client-extensions/query
    if (this.configs.enableLogging)
      this.$use(async (params, next) => {
        const before = Date.now();
        const result = await next(params);
        const after = Date.now();

        this.logger.debug(
          `Prisma запрос: ${params.model}.${params.action} выполнен за ${
            after - before
          }ms`
        );

        return result;
      });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
