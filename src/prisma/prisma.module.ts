import { Global, Module } from "@nestjs/common";
import { ConfigurableModuleClass } from "./module-definition";
import { PrismaService } from "./prisma.service";

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule extends ConfigurableModuleClass {}
