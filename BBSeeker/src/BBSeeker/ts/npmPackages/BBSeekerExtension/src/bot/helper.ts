import * as b from "bobril";
import * as t from "./types";
import { BBSeeker } from "bbseeker";

const focusableHTMLElements = ["input", "textarea", "select", "iframe", "a", "button", "area"]; // TODO: put all public constants in separate file (from bot.ts as well)
const writableSupportedInputTypes = ["text", "password", "search", "url", "tel"];

export function isVisible(elm: HTMLElement): boolean {
    if (
        /*
            Usually focusable elements with height:0 (not displayed) are still focusable, but it is edgecase and nonsense to create elms like that 
            so i will not handle this edgecase
            Also needs to check if Tag is specified because it is necessary to ignore text which has no tag
        */
        elm.tagName && (
            (elm.getAttribute("display") === "none" || elm.offsetHeight === 0 && elm.offsetWidth === 0) ||
            (elm.getAttribute("visibility") === "hidden" || getComputedStyle(elm)["visibility"] === "hidden")
        )
    ) return false;
    return true;
}

/*
    Function returns next focusable element(node).
    Search can be extended for matching tag or even some element attribute.

    Focus in general in browsers do deep search in one branch of elements and if does not find any result 
    it goes to root's(starting point where event started - currently focused element) sibling ahead of it (focus does not go back)
    and than to parent level where the process repeats.  

    - param "searchInWholeVDOM" indicates that search will start from the start of the first root and will do deep search trough all roots if necessary.
*/
export function getNextFocusableVNode(node: b.IBobrilCacheNode | undefined, includeMe?: boolean, searchInWholeVDOM?: boolean): b.IBobrilCacheNode | null {
    let nodeToFocus: b.IBobrilCacheNode | null = null;

    if (searchInWholeVDOM) {
        const roots: b.IBobrilRoots = b.getRoots();
        const rKeys: string[] = Object.keys(roots);

        for (let i = 0; i < rKeys.length; i++) {
            if (nodeToFocus) break;
            loopChildren(roots[rKeys[i]].c as b.IBobrilCacheNode[]);
        }

        return nodeToFocus;
    }

    /*
        If there is no node to start from specified search for the first focusable node in DOM
    */
    if (!node)
        return getNextFocusableVNode(node, false, true);

    if (includeMe && !searchInWholeVDOM) {
        if (node.element && isElmFocusable(node.element as HTMLElement))
            return node;
    }


    let chldrn: b.IBobrilCacheNode[] = node.children as b.IBobrilCacheNode[];
    loopChildren(chldrn);
    if (nodeToFocus)
        return nodeToFocus;

    let p: b.IBobrilCacheNode | undefined = node.parent;
    let previousNode: b.IBobrilCacheNode = node;

    let startFromElm: b.IBobrilCacheNode | undefined = undefined;
    while (p && p.children && !startFromElm) {
        for (let i = 0; i < p.children.length; i++) {
            const ch: b.IBobrilCacheNode[] = p.children as b.IBobrilCacheNode[];
            if (ch[i] == previousNode && ch[i + 1]) {
                startFromElm = ch[i + 1];
                break;
            }
        }
        if (!startFromElm) {
            previousNode = p;
            p = p.parent;
        }
    }
    if (!p)
        return getNextFocusableVNode(undefined, false, true);
    return getNextFocusableVNode(startFromElm, true);

    function loopChildren(children: b.IBobrilCacheNode[]): void {
        if (!b.isArray(children) || !children.length)
            return;

        for (let i = 0; i < children.length; i++) {
            const child: b.IBobrilCacheNode = children[i];
            const chElm: HTMLElement = child.element as HTMLElement;
            if (chElm && isElmFocusable(chElm)) {
                nodeToFocus = child;
                return;
            }
            child.children && child.children.length > 0 && loopChildren(child.children as b.IBobrilCacheNode[]);
            if (nodeToFocus) return;
        }
    }
}

