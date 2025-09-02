/// <reference types="wxt/client-types" />

declare global {
  function defineContentScript(config: any): any;
  function defineBackground(config: any): any;
}

export {};