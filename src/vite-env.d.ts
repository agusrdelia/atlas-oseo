/// <reference types="vite/client" />

import type { RelationAudit } from './domain/relation-audit';

interface ImportMetaEnv {
  readonly VITE_GA_MEASUREMENT_ID?: string;
}

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
    __ATLAS_AUDIT__?: RelationAudit;
    __ATLAS_DATA_READY__?: boolean;
    __ATLAS_READY__?: boolean;
    __ATLAS_VIEW__?: () => { cameraPosition: number[]; target: number[] };
  }
}
