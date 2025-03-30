import { ConfigurableModuleBuilder } from "@nestjs/common";
import { PrismaConfigs } from "../types/types";

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } =
  new ConfigurableModuleBuilder<PrismaConfigs>()
    .setClassMethodName("forRoot")
    .build();
