// Minimal typings for the Emscripten glue shipped in libheif-js.
declare module "libheif-js/libheif-wasm/libheif.js" {
  export interface HeifImage {
    get_width(): number
    get_height(): number
    is_primary(): boolean
    has_alpha_channel(): boolean
    display(target: ImageData, callback: (result: ImageData | null) => void): void
    free(): void
  }

  export interface HeifDecoderInstance {
    decoder: number | null
    decode(data: Uint8Array): HeifImage[]
  }

  export interface LibHeif {
    HeifDecoder: new () => HeifDecoderInstance
    heif_context_free(ctx: number): void
  }

  interface ModuleOptions {
    wasmBinary?: Uint8Array
    locateFile?: (path: string, prefix: string) => string
    onRuntimeInitialized?: () => void
    onAbort?: (reason: unknown) => void
  }

  const factory: (options?: ModuleOptions) => LibHeif
  export default factory
}
