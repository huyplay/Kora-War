export const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s)!;
