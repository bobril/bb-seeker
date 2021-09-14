
import * as bb from "./bobril/package/index"

/*
Sample search expressions:
'*'                                     = any tag,
'div'                                   = all divs,
'div.bobwai--panel'                     = all divs with bobril component ID == 'bobwai--panel',
'.bobwai--panel'                        = all components with bobril component ID == bobwai--panel
'div.bobwai--panel[2]'                  = 3rd div with bobril component ID == 'bobwai--panel',
'.bobwai--panel[2]'                     = 3rd component with bobril component ID == 'bobwai--panel',
'div.bobwai--panel[2]/input'            = all inputs which are children of the div from the previous example,
'div.id1/div.id2[5]/div'                = all divs which are children of divs.id2 on 5th index which have a div.id1 as a parent
'div.bobwai--panel/div[text=INSIGHTS]'  = all divs with text INSIGHTS whose parent is div with bobril ID == bobwai--panel
'.id1/~.id2[text=Messenger]'            = all id2 elements "somewhere" inside id1 element (also works for tags)
'input[@placeholder=New Password]'      = all inputs with attribute "placeholder" and attribute value "New Password" (should work for any attribute)

'div.bobwai--app-header-button/*[text=_APPLICATIONS]'
 = any tag with text _APPLICATIONS whose parent is div with bobril ID == bobwai--app-header-button
*/

export module BBSeeker {

    //represents bobril, e.g. definition (bb) is not imported in compiled javascript, it is used only to provide data model for TypeScript during coding
    declare const b: any;
    let replacementChar = "-";
    export let frameCounter = 0;

    export let lastClickX = 0;
    export let lastClickY = 0;

    document.addEventListener("click", function (event: MouseEvent) {
        lastClickX = event.clientX;
        lastClickY = event.clientY;
    });

    var originalAfterFrame = b.setAfterFrame((c: string | bb.IBobrilCacheNode[] | null | undefined) => {
        originalAfterFrame(c);
        frameCounter++;
    });

    /**
     * Performs recursive search of a page virtual DOM starting from bobril root objects. All matching objects are returned as instances of HTMLElement.
     * @param expression search expression, see examples above.
     * @param root (optional) specify element which will serve as search root
     */
    export function findElements(expression: string, root?: HTMLElement, ifVNodeFindNearestChildElm?: boolean): HTMLElement[] {
        const work = findElementsBody(expression, root);
        let result: HTMLElement[] = [];
        /*
            For testing purposes of bobwai components it is necessary to return closest DOM element if there is any.
            The error is thrown only if no element is found in children subtree at all 
            (should not happen if the inserted searching expression is not total nonsence). 
        */
        if (ifVNodeFindNearestChildElm) {
            work.forEach((node: bb.IBobrilCacheNode) => {
                const elm = findNearesChildElm(node);
                elm && result.push(elm);
            })
            return result;
        }

        work.forEach((node: bb.IBobrilCacheNode) => {
            if (node.element) result.push(node.element as HTMLElement);
            else throwErrVirtualComponentsPresent();
        })

        return result;
    }

    /**
     * Waits up to a given time for an element to be available and returns it or returns a timeout error. Search is scheduled every 100ms if no browser frame updates were not detected in this time frame.
     * @param expression search expression
     * @param timeout time to wait
     * @param callback webdriver callback returned by an async function it is a tuple: [element[], errorString]
     * @param root (optional) specify element which will serve as search root
     */
    export function findElementsWithTimeout(expression: string, timeout: number, callback: (results: [HTMLElement[] | null, string | null]) => [HTMLElement[], string], root?: HTMLElement) {
        frameCounter = 0;
        let start = new Date().getTime();
        let end = start + Math.abs(timeout);
        findElementsWithTimeoutBody(frameCounter, expression, timeout, start, end, callback, root);
    }

    /**
     * Waits up to a given time for an element to be available and returns promise which returns result or timeout error. Search is scheduled every 100ms if no browser frame updates were not detected in this time frame.
     * Used by Bobwai tests
     * @param expression search expression
     * @param timeout time to wait
     * @param callback which returns search results
     * @param root (optional) specify element which will serve as search root
     */
    export async function findElementsWithTimeoutAsync(
        expression: string,
        timeout: number,
        callback: (results: [HTMLElement[] | null, string | null]) => void,
        root?: HTMLElement,
        ifVNodeFindNearestChildElm?: boolean
    ): Promise<void> {
        frameCounter = 0;
        let start = new Date().getTime();
        let end = start + Math.abs(timeout);
        await findElementsWithTimeoutBody(frameCounter, expression, timeout, start, end, callback, root, ifVNodeFindNearestChildElm)
    }

    /**
     * Waits up to a given time for element to be not present.
     * @param expression search expression
     * @param timeout time to wait
     * @param callback true if element is not available, false if timeout occured and element is still present
     * @param root (optional) specify element which will serve as search root
     */
    export function waitForElementNotPresent(expression: string, timeout: number, callback: (elementNotPresent: [boolean | null, string | null]) => [boolean, string], root?: HTMLElement) {
        frameCounter = 0;
        let start = new Date().getTime();
        let end = start + Math.abs(timeout);
        waitForElementNotPresentInternal(expression, timeout, start, end, callback, root);
    }

    /**
     * Waits up to a given time for element to be not present. Returns promise which returns results or timeout error.
     * Used by Bobwai tests.  
     * @param expression search expression
     * @param timeout time to wait
     * @param callback true if element is not available, false if timeout occured and element is still present
     * @param root (optional) specify element which will serve as search root
     */
    export async function waitForElementNotPresentAsync(expression: string, timeout: number, callback: (elementNotPresent: [boolean | null, string | null]) => void, root?: HTMLElement) {
        frameCounter = 0;
        let start = new Date().getTime();
        let end = start + Math.abs(timeout);
        await waitForElementNotPresentInternal(expression, timeout, start, end, callback, root);
    }

    /**
     * Returns selected element attribute node value.
     * @param expression BBSeeker search expression
     * @param attributeName attribute node name
     * @param root (optional) specify element which will serve as search root
     */
    export function getAttribute(expression: string, attributeName: string, root?: HTMLElement): (string | undefined)[] {
        let result: (string | undefined)[] = [];

        let work = findElementsBody(expression, root);

        for (let i = 0; i < work.length; i++) {
            let elm = work[i].element;
            if (elm != undefined) {
                let attrValue = (<any>elm)["attributes"][attributeName];
                if (attrValue == undefined) {
                    attrValue = (<any>elm)[attributeName];
                }
                // JSON.stringify will return undefined if attrValue is undefined as well
                if (typeof attrValue !== "string") {
                    attrValue = JSON.stringify(attrValue);
                }
                result.push(attrValue);
            } else
                throwErrVirtualComponentsPresent()
        }
        return result;
    }

    /**
    * Returns selected bobril data node value.
    * @param expression BBSeeker search expression
    * @param dataName data node name
    * @param root (optional) specify element which will serve as search root
    * @param preserveType (optional) allows to preserve value type
    */
    export function getData<TValue = string>(expression: string, dataName: string, root?: HTMLElement, preserveType?: boolean): (TValue | undefined)[] {
        let result: (TValue | undefined)[] = [];
        let work = findElementsBody(expression, root);
        for (let i = 0; i < work.length; i++) {
            let dataNode = work[i].data;
            let dataValue;
            if (dataNode != undefined) {
                dataValue = dataNode[dataName]
                if (!preserveType && typeof dataValue !== "string") {
                    dataValue = JSON.stringify(dataValue);
                }
            }
            result.push(dataValue);
        }
        return result;
    }

