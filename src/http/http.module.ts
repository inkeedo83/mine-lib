import { Global, Module } from "@nestjs/common";
import { ConfigurableModuleClass } from "./module-definition";
import { HttpModule as AxiosModule } from "@nestjs/axios";
import { HttpService } from "./http.service";

@Global()
@Module({
  imports: [AxiosModule],
  providers: [HttpService],
})
export class HttpModule extends ConfigurableModuleClass {}
