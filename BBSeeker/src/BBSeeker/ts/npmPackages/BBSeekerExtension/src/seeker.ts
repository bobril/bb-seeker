import { BBSeeker } from "bbseeker";

const timeoutConst = 2;

/*
 TODO: This implementation was inspired by Hynek's Hladik C# selenium project.
 Think about that when looking for one item (eg. element) and BBSeeker returns more than one
 then not throw error but return just first item.
*/

/**
 * Synchronous - returns an array of found HTML Elements.
 * @param expression - specifies the elements to be found.  
 * @param root (optional) Specifies an element which search should start from.  
 */
export function findElements(expression: string, root?: HTMLElement): HTMLElement[] {
    return BBSeeker.findElements(expression, checkRoot(root), true);
}

/**
 * Asynchronous - returns a promise which returns an array of elements matching the expression. For a specified period waits for an element to be available. 
 * @param expression - specifies the elements to be found.        
 * @param timeout (optional) - specifies a period of time (seconds) for what should be process repeated if the no element is found.   
 * @param root (optional) - specifies an element which search process should start from.
 */
export function findElementsWithTimeout(expression: string, timeout?: number, root?: HTMLElement): Promise<HTMLElement[]> {
    return new Promise((resolve, reject) => {
        BBSeeker.findElementsWithTimeoutAsync(
            expression,
            getTimeout(timeout),
            (results: [HTMLElement[] | null, string | null]): void => {
                try {
                    const result: HTMLElement[] = processAsyncSearchResult<HTMLElement>(results);
                    resolve(result);
                } catch (e:any) {
                    reject(e.message);
                    throw new Error(e.message);
                }
            },
            checkRoot(root),
            true
        );
    })
}

/**
 * Returns a single element matching the expression. 
 * @param expression - specifies the elements to be found.
 * @param root (optional) - specifies an element which search process should start from.
 */
export function findElement(expression: string, root?: HTMLElement): HTMLElement | null {
    const result: HTMLElement[] = findElements(expression, root);
    return <HTMLElement | null>processSingleItemSearchResult(result, expression);
}

/**
 * Asynchronous - returns a promise which returns a single element. For a specified period waits for an element to be available. 
 * @param expression - specifies the elements to be found.
 * @param timeout (optional) - specifies a period of time (seconds) for what should be process repeated if the no element is found.  
 * @param root (optional) - specifies an element which search process should start from.
 */
export function findElementWithTimeout(expression: string, timeout?: number, root?: HTMLElement): Promise<HTMLElement | null> {
    return new Promise((resolve, reject) => {
        findElementsWithTimeout(expression, timeout, root)
            .then((result: HTMLElement[]) => {
                const res = <HTMLElement | null>processSingleItemSearchResult(result, expression);
                resolve(res);
            }).catch((err) => {
                const m = err.message || err;
                reject(m);
                throw new Error(m);
            })
    })
}

/**
 * Finds all elements matching the expression, extracts attribute and returns it in an array.
 * @param expression - specifies the elements to be found. 
 * @param attributeName - specifies the attributes that should be returned.
 * @param root (optional) - specifies an element which search process should start from.
 */
export function getAttributeList(expression: string, attributeName: string, root?: HTMLElement): (string | undefined)[] | null {
    return BBSeeker.getAttribute(expression, attributeName, checkRoot(root));
}

/**
 * Asynchronous - returns a promise which finds elements matching the expression and returns desired attribute in array. For a specified period waits for an element to be available. 
 * @param expression  - specifies the elements to be found. 
 * @param attributeName - specifies the attributes that should be returned.
 * @param timeout  (optional) - specifies a period of time (seconds) for what should be process repeated if the no element is found. 
 * @param root (optional) - specifies an element which search process should start from.
 */
export function getAttributeListWithTimeout(expression: string, attributeName: string, timeout?: number, root?: HTMLElement): Promise<string[]> {
    return new Promise((resolve, reject) => {
        BBSeeker.getAttributeWithTimeoutAsync(
            expression,
            attributeName,
            getTimeout(timeout),
            (results: [string[] | null, string | null]): void => {
                try {
                    const result: string[] = processAsyncSearchResult<string>(results);
                    resolve(result);
                } catch (e:any) {
                    reject(e.message);
                    throw new Error(e.message);
                }
            },
            checkRoot(root)
        );
    })

}

/**
 * Finds element matching the expression, extracts attribute and returns it.
 * @param expression - specifies the elements to be found. 
 * @param attributeName - specifies the attributes that should be returned.
 * @param root (optional) - specifies an element which search process should start from.
 */
