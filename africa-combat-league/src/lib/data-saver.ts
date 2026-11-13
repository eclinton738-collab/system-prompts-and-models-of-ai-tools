"use client";

import { useSyncExternalStore } from "react";

/**
 * Data saver: low-resolution images, no autoplay video.
 * Stored in a cookie so it survives reloads and can be read by the server
 * later. Defaults to ON when the phone itself asks to save data.
 * The <html data-saver="1"> attribute is set before first paint by the inline
 * script in src/app/layout.tsx.
 */
export const DATA_SAVER_COOKIE = "acl_data_saver";
const EVENT = "acl:data-saver";

export const dataSaverBootScript = `try{var d=document.documentElement,m=document.cookie.match(/(?:^|; )${DATA_SAVER_COOKIE}=(\\d)/),n=navigator.connection;if(m?m[1]==="1":!!(n&&n.saveData))d.dataset.saver="1"}catch(e){}`;

function read(): boolean {
  return document.documentElement.dataset.saver === "1";
}

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}

export function setDataSaver(on: boolean) {
  document.cookie = `${DATA_SAVER_COOKIE}=${on ? 1 : 0}; path=/; max-age=31536000; samesite=lax`;
  if (on) document.documentElement.dataset.saver = "1";
  else delete document.documentElement.dataset.saver;
  window.dispatchEvent(new Event(EVENT));
}

export function useDataSaver(): boolean {
  return useSyncExternalStore(subscribe, read, () => false);
}
