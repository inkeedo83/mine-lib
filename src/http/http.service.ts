import { Inject, Injectable, Logger } from "@nestjs/common";
import { MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } from "./module-definition";
import { HttpService as AxiosService } from "@nestjs/axios";
import {
  AxiosHeaders,
  AxiosHeaderValue,
  Method,
  RawAxiosRequestHeaders,
} from "axios";
import { catchError, firstValueFrom, map, throwError } from "rxjs";
// import { ZodSchema } from "zod";

@Injectable()
export class HttpService {
  private readonly logger = new Logger(HttpService.name);

  constructor(
    @Inject(MODULE_OPTIONS_TOKEN)
    private readonly options: typeof OPTIONS_TYPE,
    private readonly axiosService: AxiosService
  ) {}

  async request<ResponseData, RequestData = never>(
    method: Method,
    url: string,
    headers?: RawAxiosRequestHeaders | AxiosHeaders,
    data?: RequestData
  ): Promise<ResponseData> {
    try {
      const response = await firstValueFrom(
        this.axiosService
          .request<ResponseData>({
            method,
            url,
            headers: headers,
            data:
              method === "POST" || method === "PUT" || method === "PATCH"
                ? data ?? {}
                : undefined,
            params:
              method === "GET" || method === "HEAD" || method === "DELETE"
                ? data ?? {}
                : undefined,
          })
          .pipe(
            map((response) => response.data),
            catchError((error) => {
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

  async customRequest<ResponseData, RequestData = never>(
    method: Method,
    url: string,
    headers?: RawAxiosRequestHeaders | AxiosHeaders,
    data?: RequestData
  ): Promise<{
    data: ResponseData | null;
    error?: { message: string; code: number };
  }> {
    try {
      const response = await firstValueFrom(
        this.axiosService
          .request<ResponseData>({
            method,
            url,
            headers: headers,
            data:
              method === "POST" || method === "PUT" || method === "PATCH"
                ? data ?? {}
                : undefined,
            params:
              method === "GET" || method === "HEAD" || method === "DELETE"
                ? data ?? {}
                : undefined,
          })
          .pipe(
            map((response) => ({ data: response.data })),
            catchError((error) => {
              this.logger.error(
                `Request Error:
                   method: ${method}
                   url: ${url}
                   payload: ${JSON.stringify(data)}
                   error message: ${error.message}`
              );

              return throwError(() => ({
                message: error.message,
                code: error.response?.status || 500,
              }));
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

      return {
        data: null,
        error: { message: error.message, code: error.response?.status || 500 },
      };
    }
  }

  async customRequest2<ResponseData, RequestData = never>(
    method: Method,
    url: string,
    headers?: RawAxiosRequestHeaders | AxiosHeaders,
    data?: RequestData
    // validation?: ZodSchema | ((data: any) => ResponseData)
  ): Promise<{
    data: ResponseData | null;
    status: number;
    error?: {
      message: string;
      code: number;
      details?: any;
    };
  }> {
    try {
      const response = await firstValueFrom(
        this.axiosService
          .request<ResponseData>({
            method,
            url,
            headers: headers,
            data:
              method === "POST" || method === "PUT" || method === "PATCH"
                ? data ?? {}
                : undefined,
            params:
              method === "GET" || method === "HEAD" || method === "DELETE"
                ? data ?? {}
                : undefined,
          })
          .pipe(
            map((response) => {
              let validatedData = response.data;

              // try {
              //   if (validation) {
              //     if (typeof validation === "function") {
              //       // Если передана функция валидации
              //       validatedData = validation(response.data);
              //     } else {
              //       // Если передана ZodSchema
              //       const result = validation.parse(response.data);
              //       validatedData = result;
              //     }
              //   }

              //   return {
              //     data: validatedData,
              //     status: response.status,
              //   };
              // } catch (validationError) {
              //   this.logger.error(
              //     `Validation Error:
              //        method: ${method}
              //        url: ${url}
              //        payload: ${JSON.stringify(data)}
              //        error: ${
              //          validationError.message ||
              //          JSON.stringify(validationError)
              //        }`
              //   );

              //   throw {
              //     message: "Validation failed for response data",
              //     code: 422,
              //     details: validationError,
              //   };
              // }

              return {
                data: validatedData,
                status: response.status,
              };
            }),
            catchError((error) => {
              this.logger.error(
                `Request Error:
                   method: ${method}
                   url: ${url}
                   payload: ${JSON.stringify(data)}
                   error message: ${error.message}
                   status code: ${error.response?.status || "unknown"}`
              );

              return throwError(() => ({
                status: error.response?.status || 500,
                error: {
                  message: error.message,
                  code: error.response?.status || 500,
                  details: error.response?.data || null,
                },
              }));
            })
          )
      );

      return {
        data: response.data,
        status: response.status,
        error: undefined,
      };
    } catch (error) {
      this.logger.error(
        `Request Failed:
           method: ${method}
           url: ${url}
           payload: ${JSON.stringify(data)}
           error message: ${error.message || "Unknown error"}
           status code: ${error.status || error.response?.status || 500}`
      );

      return {
        data: null,
        status: error.status || error.response?.status || 500,
        error: {
          message: error.message || "Unknown error",
          code: error.status || error.response?.status || 500,
          details: error.response?.data || null,
        },
      };
    }
  }
}
