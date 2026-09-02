declare const toWindowsPath: (path: string) => string;
declare const spawnBin: (bin: string, args: string[]) => Promise<boolean>;
export { toWindowsPath, spawnBin };