export function getAttribute(expression: string, attributeName: string, root?: HTMLElement): (string | undefined) | null {
    const result: (string | undefined)[] | null = getAttributeList(expression, attributeName, root);
    return processSingleItemSearchResult<string>(result, expression);
}

/**
 * Asynchronous - returns a promise which finds element matching the expression and returns desired attribute. For a specified period waits for an element to be available. 
 * @param expression - specifies the elements to be found. 
 * @param attributeName - specifies the attributes that should be returned.
 * @param timeout (optional) - specifies a period of time (seconds) for what should be process repeated if the no element is found. 
 * @param root (optional) - specifies an element which search process should start from.
 */
export function getAttributeWithTimeout(expression: string, attributeName: string, timeout?: number, root?: HTMLElement): Promise<string> {
    return new Promise((resolve, reject) => {
        getAttributeListWithTimeout(expression, attributeName, timeout, root)
            .then((result: string[]) => {
                const res: string = <string>processSingleItemSearchResult(result, expression);
                resolve(res);
            }).catch((err) => {
                const m = err.message;
                if (m) {
                    reject(m);
                    throw new Error(m);
                } else reject(err);
            });
    })
}

/**
 * Finds all elements matching the expression, extracts data and returns it in a list.
 * @param expression - specifies the elements to be found. 
 * @param dataName - specifies data that should be returned
 * @param root (optional) - specifies an element which search process should start from.
 */
export function getDataList(expression: string, dataName: string, root?: HTMLElement): (string | undefined)[] | null {
    let dataList: (string | undefined)[] | null = BBSeeker.getData(expression, dataName, root);
    return dataList;
}

/**
 * Asynchronous - returns promise which finds all elements matching the expression, extracts data and returns it in a array. For a specified period waits for an element to be available. 
 * @param expression - specifies the elements to be found. 
 * @param dataName - specifies data that should be returned
 * @param timeout (optional) - specifies a period of time (seconds) for what should be process repeated if the no element is found. 
 * @param root (optional) - specifies an element which search process should start from.
 */
export function getDataListWithTimeout(expression: string, dataName: string, timeout?: number, root?: HTMLElement): Promise<string[]> {
    return new Promise((resolve, reject) => {
        BBSeeker.getDataWithTimeoutAsync(
            expression,
            dataName,
            getTimeout(timeout),
            (results: [string[] | null, string | null]): void => {
                try {
                    const result: string[] = processAsyncSearchResult<string>(results);
                    resolve(result);
                } catch (e:any) {
                    reject(e.message);
                    throw new Error(e.message);
                }
            },
            checkRoot(root)
        );
    })
}

/**
 * Finds element matching the expression, extracts data and returns it.
 * @param expression - specifies the elements to be found. 
 * @param dataName - specifies data that should be returned
 * @param root (optional) - specifies an element which search process should start from.
 */
export function getData(expression: string, dataName: string, root?: HTMLElement): (string | undefined) | null {
    const result = getDataList(expression, dataName, root);
    return processSingleItemSearchResult(result, expression);
}

/**
 * Asynchronous - returns a promise which finds element matching the expression and returns desired data. For a specified period waits for an element to be available. 
 * @param expression - specifies the elements to be found. 
 * @param dataName - specifies data that should be returned
 * @param timeout (optional) - specifies a period of time (seconds) for what should be process repeated if the no element is found.
 * @param root (optional) - specifies an element which search process should start from.
 */
export function getDataWidthTimeout(expression: string, dataName: string, timeout?: number, root?: HTMLElement): Promise<string> {
    return new Promise((resolve, reject) => {
        getDataListWithTimeout(expression, dataName, timeout, root)
            .then((result: string[]) => {
                const res: string = <string>processSingleItemSearchResult(result, expression);
                resolve(res);
            })
            .catch((err) => {
                const m = err.message;
                if (m) {
                    reject(m);
                    throw new Error(m);
                } else reject(err);
            })
    })
}

/**
 * Return a list of values of CTX property for all matching elements.
 * @param expression - specifies the elements to be found
 * @param contextPropertyName 
 * @param root 
 */
export function getCtxValueList(expression: string, contextPropertyName: string, root?: HTMLElement): (string | undefined)[] {
    return BBSeeker.getCtx(expression, contextPropertyName, checkRoot(root));
}

