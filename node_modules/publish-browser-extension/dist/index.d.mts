//#region node_modules/superstruct/dist/error.d.ts
/**
 * A `StructFailure` represents a single specific failure in validation.
 */
type Failure = {
  value: any;
  key: any;
  type: string;
  refinement: string | undefined;
  message: string;
  explanation?: string;
  branch: Array<any>;
  path: Array<any>;
};
/**
 * `StructError` objects are thrown (or returned) when validation fails.
 *
 * Validation logic is design to exit early for maximum performance. The error
 * represents the first error encountered during validation. For more detail,
 * the `error.failures` property is a generator function that can be run to
 * continue validation and receive all the failures in the data.
 */
declare class StructError extends TypeError {
  value: any;
  key: any;
  type: string;
  refinement: string | undefined;
  path: Array<any>;
  branch: Array<any>;
  failures: () => Array<Failure>;
  [x: string]: any;
  constructor(failure: Failure, failures: () => Generator<Failure>);
}
//#endregion
//#region node_modules/superstruct/dist/struct.d.ts
/**
 * `Struct` objects encapsulate the validation logic for a specific type of
 * values. Once constructed, you use the `assert`, `is` or `validate` helpers to
 * validate unknown input data against the struct.
 */
declare class Struct<T = unknown, S = unknown> {
  readonly TYPE: T;
  type: string;
  schema: S;
  coercer: (value: unknown, context: Context) => unknown;
  validator: (value: unknown, context: Context) => Iterable<Failure>;
  refiner: (value: T, context: Context) => Iterable<Failure>;
  entries: (value: unknown, context: Context) => Iterable<[string | number, unknown, Struct<any> | Struct<never>]>;
  constructor(props: {
    type: string;
    schema: S;
    coercer?: Coercer;
    validator?: Validator;
    refiner?: Refiner<T>;
    entries?: Struct<T, S>['entries'];
  });
  /**
   * Assert that a value passes the struct's validation, throwing if it doesn't.
   */
  assert(value: unknown, message?: string): asserts value is T;
  /**
   * Create a value with the struct's coercion logic, then validate it.
   */
  create(value: unknown, message?: string): T;
  /**
   * Check if a value passes the struct's validation.
   */
  is(value: unknown): value is T;
  /**
   * Mask a value, coercing and validating it, but returning only the subset of
   * properties defined by the struct's schema. Masking applies recursively to
   * props of `object` structs only.
   */
  mask(value: unknown, message?: string): T;
  /**
   * Validate a value with the struct's validation logic, returning a tuple
   * representing the result.
   *
   * You may optionally pass `true` for the `coerce` argument to coerce
   * the value before attempting to validate it. If you do, the result will
   * contain the coerced result when successful. Also, `mask` will turn on
   * masking of the unknown `object` props recursively if passed.
   */
  validate(value: unknown, options?: {
    coerce?: boolean;
    mask?: boolean;
    message?: string;
  }): [StructError, undefined] | [undefined, T];
}
/**
 * A `Context` contains information about the current location of the
 * validation inside the initial input value. It also carries `mask`
 * since it's a run-time flag determining how the validation was invoked
 * (via `mask()` or via `validate()`), plus it applies recursively
 * to all of the nested structs.
 */
type Context = {
  branch: Array<any>;
  path: Array<any>;
  mask?: boolean;
};
/**
 * A type utility to extract the type from a `Struct` class.
 */
type Infer<T extends Struct<any, any>> = T['TYPE'];
/**
 * A `Result` is returned from validation functions.
 */
type Result = boolean | string | Partial<Failure> | Iterable<boolean | string | Partial<Failure>>;
/**
 * A `Coercer` takes an unknown value and optionally coerces it.
 */
type Coercer<T = unknown> = (value: T, context: Context) => unknown;
/**
 * A `Validator` takes an unknown value and validates it.
 */
type Validator = (value: unknown, context: Context) => Result;
/**
 * A `Refiner` takes a value of a known type and validates it against a further
 * constraint.
 */
