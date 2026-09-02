import { ZlibOptions } from "node:zlib";
//#region index.d.ts
type FileContent = string | ArrayBuffer | NodeJS.ArrayBufferView<ArrayBufferLike>;
interface Zip {
  addFile(path: string, content: FileContent): void;
  toBuffer(): Promise<Buffer>;
}
declare function createZip(options?: ZlibOptions): Zip;
//#endregion
export { Zip, createZip };