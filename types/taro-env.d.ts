declare function defineAppConfig<TConfig extends Record<string, unknown>>(config: TConfig): TConfig;

declare function definePageConfig<TConfig extends Record<string, unknown>>(config: TConfig): TConfig;

declare module '*.scss';
declare module '*.css';
declare module '*.png' {
  const src: string;
  export default src;
}
declare module '*.jpg' {
  const src: string;
  export default src;
}
declare module '*.jpeg' {
  const src: string;
  export default src;
}
declare module '*.svg' {
  const src: string;
  export default src;
}
