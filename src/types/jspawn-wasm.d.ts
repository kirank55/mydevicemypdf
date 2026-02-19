declare module '@jspawn/qpdf-wasm' {
  export interface WasmFactoryOptions {
    locateFile?: (path: string, prefix: string) => string;
    print?: (text: string) => void;
    printErr?: (text: string) => void;
  }

  export interface WasmModule {
    FS: {
      writeFile: (path: string, data: Uint8Array) => void;
      readFile: (path: string) => Uint8Array;
      unlink: (path: string) => void;
    };
    callMain: (args: string[]) => number;
  }

  export default function createQpdfModule(
    options?: WasmFactoryOptions
  ): Promise<WasmModule>;
}

declare module '@jspawn/ghostscript-wasm' {
  export interface WasmFactoryOptions {
    locateFile?: (path: string, prefix: string) => string;
    print?: (text: string) => void;
    printErr?: (text: string) => void;
  }

  export interface WasmModule {
    FS: {
      writeFile: (path: string, data: Uint8Array) => void;
      readFile: (path: string) => Uint8Array;
      unlink: (path: string) => void;
    };
    callMain: (args: string[]) => number;
  }

  export default function createGhostscriptModule(
    options?: WasmFactoryOptions
  ): Promise<WasmModule>;
}
