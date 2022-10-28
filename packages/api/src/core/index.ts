import type Oas from 'oas';
import type { Operation } from 'oas';
import type { HttpMethods } from 'oas/dist/rmoas.types';

import oasToHar from '@readme/oas-to-har';
import fetchHar from 'fetch-har';
import { FormDataEncoder } from 'form-data-encoder';
import 'isomorphic-fetch';

import FetchError from './errors/fetchError';
import getJSONSchemaDefaults from './getJSONSchemaDefaults';
import parseResponse from './parseResponse';
import prepareAuth from './prepareAuth';
import prepareParams from './prepareParams';
import prepareServer from './prepareServer';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ConfigOptions {}

export type FetchResponse<status, data> = {
  data: data;
  status: status;
  headers: Headers;
  res: Response;
};

// https://stackoverflow.com/a/39495173
type Enumerate<N extends number, Acc extends number[] = []> = Acc['length'] extends N
  ? Acc[number]
  : Enumerate<N, [...Acc, Acc['length']]>;

export type HTTPMethodRange<F extends number, T extends number> = Exclude<Enumerate<T>, Enumerate<F>>;

export { getJSONSchemaDefaults, parseResponse, prepareAuth, prepareParams, prepareServer };

export default class APICore {
  spec: Oas;

  private auth: (number | string)[] = [];

  private server:
    | false
    | {
        url?: string;
        variables?: Record<string, string | number>;
      } = false;

  private config: ConfigOptions = {};

  private userAgent: string;

  constructor(spec?: Oas, userAgent?: string) {
    this.spec = spec;
    this.userAgent = userAgent;
  }

  setSpec(spec: Oas) {
    this.spec = spec;
  }

  setConfig(config: ConfigOptions) {
    this.config = config;
    return this;
  }

  setUserAgent(userAgent: string) {
    this.userAgent = userAgent;
    return this;
  }

  setAuth(...values: string[] | number[]) {
    this.auth = values;
    return this;
  }

  setServer(url: string, variables: Record<string, string | number> = {}) {
    this.server = { url, variables };
    return this;
  }

  async fetch(path: string, method: HttpMethods, body?: unknown, metadata?: Record<string, unknown>) {
    const operation = this.spec.operation(path, method);

    return this.fetchOperation(operation, body, metadata);
  }

  async fetchOperation(operation: Operation, body?: unknown, metadata?: Record<string, unknown>) {
    return prepareParams(operation, body, metadata).then(params => {
      const data = { ...params };

      // If `sdk.server()` has been issued data then we need to do some extra work to figure out
      // how to use that supplied server, and also handle any server variables that were sent
      // alongside it.
      if (this.server) {
        const preparedServer = prepareServer(this.spec, this.server.url, this.server.variables);
        if (preparedServer) {
          data.server = preparedServer;
        }
      }

      // @ts-expect-error `this.auth` typing is off. FIXME
      const har = oasToHar(this.spec, operation, data, prepareAuth(this.auth, operation));

      return fetchHar(har as any, {
        userAgent: this.userAgent,
        files: data.files || {},
        multipartEncoder: FormDataEncoder,
      }).then(async (res: Response) => {
        const parsed = await parseResponse(res);

        if (res.status >= 400 && res.status <= 599) {
          throw new FetchError(parsed.status, parsed.data, parsed.headers, parsed.res);
        }

        return parsed;
      });
    });
  }
}
