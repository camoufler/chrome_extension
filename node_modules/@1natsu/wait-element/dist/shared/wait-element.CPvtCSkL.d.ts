interface HasQuerySelector {
    querySelector: Document["querySelector"];
}
interface NodeLike extends HasQuerySelector, Node {
    [otherKey: string]: any;
}
type QuerySelectorReturn = ReturnType<HasQuerySelector["querySelector"]>;
type DefaultResult = Element;

type DetectorResultType<Result> = {
    isDetected: true;
    result: Result;
} | {
    isDetected: false;
};
type Detector<Result = unknown, QuerySelectorResult extends QuerySelectorReturn = QuerySelectorReturn> = (element: QuerySelectorResult) => DetectorResultType<Result> | Promise<DetectorResultType<Result>>;
declare const isExist: Detector<Element>;
declare const isNotExist: Detector<null>;

export { isNotExist as c, isExist as i };
export type { Detector as D, NodeLike as N, QuerySelectorReturn as Q, DefaultResult as a, DetectorResultType as b };