export function isElmFocusable(elm: HTMLElement): boolean {
    const tag: string = elm.tagName && elm.tagName.toLowerCase();
    const tabindex: string | null = tag && elm.getAttribute("tabindex") || null;
    if (
        isVisible(elm) &&
        !(elm as any).disabled &&
        (
            (tabindex && parseInt(tabindex) > -1 || focusableHTMLElements.indexOf(tag) > -1) ||
            ((tag === "div" || tag === "span") && elm.contentEditable === "true")
        )
    )
        return true;
    return false;
}

export function getFirstFocusableParent(elm: HTMLElement): HTMLElement | null {
    let parent = elm.parentElement;
    while (parent) {
        if (isElmFocusable(parent))
            return parent;
        parent = parent.parentElement;
    }
    return null;
}

export function shouldBlur(elm: HTMLElement, vNode: b.IBobrilCacheNode | undefined): boolean {
    return (b.focused() != null || (document.activeElement != null && document.activeElement.tagName.toLowerCase() !== "body")) && !isElmAlreadyFocused(elm, vNode);
}

export function isElmAlreadyFocused(elm: HTMLElement, node: b.IBobrilCacheNode | undefined): boolean {
    return document.hasFocus() && (node === b.focused() || elm === document.activeElement);
}

export function getActiveHTMLElement(): HTMLElement {
    return BBSeeker.findNearesChildElm(getActiveVNode() as any, true) || document.activeElement as HTMLElement;
}

export function getActiveVNode(): b.IBobrilCacheNode | undefined {
    // return b.focused() || b.deref(document.activeElement); // TODO: ta deref pulka asi nebude potreba. 
    // - TODO2: musel jsem zakomentit .. pokud mi napriklad na komponente zavolaji elm.focus (a ne b.focus), tak se asi netrignou blur a focus
    // listenery a tak se interne v bobrilu neprepisou aktualne zafocusenej elm.
    return b.deref(document.activeElement);
}

export function getFirstInputOrTextAreaElm(vNode: b.IBobrilCacheNode): b.IBobrilCacheNode | undefined {
    // - deep branch search - whole branch first
    let result: b.IBobrilCacheNode | undefined = undefined;
    loopChildren(vNode.children as b.IBobrilCacheNode[])

    function loopChildren(chldrn: b.IBobrilCacheNode[]) {
        if (!b.isArray(chldrn) || !chldrn.length)
            return;

        chldrn.forEach((child: b.IBobrilCacheNode) => {
            if (result) return; // or rewrite it to classical foreach and break it when found result
            const elm: HTMLElement = child.element as HTMLElement;
            if (
                elm
                && ["input", "textarea"].indexOf(elm.tagName.toLowerCase()) > -1
                && !(elm as any).disabled
            ) {
                result = child;
                return;
            }
            if (!result)
                loopChildren(child.children as b.IBobrilCacheNode[])
        });
    }
    return result;
}

export function getParentLabel(vNode: b.IBobrilCacheNode): b.IBobrilCacheNode | undefined {
    const elm: HTMLElement = vNode.element as HTMLElement;
    if (elm && elm.tagName.toLowerCase() === "label")
        return vNode;

    let p: b.IBobrilCacheNode | undefined = vNode.parent;

    while (p) {
        const e: HTMLElement = p.element as HTMLElement;
        if (e && e.tagName.toLowerCase() === "label")
            return p;
        p = p.parent;
    }
    return undefined;
}

export function isElmSomeTextEditableElm(elm: HTMLElement): boolean {
    const tag: string = elm.tagName.toLowerCase();
    const contentEditable: boolean = elm.contentEditable === "true" ? true : false;
    const type: string | null = elm.getAttribute("type");
    /*
        Chrome from some reason restricted inputs and it is no longer possible to
        access and modify selectionStart element property on some input types.
        https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/setSelectionRange 
        => therefore input type number is now unsupported
    */
    return (tag === "textarea"
        || (tag === "input" && (
            type && writableSupportedInputTypes.indexOf(type) !== -1
            || !type))
        && !(elm as HTMLInputElement | HTMLTextAreaElement).disabled)
        || (["textarea", "input"].indexOf(tag) === -1 && contentEditable);
}

