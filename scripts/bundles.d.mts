export declare const INITIAL_BUDGET_BYTES: number;
export declare function initialScripts(html: string): string[];
export declare function measurePage(
  html: string,
  staticDir: string
): { files: string[]; gzipBytes: number; threeFiles: string[] };
