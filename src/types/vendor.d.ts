/**
 * Type declarations for third-party modules that don't ship their own types.
 */

/**
 * qpdf-wasm — Emscripten-compiled qpdf CLI.
 * The init function returns a Promise that resolves to a module with callMain and FS.
 */
declare module 'qpdf-wasm' {
  interface QpdfFS {
    writeFile(path: string, data: Uint8Array): void;
    readFile(path: string): Uint8Array;
    unlink(path: string): void;
    mkdir(path: string): void;
  }

  interface QpdfModule {
    callMain(args: string[]): number;
    FS: QpdfFS;
  }

  interface QpdfInitOptions {
    wasmBinary?: Uint8Array | ArrayBuffer;
    noInitialRun?: boolean;
    print?: (s: string) => void;
    printErr?: (s: string) => void;
    onExit?: (code: number) => void;
    locateFile?: (path: string, prefix: string) => string;
  }

  function init(options?: QpdfInitOptions): Promise<QpdfModule>;
  export default init;
}