export function getTextEditableElmTextContent(elm: HTMLElement): string {
    const tag: string = elm.tagName.toLowerCase();
    const type: string | null = elm.getAttribute("type");

    if (tag === "textarea" ||
        (tag === "input" && (
            !type ||
            ["text", "password", "email", "number"].indexOf(type) !== -1

        )
        )
    ) {
        return (elm as HTMLInputElement | HTMLTextAreaElement).value;
    } else
        return elm.innerText;
}

export function selectContentEditableElmText(elm: HTMLElement, startIndex: number, charCountToSelect: number): void {
    const endIndex = startIndex + charCountToSelect;
    // TODO: check if it works in IE
    /*
        Because of new rows "character" is not part of textNode
        and also are not returned in textNodes arr, it will select next available char instead.
        When filling endIndex, the row "chars" should not be included on that count 
    */
    if (document.getSelection && document.createRange) {
        let range = document.createRange();
        range.selectNodeContents(elm);
        const textNodes: ChildNode[] = getTextNodesInElm(elm);
        let curTNodeStartIndex = 0;
        let curTNodeEndIndex = 0;
        let foundStart: boolean = false;

        for (let i = 0; i < textNodes.length; i++) {
            let tNode: ChildNode = textNodes[i];
            const length = (tNode as any).length;
            curTNodeEndIndex = curTNodeStartIndex + length;

            if (!foundStart && startIndex <= curTNodeEndIndex) {
                range.setStart(tNode, startIndex - curTNodeStartIndex);
                foundStart = true;
            }
            if (foundStart && endIndex <= curTNodeEndIndex) {
                range.setEnd(tNode, endIndex - curTNodeStartIndex);
                break;
            } else if (foundStart && endIndex > curTNodeEndIndex && !textNodes[i]) {
                range.setEnd(tNode, curTNodeEndIndex);
                break;
            }
            curTNodeStartIndex = curTNodeStartIndex + length;
        }

        let selection = window.getSelection()!; // TODO: => ugly hack but it will not work in IE
        selection.removeAllRanges();
        if (foundStart)
            selection.addRange(range);
    }

    function getTextNodesInElm(elm: ChildNode | HTMLElement): ChildNode[] {
        let textNodes: ChildNode[] = [];
        if (elm.nodeType === 3)
            textNodes.push(elm);
        else {
            const ch = elm.childNodes;
            for (let i = 0; i < ch.length; i++) {
                textNodes.push(...getTextNodesInElm(ch[i]));
            }
        }
        return textNodes;
    }
}

/*
    When nothing is blocking and browser renders new frame each 16.6 ms (60fps => 1000/60 = 16.6)
    => it counts on that the monitor is running at least at 60Hz to be able to redraw screen each 16.6 ms.
 */
