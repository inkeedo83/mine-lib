import { Inject, Injectable, Logger } from "@nestjs/common";
import { MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } from "./module-definition";
import { HttpService as AxiosService } from "@nestjs/axios";
import { AxiosHeaders, AxiosHeaderValue, Method, RawAxiosRequestHeaders } from "axios";
import { catchError, firstValueFrom, map, throwError } from "rxjs";

@Injectable()
export class HttpService {
    private readonly logger = new Logger(HttpService.name);

  constructor(
    @Inject(MODULE_OPTIONS_TOKEN)
    private readonly options: typeof OPTIONS_TYPE,
    private readonly axiosService: AxiosService
  ){}

 
  private async request<ResponseData, RequestData = never>(
    method: Method,
    url: string,
    headers?:RawAxiosRequestHeaders | AxiosHeaders,
    data?: RequestData,
      ): Promise<ResponseData> {
    try {
      const response = await firstValueFrom(
        this.axiosService
          .request<ResponseData>({
            method,
            url,
            headers: headers,
            data: method === 'POST' || method === 'PUT' || method === 'PATCH' ? data ?? {} : undefined,
            params: method === 'GET' || method === 'HEAD' || method === 'DELETE' ? data ?? {} : undefined
          })
          .pipe(
            map(response => 
               response.data
            ),
            catchError(error => {
              this.logger.error(
                `Request Error:
                   method: ${method}
                   url: ${url}
                   payload: ${JSON.stringify(data)}
                   error message: ${error.message}`
              );

              return throwError(() => new Error(error.message));
            })
          )
      );

      return response;
    } catch (error) {
      this.logger.error(
        `Request Failed:
           method: ${method}
           url: ${url}
           payload: ${JSON.stringify(data)}
           error message: ${error.message}`
      );

      throw error;
    }
  }

  
  

}