export function getCtxValueListWithTimeout(expression: string, contextPropertyName: string, timeout?: number, root?: HTMLElement): Promise<(string | undefined)[]> {
    return new Promise((resolve, reject) => {
        BBSeeker.getCtxWithTimeoutAsync(
            expression,
            contextPropertyName,
            getTimeout(timeout),
            (results: [string[] | null, string | null]): void => {
                try {
                    const result = processAsyncSearchResult<string | undefined>(results);
                    resolve(result);
                } catch (e:any) {
                    reject(e.message);
                    throw new Error(e.message);
                }
            },
            checkRoot(root)
        )
    });
}

export function getCtxValue(expression: string, contextPropertyName: string, root?: HTMLElement): string | undefined {
    const result = getCtxValueList(expression, contextPropertyName, checkRoot(root));
    return <string | undefined>processSingleItemSearchResult(result, expression);
}

export function getCtxValueWithTimeout(expression: string, contextPropertyName: string, timeout: number, root?: HTMLElement): Promise<string | undefined | null> {
    return new Promise((resolve, reject) => {
        getCtxValueListWithTimeout(expression, contextPropertyName, getTimeout(timeout), checkRoot(root))
            .then((result: (string | undefined)[]) => {
                const res = processSingleItemSearchResult<string | undefined>(result, expression);
                resolve(res);
            }).catch(err => {
                const m = err.message;
                reject(m);
                throw new Error(m);
            })
    });
}

/**
 * Waits up to a given time for the element to be removed from a page or throws a TimeoutException. Uses default BBSeeker timeout.
 * @param expression - specifies the elements to be found. 
 * @param timeout  (optional) - specifies a period of time (seconds) for what should be process repeated if the no element is found.
 * @param root (optional) - specifies an element which search process should start from.
 */
export function waitUntilElementIsNotPresent(expression: string, timeout?: number, root?: HTMLElement): Promise<{}> {
    return new Promise((resolve, reject) => {
        BBSeeker.waitForElementNotPresentAsync(
            expression,
            getTimeout(timeout),
            (results: [boolean | null, string | null]): void => {
                try {
                    const result: boolean = processWaitUntilNotPresentResults(results, expression);
                    resolve(result);
                } catch (e:any) {
                    reject(e.message);
                }
            },
            checkRoot(root)
        )
    })

}

/**
 * Returns position of the last click in the browser viewport.
 */
export function getLastClickPosition(): [number, number] {
    let coordinates: [number, number];
    try {
        coordinates = <[number, number]>BBSeeker.getLastClickPosition();
    } catch (e:any) {
        console.warn(`Could not get last click position. Returning [0,0] as a failsafe. Reason: ${e.message}`)
        coordinates = [0, 0];
    }
    return coordinates;
}


// ================================== //
// ========= HELPER SECTION ========= //
// ================================== //

function processAsyncSearchResult<T>(result: [T[] | null, string | null]): T[] {
    handleInvalidResult(result[1]);
    if (result[0]) return <T[]>result[0];
    else {
        throw new Error("Unexpected state occurred in the async search script, results are null. This should not happen unless error is returned instead."
            + " This might be a script author's error.");
    }
}

function handleInvalidResult(err: string | null): void {
    if (err) {
        if (err.indexOf("Async search timed out") > -1) throw new Error(err);
        else throw new Error(`Error occurred during BBSeeker search: ${err}.`);
    }
}

function processWaitUntilNotPresentResults(results: [boolean | null, string | null], expression: string): boolean {
    const isNotPresent = results[0];
    const err = results[1];

    if (err) throw new Error(`Error occurred during BBSeeker search: '${err}'`);
    if (isNotPresent === false) throw new Error(`Timed out waiting for element to be removed: '${expression}'`);
    if (!isNotPresent) throw new Error("Unexpected state occurred in the async waitForElementNotPresent script, returned value is null."
        + "This should not happen and might be a script author's error.");

    return isNotPresent;
}

function processSingleItemSearchResult<T>(result: (T | undefined)[] | null, expression: string): (T | undefined) | null {
    if (!Array.isArray(result) || result.length === 0) return null;
    if (result.length > 1) {
        throw new Error("Too many results returned for expression: " + expression + ".");
    }
    return result[0];
}

function checkRoot(root: HTMLElement | undefined): HTMLElement | undefined {
    if (root && !(root instanceof HTMLElement)) root = undefined;
    return root;
}

function getTimeout(timeout: number | undefined): number {
    if (!timeout) timeout = timeoutConst;
    return timeout * 1000;
}