const browserRenderIntervalBaseRateMS = 16;
/**
    Method which should check for some period if invalidate was initiated and then finished.
    If @param terminateAfterFirstInvalidate is enabled it ends waiting once the first invalidate
    and redraw (next frame happens) is done if it is sooner than specified @param maxDelayMS.
    
    Using @param maxDelayMS with disabled @param terminateAfterFirstInvalidate
    is useful e.g. for HTTP requests...invalidate can be initiated by response so we need to wait
    but not necessarily longer than necessary.
*/
export function carryOnActionChain(maxDelayMS?: number, terminateAfterFirstInvalidate?: boolean): Promise<void> {
    /*
        If maxDelayMS or terminateAfterFirstInvalidate is not specified then carry on processing further
        action pipeline after 16ms to give browser time to react.
        MaxDelayMS has higher priority so if it is inserted then termination param is ignored.
        Otherwise trigger action pipeline after first successful invalidate if specified
        or trigger action pipeline after specified delay. 
    */
    const now: number = new Date().getTime();
    const end: number = now + (maxDelayMS || 0);

    return new Promise((resolve) => {
        if (!maxDelayMS) {
            setTimeout(() => {
                resolve();
            }, browserRenderIntervalBaseRateMS);
        } else {
            let i = setInterval(() => {
                if (new Date().getTime() >= end) {
                    clearInterval(i);
                    resolve();
                }
            }, browserRenderIntervalBaseRateMS)

            if (terminateAfterFirstInvalidate || terminateAfterFirstInvalidate == null) {
                const origAfterFrameCallBack = b.setAfterFrame(
                    (root: string | b.IBobrilCacheNode[] | null | undefined) => {
                        origAfterFrameCallBack(root);
                        b.setAfterFrame(origAfterFrameCallBack);
                        i && clearInterval(i);
                        setTimeout(() => {
                            resolve();
                        }, browserRenderIntervalBaseRateMS);
                    }
                )
            }
        }
    })
}


/**
 * Returns upper left corner coordinates of elm (x:1 y:1 of element) 
 * relative to viewport by default but can be switched to absolute.
 * @param elm - element on which is done pointer action
 */
export function getPointerActionPosition(elm: HTMLElement, absolute?: boolean): t.ICoordinates {
    const elmRect: DOMRect = elm.getBoundingClientRect() as DOMRect;
    /*
        Returns position of upper left corner of the element with + 1px offset.
    */
    return {
        x: (absolute ? elmRect.x + window.pageXOffset : elmRect.x) + 1,
        y: (absolute ? elmRect.y + window.pageYOffset : elmRect.y) + 1
    }
}

const _reserveToMakeElmVisible = 100;
/**
 * Returns element which is present on specified absolute coordinates.
 * Also modifies inserted absolute coords and returns as relative coords.     
 * If the coordinates are out of the viewport and also are in scrollable area
 * then scrolls viewport to necessary position as well.
 * @param x - absolute x coord where should be element found
 * @param y - absolute y coord where should be element found
 * @param scrollBack - indicates whether the viewport should be scrolled back to the current position
 */
export function getElmAndRelativeCoordsFromAbsPointAndScrollIfNecessary(
    x: number,
    y: number,
    scrollBack?: boolean
): { elm: HTMLElement, coords: t.ICoordinates } | null {
    const oldScrollX = window.pageXOffset;
    const oldScrollY = window.pageYOffset;
    /*
        To get element which is out of the viewport 
        it is necessary to scroll display to make elm 
        (or coordination in this case) visible
        and then make the coordinate relative to the viewport.
        (elementFromPoint method uses relative coordinates) 
    */
    scrollIfCoordOutOfViewport(x, y);
    if (
        scrollBack && (
            oldScrollX !== window.pageXOffset
            || oldScrollY !== window.pageYOffset
        )
    )
        window.scrollTo(oldScrollX, oldScrollY);
    // TODO: overit, zda je to podporovany ve vsech prohlizecich - https://caniuse.com/#feat=element-scroll-methods
    // kdyz jsem ale nastavoval pouze scrollTop, tak se mi to ale neprekreslilo, tak wtf
    // mozna to predelat na scrollTop a scrollLeft

    const relX = x - window.pageXOffset;
    const relY = y - window.pageYOffset;
    const e = document.elementFromPoint(relX, relY) as HTMLElement | null;
    return e ? { elm: e, coords: { x: relX, y: relY } } : null;
}