    /**
     * Returns selected bobril property value.
     * @param expression BBSeeker search expression
     * @param propertyPath property path relative to the virtual component/object
     * @param root (optional) specify element which will serve as search root
     */
    export function getProperty(expression: string, propertyPath: string, root?: HTMLElement): (string | undefined)[] {
        let result: (string | undefined)[] = [];
        if (!propertyPath)
            throw new BBSeekerError(
                "You have to provide property name or path relative to element as root. Path separator is \".\", e.g. \"component.id\"",
                ErrorType.PARSER);
        let pathParts = propertyPath.replace(/\]$/, "").split(/\.|\[|\]\./);
        let work = findElementsBody(expression, root);

        for (let i = 0; i < work.length; i++) {
            let bobrilObject: any = work[i];
            let propertyValue;
            pathParts.forEach(function (p: string) {
                if (bobrilObject !== undefined) {
                    bobrilObject = bobrilObject[p];
                }
            });
            propertyValue = bobrilObject;
            if (typeof propertyValue !== "string") {
                propertyValue = JSON.stringify(propertyValue);
            }
            result.push(propertyValue);
        }
        return result;
    }

    /**
    * Returns input elements linked to the matched file selector components.
    * @param expression BBSeeker search expression
    * @param root (optional) specify element which will serve as search root
    */
    export function getFileInput(expression: string, root?: HTMLElement): (HTMLElement | undefined)[] {
        return getFileInputInternal(expression, "fileInput", root);
    }

    function getFileInputInternal(expression: string, propertyName: string, root?: HTMLElement): (HTMLElement | undefined)[] {
        let result: HTMLElement[] = [];
        let work = getCtxInternal(expression, propertyName, root);

        for (let i = 0; i < work.length; i++) {
            let element = work[i];
            if (element != undefined) {
                result.push(<HTMLElement>element);
            }
        }
        return result;
    }

    /**
     * Returns selected bobril context value.
     * @param expression BBSeeker search expression
     * @param contextPropertyName context property name
     * @param root (optional) specify element which will serve as search root
     */
    export function getCtx(expression: string, contextPropertyName: string, root?: HTMLElement): (string | undefined)[] {
        let result: string[] = [];
        let work = getCtxInternal(expression, contextPropertyName, root);

        for (let i = 0; i < work.length; i++) {
            result.push(stringifyNonStringValue(work[i]));
        }
        return result;
    }

    /**
     * Returns selected bobril context value.
     * @param expression BBSeeker search expression
     * @param contextPropertyName context property name
     * @param root (optional) specify element which will serve as search root
     */
    function getCtxInternal(expression: string, contextPropertyName: string, root?: HTMLElement): any[] {
        let result: bb.IBobrilCacheNode[] = [];

        let work = findElementsBody(expression, root);

        for (let i = 0; i < work.length; i++) {
            let context = work[i].ctx;
            let contextValue;
            if (context != undefined) {
                contextValue = (context as any)[contextPropertyName]
            }
            result.push(contextValue);
        }
        return result;
    }

    function stringifyNonStringValue(value: any): string {
        let strValue;
        if (typeof value !== "string") {
            strValue = JSON.stringify(value);
        } else {
            strValue = value;
        }
        return strValue;
    }

    /**
     * Finds all matching elements and extracts selected attribute value into a resultset.
     * @param expression BBSeeker search expression
     * @param attributeName attribute node name
     * @param timeout time to wait
     * @param callback webdriver callback returned by an async function it is a tuple: [string[], errorString]
     * @param root (optional) specify element which will serve as search root
     */
    export function getAttributeWithTimeout(expression: string, attributeName: string, timeout: number, callback: (results: [string[] | null, string | null]) => [string[], string], root?: HTMLElement) {
        frameCounter = 0;
        let start = new Date().getTime();
        let end = start + Math.abs(timeout);
        getAttributeWithTimeoutBody(frameCounter, expression, attributeName, timeout, start, end, callback, root);
    }

    /**
     * Finds all matching elements and extracts selected attribute value into a resultset which is returned as promise result.
     * Used by Bobwai tests.  
     * @param expression BBSeeker search expression
     * @param attributeName attribute node name
     * @param timeout time to wait
     * @param callback returns search results.
     * @param root (optional) specify element which will serve as search root
     */
    export async function getAttributeWithTimeoutAsync(expression: string, attributeName: string, timeout: number, callback: (results: [string[] | null, string | null]) => [string[], string] | void, root?: HTMLElement) {
        frameCounter = 0;
        let start = new Date().getTime();
        let end = start + Math.abs(timeout);
        await getAttributeWithTimeoutBody(frameCounter, expression, attributeName, timeout, start, end, callback, root);
    }

    /**
     * Finds all matching elements and extracts selected data value into a resultset.
     * @param expression BBSeeker search expression
     * @param dataName data node name
     * @param timeout time to wait
     * @param callback webdriver callback returned by an async function it is a tuple: [string[], errorString]
     * @param root (optional) specify element which will serve as search root
     */
    export function getDataWithTimeout(expression: string, dataName: string, timeout: number, callback: (results: [string[] | null, string | null]) => [string[], string] | void, root?: HTMLElement) {
        frameCounter = 0;
        let start = new Date().getTime();
        let end = start + Math.abs(timeout);
        getDataWithTimeoutBody(frameCounter, expression, dataName, timeout, start, end, callback, root);
    }

    /**
     * Returns promise which returns all matching elements and extracts selected data value into a resultset.
     * Used by Bobwai tests. 
     * @param expression BBSeeker search expression
     * @param dataName data node name
     * @param timeout time to wait
     * @param callback webdriver callback returned by an async function it is a tuple: [string[], errorString]
     * @param root (optional) specify element which will serve as search root
     */
    export async function getDataWithTimeoutAsync(expression: string, dataName: string, timeout: number, callback: (results: [string[] | null, string | null]) => [string[], string] | void, root?: HTMLElement) {
        frameCounter = 0;
        let start = new Date().getTime();
        let end = start + Math.abs(timeout);
        await getDataWithTimeoutBody(frameCounter, expression, dataName, timeout, start, end, callback, root);
    }

    /**
 * Finds all matching elements and extracts selected property value into a resultset.
 * @param expression BBSeeker search expression
 * @param propertyPath property path separated by "." character
 * @param timeout time to wait
 * @param callback webdriver callback returned by an async function it is a tuple: [string[], errorString]
 * @param root (optional) specify element which will serve as search root
 */
    export function getPropertyWithTimeout(expression: string, propertyPath: string, timeout: number, callback: (results: [string[] | null, string | null]) => [string[], string] | void, root?: HTMLElement) {
        frameCounter = 0;
        let start = new Date().getTime();
        let end = start + Math.abs(timeout);
        getPropertyWithTimeoutBody(frameCounter, expression, propertyPath, timeout, start, end, callback, root);
    }

    /**
     * Returns promise which returns all matching elements and extracts selected property value into a resultset.
     * Used by Bobwai tests. 
     * @param expression BBSeeker search expression
     * @param propertyPath property path separated by "." character
     * @param timeout time to wait
     * @param callback webdriver callback returned by an async function it is a tuple: [string[], errorString]
     * @param root (optional) specify element which will serve as search root
     */
    export async function getPropertyWithTimeoutAsync(expression: string, propertyPath: string, timeout: number, callback: (results: [string[] | null, string | null]) => [string[], string] | void, root?: HTMLElement) {
        frameCounter = 0;
        let start = new Date().getTime();
        let end = start + Math.abs(timeout);
        await getPropertyWithTimeoutBody(frameCounter, expression, propertyPath, timeout, start, end, callback, root);
    }

    /**
     * Finds matching file selection component and extracts reference to HTML element from ctx into a resultset which is returned as promise result.
     * @param expression BBSeeker search expression
     * @param timeout time to wait
     * @param callback returns search results.
     * @param root (optional) specify element which will serve as search root
     */
    export async function getFileInputWithTimeout(expression: string, timeout: number, callback: (results: [HTMLElement[] | null, string | null]) => [HTMLElement[], string] | void, root?: HTMLElement) {
        frameCounter = 0;
        let start = new Date().getTime();
        let end = start + Math.abs(timeout);
        await getFileInputWithTimeoutBody(frameCounter, expression, timeout, start, end, callback, root);
    }

    /**
     * Returns promise which contains reference to HTML input element referenced by file selection component.
     * Used by Bobwai tests. 
     * @param expression BBSeeker search expression
     * @param timeout time to wait
     * @param callback webdriver callback returned by an async function it is a tuple: [HTMLElement[], errorString]
     * @param root (optional) specify element which will serve as search root
     */
    export async function getFileInputWithTimeoutAsync(expression: string, timeout: number, callback: (results: [HTMLElement[] | null, string | null]) => [HTMLElement[], string] | void, root?: HTMLElement) {
        frameCounter = 0;
        let start = new Date().getTime();
        let end = start + Math.abs(timeout);
        await getFileInputWithTimeoutBody(frameCounter, expression, timeout, start, end, callback, root);
    }

    /**
     * Finds all matching elements and extracts selected context property value into a resultset.
     * @param expression BBSeeker search expression
     * @param ctxPropertyName context property name
     * @param timeout time to wait
     * @param callback webdriver callback returned by an async function it is a tuple: [string[], errorString]
     * @param root (optional) specify element which will serve as search root
     */
    export function getCtxWithTimeout(expression: string, ctxPropertyName: string, timeout: number, callback: (results: [string[] | null, string | null]) => [string[], string] | void, root?: HTMLElement) {
        frameCounter = 0;
        let start = new Date().getTime();
        let end = start + Math.abs(timeout);
        getCtxWithTimeoutBody(frameCounter, expression, ctxPropertyName, timeout, start, end, callback, root);
    }

    /**
     * Returns promise which returns all matching elements and extracts selected context value into a resultset.
     * Used by Bobwai tests. 
     * @param expression BBSeeker search expression
     * @param ctxPropertyName context property name
     * @param timeout time to wait
     * @param callback webdriver callback returned by an async function it is a tuple: [string[], errorString]
     * @param root (optional) specify element which will serve as search root
     */
    export async function getCtxWithTimeoutAsync(expression: string, ctxPropertyName: string, timeout: number, callback: (results: [string[] | null, string | null]) => [string[], string] | void, root?: HTMLElement) {
        frameCounter = 0;
        let start = new Date().getTime();
        let end = start + Math.abs(timeout);
        await getCtxWithTimeoutBody(frameCounter, expression, ctxPropertyName, timeout, start, end, callback, root);
    }

    /**
     * Returns last click coordinates.
     */
    export function getLastClickPosition() {
        return [lastClickX, lastClickY];
    }

    /**
     * Returns raw results from which searched types of objects can be extracted.
     * @param expression bbseeker search expression
     * @param root element which will serve as search root
     */
    function findElementsBody(expression: string, root?: HTMLElement): bb.IBobrilCacheNode[] {
        let parsedExpression: Identifier[] = parseExpression(expression);
        let work: bb.IBobrilCacheNode[] = [];

        if (!root) {
            if (b == undefined) {
                throw new BBSeekerError("Bobril not found in the page. Search terminated.", ErrorType.BOBRIL);
            }
            let roots: bb.IBobrilRoots = b.getRoots();
            let keys = Object.keys(roots);
            for (let ri = 0; ri < keys.length; ri++) {
                let rtc: bb.IBobrilCacheNode[] | bb.IBobrilCacheNode | undefined = roots[keys[ri]].c as bb.IBobrilCacheNode[];
                if (rtc != undefined) {
                    work = work.concat(rtc);
                } else {
                    //fallback of the last hope - if this fails, something is very wrong with Bobril!!!
                    rtc = roots[keys[ri]].n;
                    if (rtc && rtc.children) {
                        work = work.concat(rtc);
                    }
                }
            }
        } else {
            const rootNode: bb.IBobrilCacheNode | undefined = b.deref(root);
            rootNode && work.push(rootNode);
        }

        for (let i = 0; i < parsedExpression.length; i++) {
            let temp: bb.IBobrilCacheNode[] = [];
            let locator: Identifier = parsedExpression[i];
            for (let j = 0; j < work.length; j++) {
                if (locator.siblingOffset == 0) {
                    if (locator.childIndexFilter != undefined) {
                        let matchingChildren: bb.IBobrilCacheNode[] = [];
                        matchingChildren = findElementsInternal(matchingChildren, work[j], locator, i === 0);
                        //child index: returned collection should be filled only to the level of the index, we return only one match per parent
                        //see matchObjectByFilter for more comments
                        if (locator.childIndexFilter.comparison == Comparison.SIMPLE) { //child index filter -> index only
                            if (matchingChildren.length - 1 >= locator.childIndexFilter.matchedValue) {
                                temp.push(matchingChildren[locator.childIndexFilter.matchedValue]);
                            }
                        } else if (matchingChildren.length > 0) { // child index filter -> last(), possibly with last index offset (e.g. last()-1)
                            var lastIndexWithOffset = matchingChildren.length - 1 + locator.childIndexFilter.matchedValue;
                            if (lastIndexWithOffset >= 0) {
                                temp.push(matchingChildren[lastIndexWithOffset]);
                            }
                        }
                    } else {
                        temp = findElementsInternal(temp, work[j], locator, i === 0);
                    }
                } else {
                    let parent = work[j].parent;
                    if (parent && parent.children) {
                        for (let k = 0; k < parent.children.length; k++) {
                            let child: bb.IBobrilCacheNode = <bb.IBobrilCacheNode>parent.children[k];
                            let childWithOffset: bb.IBobrilCacheNode = <bb.IBobrilCacheNode>parent.children[k + locator.siblingOffset];
                            if (child === work[j] && childWithOffset != undefined) {
                                temp.push(childWithOffset);
                                break;
                            }
                        }
                    }
                }
            }
            if (Array.isArray(locator.filters) && locator.filters.length == 1 && locator.filters[0].isIndexFilter()) {
                var index: number = parseInt(locator.filters[0].matchedValue);
                if (locator.filters[0].matchedName == undefined) {
                    temp = temp.slice(index, index + 1)
                } else {
                    if (temp.length + index < 0) {
                        let idx = (index != -1) ? index + 1 : "";
                        throw new BBSeekerError("Index filter: 'last()" + idx + "' is outside of result set length: '" + temp.length + "'", ErrorType.SEARCH);
                    }
                    temp = temp.slice(temp.length + index, temp.length + index + 1);
                }
            }
            work = temp;
        }
        return work;
    }

    /**
     * Recursive search wrapper.
     * @param resultArray array to push results into
     * @param bobrilObject bobril object to search for matching children
     * @param locator identifier used to match search to
     * @param anylevel true only for the 1st iteration
     */
    function findElementsInternal(resultArray: bb.IBobrilCacheNode[], bobrilObject: bb.IBobrilCacheNode, locator: Identifier, anylevel: boolean): bb.IBobrilCacheNode[] {
        if (anylevel) {
            matchObject(bobrilObject, resultArray, locator);
        }
        if (!locator.isMatchingParent()) { //if children are being looked up
            findElementsRecursive(bobrilObject, resultArray, locator, anylevel);
        } else if (bobrilObject.parent) {
            if (!locator.isDefined()) { //if direct parent is being looked up
                resultArray.push(bobrilObject.parent);
            } else { //if one of the parents determined by locator is being looked up
                let tmpParentArray: bb.IBobrilCacheNode[] = [];
                while (tmpParentArray.length == 0 && bobrilObject.parent) {
                    matchObject(bobrilObject.parent, tmpParentArray, locator);
                    bobrilObject = bobrilObject.parent
                }
                resultArray = resultArray.concat(tmpParentArray);
            }
        }
        return resultArray;
    }

    /**
     * Performes a recursive search of a bobril object children based on a provided identifier object. All matches are pushed into a result array. 
     * @param bobrilObject
     * @param resultArray
     * @param locator
     * @param anylevel indicates the 1st iteration of a recursion, false otherwise
     */
    function findElementsRecursive(bobrilObject: bb.IBobrilCacheNode, resultArray: bb.IBobrilCacheNode[],
        locator: Identifier, anylevel: boolean) {
        if (bobrilObject != undefined && Array.isArray(bobrilObject.children)) {
            for (let i = 0; i < bobrilObject.children.length; i++) {
                var currentLocator = locator;
                let child: bb.IBobrilCacheNode = <bb.IBobrilCacheNode>bobrilObject.children[i];
                if (anylevel || child.tag == undefined) {
                    findElementsRecursive(child, resultArray, locator, anylevel);
                } else if (locator.isMatchingAnyChild()) {
                    currentLocator = clone(locator);
                    currentLocator.matchingType = MatchingType.EXACT;
                    currentLocator.keyRegex = locator.keyRegex; //regex reference is not cloned properly, just reference the original
                    findElementsRecursive(child, resultArray, currentLocator, true);
                }
                matchObject(child, resultArray, currentLocator);
            }
        }
    }

    /**
     * Async search step result handling. Depending on search result and state either calls callback or handles rescheduling.
     * @param lastCheck
     * @param expression
     * @param timeout
     * @param start
     * @param end
     * @param callback
     * @param root element which will serve as search root
     */
    function findElementsWithTimeoutBody(
        lastCheck: number,
        expression: string,
        timeout: number,
        start: number,
        end: number,
        callback: (results: [HTMLElement[] | null, string | null]) => [HTMLElement[], string] | void,
        root?: HTMLElement,
        ifVNodeFindNearestChildElm?: boolean
    ) {
        try {
            let time = new Date().getTime();
            if (lastCheck == frameCounter) {
                let results: HTMLElement[] = handleBobrilNotReadyForElements(findElements, expression, end, time, root, ifVNodeFindNearestChildElm);
                if (results.length > 0) {
                    callback([results, null]);
                } else {
                    if (time < end) {
                        findElementsWithTimeoutReschedule(expression, timeout, start, end, callback, root, ifVNodeFindNearestChildElm);
                    } else {
                        callback([null, "Async search timed out after '" + ((new Date().getTime() - start) / 1000) + "s' for expression: '" + expression + "'"]);
                    }
                }
            } else {
                findElementsWithTimeoutReschedule(expression, timeout, start, end, callback, root, ifVNodeFindNearestChildElm);
            }
        } catch (err: any) {
            callback([null, formatError(err)]);
        }
    }

    /**
     * Used for rescheduling async search.
     * @param expression
     * @param timeout
     * @param start
     * @param end
     * @param callback webdriver callback returned by an async function it is a tuple: [element[], errorString]
     * @param root element which will serve as search root
     */
    function findElementsWithTimeoutReschedule(
        expression: string,
        timeout: number,
        start: number,
        end: number,
        callback: (results: [HTMLElement[] | null, string | null]) => [HTMLElement[], string] | void,
        root?: HTMLElement,
        ifVNodeFindNearestChildElm?: boolean
    ) {
        var lastCheck = frameCounter;
        setTimeout(() => {
            findElementsWithTimeoutBody(lastCheck, expression, timeout, start, end, callback, root, ifVNodeFindNearestChildElm);
        }, 100);
    }

    /**
     * Internal. Waits up to a given time for element to be not present.
     * @param expression search expression
     * @param timeout time to wait
     * @param callback true if element is not available, false if timeout occured and element is still present
     * @param root element which will serve as search root
     */
    function waitForElementNotPresentInternal(expression: string, timeout: number, start: number, end: number, callback: (elementNotPresent: [boolean | null, string | null]) => [boolean, string] | void, root?: HTMLElement) {
        var lastCheck = frameCounter;
        setTimeout(() => {
            try {
                let time = new Date().getTime();
                if (lastCheck == frameCounter) {
                    var results = findElements(expression, root);
                    if (results.length == 0) {
                        callback([true, null]);
                    } else {
                        if (time < end) {
                            waitForElementNotPresentInternal(expression, timeout, start, end, callback, root);
                        } else {
                            callback([false, null]);
                        }
                    }
                } else {
                    waitForElementNotPresentInternal(expression, timeout, start, end, callback, root);
                }
            } catch (err: any) {
                callback([false, formatError(err)]);
            }
        }, 100);
    }

    function getAttributeWithTimeoutBody(lastCheck: number, expression: string, attributeName: string, timeout: number, start: number, end: number, callback: (results: [string[] | null, string | null]) => [string[], string] | void, root?: HTMLElement) {
        try {
            let time = new Date().getTime();
            if (lastCheck == frameCounter) {
                let results = handleBobrilNotReadyForData(getAttribute, expression, attributeName, end, time, root);
                if (results.length > 0) {
                    callback([results, null]);
                } else {
                    if (time < end) {
                        getAttributeWithTimeoutReschedule(expression, attributeName, timeout, start, end, callback, root);
                    } else {
                        callback([null, "Async search timed out after '" + ((new Date().getTime() - start) / 1000) + "s' for expression: '" + expression + "'"]);
                    }
                }
            } else {
                getAttributeWithTimeoutReschedule(expression, attributeName, timeout, start, end, callback, root);
            }
        } catch (err: any) {
            callback([null, formatError(err)]);
        }
    }

    function getAttributeWithTimeoutReschedule(expression: string, attributeName: string, timeout: number, start: number, end: number, callback: (results: [string[] | null, string | null]) => [string[], string] | void, root?: HTMLElement) {
        var lastCheck = frameCounter;
        setTimeout(() => {
            getAttributeWithTimeoutBody(lastCheck, expression, attributeName, timeout, start, end, callback, root);
        }, 100);
    }

    function getDataWithTimeoutBody(lastCheck: number, expression: string, dataName: string, timeout: number, start: number, end: number, callback: (results: [string[] | null, string | null]) => [string[], string] | void, root?: HTMLElement) {
        try {
            let time = new Date().getTime();
            if (lastCheck == frameCounter) {
                let results = handleBobrilNotReadyForData(getData, expression, dataName, end, time, root);
                if (results.length > 0) {
                    callback([results, null]);
                } else {
                    if (time < end) {
                        getDataWithTimeoutReschedule(expression, dataName, timeout, start, end, callback, root);
                    } else {
                        callback([null, "Async search timed out after '" + ((new Date().getTime() - start) / 1000) + "s' for expression: '" + expression + "'"]);
                    }
                }
            } else {
                getDataWithTimeoutReschedule(expression, dataName, timeout, start, end, callback, root);
            }
        } catch (err: any) {
            callback([null, formatError(err)]);
        }
    }

    function getDataWithTimeoutReschedule(expression: string, dataName: string, timeout: number, start: number, end: number, callback: (results: [string[] | null, string | null]) => [string[], string] | void, root?: HTMLElement) {
        var lastCheck = frameCounter;
        setTimeout(() => {
            getDataWithTimeoutBody(lastCheck, expression, dataName, timeout, start, end, callback, root);
        }, 100);
    }

    function getPropertyWithTimeoutBody(lastCheck: number, expression: string, propertyPath: string, timeout: number, start: number, end: number, callback: (results: [string[] | null, string | null]) => [string[], string] | void, root?: HTMLElement) {
        try {
            let time = new Date().getTime();
            if (lastCheck == frameCounter) {
                let results = handleBobrilNotReadyForData(getProperty, expression, propertyPath, end, time, root);
                if (results.length > 0) {
                    callback([results, null]);
                } else {
                    if (time < end) {
                        getPropertyWithTimeoutReschedule(expression, propertyPath, timeout, start, end, callback, root);
                    } else {
                        callback([null, "Async search timed out after '" + ((new Date().getTime() - start) / 1000) + "s' for expression: '" + expression + "'"]);
                    }
                }
            } else {
                getPropertyWithTimeoutReschedule(expression, propertyPath, timeout, start, end, callback, root);
            }
        } catch (err:any) {
            callback([null, formatError(err)]);
        }
    }

    function getPropertyWithTimeoutReschedule(expression: string, propertyPath: string, timeout: number, start: number, end: number, callback: (results: [string[] | null, string | null]) => [string[], string] | void, root?: HTMLElement) {
        var lastCheck = frameCounter;
        setTimeout(() => {
            getPropertyWithTimeoutBody(lastCheck, expression, propertyPath, timeout, start, end, callback, root);
        }, 100);
    }

    function getCtxWithTimeoutBody(lastCheck: number, expression: string, ctxPropertyName: string, timeout: number, start: number, end: number, callback: (results: [string[] | null, string | null]) => [string[], string] | void, root?: HTMLElement) {
        try {
            let time = new Date().getTime();
            if (lastCheck == frameCounter) {
                let results = handleBobrilNotReadyForData(getCtx, expression, ctxPropertyName, end, time, root);
                if (results.length > 0) {
                    callback([results, null]);
                } else {
                    if (time < end) {
                        getCtxWithTimeoutReschedule(expression, ctxPropertyName, timeout, start, end, callback, root);
                    } else {
                        callback([null, "Async search timed out after '" + ((new Date().getTime() - start) / 1000) + "s' for expression: '" + expression + "'"]);
                    }
                }
            } else {
                getCtxWithTimeoutReschedule(expression, ctxPropertyName, timeout, start, end, callback, root);
            }
        } catch (err:any) {
            callback([null, formatError(err)]);
        }
    }

    function getCtxWithTimeoutReschedule(expression: string, attributeName: string, timeout: number, start: number, end: number, callback: (results: [string[] | null, string | null]) => [string[], string] | void, root?: HTMLElement) {
        var lastCheck = frameCounter;
        setTimeout(() => {
            getCtxWithTimeoutBody(lastCheck, expression, attributeName, timeout, start, end, callback, root);
        }, 100);
    }

    function getFileInputWithTimeoutBody(lastCheck: number, expression: string, timeout: number, start: number, end: number, callback: (results: [HTMLElement[] | null, string | null]) => [HTMLElement[], string] | void, root?: HTMLElement) {
        try {
            let time = new Date().getTime();
            if (lastCheck == frameCounter) {
                let results = handleBobrilNotReadyForData(getFileInputInternal, expression, "fileInput", end, time, root);
                if (results.length > 0) {
                    callback([results, null]);
                } else {
                    if (time < end) {
                        getFileInputWithTimeoutReschedule(expression, timeout, start, end, callback, root);
                    } else {
                        callback([null, "Async search timed out after '" + ((new Date().getTime() - start) / 1000) + "s' for expression: '" + expression + "'"]);
                    }
                }
            } else {
                getFileInputWithTimeoutReschedule(expression, timeout, start, end, callback, root);
            }
        } catch (err:any) {
            callback([null, formatError(err)]);
        }
    }

    function getFileInputWithTimeoutReschedule(expression: string, timeout: number, start: number, end: number, callback: (results: [HTMLElement[] | null, string | null]) => [HTMLElement[], string] | void, root?: HTMLElement) {
        var lastCheck = frameCounter;
        setTimeout(() => {
            getFileInputWithTimeoutBody(lastCheck, expression, timeout, start, end, callback, root);
        }, 100);
    }

    /**
     * Matches bobril object with provided identifier.
     * @param bobrilObject
     * @param resultArray
     * @param locator
     */
    function matchObject(bobrilObject: bb.IBobrilCacheNode, resultArray: bb.IBobrilCacheNode[], locator: Identifier) {
        if (locator.tag == undefined || bobrilObject.tag === locator.tag || locator.tag === "*") {
            if (locator.id != undefined && bobrilObject.component != undefined) {
                let matchedId = bobrilObject.component.id
                if (matchedId != undefined && matchedId.indexOf("/") != -1) {
                    matchedId = matchedId.replace(/\//g, replacementChar);
                }
                if (matchedId === locator.id) {
                    matchObjectByFilters(bobrilObject, resultArray, locator);
                }
            } else if (locator.key != undefined) {
                if (locator.keyRegex == undefined) {
                    if (bobrilObject.key === locator.key) {
                        matchObjectByFilters(bobrilObject, resultArray, locator);
                    }
                } else if (bobrilObject.key != undefined) {
                    var matches = bobrilObject.key.match(locator.keyRegex);
                    if (matches != undefined && matches.length > 0 && matches[0] === bobrilObject.key) {
                        matchObjectByFilters(bobrilObject, resultArray, locator);
                    }
                }
            } else if (locator.id == undefined && locator.key == undefined) {
                matchObjectByFilters(bobrilObject, resultArray, locator);
            }
        }
    }

    /**
     * Matches bobril object with provided filters. Helper booleans are resolved ahead of time and provided as a parameter to improve performance.
     * @param bobrilObject
     * @param resultArray
     * @param locator
     */
    function matchObjectByFilters(bobrilObject: bb.IBobrilCacheNode, resultArray: bb.IBobrilCacheNode[], locator: Identifier) {
        if (locator.filters && (locator.filters.length == 0 || locator.filters[0].isIndexFilter())) {
            resultArray.push(bobrilObject);
        } else if (locator.filters) {
            let match: bb.IBobrilCacheNode | undefined = bobrilObject;
            for (let i = 0; i < locator.filters.length; i++) {
                let filter = locator.filters[i];
                if (match != undefined && filter.joinType == JoinType.AND) {
                    match = matchObjectByFilter(match, locator, filter);
                }
            }
            if (match != undefined) {
                resultArray.push(match);
            }
        }
    }

    function matchObjectByFilter(bobrilObject: bb.IBobrilCacheNode, locator: Identifier, filter: Filter): bb.IBobrilCacheNode | undefined {
        if (filter.isTextFilter()) {
            if (filter.isStrictFilter) {
                return matchStrictTextFilter(bobrilObject, locator, filter);
            } else {
                return matchNonStrictTextFilter(bobrilObject, locator, filter);
            }
        } else if (filter.isAttributeFilter() && bobrilObject.element != undefined) {
            if (filter.isStrictFilter) {
                return matchStrictAttributeFilter(bobrilObject, filter);
            } else {
                return matchNonStrictAttributeFilter(bobrilObject, filter);
            }
        } else if (filter.isDataFilter() && bobrilObject.data != undefined && filter && filter.matchedName && bobrilObject.data[filter.matchedName] != undefined) {
            if (filter.isStrictFilter) {
                return matchStrictValue(bobrilObject, bobrilObject.data[filter.matchedName], filter);
            } else {
                return matchNonStrictValue(bobrilObject, bobrilObject.data[filter.matchedName], filter);
            }
        } else if (filter.isChildIndexFilter()) { // results will be trimmed in the calling function or bz following filters on the same level
            return bobrilObject;
        }
        return;
    }

    function matchStrictValue(bobrilObject: bb.IBobrilCacheNode, testedValue: any, filter: Filter): bb.IBobrilCacheNode | undefined {
        if (testedValue == undefined) {
            return;
        }
        if (typeof testedValue !== "string") {
            testedValue = JSON.stringify(testedValue);
        }
        if (Comparison.SIMPLE == filter.comparison) {
            if (testedValue == filter.matchedValue) {
                return bobrilObject;
            }
        } else if (Comparison.STARTS_WITH == filter.comparison) {
            if (startsWith(testedValue, filter.matchedValue)) {
                return bobrilObject;
            }
        } else if (Comparison.ENDS_WITH == filter.comparison) {
            if (endsWith(testedValue, filter.matchedValue)) {
                return bobrilObject;
            }
        }
        return;
    }

    function matchNonStrictValue(bobrilObject: bb.IBobrilCacheNode, testedValue: any, filter: Filter): bb.IBobrilCacheNode | undefined {
        if (testedValue == undefined) {
            return;
        }
        if (typeof testedValue !== "string") {
            testedValue = JSON.stringify(testedValue);
        }
        if (testedValue.indexOf(filter.matchedValue) != -1) {
            return bobrilObject;
        }
        return;
    }

    function matchStrictTextFilter(bobrilObject: bb.IBobrilCacheNode, locator: Identifier, filter: Filter): bb.IBobrilCacheNode | undefined {
        if (Array.isArray(bobrilObject.children)) {
            for (let j = 0; j < bobrilObject.children.length; j++) {
                let textChild: bb.IBobrilCacheNode = <bb.IBobrilCacheNode>bobrilObject.children[j];
                if (typeof textChild === "string") {
                    var match = matchStrictValue(textChild, (<any>textChild)["children"], filter);
                    if (match != undefined) {
                        return sanitizeTextNode(match);
                    }
                } else {
                    if (textChild.tag == null) {
                        return matchObjectByFilter(textChild, locator, filter);
                    }
                }
            }
        } else {
            var match = matchStrictValue(bobrilObject, bobrilObject.children, filter);
            if (match != undefined) {
                return sanitizeTextNode(match);
            }
        }
        return undefined;
    }

    function matchNonStrictTextFilter(bobrilObject: bb.IBobrilCacheNode, locator: Identifier, filter: Filter): bb.IBobrilCacheNode | undefined {
        if (Array.isArray(bobrilObject.children)) {
            for (let j = 0; j < bobrilObject.children.length; j++) {
                let textChild: bb.IBobrilCacheNode = <bb.IBobrilCacheNode>bobrilObject.children[j];
                if (typeof textChild === "string") {
                    let childText = (<any>textChild)["children"] as string;
                    if (childText != undefined && childText.indexOf(filter.matchedValue) != -1) {
                        return sanitizeTextNode(textChild);
                    }
                } else {
                    if (textChild && textChild.tag == null) {
                        return matchObjectByFilter(textChild, locator, filter);
                    }
                }
            }
        } else {
            var objectText = bobrilObject.children as string;
            if (objectText != undefined && objectText.indexOf(filter.matchedValue) != -1) {
                return sanitizeTextNode(bobrilObject);
            }
        }
        return;
    }

    function matchStrictAttributeFilter(bobrilObject: bb.IBobrilCacheNode, filter: Filter): bb.IBobrilCacheNode | undefined {
        if (filter && filter.matchedName && (<any>bobrilObject.element)["attributes"][filter.matchedName] != undefined) {
            return matchStrictValue(bobrilObject, (<any>bobrilObject.element)["attributes"][filter.matchedName]["nodeValue"], filter);
        } else if (filter && filter.matchedName) {
            return matchStrictValue(bobrilObject, (<any>bobrilObject.element)[filter.matchedName], filter);
        }
        else return undefined;
    }

    function matchNonStrictAttributeFilter(bobrilObject: bb.IBobrilCacheNode, filter: Filter): bb.IBobrilCacheNode | undefined {
        if (filter && filter.matchedName && (<any>bobrilObject.element)["attributes"][filter.matchedName] != undefined) {
            return matchNonStrictValue(bobrilObject, (<any>bobrilObject.element)["attributes"][filter.matchedName]["nodeValue"], filter);
        } else if (filter && filter.matchedName) {
            return matchNonStrictValue(bobrilObject, (<any>bobrilObject.element)[filter.matchedName], filter);
        }
        else return undefined;
    }

    function startsWith(text: string, start: string): boolean {
        return text.slice(0, start.length) == start;
    }

    function endsWith(text: string, end: string): boolean {
        return text.slice(-end.length) == end;
    }

    /**
     * Makes sure that resulting object is not a text node but an element that contains a text (e.g. <div>test</d> instead of "test").
     * @param bobrilObject
     */
    function sanitizeTextNode(bobrilObject: bb.IBobrilCacheNode): bb.IBobrilCacheNode | undefined {
        if (bobrilObject.element != undefined && (<HTMLElement>bobrilObject.element).nodeType == Node.TEXT_NODE) {
            return bobrilObject.parent;
        } else {
            return bobrilObject;
        }
    }

    /**
     * Handle case when bobril has not finished loading nodes yet - variant for elements.
     * @param search
     * @param expression
     * @param end
     * @param time
     * @param root element which will serve as search root
     */
    function handleBobrilNotReadyForElements(
        search: (expression: string, root?: HTMLElement, ifVNodeFindNearestChildElm?: boolean) => HTMLElement[],
        expression: string,
        end: number,
        time: number,
        root?: HTMLElement,
        ifVNodeFindNearestChildElm?: boolean
    ): HTMLElement[] {
        try {
            return search(expression, root, ifVNodeFindNearestChildElm);
        } catch (err) {
            if (err instanceof BBSeekerError && err.type == ErrorType.BOBRIL && (time < end)) {
                return [];
            }
            throw err;
        }
    }

    /**
     * Handle case when bobril has not finished loading nodes yet - variant for attributes and data.
     * @param search
     * @param expression
     * @param name
     * @param end
     * @param time
     * @param root element which will serve as search root
     */
    // ten search muze opravdu vracet cokoli ? asi to udelat zase genericky
    function handleBobrilNotReadyForData(search: (expression: string, name: string, root?: HTMLElement) => any[], expression: string, name: string, end: number, time: number, root?: HTMLElement) {
        try {
            return search(expression, name, root);
        } catch (err) {
            if (err instanceof BBSeekerError && err.type == ErrorType.BOBRIL && (time < end)) {
                return [];
            }
            throw err;
        }
    }

    function formatError(err: Error): string {
        if (err instanceof BBSeekerError) {
            return err.message;
        }
        return err.name + ": " + err.message;
    }

    /**
     * Parses provided search expression into an array of node identifiers.
     * @param expression search expression
     */
    function parseExpression(expression: string): Identifier[] {
        let identifiers: string[] = expression.split(/\/(?=(?:(?:[^\[\]]*\[[^\[\]]*\])|(?:[^\[\]]*\[[^\[\]]*\]))*[^\[\]]*$)/);
        let resultArray: Identifier[] = [];
        for (let i = 0; i < identifiers.length; i++) {
            let componentId: string = identifiers[i];
            resultArray[i] = parseSelector(componentId);
        }
        return resultArray;
    }

    /**
    * Parses each selector substring into an Identifier object.
    * @param identifier
    */
    function parseSelector(identifier: string): Identifier {
        let selectorWithoutFilter: string = stripFilters(identifier);
        let filters: Filter[] = extractFilters(identifier);

        let regexMatches = /^([~|^])?([^.|^#]*)?((.?)(.+)?)/g.exec(selectorWithoutFilter);
        let id: string | undefined = undefined;
        let key: string | undefined = undefined;
        let keyRegex: RegExp | undefined = undefined;
        let tag: string | undefined = undefined;
        let offset: number = 0;
        let matching: MatchingType = MatchingType.EXACT;

        if (regexMatches !== null) {
            if ("^" === regexMatches[1]) {
                matching = MatchingType.PARENT;
            } else if ("~" === regexMatches[1]) {
                matching = MatchingType.ANY_CHILD
            }
            if (regexMatches[2]) {
                tag = regexMatches[2];
            }
            if (regexMatches[4]) {
                switch (regexMatches[4]) {
                    case ".":
                        id = regexMatches[5];
                        break;
                    case "#":
                        key = regexMatches[5];
                        break;
                    default:
                        throw new BBSeekerError("Unmatched symbol '" + regexMatches[4] + "' in locator '" + identifier + "'", ErrorType.PARSER);
                }
            }
        }
        if (key != undefined && key.indexOf("*") != -1) {
            keyRegex = new RegExp(key.replace(/\*/g, ".*"), "g")
        }
        let rightSibling = tag ? /^>(\d*)>$/g.exec(tag) : null;
        let leftSibling = tag ? /^<(\d*)<$/g.exec(tag) : null;
        if (rightSibling) {
            offset = (!rightSibling[1]) ? 1 : Number(rightSibling[1]);
        } else if (leftSibling) {
            offset = (!leftSibling[1]) ? -1 : -1 * Number(leftSibling[1]);
        }

        return new Identifier(
            tag,
            id,
            key,
            keyRegex,
            filters,
            offset,
            getChildIndexFilter(filters),
            matching
        );

    }

    function stripFilters(identifier: string): string {
        if (identifier.indexOf('[') == -1) {
            return identifier;
        }
        return identifier.substring(0, identifier.indexOf('['));
    }

    function extractFilters(identifier: string): Filter[] {
        if (identifier.indexOf('[') == -1) {
            return [];
        }
        let splits: string[] = identifier.substring(identifier.indexOf('[') + 1, identifier.length - 1).split(/(\]AND\[|\]OR\[)/i);
        if (splits.length > 1 && splits.length % 2 != 1) {
            throw new BBSeekerError("Unexpected number of splits while parsing filters: " + splits, ErrorType.PARSER);
        }
        let filters: Filter[] = [];
        for (let i = 0; i < splits.length; i = i + 2) {
            if (i == 0) {
                filters.push(parseFilter(splits[i], null));
            } else {
                let filter = parseFilter(splits[i], splits[i - 1]);
                if (filter.isIndexFilter()) {
                    throw new BBSeekerError("Index filter cannot be joined with other filters on the same level.", ErrorType.PARSER);
                }
                filters.push(filter);
            }
        }
        return filters;
    }

    function parseFilter(filterStr: string, joinSplitter?: string | null): Filter {
        let f: Filter = new Filter();

        let isFilterAttribute = false;
        let isFilterData = false;
        if (filterStr.charAt(0) == "@" && filterStr.length > 2) {
            if (filterStr.indexOf("*=") > 0 && filterStr.indexOf("*=") < filterStr.length - 2) {
                isFilterAttribute = true;
                f.comparison = Comparison.STARTS_WITH;
            } else if (filterStr.indexOf("^=") > 0 && filterStr.indexOf("^=") < filterStr.length - 2) {
                isFilterAttribute = true;
                f.comparison = Comparison.ENDS_WITH;
            } else {
                let strictness = parseStrictness(filterStr);
                if (strictness == Strictness.STRICT) {
                    isFilterAttribute = true;
                } else if (strictness == Strictness.NON_STRICT) {
                    isFilterAttribute = true;
                    f.isStrictFilter = false;
                }
            }

        }
        if (filterStr.charAt(0) == "$" && filterStr.length > 2) {
            if (filterStr.indexOf("*=") > 0 && filterStr.indexOf("*=") < filterStr.length - 2) {
                isFilterData = true;
                f.comparison = Comparison.STARTS_WITH;
            } else if (filterStr.indexOf("^=") > 0 && filterStr.indexOf("^=") < filterStr.length - 2) {
                isFilterData = true;
                f.comparison = Comparison.ENDS_WITH;
            } else {
                let strictness = parseStrictness(filterStr);
                if (strictness == Strictness.STRICT) {
                    isFilterData = true;
                } else if (strictness == Strictness.NON_STRICT) {
                    isFilterData = true;
                    f.isStrictFilter = false;
                }
            }
        }

        var childIndexRegexResult;
        if (!isNaN(Number(filterStr))) {
            f.matchedValue = filterStr;
        } else if (filterStr.indexOf("last()") == 0) {
            f.matchedName = "last";
            var indexDelta: number = -1;
            var index: number = indexDelta;
            if (/-(\s+)?\d+/.test(filterStr)) {
                index = parseInt(filterStr.replace(/ /g, "").replace("last()", "")) + indexDelta;
            }
            f.matchedValue = index;
        } else if (filterStr.indexOf("text=") == 0) {
            f.filterType = FilterType.TEXT;
            f.matchedValue = filterStr.replace("text=", "");
        } else if (filterStr.indexOf("text~") == 0) {
            f.filterType = FilterType.TEXT;
            f.matchedValue = filterStr.replace("text~", "");
            f.isStrictFilter = false;
        } else if (filterStr.indexOf("text*=") == 0) {
            f.filterType = FilterType.TEXT;
            f.matchedValue = filterStr.replace("text*=", "");
            f.comparison = Comparison.STARTS_WITH;
        } else if (filterStr.indexOf("text^=") == 0) {
            f.filterType = FilterType.TEXT;
            f.matchedValue = filterStr.replace("text^=", "");
            f.comparison = Comparison.ENDS_WITH;
        } else if (isFilterAttribute) {
            f.filterType = FilterType.ATTRIBUTE;
            let splitAttribute = extractFilterTuple(filterStr, f.isStrictFilter, f.comparison);
            f.matchedName = splitAttribute[0].replace("@", "");
            f.matchedValue = splitAttribute[1];
        } else if (isFilterData) {
            f.filterType = FilterType.DATA;
            let splitData = extractFilterTuple(filterStr, f.isStrictFilter, f.comparison);
            f.matchedName = splitData[0].replace("$", "");
            f.matchedValue = splitData[1];
        } else if (childIndexRegexResult = /^:([0-9]\d*|last\(\)(\-\d+)?)$/g.exec(filterStr.replace(/\s/g, ''))) {
            f.filterType = FilterType.CHILD_INDEX;
            //child index value or "last()"
            if (!isNaN(Number(childIndexRegexResult[1]))) {
                f.matchedValue = parseInt(childIndexRegexResult[1]); //specifix child index indexed from 0
                f.matchedName = f.matchedValue;
            } else {
                f.comparison = Comparison.COMPLEX; // complex is used for "last()"
                f.matchedName = childIndexRegexResult[1]; //e.g. last()-1
                f.matchedValue = childIndexRegexResult[2] != undefined ? parseInt(childIndexRegexResult[2]) : 0; //e.g. -1 from last()-1
            }
        } else {
            throw new BBSeekerError("Unrecognized filter: '" + filterStr + "'", ErrorType.PARSER);
        }

        if (joinSplitter != null) {
            switch (joinSplitter.toLowerCase()) {
                case "]and[":
                    f.joinType = JoinType.AND;
                    break;
                //case "]or[":
                //    f.joinType = JoinType.OR;
                //    break;
                default:
                    throw new BBSeekerError("Unmatched filter join option '..." + joinSplitter + "'...", ErrorType.PARSER);
            }
        }
        return f;
    }

    function parseStrictness(filterStr: string): Strictness {
        let equalsIndex = filterStr.indexOf("=");
        let tildeIndex = filterStr.indexOf("~");
        if (equalsIndex > 0 && tildeIndex > 0) {
            if (equalsIndex < tildeIndex) {
                return Strictness.STRICT;
            }
            return Strictness.NON_STRICT;
        } else if (equalsIndex > 0 && tildeIndex < 0 && equalsIndex < filterStr.length - 1) {
            return Strictness.STRICT;
        } else if (tildeIndex > 0 && equalsIndex < 0 && tildeIndex < filterStr.length - 1) {
            return Strictness.NON_STRICT;
        }
        return Strictness.NOT_VALID;
    }

    function extractFilterTuple(filter: string, strict: boolean, comparison: Comparison): [string, string] {
        switch (comparison) {
            case Comparison.SIMPLE:
                {
                    let index = (strict) ? filter.indexOf("=") : filter.indexOf("~");
                    return [filter.slice(0, index), filter.slice(index + 1, filter.length)];
                }
            case Comparison.STARTS_WITH:
                {
                    var operator = "*=";
                    let index = filter.indexOf(operator);
                    return [filter.slice(0, index), filter.slice(index + operator.length, filter.length)];
                }
            case Comparison.ENDS_WITH:
                {
                    var operator = "^=";
                    let index = filter.indexOf(operator);
                    return [filter.slice(0, index), filter.slice(index + operator.length, filter.length)];
                }
            default:
                throw new BBSeekerError("Unmatched comparison operator in filter '" + filter + "'.", ErrorType.PARSER);
        }
    }

    function getChildIndexFilter(filters: Filter[]): Filter | undefined {
        let childIndexFilter: Filter | undefined = undefined;
        if (filters) {
            for (let filter of filters) {
                if (filter.isChildIndexFilter()) {
                    if (childIndexFilter != undefined) {
                        throw new BBSeekerError("Only one child index filter is allowed per search level but multiple were detected "
                            + "'" + childIndexFilter.matchedName + ", " + filter.matchedValue + "'.", ErrorType.PARSER);
                    }
                    childIndexFilter = filter;
                }
            }
        }
        return childIndexFilter;
    }

    class Identifier {
        constructor(
            public tag?: string | undefined,
            public id?: string | undefined,
            public key?: string | undefined,
            public keyRegex?: RegExp | undefined,
            public filters?: Filter[] | undefined,
            public siblingOffset: number = 0,
            public childIndexFilter: Filter | undefined = undefined,
            public matchingType: MatchingType = MatchingType.EXACT
        ) { }

        public isMatchingExact(): boolean {
            return MatchingType.EXACT === this.matchingType;
        }

        public isMatchingAnyChild(): boolean {
            return MatchingType.ANY_CHILD === this.matchingType;
        }

        public isMatchingParent(): boolean {
            return MatchingType.PARENT === this.matchingType;
        }

        public isDefined(): boolean {
            return this.tag != undefined || this.id != undefined || this.key != undefined;
        }
    }

    class Filter {
        public joinType: JoinType = JoinType.AND;
        public constructor(
            public filterType: FilterType = FilterType.INDEX,
            public isStrictFilter: boolean = true,
            public comparison: Comparison = Comparison.SIMPLE,
            public matchedName?: string,
            public matchedValue?: any
        ) { }

        public isIndexFilter(): boolean {
            return FilterType.INDEX === this.filterType;
        }

        public isChildIndexFilter(): boolean {
            return FilterType.CHILD_INDEX === this.filterType;
        }

        public isTextFilter(): boolean {
            return FilterType.TEXT === this.filterType;
        }

        public isAttributeFilter(): boolean {
            return FilterType.ATTRIBUTE === this.filterType;
        }

        public isDataFilter(): boolean {
            return FilterType.DATA === this.filterType;
        }
    }

    class BBSeekerError extends Error {
        public name = "BBSeekerError";
        constructor(public message: string, public type: ErrorType) {
            super(message);
            (<any>this)["__proto__"] = BBSeekerError.prototype; // vyzkouset jestli to bude vypisovat spravny errory kdyz to vyhodim
            this.formatMessage();
        }

        public formatMessage() {
            this.message = this.name + "(" + ErrorType[this.type] + "): " + this.message;
        }
    }

    enum MatchingType {
        EXACT,
        ANY_CHILD,
        PARENT
    }

    enum FilterType {
        INDEX,
        CHILD_INDEX,
        TEXT,
        ATTRIBUTE,
        DATA
    }

    enum ErrorType {
        BOBRIL,
        PARSER,
        SEARCH,
        TIMEOUT
    }

    enum JoinType {
        AND,
        OR
    }

    enum Comparison {
        SIMPLE,
        STARTS_WITH,
        ENDS_WITH,
        COMPLEX
    }

    enum Strictness {
        NOT_VALID,
        STRICT,
        NON_STRICT
    }

    function clone(o: any): any {
        var cloneObj = new (<any>o.constructor)();
        for (var attr in o) {
            if (typeof o[attr] === "object") {
                cloneObj[attr] = clone(o[attr]);
            } else {
                cloneObj[attr] = o[attr];
            }
        }
        return cloneObj;
    }

    function throwErrVirtualComponentsPresent(): void {
        throw new BBSeekerError("Virtual components present in the result set. Please revise and fix your search expression to target a non-virtual component.", ErrorType.SEARCH);
    }

    /**
     * Method which returns the closes child physical DOM element if there is some
     * @param node - specifies which node should start searching from
     * @param returnEvenNull - specifies whether method should return null if none elm is found or throw an error
     */
    export function findNearesChildElm(node: bb.IBobrilCacheNode, returnEvenNull?: boolean): HTMLElement | null {
        if (!node) {
            if (returnEvenNull) return null;
            throwErrVirtualComponentsPresent();
        }
        let elm: HTMLElement = node.element as HTMLElement;
        if (elm) return elm;
        if (!node.children) {
            if (returnEvenNull) return null;
            throwErrVirtualComponentsPresent();
        }

        let childrenStack: bb.IBobrilCacheNode[] = node.children?.slice() as bb.IBobrilCacheNode[];

        while (childrenStack.length > 0) {
            const node: bb.IBobrilCacheNode = childrenStack[0];
            if (node.element) return node.element as HTMLElement;
            (<bb.IBobrilCacheNode[]>node.children).forEach(child => {
                childrenStack.push(child);
            });
            childrenStack.shift();
        }
        /*
            Becouse of all nodes have been iterated trough and no DOM element was found
            the error with virtual component present in the results is thrown.
        */
        if (returnEvenNull) return null;
        throwErrVirtualComponentsPresent();

        return null; // it never comes here but necessary to avoid compilation error becouse of "lack of return statement"
    }
    (<any>window)["BBSeeker"] = BBSeeker;
}
