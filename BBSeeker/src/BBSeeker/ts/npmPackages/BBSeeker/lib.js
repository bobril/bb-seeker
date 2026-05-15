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
export var BBSeeker;
(function (BBSeeker) {
    let replacementChar = "-";
    BBSeeker.frameCounter = 0;
    BBSeeker.lastClickX = 0;
    BBSeeker.lastClickY = 0;
    document.addEventListener("click", function (event) {
        BBSeeker.lastClickX = event.clientX;
        BBSeeker.lastClickY = event.clientY;
    });
    var originalAfterFrame = b.setAfterFrame((c) => {
        originalAfterFrame(c);
        BBSeeker.frameCounter++;
    });
    /**
     * Performs recursive search of a page virtual DOM starting from bobril root objects. All matching objects are returned as instances of HTMLElement.
     * @param expression search expression, see examples above.
     * @param root (optional) specify element which will serve as search root
     */
    function findElements(expression, root, ifVNodeFindNearestChildElm) {
        const work = findElementsBody(expression, root);
        let result = [];
        /*
            For testing purposes of bobwai components it is necessary to return closest DOM element if there is any.
            The error is thrown only if no element is found in children subtree at all
            (should not happen if the inserted searching expression is not total nonsence).
        */
        if (ifVNodeFindNearestChildElm) {
            work.forEach((node) => {
                const elm = findNearesChildElm(node);
                elm && result.push(elm);
            });
            return result;
        }
        work.forEach((node) => {
            if (node.element)
                result.push(node.element);
            else
                throwErrVirtualComponentsPresent();
        });
        return result;
    }
    BBSeeker.findElements = findElements;
    /**
     * Waits up to a given time for an element to be available and returns it or returns a timeout error. Search is scheduled every 100ms if no browser frame updates were not detected in this time frame.
     * @param expression search expression
     * @param timeout time to wait
     * @param callback webdriver callback returned by an async function it is a tuple: [element[], errorString]
     * @param root (optional) specify element which will serve as search root
     */
    function findElementsWithTimeout(expression, timeout, callback, root) {
        BBSeeker.frameCounter = 0;
        let start = new Date().getTime();
        let end = start + Math.abs(timeout);
        findElementsWithTimeoutBody(BBSeeker.frameCounter, expression, timeout, start, end, callback, root);
    }
    BBSeeker.findElementsWithTimeout = findElementsWithTimeout;
    /**
     * Waits up to a given time for an element to be available and returns promise which returns result or timeout error. Search is scheduled every 100ms if no browser frame updates were not detected in this time frame.
     * Used by Bobwai tests
     * @param expression search expression
     * @param timeout time to wait
     * @param callback which returns search results
     * @param root (optional) specify element which will serve as search root
     */
    async function findElementsWithTimeoutAsync(expression, timeout, callback, root, ifVNodeFindNearestChildElm) {
        BBSeeker.frameCounter = 0;
        let start = new Date().getTime();
        let end = start + Math.abs(timeout);
        await findElementsWithTimeoutBody(BBSeeker.frameCounter, expression, timeout, start, end, callback, root, ifVNodeFindNearestChildElm);
    }
    BBSeeker.findElementsWithTimeoutAsync = findElementsWithTimeoutAsync;
    /**
     * Waits up to a given time for element to be not present.
     * @param expression search expression
     * @param timeout time to wait
     * @param callback true if element is not available, false if timeout occured and element is still present
     * @param root (optional) specify element which will serve as search root
     */
    function waitForElementNotPresent(expression, timeout, callback, root) {
        BBSeeker.frameCounter = 0;
        let start = new Date().getTime();
        let end = start + Math.abs(timeout);
        waitForElementNotPresentInternal(expression, timeout, start, end, callback, root);
    }
    BBSeeker.waitForElementNotPresent = waitForElementNotPresent;
    /**
     * Waits up to a given time for element to be not present. Returns promise which returns results or timeout error.
     * Used by Bobwai tests.
     * @param expression search expression
     * @param timeout time to wait
     * @param callback true if element is not available, false if timeout occured and element is still present
     * @param root (optional) specify element which will serve as search root
     */
    async function waitForElementNotPresentAsync(expression, timeout, callback, root) {
        BBSeeker.frameCounter = 0;
        let start = new Date().getTime();
        let end = start + Math.abs(timeout);
        await waitForElementNotPresentInternal(expression, timeout, start, end, callback, root);
    }
    BBSeeker.waitForElementNotPresentAsync = waitForElementNotPresentAsync;
    /**
     * Returns selected element attribute node value.
     * @param expression BBSeeker search expression
     * @param attributeName attribute node name
     * @param root (optional) specify element which will serve as search root
     */
    function getAttribute(expression, attributeName, root) {
        let result = [];
        let work = findElementsBody(expression, root);
        for (let i = 0; i < work.length; i++) {
            let elm = work[i].element;
            if (elm != undefined) {
                let attrValue = elm["attributes"][attributeName];
                if (attrValue == undefined) {
                    attrValue = elm[attributeName];
                }
                // JSON.stringify will return undefined if attrValue is undefined as well
                if (typeof attrValue !== "string") {
                    attrValue = JSON.stringify(attrValue);
                }
                result.push(attrValue);
            }
            else
                throwErrVirtualComponentsPresent();
        }
        return result;
    }
    BBSeeker.getAttribute = getAttribute;
    /**
    * Returns selected bobril data node value.
    * @param expression BBSeeker search expression
    * @param dataName data node name
    * @param root (optional) specify element which will serve as search root
    * @param preserveType (optional) allows to preserve value type
    */
    function getData(expression, dataName, root, preserveType) {
        let result = [];
        let work = findElementsBody(expression, root);
        for (let i = 0; i < work.length; i++) {
            let dataNode = work[i].data;
            let dataValue;
            if (dataNode != undefined) {
                dataValue = dataNode[dataName];
                if (!preserveType && typeof dataValue !== "string") {
                    dataValue = JSON.stringify(dataValue);
                }
            }
            result.push(dataValue);
        }
        return result;
    }
    BBSeeker.getData = getData;
    /**
     * Returns selected bobril property value.
     * @param expression BBSeeker search expression
     * @param propertyPath property path relative to the virtual component/object
     * @param root (optional) specify element which will serve as search root
     */
    function getProperty(expression, propertyPath, root) {
        let result = [];
        if (!propertyPath)
            throw new BBSeekerError("You have to provide property name or path relative to element as root. Path separator is \".\", e.g. \"component.id\"", ErrorType.PARSER);
        let pathParts = propertyPath.replace(/\]$/, "").split(/\.|\[|\]\./);
        let work = findElementsBody(expression, root);
        for (let i = 0; i < work.length; i++) {
            let bobrilObject = work[i];
            let propertyValue;
            pathParts.forEach(function (p) {
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
    BBSeeker.getProperty = getProperty;
    /**
    * Returns input elements linked to the matched file selector components.
    * @param expression BBSeeker search expression
    * @param root (optional) specify element which will serve as search root
    */
    function getFileInput(expression, root) {
        return getFileInputInternal(expression, "fileInput", root);
    }
    BBSeeker.getFileInput = getFileInput;
    function getFileInputInternal(expression, propertyName, root) {
        let result = [];
        let work = getCtxInternal(expression, propertyName, root);
        for (let i = 0; i < work.length; i++) {
            let element = work[i];
            if (element != undefined) {
                result.push(element);
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
    function getCtx(expression, contextPropertyName, root) {
        let result = [];
        let work = getCtxInternal(expression, contextPropertyName, root);
        for (let i = 0; i < work.length; i++) {
            result.push(stringifyNonStringValue(work[i]));
        }
        return result;
    }
    BBSeeker.getCtx = getCtx;
    /**
     * Returns selected bobril context value.
     * @param expression BBSeeker search expression
     * @param contextPropertyName context property name
     * @param root (optional) specify element which will serve as search root
     */
    function getCtxInternal(expression, contextPropertyName, root) {
        let result = [];
        let work = findElementsBody(expression, root);
        for (let i = 0; i < work.length; i++) {
            let context = work[i].ctx;
            let contextValue;
            if (context != undefined) {
                contextValue = context[contextPropertyName];
            }
            result.push(contextValue);
        }
        return result;
    }
    function stringifyNonStringValue(value) {
        let strValue;
        if (typeof value !== "string") {
            strValue = JSON.stringify(value);
        }
        else {
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
    function getAttributeWithTimeout(expression, attributeName, timeout, callback, root) {
        BBSeeker.frameCounter = 0;
        let start = new Date().getTime();
        let end = start + Math.abs(timeout);
        getAttributeWithTimeoutBody(BBSeeker.frameCounter, expression, attributeName, timeout, start, end, callback, root);
    }
    BBSeeker.getAttributeWithTimeout = getAttributeWithTimeout;
    /**
     * Finds all matching elements and extracts selected attribute value into a resultset which is returned as promise result.
     * Used by Bobwai tests.
     * @param expression BBSeeker search expression
     * @param attributeName attribute node name
     * @param timeout time to wait
     * @param callback returns search results.
     * @param root (optional) specify element which will serve as search root
     */
    async function getAttributeWithTimeoutAsync(expression, attributeName, timeout, callback, root) {
        BBSeeker.frameCounter = 0;
        let start = new Date().getTime();
        let end = start + Math.abs(timeout);
        await getAttributeWithTimeoutBody(BBSeeker.frameCounter, expression, attributeName, timeout, start, end, callback, root);
    }
    BBSeeker.getAttributeWithTimeoutAsync = getAttributeWithTimeoutAsync;
    /**
     * Finds all matching elements and extracts selected data value into a resultset.
     * @param expression BBSeeker search expression
     * @param dataName data node name
     * @param timeout time to wait
     * @param callback webdriver callback returned by an async function it is a tuple: [string[], errorString]
     * @param root (optional) specify element which will serve as search root
     */
    function getDataWithTimeout(expression, dataName, timeout, callback, root) {
        BBSeeker.frameCounter = 0;
        let start = new Date().getTime();
        let end = start + Math.abs(timeout);
        getDataWithTimeoutBody(BBSeeker.frameCounter, expression, dataName, timeout, start, end, callback, root);
    }
    BBSeeker.getDataWithTimeout = getDataWithTimeout;
    /**
     * Returns promise which returns all matching elements and extracts selected data value into a resultset.
     * Used by Bobwai tests.
     * @param expression BBSeeker search expression
     * @param dataName data node name
     * @param timeout time to wait
     * @param callback webdriver callback returned by an async function it is a tuple: [string[], errorString]
     * @param root (optional) specify element which will serve as search root
     */
    async function getDataWithTimeoutAsync(expression, dataName, timeout, callback, root) {
        BBSeeker.frameCounter = 0;
        let start = new Date().getTime();
        let end = start + Math.abs(timeout);
        await getDataWithTimeoutBody(BBSeeker.frameCounter, expression, dataName, timeout, start, end, callback, root);
    }
    BBSeeker.getDataWithTimeoutAsync = getDataWithTimeoutAsync;
    /**
 * Finds all matching elements and extracts selected property value into a resultset.
 * @param expression BBSeeker search expression
 * @param propertyPath property path separated by "." character
 * @param timeout time to wait
 * @param callback webdriver callback returned by an async function it is a tuple: [string[], errorString]
 * @param root (optional) specify element which will serve as search root
 */
    function getPropertyWithTimeout(expression, propertyPath, timeout, callback, root) {
        BBSeeker.frameCounter = 0;
        let start = new Date().getTime();
        let end = start + Math.abs(timeout);
        getPropertyWithTimeoutBody(BBSeeker.frameCounter, expression, propertyPath, timeout, start, end, callback, root);
    }
    BBSeeker.getPropertyWithTimeout = getPropertyWithTimeout;
    /**
     * Returns promise which returns all matching elements and extracts selected property value into a resultset.
     * Used by Bobwai tests.
     * @param expression BBSeeker search expression
     * @param propertyPath property path separated by "." character
     * @param timeout time to wait
     * @param callback webdriver callback returned by an async function it is a tuple: [string[], errorString]
     * @param root (optional) specify element which will serve as search root
     */
    async function getPropertyWithTimeoutAsync(expression, propertyPath, timeout, callback, root) {
        BBSeeker.frameCounter = 0;
        let start = new Date().getTime();
        let end = start + Math.abs(timeout);
        await getPropertyWithTimeoutBody(BBSeeker.frameCounter, expression, propertyPath, timeout, start, end, callback, root);
    }
    BBSeeker.getPropertyWithTimeoutAsync = getPropertyWithTimeoutAsync;
    /**
     * Finds matching file selection component and extracts reference to HTML element from ctx into a resultset which is returned as promise result.
     * @param expression BBSeeker search expression
     * @param timeout time to wait
     * @param callback returns search results.
     * @param root (optional) specify element which will serve as search root
     */
    async function getFileInputWithTimeout(expression, timeout, callback, root) {
        BBSeeker.frameCounter = 0;
        let start = new Date().getTime();
        let end = start + Math.abs(timeout);
        await getFileInputWithTimeoutBody(BBSeeker.frameCounter, expression, timeout, start, end, callback, root);
    }
    BBSeeker.getFileInputWithTimeout = getFileInputWithTimeout;
    /**
     * Returns promise which contains reference to HTML input element referenced by file selection component.
     * Used by Bobwai tests.
     * @param expression BBSeeker search expression
     * @param timeout time to wait
     * @param callback webdriver callback returned by an async function it is a tuple: [HTMLElement[], errorString]
     * @param root (optional) specify element which will serve as search root
     */
    async function getFileInputWithTimeoutAsync(expression, timeout, callback, root) {
        BBSeeker.frameCounter = 0;
        let start = new Date().getTime();
        let end = start + Math.abs(timeout);
        await getFileInputWithTimeoutBody(BBSeeker.frameCounter, expression, timeout, start, end, callback, root);
    }
    BBSeeker.getFileInputWithTimeoutAsync = getFileInputWithTimeoutAsync;
    /**
     * Finds all matching elements and extracts selected context property value into a resultset.
     * @param expression BBSeeker search expression
     * @param ctxPropertyName context property name
     * @param timeout time to wait
     * @param callback webdriver callback returned by an async function it is a tuple: [string[], errorString]
     * @param root (optional) specify element which will serve as search root
     */
    function getCtxWithTimeout(expression, ctxPropertyName, timeout, callback, root) {
        BBSeeker.frameCounter = 0;
        let start = new Date().getTime();
        let end = start + Math.abs(timeout);
        getCtxWithTimeoutBody(BBSeeker.frameCounter, expression, ctxPropertyName, timeout, start, end, callback, root);
    }
    BBSeeker.getCtxWithTimeout = getCtxWithTimeout;
    /**
     * Returns promise which returns all matching elements and extracts selected context value into a resultset.
     * Used by Bobwai tests.
     * @param expression BBSeeker search expression
     * @param ctxPropertyName context property name
     * @param timeout time to wait
     * @param callback webdriver callback returned by an async function it is a tuple: [string[], errorString]
     * @param root (optional) specify element which will serve as search root
     */
    async function getCtxWithTimeoutAsync(expression, ctxPropertyName, timeout, callback, root) {
        BBSeeker.frameCounter = 0;
        let start = new Date().getTime();
        let end = start + Math.abs(timeout);
        await getCtxWithTimeoutBody(BBSeeker.frameCounter, expression, ctxPropertyName, timeout, start, end, callback, root);
    }
    BBSeeker.getCtxWithTimeoutAsync = getCtxWithTimeoutAsync;
    /**
     * Returns last click coordinates.
     */
    function getLastClickPosition() {
        return [BBSeeker.lastClickX, BBSeeker.lastClickY];
    }
    BBSeeker.getLastClickPosition = getLastClickPosition;
    /**
     * Returns raw results from which searched types of objects can be extracted.
     * @param expression bbseeker search expression
     * @param root element which will serve as search root
     */
    function findElementsBody(expression, root) {
        let parsedExpression = parseExpression(expression);
        let work = [];
        if (!root) {
            if (b == undefined) {
                throw new BBSeekerError("Bobril not found in the page. Search terminated.", ErrorType.BOBRIL);
            }
            let roots = b.getRoots();
            let keys = Object.keys(roots);
            for (let ri = 0; ri < keys.length; ri++) {
                let rtc = roots[keys[ri]].c;
                if (rtc != undefined) {
                    work = work.concat(rtc);
                }
                else {
                    //fallback of the last hope - if this fails, something is very wrong with Bobril!!!
                    rtc = roots[keys[ri]].n;
                    if (rtc && rtc.children) {
                        work = work.concat(rtc);
                    }
                }
            }
        }
        else {
            const rootNode = b.deref(root);
            rootNode && work.push(rootNode);
        }
        for (let i = 0; i < parsedExpression.length; i++) {
            let temp = [];
            let locator = parsedExpression[i];
            for (let j = 0; j < work.length; j++) {
                if (locator.siblingOffset == 0) {
                    if (locator.childIndexFilter != undefined) {
                        let matchingChildren = [];
                        matchingChildren = findElementsInternal(matchingChildren, work[j], locator, i === 0);
                        //child index: returned collection should be filled only to the level of the index, we return only one match per parent
                        //see matchObjectByFilter for more comments
                        if (locator.childIndexFilter.comparison == Comparison.SIMPLE) { //child index filter -> index only
                            if (matchingChildren.length - 1 >= locator.childIndexFilter.matchedValue) {
                                temp.push(matchingChildren[locator.childIndexFilter.matchedValue]);
                            }
                        }
                        else if (matchingChildren.length > 0) { // child index filter -> last(), possibly with last index offset (e.g. last()-1)
                            var lastIndexWithOffset = matchingChildren.length - 1 + locator.childIndexFilter.matchedValue;
                            if (lastIndexWithOffset >= 0) {
                                temp.push(matchingChildren[lastIndexWithOffset]);
                            }
                        }
                    }
                    else {
                        temp = findElementsInternal(temp, work[j], locator, i === 0);
                    }
                }
                else {
                    let parent = work[j].parent;
                    if (parent && parent.children) {
                        for (let k = 0; k < parent.children.length; k++) {
                            let child = parent.children[k];
                            let childWithOffset = parent.children[k + locator.siblingOffset];
                            if (child === work[j] && childWithOffset != undefined) {
                                temp.push(childWithOffset);
                                break;
                            }
                        }
                    }
                }
            }
            if (Array.isArray(locator.filters) && locator.filters.length == 1 && locator.filters[0].isIndexFilter()) {
                var index = parseInt(locator.filters[0].matchedValue);
                if (locator.filters[0].matchedName == undefined) {
                    temp = temp.slice(index, index + 1);
                }
                else {
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
    function findElementsInternal(resultArray, bobrilObject, locator, anylevel) {
        if (anylevel) {
            matchObject(bobrilObject, resultArray, locator);
        }
        if (!locator.isMatchingParent()) { //if children are being looked up
            findElementsRecursive(bobrilObject, resultArray, locator, anylevel);
        }
        else if (bobrilObject.parent) {
            if (!locator.isDefined()) { //if direct parent is being looked up
                resultArray.push(bobrilObject.parent);
            }
            else { //if one of the parents determined by locator is being looked up
                let tmpParentArray = [];
                while (tmpParentArray.length == 0 && bobrilObject.parent) {
                    matchObject(bobrilObject.parent, tmpParentArray, locator);
                    bobrilObject = bobrilObject.parent;
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
    function findElementsRecursive(bobrilObject, resultArray, locator, anylevel) {
        if (bobrilObject != undefined && Array.isArray(bobrilObject.children)) {
            for (let i = 0; i < bobrilObject.children.length; i++) {
                var currentLocator = locator;
                let child = bobrilObject.children[i];
                if (anylevel || child.tag == undefined) {
                    findElementsRecursive(child, resultArray, locator, anylevel);
                }
                else if (locator.isMatchingAnyChild()) {
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
    function findElementsWithTimeoutBody(lastCheck, expression, timeout, start, end, callback, root, ifVNodeFindNearestChildElm) {
        try {
            let time = new Date().getTime();
            if (lastCheck == BBSeeker.frameCounter) {
                let results = handleBobrilNotReadyForElements(findElements, expression, end, time, root, ifVNodeFindNearestChildElm);
                if (results.length > 0) {
                    callback([results, null]);
                }
                else {
                    if (time < end) {
                        findElementsWithTimeoutReschedule(expression, timeout, start, end, callback, root, ifVNodeFindNearestChildElm);
                    }
                    else {
                        callback([null, "Async search timed out after '" + ((new Date().getTime() - start) / 1000) + "s' for expression: '" + expression + "'"]);
                    }
                }
            }
            else {
                findElementsWithTimeoutReschedule(expression, timeout, start, end, callback, root, ifVNodeFindNearestChildElm);
            }
        }
        catch (err) {
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
    function findElementsWithTimeoutReschedule(expression, timeout, start, end, callback, root, ifVNodeFindNearestChildElm) {
        var lastCheck = BBSeeker.frameCounter;
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
    function waitForElementNotPresentInternal(expression, timeout, start, end, callback, root) {
        var lastCheck = BBSeeker.frameCounter;
        setTimeout(() => {
            try {
                let time = new Date().getTime();
                if (lastCheck == BBSeeker.frameCounter) {
                    var results = findElements(expression, root);
                    if (results.length == 0) {
                        callback([true, null]);
                    }
                    else {
                        if (time < end) {
                            waitForElementNotPresentInternal(expression, timeout, start, end, callback, root);
                        }
                        else {
                            callback([false, null]);
                        }
                    }
                }
                else {
                    waitForElementNotPresentInternal(expression, timeout, start, end, callback, root);
                }
            }
            catch (err) {
                callback([false, formatError(err)]);
            }
        }, 100);
    }
    function getAttributeWithTimeoutBody(lastCheck, expression, attributeName, timeout, start, end, callback, root) {
        try {
            let time = new Date().getTime();
            if (lastCheck == BBSeeker.frameCounter) {
                let results = handleBobrilNotReadyForData(getAttribute, expression, attributeName, end, time, root);
                if (results.length > 0) {
                    callback([results, null]);
                }
                else {
                    if (time < end) {
                        getAttributeWithTimeoutReschedule(expression, attributeName, timeout, start, end, callback, root);
                    }
                    else {
                        callback([null, "Async search timed out after '" + ((new Date().getTime() - start) / 1000) + "s' for expression: '" + expression + "'"]);
                    }
                }
            }
            else {
                getAttributeWithTimeoutReschedule(expression, attributeName, timeout, start, end, callback, root);
            }
        }
        catch (err) {
            callback([null, formatError(err)]);
        }
    }
    function getAttributeWithTimeoutReschedule(expression, attributeName, timeout, start, end, callback, root) {
        var lastCheck = BBSeeker.frameCounter;
        setTimeout(() => {
            getAttributeWithTimeoutBody(lastCheck, expression, attributeName, timeout, start, end, callback, root);
        }, 100);
    }
    function getDataWithTimeoutBody(lastCheck, expression, dataName, timeout, start, end, callback, root) {
        try {
            let time = new Date().getTime();
            if (lastCheck == BBSeeker.frameCounter) {
                let results = handleBobrilNotReadyForData(getData, expression, dataName, end, time, root);
                if (results.length > 0) {
                    callback([results, null]);
                }
                else {
                    if (time < end) {
                        getDataWithTimeoutReschedule(expression, dataName, timeout, start, end, callback, root);
                    }
                    else {
                        callback([null, "Async search timed out after '" + ((new Date().getTime() - start) / 1000) + "s' for expression: '" + expression + "'"]);
                    }
                }
            }
            else {
                getDataWithTimeoutReschedule(expression, dataName, timeout, start, end, callback, root);
            }
        }
        catch (err) {
            callback([null, formatError(err)]);
        }
    }
    function getDataWithTimeoutReschedule(expression, dataName, timeout, start, end, callback, root) {
        var lastCheck = BBSeeker.frameCounter;
        setTimeout(() => {
            getDataWithTimeoutBody(lastCheck, expression, dataName, timeout, start, end, callback, root);
        }, 100);
    }
    function getPropertyWithTimeoutBody(lastCheck, expression, propertyPath, timeout, start, end, callback, root) {
        try {
            let time = new Date().getTime();
            if (lastCheck == BBSeeker.frameCounter) {
                let results = handleBobrilNotReadyForData(getProperty, expression, propertyPath, end, time, root);
                if (results.length > 0) {
                    callback([results, null]);
                }
                else {
                    if (time < end) {
                        getPropertyWithTimeoutReschedule(expression, propertyPath, timeout, start, end, callback, root);
                    }
                    else {
                        callback([null, "Async search timed out after '" + ((new Date().getTime() - start) / 1000) + "s' for expression: '" + expression + "'"]);
                    }
                }
            }
            else {
                getPropertyWithTimeoutReschedule(expression, propertyPath, timeout, start, end, callback, root);
            }
        }
        catch (err) {
            callback([null, formatError(err)]);
        }
    }
    function getPropertyWithTimeoutReschedule(expression, propertyPath, timeout, start, end, callback, root) {
        var lastCheck = BBSeeker.frameCounter;
        setTimeout(() => {
            getPropertyWithTimeoutBody(lastCheck, expression, propertyPath, timeout, start, end, callback, root);
        }, 100);
    }
    function getCtxWithTimeoutBody(lastCheck, expression, ctxPropertyName, timeout, start, end, callback, root) {
        try {
            let time = new Date().getTime();
            if (lastCheck == BBSeeker.frameCounter) {
                let results = handleBobrilNotReadyForData(getCtx, expression, ctxPropertyName, end, time, root);
                if (results.length > 0) {
                    callback([results, null]);
                }
                else {
                    if (time < end) {
                        getCtxWithTimeoutReschedule(expression, ctxPropertyName, timeout, start, end, callback, root);
                    }
                    else {
                        callback([null, "Async search timed out after '" + ((new Date().getTime() - start) / 1000) + "s' for expression: '" + expression + "'"]);
                    }
                }
            }
            else {
                getCtxWithTimeoutReschedule(expression, ctxPropertyName, timeout, start, end, callback, root);
            }
        }
        catch (err) {
            callback([null, formatError(err)]);
        }
    }
    function getCtxWithTimeoutReschedule(expression, attributeName, timeout, start, end, callback, root) {
        var lastCheck = BBSeeker.frameCounter;
        setTimeout(() => {
            getCtxWithTimeoutBody(lastCheck, expression, attributeName, timeout, start, end, callback, root);
        }, 100);
    }
    function getFileInputWithTimeoutBody(lastCheck, expression, timeout, start, end, callback, root) {
        try {
            let time = new Date().getTime();
            if (lastCheck == BBSeeker.frameCounter) {
                let results = handleBobrilNotReadyForData(getFileInputInternal, expression, "fileInput", end, time, root);
                if (results.length > 0) {
                    callback([results, null]);
                }
                else {
                    if (time < end) {
                        getFileInputWithTimeoutReschedule(expression, timeout, start, end, callback, root);
                    }
                    else {
                        callback([null, "Async search timed out after '" + ((new Date().getTime() - start) / 1000) + "s' for expression: '" + expression + "'"]);
                    }
                }
            }
            else {
                getFileInputWithTimeoutReschedule(expression, timeout, start, end, callback, root);
            }
        }
        catch (err) {
            callback([null, formatError(err)]);
        }
    }
    function getFileInputWithTimeoutReschedule(expression, timeout, start, end, callback, root) {
        var lastCheck = BBSeeker.frameCounter;
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
    function matchObject(bobrilObject, resultArray, locator) {
        if (locator.tag == undefined || bobrilObject.tag === locator.tag || locator.tag === "*") {
            if (locator.id != undefined && bobrilObject.component != undefined) {
                let matchedId = bobrilObject.component.id;
                if (matchedId != undefined && matchedId.indexOf("/") != -1) {
                    matchedId = matchedId.replace(/\//g, replacementChar);
                }
                if (matchedId === locator.id) {
                    matchObjectByFilters(bobrilObject, resultArray, locator);
                }
            }
            else if (locator.key != undefined) {
                if (locator.keyRegex == undefined) {
                    if (bobrilObject.key === locator.key) {
                        matchObjectByFilters(bobrilObject, resultArray, locator);
                    }
                }
                else if (bobrilObject.key != undefined) {
                    var matches = bobrilObject.key.match(locator.keyRegex);
                    if (matches != undefined && matches.length > 0 && matches[0] === bobrilObject.key) {
                        matchObjectByFilters(bobrilObject, resultArray, locator);
                    }
                }
            }
            else if (locator.id == undefined && locator.key == undefined) {
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
    function matchObjectByFilters(bobrilObject, resultArray, locator) {
        if (locator.filters && (locator.filters.length == 0 || locator.filters[0].isIndexFilter())) {
            resultArray.push(bobrilObject);
        }
        else if (locator.filters) {
            let match = bobrilObject;
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
    function matchObjectByFilter(bobrilObject, locator, filter) {
        if (filter.isTextFilter()) {
            if (filter.isStrictFilter) {
                return matchStrictTextFilter(bobrilObject, locator, filter);
            }
            else {
                return matchNonStrictTextFilter(bobrilObject, locator, filter);
            }
        }
        else if (filter.isAttributeFilter() && bobrilObject.element != undefined) {
            if (filter.isStrictFilter) {
                return matchStrictAttributeFilter(bobrilObject, filter);
            }
            else {
                return matchNonStrictAttributeFilter(bobrilObject, filter);
            }
        }
        else if (filter.isDataFilter() && bobrilObject.data != undefined && filter && filter.matchedName && bobrilObject.data[filter.matchedName] != undefined) {
            if (filter.isStrictFilter) {
                return matchStrictValue(bobrilObject, bobrilObject.data[filter.matchedName], filter);
            }
            else {
                return matchNonStrictValue(bobrilObject, bobrilObject.data[filter.matchedName], filter);
            }
        }
        else if (filter.isChildIndexFilter()) { // results will be trimmed in the calling function or bz following filters on the same level
            return bobrilObject;
        }
        return;
    }
    function matchStrictValue(bobrilObject, testedValue, filter) {
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
        }
        else if (Comparison.STARTS_WITH == filter.comparison) {
            if (startsWith(testedValue, filter.matchedValue)) {
                return bobrilObject;
            }
        }
        else if (Comparison.ENDS_WITH == filter.comparison) {
            if (endsWith(testedValue, filter.matchedValue)) {
                return bobrilObject;
            }
        }
        return;
    }
    function matchNonStrictValue(bobrilObject, testedValue, filter) {
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
    function matchStrictTextFilter(bobrilObject, locator, filter) {
        if (Array.isArray(bobrilObject.children)) {
            for (let j = 0; j < bobrilObject.children.length; j++) {
                let textChild = bobrilObject.children[j];
                if (typeof textChild === "string") {
                    var match = matchStrictValue(textChild, textChild["children"], filter);
                    if (match != undefined) {
                        return sanitizeTextNode(match);
                    }
                }
                else {
                    if (textChild.tag == null) {
                        return matchObjectByFilter(textChild, locator, filter);
                    }
                }
            }
        }
        else {
            var match = matchStrictValue(bobrilObject, bobrilObject.children, filter);
            if (match != undefined) {
                return sanitizeTextNode(match);
            }
        }
        return undefined;
    }
    function matchNonStrictTextFilter(bobrilObject, locator, filter) {
        if (Array.isArray(bobrilObject.children)) {
            for (let j = 0; j < bobrilObject.children.length; j++) {
                let textChild = bobrilObject.children[j];
                if (typeof textChild === "string") {
                    let childText = textChild["children"];
                    if (childText != undefined && childText.indexOf(filter.matchedValue) != -1) {
                        return sanitizeTextNode(textChild);
                    }
                }
                else {
                    if (textChild && textChild.tag == null) {
                        return matchObjectByFilter(textChild, locator, filter);
                    }
                }
            }
        }
        else {
            var objectText = bobrilObject.children;
            if (objectText != undefined && objectText.indexOf(filter.matchedValue) != -1) {
                return sanitizeTextNode(bobrilObject);
            }
        }
        return;
    }
    function matchStrictAttributeFilter(bobrilObject, filter) {
        if (filter && filter.matchedName && bobrilObject.element["attributes"][filter.matchedName] != undefined) {
            return matchStrictValue(bobrilObject, bobrilObject.element["attributes"][filter.matchedName]["nodeValue"], filter);
        }
        else if (filter && filter.matchedName) {
            return matchStrictValue(bobrilObject, bobrilObject.element[filter.matchedName], filter);
        }
        else
            return undefined;
    }
    function matchNonStrictAttributeFilter(bobrilObject, filter) {
        if (filter && filter.matchedName && bobrilObject.element["attributes"][filter.matchedName] != undefined) {
            return matchNonStrictValue(bobrilObject, bobrilObject.element["attributes"][filter.matchedName]["nodeValue"], filter);
        }
        else if (filter && filter.matchedName) {
            return matchNonStrictValue(bobrilObject, bobrilObject.element[filter.matchedName], filter);
        }
        else
            return undefined;
    }
    function startsWith(text, start) {
        return text.slice(0, start.length) == start;
    }
    function endsWith(text, end) {
        return text.slice(-end.length) == end;
    }
    /**
     * Makes sure that resulting object is not a text node but an element that contains a text (e.g. <div>test</d> instead of "test").
     * @param bobrilObject
     */
    function sanitizeTextNode(bobrilObject) {
        if (bobrilObject.element != undefined && bobrilObject.element.nodeType == Node.TEXT_NODE) {
            return bobrilObject.parent;
        }
        else {
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
    function handleBobrilNotReadyForElements(search, expression, end, time, root, ifVNodeFindNearestChildElm) {
        try {
            return search(expression, root, ifVNodeFindNearestChildElm);
        }
        catch (err) {
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
    function handleBobrilNotReadyForData(search, expression, name, end, time, root) {
        try {
            return search(expression, name, root);
        }
        catch (err) {
            if (err instanceof BBSeekerError && err.type == ErrorType.BOBRIL && (time < end)) {
                return [];
            }
            throw err;
        }
    }
    function formatError(err) {
        if (err instanceof BBSeekerError) {
            return err.message;
        }
        return err.name + ": " + err.message;
    }
    /**
     * Parses provided search expression into an array of node identifiers.
     * @param expression search expression
     */
    function parseExpression(expression) {
        let identifiers = expression.split(/\/(?=(?:(?:[^\[\]]*\[[^\[\]]*\])|(?:[^\[\]]*\[[^\[\]]*\]))*[^\[\]]*$)/);
        let resultArray = [];
        for (let i = 0; i < identifiers.length; i++) {
            let componentId = identifiers[i];
            resultArray[i] = parseSelector(componentId);
        }
        return resultArray;
    }
    /**
    * Parses each selector substring into an Identifier object.
    * @param identifier
    */
    function parseSelector(identifier) {
        let selectorWithoutFilter = stripFilters(identifier);
        let filters = extractFilters(identifier);
        let regexMatches = /^([~|^])?([^.|^#]*)?((.?)(.+)?)/g.exec(selectorWithoutFilter);
        let id = undefined;
        let key = undefined;
        let keyRegex = undefined;
        let tag = undefined;
        let offset = 0;
        let matching = MatchingType.EXACT;
        if (regexMatches !== null) {
            if ("^" === regexMatches[1]) {
                matching = MatchingType.PARENT;
            }
            else if ("~" === regexMatches[1]) {
                matching = MatchingType.ANY_CHILD;
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
            keyRegex = new RegExp(key.replace(/\*/g, ".*"), "g");
        }
        let rightSibling = tag ? /^>(\d*)>$/g.exec(tag) : null;
        let leftSibling = tag ? /^<(\d*)<$/g.exec(tag) : null;
        if (rightSibling) {
            offset = (!rightSibling[1]) ? 1 : Number(rightSibling[1]);
        }
        else if (leftSibling) {
            offset = (!leftSibling[1]) ? -1 : -1 * Number(leftSibling[1]);
        }
        return new Identifier(tag, id, key, keyRegex, filters, offset, getChildIndexFilter(filters), matching);
    }
    function stripFilters(identifier) {
        if (identifier.indexOf('[') == -1) {
            return identifier;
        }
        return identifier.substring(0, identifier.indexOf('['));
    }
    function extractFilters(identifier) {
        if (identifier.indexOf('[') == -1) {
            return [];
        }
        let splits = identifier.substring(identifier.indexOf('[') + 1, identifier.length - 1).split(/(\]AND\[|\]OR\[)/i);
        if (splits.length > 1 && splits.length % 2 != 1) {
            throw new BBSeekerError("Unexpected number of splits while parsing filters: " + splits, ErrorType.PARSER);
        }
        let filters = [];
        for (let i = 0; i < splits.length; i = i + 2) {
            if (i == 0) {
                filters.push(parseFilter(splits[i], null));
            }
            else {
                let filter = parseFilter(splits[i], splits[i - 1]);
                if (filter.isIndexFilter()) {
                    throw new BBSeekerError("Index filter cannot be joined with other filters on the same level.", ErrorType.PARSER);
                }
                filters.push(filter);
            }
        }
        return filters;
    }
    function parseFilter(filterStr, joinSplitter) {
        let f = new Filter();
        let isFilterAttribute = false;
        let isFilterData = false;
        if (filterStr.charAt(0) == "@" && filterStr.length > 2) {
            if (filterStr.indexOf("*=") > 0 && filterStr.indexOf("*=") < filterStr.length - 2) {
                isFilterAttribute = true;
                f.comparison = Comparison.STARTS_WITH;
            }
            else if (filterStr.indexOf("^=") > 0 && filterStr.indexOf("^=") < filterStr.length - 2) {
                isFilterAttribute = true;
                f.comparison = Comparison.ENDS_WITH;
            }
            else {
                let strictness = parseStrictness(filterStr);
                if (strictness == Strictness.STRICT) {
                    isFilterAttribute = true;
                }
                else if (strictness == Strictness.NON_STRICT) {
                    isFilterAttribute = true;
                    f.isStrictFilter = false;
                }
            }
        }
        if (filterStr.charAt(0) == "$" && filterStr.length > 2) {
            if (filterStr.indexOf("*=") > 0 && filterStr.indexOf("*=") < filterStr.length - 2) {
                isFilterData = true;
                f.comparison = Comparison.STARTS_WITH;
            }
            else if (filterStr.indexOf("^=") > 0 && filterStr.indexOf("^=") < filterStr.length - 2) {
                isFilterData = true;
                f.comparison = Comparison.ENDS_WITH;
            }
            else {
                let strictness = parseStrictness(filterStr);
                if (strictness == Strictness.STRICT) {
                    isFilterData = true;
                }
                else if (strictness == Strictness.NON_STRICT) {
                    isFilterData = true;
                    f.isStrictFilter = false;
                }
            }
        }
        var childIndexRegexResult;
        if (!isNaN(Number(filterStr))) {
            f.matchedValue = filterStr;
        }
        else if (filterStr.indexOf("last()") == 0) {
            f.matchedName = "last";
            var indexDelta = -1;
            var index = indexDelta;
            if (/-(\s+)?\d+/.test(filterStr)) {
                index = parseInt(filterStr.replace(/ /g, "").replace("last()", "")) + indexDelta;
            }
            f.matchedValue = index;
        }
        else if (filterStr.indexOf("text=") == 0) {
            f.filterType = FilterType.TEXT;
            f.matchedValue = filterStr.replace("text=", "");
        }
        else if (filterStr.indexOf("text~") == 0) {
            f.filterType = FilterType.TEXT;
            f.matchedValue = filterStr.replace("text~", "");
            f.isStrictFilter = false;
        }
        else if (filterStr.indexOf("text*=") == 0) {
            f.filterType = FilterType.TEXT;
            f.matchedValue = filterStr.replace("text*=", "");
            f.comparison = Comparison.STARTS_WITH;
        }
        else if (filterStr.indexOf("text^=") == 0) {
            f.filterType = FilterType.TEXT;
            f.matchedValue = filterStr.replace("text^=", "");
            f.comparison = Comparison.ENDS_WITH;
        }
        else if (isFilterAttribute) {
            f.filterType = FilterType.ATTRIBUTE;
            let splitAttribute = extractFilterTuple(filterStr, f.isStrictFilter, f.comparison);
            f.matchedName = splitAttribute[0].replace("@", "");
            f.matchedValue = splitAttribute[1];
        }
        else if (isFilterData) {
            f.filterType = FilterType.DATA;
            let splitData = extractFilterTuple(filterStr, f.isStrictFilter, f.comparison);
            f.matchedName = splitData[0].replace("$", "");
            f.matchedValue = splitData[1];
        }
        else if (childIndexRegexResult = /^:([0-9]\d*|last\(\)(\-\d+)?)$/g.exec(filterStr.replace(/\s/g, ''))) {
            f.filterType = FilterType.CHILD_INDEX;
            //child index value or "last()"
            if (!isNaN(Number(childIndexRegexResult[1]))) {
                f.matchedValue = parseInt(childIndexRegexResult[1]); //specifix child index indexed from 0
                f.matchedName = f.matchedValue;
            }
            else {
                f.comparison = Comparison.COMPLEX; // complex is used for "last()"
                f.matchedName = childIndexRegexResult[1]; //e.g. last()-1
                f.matchedValue = childIndexRegexResult[2] != undefined ? parseInt(childIndexRegexResult[2]) : 0; //e.g. -1 from last()-1
            }
        }
        else {
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
    function parseStrictness(filterStr) {
        let equalsIndex = filterStr.indexOf("=");
        let tildeIndex = filterStr.indexOf("~");
        if (equalsIndex > 0 && tildeIndex > 0) {
            if (equalsIndex < tildeIndex) {
                return Strictness.STRICT;
            }
            return Strictness.NON_STRICT;
        }
        else if (equalsIndex > 0 && tildeIndex < 0 && equalsIndex < filterStr.length - 1) {
            return Strictness.STRICT;
        }
        else if (tildeIndex > 0 && equalsIndex < 0 && tildeIndex < filterStr.length - 1) {
            return Strictness.NON_STRICT;
        }
        return Strictness.NOT_VALID;
    }
    function extractFilterTuple(filter, strict, comparison) {
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
    function getChildIndexFilter(filters) {
        let childIndexFilter = undefined;
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
        tag;
        id;
        key;
        keyRegex;
        filters;
        siblingOffset;
        childIndexFilter;
        matchingType;
        constructor(tag, id, key, keyRegex, filters, siblingOffset = 0, childIndexFilter = undefined, matchingType = MatchingType.EXACT) {
            this.tag = tag;
            this.id = id;
            this.key = key;
            this.keyRegex = keyRegex;
            this.filters = filters;
            this.siblingOffset = siblingOffset;
            this.childIndexFilter = childIndexFilter;
            this.matchingType = matchingType;
        }
        isMatchingExact() {
            return MatchingType.EXACT === this.matchingType;
        }
        isMatchingAnyChild() {
            return MatchingType.ANY_CHILD === this.matchingType;
        }
        isMatchingParent() {
            return MatchingType.PARENT === this.matchingType;
        }
        isDefined() {
            return this.tag != undefined || this.id != undefined || this.key != undefined;
        }
    }
    class Filter {
        filterType;
        isStrictFilter;
        comparison;
        matchedName;
        matchedValue;
        joinType = JoinType.AND;
        constructor(filterType = FilterType.INDEX, isStrictFilter = true, comparison = Comparison.SIMPLE, matchedName, matchedValue) {
            this.filterType = filterType;
            this.isStrictFilter = isStrictFilter;
            this.comparison = comparison;
            this.matchedName = matchedName;
            this.matchedValue = matchedValue;
        }
        isIndexFilter() {
            return FilterType.INDEX === this.filterType;
        }
        isChildIndexFilter() {
            return FilterType.CHILD_INDEX === this.filterType;
        }
        isTextFilter() {
            return FilterType.TEXT === this.filterType;
        }
        isAttributeFilter() {
            return FilterType.ATTRIBUTE === this.filterType;
        }
        isDataFilter() {
            return FilterType.DATA === this.filterType;
        }
    }
    class BBSeekerError extends Error {
        message;
        type;
        name = "BBSeekerError";
        constructor(message, type) {
            super(message);
            this.message = message;
            this.type = type;
            this["__proto__"] = BBSeekerError.prototype; // vyzkouset jestli to bude vypisovat spravny errory kdyz to vyhodim
            this.formatMessage();
        }
        formatMessage() {
            this.message = this.name + "(" + ErrorType[this.type] + "): " + this.message;
        }
    }
    let MatchingType;
    (function (MatchingType) {
        MatchingType[MatchingType["EXACT"] = 0] = "EXACT";
        MatchingType[MatchingType["ANY_CHILD"] = 1] = "ANY_CHILD";
        MatchingType[MatchingType["PARENT"] = 2] = "PARENT";
    })(MatchingType || (MatchingType = {}));
    let FilterType;
    (function (FilterType) {
        FilterType[FilterType["INDEX"] = 0] = "INDEX";
        FilterType[FilterType["CHILD_INDEX"] = 1] = "CHILD_INDEX";
        FilterType[FilterType["TEXT"] = 2] = "TEXT";
        FilterType[FilterType["ATTRIBUTE"] = 3] = "ATTRIBUTE";
        FilterType[FilterType["DATA"] = 4] = "DATA";
    })(FilterType || (FilterType = {}));
    let ErrorType;
    (function (ErrorType) {
        ErrorType[ErrorType["BOBRIL"] = 0] = "BOBRIL";
        ErrorType[ErrorType["PARSER"] = 1] = "PARSER";
        ErrorType[ErrorType["SEARCH"] = 2] = "SEARCH";
        ErrorType[ErrorType["TIMEOUT"] = 3] = "TIMEOUT";
    })(ErrorType || (ErrorType = {}));
    let JoinType;
    (function (JoinType) {
        JoinType[JoinType["AND"] = 0] = "AND";
        JoinType[JoinType["OR"] = 1] = "OR";
    })(JoinType || (JoinType = {}));
    let Comparison;
    (function (Comparison) {
        Comparison[Comparison["SIMPLE"] = 0] = "SIMPLE";
        Comparison[Comparison["STARTS_WITH"] = 1] = "STARTS_WITH";
        Comparison[Comparison["ENDS_WITH"] = 2] = "ENDS_WITH";
        Comparison[Comparison["COMPLEX"] = 3] = "COMPLEX";
    })(Comparison || (Comparison = {}));
    let Strictness;
    (function (Strictness) {
        Strictness[Strictness["NOT_VALID"] = 0] = "NOT_VALID";
        Strictness[Strictness["STRICT"] = 1] = "STRICT";
        Strictness[Strictness["NON_STRICT"] = 2] = "NON_STRICT";
    })(Strictness || (Strictness = {}));
    function clone(o) {
        var cloneObj = new o.constructor();
        for (var attr in o) {
            if (typeof o[attr] === "object") {
                cloneObj[attr] = clone(o[attr]);
            }
            else {
                cloneObj[attr] = o[attr];
            }
        }
        return cloneObj;
    }
    function throwErrVirtualComponentsPresent() {
        throw new BBSeekerError("Virtual components present in the result set. Please revise and fix your search expression to target a non-virtual component.", ErrorType.SEARCH);
    }
    /**
     * Method which returns the closes child physical DOM element if there is some
     * @param node - specifies which node should start searching from
     * @param returnEvenNull - specifies whether method should return null if none elm is found or throw an error
     */
    function findNearesChildElm(node, returnEvenNull) {
        if (!node) {
            if (returnEvenNull)
                return null;
            throwErrVirtualComponentsPresent();
        }
        let elm = node.element;
        if (elm)
            return elm;
        if (!node.children) {
            if (returnEvenNull)
                return null;
            throwErrVirtualComponentsPresent();
        }
        let childrenStack = node.children?.slice();
        while (childrenStack.length > 0) {
            const node = childrenStack[0];
            if (node.element)
                return node.element;
            node.children.forEach(child => {
                childrenStack.push(child);
            });
            childrenStack.shift();
        }
        /*
            Becouse of all nodes have been iterated trough and no DOM element was found
            the error with virtual component present in the results is thrown.
        */
        if (returnEvenNull)
            return null;
        throwErrVirtualComponentsPresent();
        return null; // it never comes here but necessary to avoid compilation error becouse of "lack of return statement"
    }
    BBSeeker.findNearesChildElm = findNearesChildElm;
    window["BBSeeker"] = BBSeeker;
})(BBSeeker || (BBSeeker = {}));
//# sourceMappingURL=BBSeeker.js.map