export function scrollIfCoordOutOfViewport(x: number, y: number): void {
    /*
       x and y coords are absolute coords in the documentElement.

        NOTE: changing scroll property value on DOM element will automatically trigger 
        scroll listener and bobril will react and handle all necessities.
    */
    const curScrollX = window.pageXOffset;
    const curScrollY = window.pageYOffset;
    const viewportH = document.documentElement.clientHeight;
    const viewportW = document.documentElement.clientWidth;
    const wholeContentH = document.documentElement.scrollHeight;
    const wholeContentW = document.documentElement.scrollWidth;
    let newScrollX: number = curScrollX;
    let newScrollY: number = curScrollY;

    if (x <= curScrollX)
        newScrollX = x - _reserveToMakeElmVisible
    else if (x >= viewportW + curScrollX && x < wholeContentW)
        newScrollX = Math.min(x - viewportW + _reserveToMakeElmVisible, wholeContentW);
    if (y <= curScrollY)
        newScrollY = y - _reserveToMakeElmVisible
    else if (y >= viewportH + curScrollY && y < wholeContentH)
        newScrollY = Math.min(y - viewportH + _reserveToMakeElmVisible, wholeContentH);

    if (newScrollX !== curScrollX || newScrollY !== curScrollY)
        window.scrollTo(newScrollX, newScrollY);
    // TODO: overit, zda je to podporovany ve vsech prohlizecich - https://caniuse.com/#feat=element-scroll-methods
    // kdyz jsem ale nastavoval pouze scrollTop, tak se mi to ale neprekreslilo, tak wtf
    // mozna to predelat na scrollTop a scrollLeft
}

export function scrollIfElmOutOfViewport(elm: HTMLElement): void {
    // TODO: udelat lepsi check ...scrolovat by to melo pouze, kdyz ten element neni videt vubec 
    // kdyz je videt alespon nejaka cast, tak predpokladat, ze se scroluje na ni
    if (elm === document.documentElement)
        return;
    const rect = elm.getBoundingClientRect() as DOMRect;
    const absCoord = convertRelativeCoordToAbsolute({ x: rect.x, y: rect.y });
    scrollIfCoordOutOfViewport(absCoord.x, absCoord.y);
}

/*
    Enhances default coordinates of element (elements upper left corner (x:1, y:1))
    with specified inner element pointer mouse coordinates.
*/
export function enhanceCoordinates(coordinates: t.ICoordinates, coordinatesInElement: t.ICoordinates | undefined): t.ICoordinates {
    if (!coordinatesInElement)
        return coordinates;
    /*
        If specific click coordinates within the element
        was inserted then coordinates are properly edited.
    */
    return {
        x: coordinates.x + coordinatesInElement.x - 1,
        y: coordinates.y + coordinatesInElement.y - 1
    }
}

export function convertRelativeCoordToAbsolute(coord: t.ICoordinates): t.ICoordinates {
    return {
        x: coord.x + window.pageXOffset,
        y: coord.y + window.pageYOffset
    }
}

export function convertAbsoluteCoordToRelative(coord: t.ICoordinates): t.ICoordinates {
    return {
        x: coord.x - window.pageXOffset,
        y: coord.y - window.pageYOffset
    }
}

/**
 * Returns whether the elm is vertically scrollable and also
 * whether it is possible to scroll it 
 * (has some scrollable area left).
 */
export function isVerticallyScrollable(elm: HTMLElement, isDownDir: boolean, isExact: boolean): boolean {
    const vScrollable = b.isScrollable(elm)[1];
    if (isExact)
        return vScrollable;
    return vScrollable && isDownDir
        ? (elm.scrollHeight - elm.clientHeight) > elm.scrollTop
        : elm.scrollTop > 0;
}

export function isHorizontalyScrollable(elm: HTMLElement, isRightDir: boolean, isExact: boolean): boolean {
    const hScrollable = b.isScrollable(elm)[0];
    if (isExact)
        return hScrollable;
    return hScrollable && isRightDir
        ? (elm.scrollWidth - elm.clientWidth) > elm.scrollLeft
        : elm.scrollLeft > 0;
}
