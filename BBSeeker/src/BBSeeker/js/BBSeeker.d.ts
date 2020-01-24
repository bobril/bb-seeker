import * as bb from "./bobril/package/index";
export declare module BBSeeker {
    let frameCounter: number;
    let lastClickX: number;
    let lastClickY: number;
    /**
     * Performs recursive search of a page virtual DOM starting from bobril root objects. All matching objects are returned as instances of HTMLElement.
     * @param expression search expression, see examples above.
     * @param root (optional) specify element which will serve as search root
     */
    function findElements(expression: string, root?: HTMLElement, ifVNodeFindNearestChildElm?: boolean): HTMLElement[];
    /**
     * Waits up to a given time for an element to be available and returns it or returns a timeout error. Search is scheduled every 100ms if no browser frame updates were not detected in this time frame.
     * @param expression search expression
     * @param timeout time to wait
     * @param callback webdriver callback returned by an async function it is a tuple: [element[], errorString]
     * @param root (optional) specify element which will serve as search root
     */
    function findElementsWithTimeout(expression: string, timeout: number, callback: (results: [HTMLElement[] | null, string | null]) => [HTMLElement[], string], root?: HTMLElement): void;
    /**
     * Waits up to a given time for an element to be available and returns promise which returns result or timeout error. Search is scheduled every 100ms if no browser frame updates were not detected in this time frame.
     * Used by Bobwai tests
     * @param expression search expression
     * @param timeout time to wait
     * @param callback which returns search results
     * @param root (optional) specify element which will serve as search root
     */
    function findElementsWithTimeoutAsync(expression: string, timeout: number, callback: (results: [HTMLElement[] | null, string | null]) => void, root?: HTMLElement, ifVNodeFindNearestChildElm?: boolean): Promise<void>;
    /**
     * Waits up to a given time for element to be not present.
     * @param expression search expression
     * @param timeout time to wait
     * @param callback true if element is not available, false if timeout occured and element is still present
     * @param root (optional) specify element which will serve as search root
     */
    function waitForElementNotPresent(expression: string, timeout: number, callback: (elementNotPresent: [boolean | null, string | null]) => [boolean, string], root?: HTMLElement): void;
    /**
     * Waits up to a given time for element to be not present. Returns promise which returns results or timeout error.
     * Used by Bobwai tests.
     * @param expression search expression
     * @param timeout time to wait
     * @param callback true if element is not available, false if timeout occured and element is still present
     * @param root (optional) specify element which will serve as search root
     */
    function waitForElementNotPresentAsync(expression: string, timeout: number, callback: (elementNotPresent: [boolean | null, string | null]) => void, root?: HTMLElement): Promise<void>;
    /**
     * Returns selected element attribute node value.
     * @param expression BBSeeker search expression
     * @param attributeName attribute node name
     * @param root (optional) specify element which will serve as search root
     */
    function getAttribute(expression: string, attributeName: string, root?: HTMLElement): (string | undefined)[];
    /**
    * Returns selected bobril data node value.
    * @param expression BBSeeker search expression
    * @param dataName data node name
    * @param root (optional) specify element which will serve as search root
    * @param preserveType (optional) allows to preserve value type
    */
    function getData<TValue = string>(expression: string, dataName: string, root?: HTMLElement, preserveType?: boolean): (TValue | undefined)[];
    /**
     * Returns selected bobril property value.
     * @param expression BBSeeker search expression
     * @param propertyPath property path relative to the virtual component/object
     * @param root (optional) specify element which will serve as search root
     */
    function getProperty(expression: string, propertyPath: string, root?: HTMLElement): (string | undefined)[];
    /**
    * Returns input elements linked to the matched file selector components.
    * @param expression BBSeeker search expression
    * @param root (optional) specify element which will serve as search root
    */
    function getFileInput(expression: string, root?: HTMLElement): (HTMLElement | undefined)[];
    /**
     * Returns selected bobril context value.
     * @param expression BBSeeker search expression
     * @param contextPropertyName context property name
     * @param root (optional) specify element which will serve as search root
     */
    function getCtx(expression: string, contextPropertyName: string, root?: HTMLElement): (string | undefined)[];
    /**
     * Finds all matching elements and extracts selected attribute value into a resultset.
     * @param expression BBSeeker search expression
     * @param attributeName attribute node name
     * @param timeout time to wait
     * @param callback webdriver callback returned by an async function it is a tuple: [string[], errorString]
     * @param root (optional) specify element which will serve as search root
     */
    function getAttributeWithTimeout(expression: string, attributeName: string, timeout: number, callback: (results: [string[] | null, string | null]) => [string[], string], root?: HTMLElement): void;
    /**
     * Finds all matching elements and extracts selected attribute value into a resultset which is returned as promise result.
     * Used by Bobwai tests.
     * @param expression BBSeeker search expression
     * @param attributeName attribute node name
     * @param timeout time to wait
     * @param callback returns search results.
     * @param root (optional) specify element which will serve as search root
     */
    function getAttributeWithTimeoutAsync(expression: string, attributeName: string, timeout: number, callback: (results: [string[] | null, string | null]) => [string[], string] | void, root?: HTMLElement): Promise<void>;
    /**
     * Finds all matching elements and extracts selected data value into a resultset.
     * @param expression BBSeeker search expression
     * @param dataName data node name
     * @param timeout time to wait
     * @param callback webdriver callback returned by an async function it is a tuple: [string[], errorString]
     * @param root (optional) specify element which will serve as search root
     */
    function getDataWithTimeout(expression: string, dataName: string, timeout: number, callback: (results: [string[] | null, string | null]) => [string[], string] | void, root?: HTMLElement): void;
    /**
     * Returns promise which returns all matching elements and extracts selected data value into a resultset.
     * Used by Bobwai tests.
     * @param expression BBSeeker search expression
     * @param dataName data node name
     * @param timeout time to wait
     * @param callback webdriver callback returned by an async function it is a tuple: [string[], errorString]
     * @param root (optional) specify element which will serve as search root
     */
    function getDataWithTimeoutAsync(expression: string, dataName: string, timeout: number, callback: (results: [string[] | null, string | null]) => [string[], string] | void, root?: HTMLElement): Promise<void>;
    /**
 * Finds all matching elements and extracts selected property value into a resultset.
 * @param expression BBSeeker search expression
 * @param propertyPath property path separated by "." character
 * @param timeout time to wait
 * @param callback webdriver callback returned by an async function it is a tuple: [string[], errorString]
 * @param root (optional) specify element which will serve as search root
 */
    function getPropertyWithTimeout(expression: string, propertyPath: string, timeout: number, callback: (results: [string[] | null, string | null]) => [string[], string] | void, root?: HTMLElement): void;
    /**
     * Returns promise which returns all matching elements and extracts selected property value into a resultset.
     * Used by Bobwai tests.
     * @param expression BBSeeker search expression
     * @param propertyPath property path separated by "." character
     * @param timeout time to wait
     * @param callback webdriver callback returned by an async function it is a tuple: [string[], errorString]
     * @param root (optional) specify element which will serve as search root
     */
    function getPropertyWithTimeoutAsync(expression: string, propertyPath: string, timeout: number, callback: (results: [string[] | null, string | null]) => [string[], string] | void, root?: HTMLElement): Promise<void>;
    /**
     * Finds matching file selection component and extracts reference to HTML element from ctx into a resultset which is returned as promise result.
     * @param expression BBSeeker search expression
     * @param timeout time to wait
     * @param callback returns search results.
     * @param root (optional) specify element which will serve as search root
     */
    function getFileInputWithTimeout(expression: string, timeout: number, callback: (results: [HTMLElement[] | null, string | null]) => [HTMLElement[], string] | void, root?: HTMLElement): Promise<void>;
    /**
     * Returns promise which contains reference to HTML input element referenced by file selection component.
     * Used by Bobwai tests.
     * @param expression BBSeeker search expression
     * @param timeout time to wait
     * @param callback webdriver callback returned by an async function it is a tuple: [HTMLElement[], errorString]
     * @param root (optional) specify element which will serve as search root
     */
    function getFileInputWithTimeoutAsync(expression: string, timeout: number, callback: (results: [HTMLElement[] | null, string | null]) => [HTMLElement[], string] | void, root?: HTMLElement): Promise<void>;
    /**
     * Finds all matching elements and extracts selected context property value into a resultset.
     * @param expression BBSeeker search expression
     * @param ctxPropertyName context property name
     * @param timeout time to wait
     * @param callback webdriver callback returned by an async function it is a tuple: [string[], errorString]
     * @param root (optional) specify element which will serve as search root
     */
    function getCtxWithTimeout(expression: string, ctxPropertyName: string, timeout: number, callback: (results: [string[] | null, string | null]) => [string[], string] | void, root?: HTMLElement): void;
    /**
     * Returns promise which returns all matching elements and extracts selected context value into a resultset.
     * Used by Bobwai tests.
     * @param expression BBSeeker search expression
     * @param ctxPropertyName context property name
     * @param timeout time to wait
     * @param callback webdriver callback returned by an async function it is a tuple: [string[], errorString]
     * @param root (optional) specify element which will serve as search root
     */
    function getCtxWithTimeoutAsync(expression: string, ctxPropertyName: string, timeout: number, callback: (results: [string[] | null, string | null]) => [string[], string] | void, root?: HTMLElement): Promise<void>;
    /**
     * Returns last click coordinates.
     */
    function getLastClickPosition(): number[];
    /**
     * Method which returns the closes child physical DOM element if there is some
     * @param node - specifies which node should start searching from
     * @param returnEvenNull - specifies whether method should return null if none elm is found or throw an error
     */
    function findNearesChildElm(node: bb.IBobrilCacheNode, returnEvenNull?: boolean): HTMLElement | null;
}
