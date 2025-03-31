// Тестовый файл для проверки импортов
import { PrismaModule } from "@mine/prisma";
import { bootstrapTelemetry } from "@mine/telemetry";
// Если нужно импортировать что-то из основного модуля
// import { ... } from '@mine/core';

console.log("PrismaModule:", PrismaModule);
console.log("bootstrapTelemetry:", bootstrapTelemetry);
