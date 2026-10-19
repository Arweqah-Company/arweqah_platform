import type { INestApplication } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { REQUIRED_PERMISSION } from '../../src/core/access/presentation/require-permission.decorator';

export interface DiscoveredRoute {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  path: string;
  isPublic: boolean;
  permission: string | undefined;
}

const SAMPLE_ID = '00000000-0000-4000-8000-000000000000';

/** Every controller route from Nest metadata, so new routes are covered by the security suite automatically. */
export function discoverRoutes(app: INestApplication): DiscoveredRoute[] {
  const discovery = app.get(DiscoveryService);
  const scanner = app.get(MetadataScanner);
  const reflector = app.get(Reflector);
  const routes: DiscoveredRoute[] = [];
  for (const wrapper of discovery.getControllers()) {
    const instance = wrapper.instance as object | undefined;
    const controller = wrapper.metatype;
    if (!instance || !controller) continue;
    const base = String(Reflect.getMetadata(PATH_METADATA, controller) ?? '');
    for (const name of scanner.getAllMethodNames(Object.getPrototypeOf(instance))) {
      const handler = (instance as Record<string, () => unknown>)[name];
      if (!handler) continue;
      const path = Reflect.getMetadata(PATH_METADATA, handler) as string | undefined;
      const method = Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod | undefined;
      if (path === undefined || method === undefined) continue;
      routes.push({
        method: RequestMethod[method].toLowerCase() as DiscoveredRoute['method'],
        path: `/api/${[base, path].filter((p) => p && p !== '/').join('/')}`
          .replace(/\/+/g, '/')
          .replace(/:kind/g, 'team')
          .replace(/:[a-zA-Z]+/g, SAMPLE_ID),
        isPublic: !!reflector.getAllAndOverride<boolean>('PUBLIC', [handler, controller]),
        permission: reflector.getAllAndOverride<string | undefined>(REQUIRED_PERMISSION, [handler, controller]),
      });
    }
  }
  return routes;
}
