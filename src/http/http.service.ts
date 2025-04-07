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
import { ZodError, ZodSchema } from "zod";
import FormData from "form-data";

@Injectable()
export class HttpService {
  private readonly logger = new Logger(HttpService.name);

  constructor(
    @Inject(MODULE_OPTIONS_TOKEN)
    private readonly options: typeof OPTIONS_TYPE,
    private readonly axiosService: AxiosService
  ) {}

  async request<ResponseData, RequestData = never | FormData>(
    method: Method,
    url: string,
    headers?: RawAxiosRequestHeaders | AxiosHeaders,
    data?: RequestData | FormData,
    validation?: ZodSchema | ((data: any) => ResponseData)
  ): Promise<{
    data: ResponseData | null;
    status: number;
    error?: {
      message: string;
      code: number;
      details?: unknown;
    };
  }> {
    try {
      const response = await firstValueFrom(
        this.axiosService
          .request<ResponseData>({
            method,
            url,
            headers:
              data instanceof FormData
                ? { ...headers, ...data.getHeaders() }
                : headers,
            data:
              method === "POST" || method === "PUT" || method === "PATCH"
                ? data ?? {}
                : undefined,
            params:
              (method === "GET" || method === "HEAD" || method === "DELETE") &&
              !(data instanceof FormData)
                ? data ?? {}
                : undefined,
          })
          .pipe(
            map((response) => {
              let validatedData = response.data;

              try {
                if (validation) {
                  if (validation instanceof ZodSchema) {
                    const {
                      success,
                      error,
                      data: result,
                    } = validation.safeParse(response.data);
                    if (!success)
                      throw new Error(
                        JSON.stringify(
                          error.flatten((issue) => ({
                            message: issue.message,
                            path: issue.path.join("."),
                          }))
                        )
                      );
                    validatedData = result;
                  } else {
                    validatedData = validation(response.data);
                  }
                }

                return {
                  data: validatedData,
                  status: response.status,
                };
              } catch (validationError) {
                this.logger.error(
                  `Validation Error:
                     method: ${method}
                     url: ${url}
                     payload: ${
                       data instanceof FormData
                         ? "[FormData]"
                         : JSON.stringify(data)
                     }
                     error: ${
                       validationError.message ||
                       JSON.stringify(validationError)
                     }`
                );

                throw {
                  message: "Validation failed for response data",
                  code: 422,
                  details: validationError,
                };
              }
            }),
            catchError((error) => {
              this.logger.error(
                `Request Error:
                   method: ${method}
                   url: ${url}
                   payload: ${
                     data instanceof FormData
                       ? "[FormData]"
                       : JSON.stringify(data)
                   }
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
           payload: ${
             data instanceof FormData ? "[FormData]" : JSON.stringify(data)
           }
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