type Refiner<T> = (value: T, context: Context) => Result;
//#endregion
//#region src/utils/types.d.ts
type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;
//#endregion
//#region src/utils/config-schema.d.ts
interface MetaStruct<T> extends Struct<T> {
  '~meta': {
    description: string;
    extendedDescription?: string;
    path: string;
    note?: string;
  };
}
/** @deprecated Will be removed October 15th, 2026, when the CWS API v1.1 is shut down. */
declare const ChromeWebStoreV1_1Options: Struct<{
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  zip: string;
  extensionId: string;
  skipSubmitReview: boolean;
  apiVersion?: "v1.1" | undefined;
  publishTarget?: "default" | "trustedTesters" | undefined;
  reviewExemption?: boolean | undefined;
  deployPercentage?: number | undefined;
}, {
  clientId: MetaStruct<string>;
  clientSecret: MetaStruct<string>;
  refreshToken: MetaStruct<string>;
  publishTarget: MetaStruct<"default" | "trustedTesters" | undefined>;
  reviewExemption: MetaStruct<boolean | undefined>;
  zip: MetaStruct<string>;
  deployPercentage: MetaStruct<number | undefined>;
  extensionId: MetaStruct<string>;
  skipSubmitReview: MetaStruct<boolean>;
  apiVersion: MetaStruct<"v1.1" | undefined>;
}>;
/** @deprecated Will be removed October 15th, 2026, when the CWS API v1.1 is shut down. */
type ChromeWebStoreV1_1Options = Infer<typeof ChromeWebStoreV1_1Options>;
declare const ChromeWebStoreV2Options: Struct<{
  apiVersion: "v2";
  zip: string;
  extensionId: string;
  skipSubmitReview: boolean;
  publisherId: string;
  serviceAccountClientEmail: string;
  serviceAccountPrivateKey: string;
  cancelPending: boolean;
  deployPercentage?: number | undefined;
  publishType?: "PUBLISH_TYPE_UNSPECIFIED" | "DEFAULT_PUBLISH" | "STAGED_PUBLISH" | undefined;
  skipReview?: boolean | undefined;
}, {
  publisherId: MetaStruct<string>;
  serviceAccountClientEmail: MetaStruct<string>;
  serviceAccountPrivateKey: MetaStruct<string>;
  publishType: MetaStruct<"PUBLISH_TYPE_UNSPECIFIED" | "DEFAULT_PUBLISH" | "STAGED_PUBLISH" | undefined>;
  skipReview: MetaStruct<boolean | undefined>;
  cancelPending: MetaStruct<boolean>;
  zip: MetaStruct<string>;
  deployPercentage: MetaStruct<number | undefined>;
  extensionId: MetaStruct<string>;
  skipSubmitReview: MetaStruct<boolean>;
  apiVersion: MetaStruct<"v2">;
}>;
type ChromeWebStoreV2Options = Infer<typeof ChromeWebStoreV2Options>;
/** @deprecated Will be removed October 15th, 2026, when the CWS API v1.1 is shut down. */
type AllChromeOptions = { [key in keyof ChromeWebStoreV1_1Options | keyof ChromeWebStoreV2Options]: key extends keyof ChromeWebStoreV1_1Options ? ChromeWebStoreV1_1Options[key] : key extends keyof ChromeWebStoreV2Options ? ChromeWebStoreV2Options[key] : never };
declare const FirefoxAddonStoreV5Options: Struct<{
  zip: string;
  extensionId: string;
  skipSubmitReview: boolean;
  jwtIssuer: string;
  jwtSecret: string;
  channel: "listed" | "unlisted";
  amoMetadataFile?: string | undefined;
  sourcesZip?: string | undefined;
  compatibility?: ("firefox" | "android")[] | undefined;
}, {
  zip: MetaStruct<string>;
  amoMetadataFile: MetaStruct<string | undefined>;
  sourcesZip: MetaStruct<string | undefined>;
  extensionId: MetaStruct<string>;
  jwtIssuer: MetaStruct<string>;
  jwtSecret: MetaStruct<string>;
  channel: MetaStruct<"listed" | "unlisted">;
  compatibility: MetaStruct<("firefox" | "android")[] | undefined>;
  skipSubmitReview: MetaStruct<boolean>;
}>;
type FirefoxAddonStoreV5Options = Infer<typeof FirefoxAddonStoreV5Options>;
declare const EdgeAddonStoreV1_1Options: Struct<{
  clientId: string;
  zip: string;
  skipSubmitReview: boolean;
  productId: string;
  apiKey: string;
}, {
  zip: MetaStruct<string>;
  productId: MetaStruct<string>;
  clientId: MetaStruct<string>;
  apiKey: MetaStruct<string>;
  skipSubmitReview: MetaStruct<boolean>;
}>;
type EdgeAddonStoreV1_1Options = Infer<typeof EdgeAddonStoreV1_1Options>;
declare const OperaAddonsStoreOptions: Struct<{
  zip: string;
  skipSubmitReview: boolean;
  packageId: number;
  sessionId: string;
}, {
  zip: MetaStruct<string>;
  packageId: MetaStruct<number>;
  sessionId: MetaStruct<string>;
  skipSubmitReview: MetaStruct<boolean>;
}>;
type OperaAddonsStoreOptions = Infer<typeof OperaAddonsStoreOptions>;
declare const ResolvedConfig: Struct<{
  dryRun: boolean;
  firefox?: {
    zip: string;
    extensionId: string;
    skipSubmitReview: boolean;
    jwtIssuer: string;
    jwtSecret: string;
    channel: "listed" | "unlisted";
    amoMetadataFile?: string | undefined;
    sourcesZip?: string | undefined;
    compatibility?: ("firefox" | "android")[] | undefined;
  } | undefined;
  chrome?: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    zip: string;
    extensionId: string;
    skipSubmitReview: boolean;
    apiVersion?: "v1.1" | undefined;
    publishTarget?: "default" | "trustedTesters" | undefined;
    reviewExemption?: boolean | undefined;
    deployPercentage?: number | undefined;
  } | {
    apiVersion: "v2";
    zip: string;
    extensionId: string;
    skipSubmitReview: boolean;
    publisherId: string;
    serviceAccountClientEmail: string;
    serviceAccountPrivateKey: string;
    cancelPending: boolean;
    deployPercentage?: number | undefined;
    publishType?: "PUBLISH_TYPE_UNSPECIFIED" | "DEFAULT_PUBLISH" | "STAGED_PUBLISH" | undefined;
    skipReview?: boolean | undefined;
  } | undefined;
  edge?: {
    clientId: string;
    zip: string;
    skipSubmitReview: boolean;
    productId: string;
    apiKey: string;
  } | undefined;
  opera?: {
    zip: string;
    skipSubmitReview: boolean;
    packageId: number;
    sessionId: string;
  } | undefined;
}, {
  dryRun: MetaStruct<boolean>;
  chrome: Struct<{
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    zip: string;
    extensionId: string;
    skipSubmitReview: boolean;
    apiVersion?: "v1.1" | undefined;
    publishTarget?: "default" | "trustedTesters" | undefined;
    reviewExemption?: boolean | undefined;
    deployPercentage?: number | undefined;
  } | {
    apiVersion: "v2";
    zip: string;
    extensionId: string;
    skipSubmitReview: boolean;
    publisherId: string;
    serviceAccountClientEmail: string;
    serviceAccountPrivateKey: string;
    cancelPending: boolean;
    deployPercentage?: number | undefined;
    publishType?: "PUBLISH_TYPE_UNSPECIFIED" | "DEFAULT_PUBLISH" | "STAGED_PUBLISH" | undefined;
    skipReview?: boolean | undefined;
  } | undefined, null>;
  firefox: Struct<{
    zip: string;
    extensionId: string;
    skipSubmitReview: boolean;
    jwtIssuer: string;
    jwtSecret: string;
    channel: "listed" | "unlisted";
    amoMetadataFile?: string | undefined;
    sourcesZip?: string | undefined;
    compatibility?: ("firefox" | "android")[] | undefined;
  } | undefined, {
    zip: MetaStruct<string>;
    amoMetadataFile: MetaStruct<string | undefined>;
    sourcesZip: MetaStruct<string | undefined>;
    extensionId: MetaStruct<string>;
    jwtIssuer: MetaStruct<string>;
    jwtSecret: MetaStruct<string>;
    channel: MetaStruct<"listed" | "unlisted">;
    compatibility: MetaStruct<("firefox" | "android")[] | undefined>;
    skipSubmitReview: MetaStruct<boolean>;
  }>;
  edge: Struct<{
    clientId: string;
    zip: string;
    skipSubmitReview: boolean;
    productId: string;
    apiKey: string;
  } | undefined, {
    zip: MetaStruct<string>;
    productId: MetaStruct<string>;
    clientId: MetaStruct<string>;
    apiKey: MetaStruct<string>;
    skipSubmitReview: MetaStruct<boolean>;
  }>;
  opera: Struct<{
    zip: string;
    skipSubmitReview: boolean;
    packageId: number;
    sessionId: string;
  } | undefined, {
    zip: MetaStruct<string>;
    packageId: MetaStruct<number>;
    sessionId: MetaStruct<string>;
    skipSubmitReview: MetaStruct<boolean>;
  }>;
}>;
type ResolvedConfig = Infer<typeof ResolvedConfig>;
declare const PartialResolvedConfig: Struct<{
  dryRun?: boolean | undefined;
  firefox?: {
    zip?: string | undefined;
    extensionId?: string | undefined;
    skipSubmitReview?: boolean | undefined;
    jwtIssuer?: string | undefined;
    jwtSecret?: string | undefined;
    channel?: "listed" | "unlisted" | undefined;
    amoMetadataFile?: string | undefined;
    sourcesZip?: string | undefined;
    compatibility?: ("firefox" | "android" | undefined)[] | undefined;
  } | undefined;
  chrome?: {
    clientId?: string | undefined;
    clientSecret?: string | undefined;
    refreshToken?: string | undefined;
    zip?: string | undefined;
    extensionId?: string | undefined;
    skipSubmitReview?: boolean | undefined;
    apiVersion?: "v1.1" | undefined;
    publishTarget?: "default" | "trustedTesters" | undefined;
    reviewExemption?: boolean | undefined;
    deployPercentage?: number | undefined;
  } | {
    apiVersion?: "v2" | undefined;
    zip?: string | undefined;
    extensionId?: string | undefined;
    skipSubmitReview?: boolean | undefined;
    publisherId?: string | undefined;
    serviceAccountClientEmail?: string | undefined;
    serviceAccountPrivateKey?: string | undefined;
    cancelPending?: boolean | undefined;
    deployPercentage?: number | undefined;
    publishType?: "PUBLISH_TYPE_UNSPECIFIED" | "DEFAULT_PUBLISH" | "STAGED_PUBLISH" | undefined;
    skipReview?: boolean | undefined;
  } | undefined;
  edge?: {
    clientId?: string | undefined;
    zip?: string | undefined;
    skipSubmitReview?: boolean | undefined;
    productId?: string | undefined;
    apiKey?: string | undefined;
  } | undefined;
  opera?: {
    zip?: string | undefined;
    skipSubmitReview?: boolean | undefined;
    packageId?: number | undefined;
    sessionId?: string | undefined;
  } | undefined;
}, unknown>;
type PartialResolvedConfig = Infer<typeof PartialResolvedConfig>;
type InlineConfig = DeepPartial<ResolvedConfig>;
//#endregion
//#region src/config.d.ts
/**
 * Given inline config, read environment variables and apply defaults.
 * The return value is a deep partial of the ResolvedConfig type - call
 * `validateConfig` to make sure all required options are passed
 */
declare function resolveConfig(config?: InlineConfig): PartialResolvedConfig;
/**
 * Validate if an object matches `ResolvedConfig`, throwing an error if it is
 * invalid.
 */
declare function validateConfig(config: any): ResolvedConfig;
//#endregion
//#region src/stores/store.d.ts
interface SubmitSuccess {
  success: true;
}
interface SubmitFailure {
  success: false;
  err: any;
}
type SubmitResult = SubmitSuccess | SubmitFailure;
interface Store {
  /**
   * Submit the ZIP file to the store.
   */
  submit(dryRun: boolean): Promise<void>;
  /**
   * Throw an error if the provided files do not exist.
   */
  ensureZipsExist(): Promise<void>;
}
//#endregion
//#region src/commands/submit.d.ts
declare function submit(config: InlineConfig): Promise<SubmitResults>;
type SubmitResults = Partial<Record<keyof Omit<InlineConfig, 'dryRun'>, SubmitResult>>;
//#endregion
//#region src/commands/init.d.ts
declare function init(config: InlineConfig): Promise<void>;
//#endregion
//#region src/stores/firefox-addon-store-v5.d.ts
declare class FirefoxAddonStoreV5 implements Store {
  readonly options: FirefoxAddonStoreV5Options;
  readonly setStatus: (text: string) => void;
  private client;
  constructor(options: FirefoxAddonStoreV5Options, setStatus: (text: string) => void);
  ensureZipsExist(): Promise<void>;
  submit(dryRun?: boolean): Promise<void>;
  /**
   * Ensure the extension id is not wrapped in curly braces, since that's what
   * the addon store API is expecting.
   *
   * @example
   * "{test}" -> "test"
   * "test" -> "test"
   * "test@123" -> "test@123"
   */
  private get extensionId();
  private buildValidationSummary;
  private readMetadata;
}
//#endregion
//#region src/stores/edge-addon-store-v1.1.d.ts
declare class EdgeAddonStoreV1_1 implements Store {
  private readonly options;
  readonly setStatus: (text: string) => void;
  private client;
  constructor(options: EdgeAddonStoreV1_1Options, setStatus: (text: string) => void);
  ensureZipsExist(): Promise<void>;
  submit(dryRun?: boolean | undefined): Promise<void>;
}
//#endregion
//#region src/apis/cws-api-v1.1.gen.d.ts
type Item = {
  /**
   * The CRX version of the item. If the projection is draft, then it is the draft's CRX version.
   */
  crxVersion?: string;
  /**
   * Unique ID of the item.
   */
  id?: string;
  /**
   * Detail human-readable status of the operation, in English only. Same error messages are displayed when you upload your app to the Chrome Web Store.
   */
  itemError?: Array<ItemError>;
  /**
   * Identifies this resource as an Item. Value: the fixed string "chromewebstore#item".
   */
  kind?: string;
  /**
   * Public key of this item.
   */
  publicKey?: string;
  /**
   * Status of the operation. Possible values are: - \"FAILURE\" - \"IN_PROGRESS\" - \"NOT_FOUND\" - \"SUCCESS\"
   */
  uploadState?: string;
};
type ItemError = {
  /**
   * The error code.
   */
  error_code?: string;
  /**
   * The human-readable detail message of the error.
   */
  error_detail?: string;
};
//#endregion
//#region src/stores/chrome-web-store-v1.1.d.ts
/** @deprecated Will be removed October 15th, 2026, when the CWS API v1.1 is shut down. */
interface CwsTokenDetails {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  token_type: string;
}
/** @deprecated Will be removed October 15th, 2026, when the CWS API v1.1 is shut down. */
declare class ChromeWebStoreV1_1 implements Store {
  readonly options: ChromeWebStoreV1_1Options;
  readonly setStatus: (text: string) => void;
  private client;
  private tokenCache;
  constructor(options: ChromeWebStoreV1_1Options, setStatus: (text: string) => void);
  submit(dryRun?: boolean): Promise<void>;
  ensureZipsExist(): Promise<void>;
  getToken(): Promise<string>;
  private fetchTokenDetails;
  private checkUploadState;
}
declare class ChromeWebStoreUploadStateError extends Error {
  constructor(item: Item);
}
//#endregion
//#region src/apis/cws-api-v2.gen.d.ts
type DistributionChannel = {
  /**
   * The extension version provided in the manifest of the uploaded package.
   */
  crxVersion?: string;
  /**
   * The current deploy percentage for the release channel (nonnegative number between 0 and 100).
   */
  deployPercentage?: number;
};
type FetchItemStatusResponse = {
  /**
   * Output only. The ID of the item.
   */
  itemId?: string;
  /**
   * Output only. The state of the last async upload for an item. Only set when there has been an async upload for the item in the past 24 hours.
   */
  lastAsyncUploadState?: 'UPLOAD_STATE_UNSPECIFIED' | 'SUCCEEDED' | 'IN_PROGRESS' | 'FAILED' | 'NOT_FOUND';
  /**
   * The name of the requested item.
   */
  name?: string;
  /**
   * The public key of the item, which may be generated by the store.
   */
  publicKey?: string;
  /**
   * Output only. Status of the current published revision of the item. Will be unset if the item is not published.
   */
  publishedItemRevisionStatus?: ItemRevisionStatus;
  /**
   * Status of the item revision submitted to be published. Will be unset if the item has not been submitted for publishing since the last successful publish.
   */
  submittedItemRevisionStatus?: ItemRevisionStatus;
  /**
   * If true, the item has been taken down for a policy violation. Check the developer dashboard for details.
   */
  takenDown?: boolean;
  /**
   * If true, the item has been warned for a policy violation and will be taken down if not resolved. Check the developer dashboard for details.
   */
  warned?: boolean;
};
type ItemRevisionStatus = {
  /**
   * Details on the package of the item
   */
  distributionChannels?: Array<DistributionChannel>;
  /**
   * Output only. Current state of the item
   */
  state?: 'ITEM_STATE_UNSPECIFIED' | 'PENDING_REVIEW' | 'STAGED' | 'PUBLISHED' | 'PUBLISHED_TO_TESTERS' | 'REJECTED' | 'CANCELLED';
};
//#endregion
//#region src/stores/chrome-web-store-v2.d.ts
interface ServiceAccountTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}
declare class ChromeWebStoreV2 implements Store {
  readonly options: ChromeWebStoreV2Options;
  readonly setStatus?: ((text: string) => void) | undefined;
  private client;
  private accessTokenCache;
  constructor(options: ChromeWebStoreV2Options, setStatus?: ((text: string) => void) | undefined);
  submit(dryRun?: boolean): Promise<void>;
  ensureZipsExist(): Promise<void>;
  /**
   * @param percentage A nonnegative number between 0 and 100.
   */
  setDeploymentPercentage(percentage: number): Promise<void>;
  getStatus(): Promise<FetchItemStatusResponse>;
  private getAccessToken;
  private getAccessTokenNoCache;
  private get nameParam();
  private checkUploadState;
}
//#endregion
//#region src/stores/opera-addons-store.d.ts
declare class OperaAddonsStore implements Store {
  readonly options: OperaAddonsStoreOptions;
  readonly setStatus: (text: string) => void;
  private client;
  private readonly csrfToken;
  constructor(options: OperaAddonsStoreOptions, setStatus: (text: string) => void);
  submit(dryRun?: boolean): Promise<void>;
  ensureZipsExist(): Promise<void>;
  /**
   * Upload the extension zip to Opera in chunks, returning the identifier used
   * to bind the uploaded file to the addon package.
   */
  private uploadZip;
  /**
   * Bind an uploaded file to an addon package and wait for validation.
   */
  private validateFileUpload;
  private generateFileIdentifier;
  private fileInfo;
}
//#endregion
export { type AllChromeOptions, ChromeWebStoreUploadStateError, ChromeWebStoreV1_1, type ChromeWebStoreV1_1Options, ChromeWebStoreV2, type ChromeWebStoreV2Options, CwsTokenDetails, EdgeAddonStoreV1_1, type EdgeAddonStoreV1_1Options, FirefoxAddonStoreV5, type FirefoxAddonStoreV5Options, type InlineConfig, OperaAddonsStore, type OperaAddonsStoreOptions, type ResolvedConfig, ServiceAccountTokenResponse, SubmitResults, init, resolveConfig, submit, validateConfig };