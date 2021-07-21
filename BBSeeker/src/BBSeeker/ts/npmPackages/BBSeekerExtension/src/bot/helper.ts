import * as b from "bobril";
import * as t from "./types/all";
import { BBSeeker } from "bbseeker";

/**
 * TODO: put all public constants in separate file (from bot.ts as well)
 */
const _focusableHTMLElements = ["input", "textarea", "select", "iframe", "a", "button", "area"];
const _writableSupportedInputTypes = ["text", "password", "search", "url", "tel"];
const _formControlElements = ["button", "fieldset", "input", "optgroup", "option", "select", "textarea"];

export function isVisible(elm: HTMLElement, forTab?: boolean): boolean {
    const compSt = getComputedStyle(elm);
    if (
        !elm.tagName
        || elm.hidden
        || (forTab && (elm.offsetHeight === 0 || elm.offsetWidth === 0))
        || compSt["display"] === "none" || compSt["visibility"] === "hidden"

    )
        return false;
    return true;
}

export function isDisabled(elm: HTMLElement): Boolean {
    return _formControlElements.indexOf(elm.tagName.toLowerCase()) !== -1
        && (elm as any).disabled === true;
}


interface IFocusableNode {
    tabIndex: number,
    node: b.IBobrilCacheNode
}

export function getNextFocusableVNode(curNode: b.IBobrilCacheNode | undefined, backwards: boolean): b.IBobrilCacheNode | null {
    let nodeToFocus: b.IBobrilCacheNode | null = null;
    /**
     * Search trough whole VDOM elements which are possible to focus
     * at this moment. It is necessary to sort that according to
     * tabIndex property to create valid focus path as browser would do.
     * (there are also some cases which have special handling approach like radios) 
     */
    let focusPathNodes: IFocusableNode[] = buildFocusPath();
    focusPathNodes.sort((a: IFocusableNode, b: IFocusableNode) => {
        const tA = a.tabIndex;
        const tB = b.tabIndex;
        /**
         * Elements with tab index 0
         * (set manually or natively focusable elms)
         * are by browsers focused always as the last ones
         * (if not backwards focusing)
         * so it is considered as the highest tabIndex value.
         */
        if (tA === 0 && tB !== 0) return 1;
        if (tB === 0 && tA !== 0) return -1;
        if (tA < tB) return -1;
        if (tA > tB) return 1;
        return 0;
    });


    if (!curNode) {
        if (focusPathNodes.length)
            nodeToFocus = focusPathNodes[backwards ? focusPathNodes.length - 1 : 0].node;
    }
    /**
     * If there is no other elm to focus
     * then browser would usually focus
     * some browser UI part and make no
     * active elm (blur => body is focused) 
     */
    else if (focusPathNodes.length > 1) {
        let focusNodePathIdx = focusPathNodes.findIndex(item => item.node === curNode);
        /**
         * Find next focusable node according to
         * currently focused elm.
         */
        if (backwards && focusNodePathIdx === 0)
            focusNodePathIdx = focusPathNodes.length - 1;
        else if (!backwards && focusNodePathIdx === focusPathNodes.length - 1)
            focusNodePathIdx = 0;
        else
            focusNodePathIdx += backwards ? -1 : 1;

        return focusPathNodes[focusNodePathIdx].node;
    }

    return nodeToFocus;

    function buildFocusPath(): IFocusableNode[] {
        const _noName_radio_g = "no_name_!123,./";
        const roots: b.IBobrilRoots = b.getRoots();
        const rKeys: string[] = Object.keys(roots);

        let focusableNodes: IFocusableNode[] = [];
        let radioGroups: {
            [groupName: string]: {
                smallestTabIdx: number;
                biggestTabIdx: number;
                countWithBiggest: number;
                lastCheckedNode?: b.IBobrilCacheNode
            }
        } = {};

        rKeys.forEach((_val: String, idx: number) => {
            findFocusableChildren(roots[rKeys[idx]].c);
        });

        const rGroups = Object.keys(radioGroups);
        /**
         * Clense special cases
         * 
         * Radios:
         * For each NAMED group check whether has some checked radio.
         * If so then ignore tabIndexes and keep in the focus path 
         * only the last checked radio in the group as the browser would do.
         * If none radio in the group is checked then
         * keep in the focus path only first radio from the group with the smallest tabIndex
         * for the forward direction or the last radio from the group with the  biggest for backwards.
         * 
         * 
         * Note: for now it is not handled case for non-checked radio group
         * with broken focus chains, because it is edge-case and bad design. 
         * (the only way how to make multiple radios in one group focusable)
         */
        if (rGroups.length) {
            let foundMatchesTemp = 0;

            focusableNodes = focusableNodes.filter(n => {
                const node = n.node;
                const elm = node.element as HTMLElement;

                if (isElmRadioButton(elm)) {
                    const gName = elm.getAttribute("name") || _noName_radio_g;
                    const rGroup = radioGroups[gName];

                    if (rGroup.lastCheckedNode && gName !== _noName_radio_g)
                        return rGroup.lastCheckedNode !== n.node ? false : true;

                    if (backwards) {
                        if (elm.tabIndex !== rGroup.biggestTabIdx)
                            return false;
                        foundMatchesTemp++;
                        return foundMatchesTemp === rGroup.countWithBiggest;
                    }

                    return elm.tabIndex === rGroup.smallestTabIdx;
                }

                return true;
            });
        }

        return focusableNodes;

        function findFocusableChildren(children: b.IBobrilChildren): void {
            if (!b.isArray(children) || !children.length)
                return;

            children.forEach(child => {
                if (child != null && typeof child === "object") {
                    updateFocusPath(child as b.IBobrilCacheNode);
                    findFocusableChildren((child as b.IBobrilCacheNode).children);
                }
            });

            function updateFocusPath(nextNode: b.IBobrilCacheNode): void {
                const nextElm = nextNode.element as HTMLElement | undefined;

                if (!nextElm || !isElmFocusable(nextElm, t.FocusableBy.KEYBOARD))
                    return;

                const isNextRadio = isElmRadioButton(nextElm);
                const tabIdxValue = getElementTabIndex(nextElm);
                const tabIdx = tabIdxValue == null && isFocusableByDefault(nextElm)
                    ? 0
                    : tabIdxValue!;

                /** ===========================
                 * === Handle Special Cases ===
                 * ========================= */

                /**
                * Radio Buttons
                * 
                * If some is checked:
                * Browser totally ignores tabIndexes and focuses the last checked one in the group
                * for both forwards and backwards direction. 
                * 
                * Note: This rule is applied for named groups. When the radios does not have a name
                * they are then handled according to tabIndex rule.
                * 
                * If none is checked:
                * When no broken chain occurs in the group, then browser focuses the first radio with the smallest
                * tabIndex in the group for the forward direction or the last radio in the group with the biggest for the backwards.
                * 
                * Note: Firefox does not focus only one radio in the group, it goes on tabIndexes path, so it is not 
                * standardized behavior.  
                * 
                * Broken chain 
                * 1) When between radios of some group is placed some other element with the same tabIndex as the groups lowest
                * e.g.: 
                * <div>
                *   <radio tabindex=1> <div tabindex=1>  <radio tabindex=1>
                * </div> 
                * (browser would focus all of them in the mentioned order, not just the first one (forward direction))
                * 
                * 2) Or when radios in group has different tabIndex and there is also some element in the layout
                * outside of the radio group which has same or higher tabIndex then the radio groups lowest and smaller
                * or same as the radios highest tabIndex
                * e.g.:
                * <div>
                *   <radio tabindex=1>
                *   <radio tabindex=2>
                * </div>
                * <span tabindex=1>
                * (browser would focus all three focusable elements in the order: radio with tabIndex=1, span, radio with tabIndex2)
                *
                * !!!
                * Giving different tabindex to radios inside one group or mixing different groups together 
                * or giving different radio groups different tabIndexes or dividing it with some focusable element
                * does not give much sense and is bad design anyway so cases like that are not handled.  
                */

                if (isNextRadio) {
                    const gName = nextElm.getAttribute("name") || _noName_radio_g;
                    let group = radioGroups[gName];
                    if (!group)
                        group = radioGroups[gName] = { smallestTabIdx: -1, biggestTabIdx: -1, countWithBiggest: 0 };

                    if (
                        group.smallestTabIdx === -1
                        || tabIdx < group.smallestTabIdx && tabIdx !== 0
                    )
                        group.smallestTabIdx = tabIdx;

                    if (tabIdx === 0 || (tabIdx > group.biggestTabIdx && group.biggestTabIdx !== 0))
                        group.biggestTabIdx = tabIdx;

                    group.biggestTabIdx === tabIdx
                        ? group.countWithBiggest++
                        : group.countWithBiggest = 1;

                    if (
                        (nextElm as HTMLInputElement).checked
                        || nextElm.getAttribute("checked")
                        || nextElm.getAttributeNames().indexOf("checked") > -1
                    )
                        radioGroups[gName].lastCheckedNode = nextNode;
                }

                focusableNodes.push({ node: nextNode, tabIndex: tabIdx });
            }
        }
        function isElmRadioButton(elm: HTMLElement | undefined): boolean {
            return Boolean(
                elm
                && elm.tagName.toLowerCase() === "input"
                && elm.getAttribute("type") === "radio"
            );
        }
    }
}

export function isElmFocusable(elm: HTMLElement, focusableBy: t.FocusableBy = t.FocusableBy.MOUSE): boolean {
    const tag: string = elm.tagName && elm.tagName.toLowerCase();
    if (!tag)
        return false;

    const tIndex = getElementTabIndex(elm);

    if (
        isVisible(elm, focusableBy === t.FocusableBy.KEYBOARD)
        && !(elm as any).disabled
        && (focusableBy === t.FocusableBy.MOUSE
            ? isFocusableByDefault(elm) || tIndex != null
            : (
                tIndex != null && tIndex > -1
                || tIndex == null && isFocusableByDefault(elm)
            )
        )
    )
        return true;
    return false;
}

function getElementTabIndex(elm: HTMLElement): number | undefined {
    const tabIndexVal = elm.getAttribute("tabindex");

    return tabIndexVal
        ? parseInt(tabIndexVal)
        : undefined;
}

/**
 * Checks whether the elm is natively focusable
 * without specifying a tabIndex attrs. 
 */
function isFocusableByDefault(elm: HTMLElement, tag?: string): boolean {
    tag = tag || elm.tagName.toLowerCase();

    return (
        _focusableHTMLElements.indexOf(tag) > -1
        || ((tag === "div" || tag === "span") && elm.contentEditable === "true")
    )

}

export function getFirstFocusableParent(elm: HTMLElement, focusableBy: t.FocusableBy): HTMLElement | null {
    let parent = elm.parentElement;
    while (parent) {
        if (isElmFocusable(parent, focusableBy))
            return parent;
        parent = parent.parentElement;
    }
    return null;
}

export function shouldBlur(targetElm: HTMLElement, targetVNode: b.IBobrilCacheNode | undefined): boolean {
    return (b.focused() != null || (document.activeElement != null && document.activeElement.tagName.toLowerCase() !== "body")) && !isElmAlreadyFocused(targetElm, targetVNode);
}

export function isElmAlreadyFocused(elm: HTMLElement, node: b.IBobrilCacheNode | undefined): boolean {
    // return document.hasFocus() && (node === b.focused() || elm === document.activeElement);
    return node === b.focused() || elm === document.activeElement;
}

export function getActiveHTMLElement(): HTMLElement {
    return BBSeeker.findNearesChildElm(getActiveVNode() as any, true) || document.activeElement as HTMLElement;
}

export function getActiveVNode(): b.IBobrilCacheNode | undefined {
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
            if (result)
                return; // or rewrite it to classical foreach and break it when found result
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
            type && _writableSupportedInputTypes.indexOf(type) !== -1
            || !type))
        && !(elm as HTMLInputElement | HTMLTextAreaElement).disabled)
        || (["textarea", "input"].indexOf(tag) === -1 && contentEditable);
}

//const rowVPlaceholder = "{!.:nLine.:?}";
//export function getTextEditableElmTextContent(elm: HTMLElement, rowsIncluded: boolean = false): string {
export function getTextEditableElmTextContent(elm: HTMLElement): string {
    const tag: string = elm.tagName.toLowerCase();
    const type: string | null = elm.getAttribute("type");

    if (tag === "textarea" ||
        (tag === "input" && (
            !type ||
            ["text", "password", "email", "number"].indexOf(type) !== -1
        ))
    ) {
        return (elm as HTMLInputElement | HTMLTextAreaElement).value;
        //? (elm as HTMLInputElement | HTMLTextAreaElement).value.replace(/\r|\n/gi, "{.:nLine.:}") 
        //: (elm as HTMLInputElement | HTMLTextAreaElement).value;
    } else
        return elm.innerText;
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

/**
 * Returns element which is present on specified absolute coordinates.
 * Also modifies inserted absolute coords and returns as relative coords.     
 * If the coordinates are out of the viewport and also are in scrollable area
 * then scrolls viewport to necessary position as well.
 * @param x - Absolute x coordinate where should be element found.
 * @param y - Absolute y coordinate where should be element found.
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

    const relX = x - window.pageXOffset;
    const relY = y - window.pageYOffset;
    const e = document.elementFromPoint(relX, relY) as HTMLElement | null;
    return e ? { elm: e, coords: { x: relX, y: relY } } : null;
}

const _reserveToMakeElmVisible = 100;
/**
 * @param x - Absolute x coordinate where should be element found.
 * @param y - Absolute y coordinate where should be element found.
 */
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
        newScrollX = x - _reserveToMakeElmVisible;
    else if (x >= viewportW + curScrollX && x < wholeContentW)
        newScrollX = Math.min(x - viewportW + _reserveToMakeElmVisible, wholeContentW);
    if (y <= curScrollY)
        newScrollY = y - _reserveToMakeElmVisible;
    else if (y >= viewportH + curScrollY && y < wholeContentH)
        newScrollY = Math.min(y - viewportH + _reserveToMakeElmVisible, wholeContentH);

    if (newScrollX !== curScrollX || newScrollY !== curScrollY)
        window.scrollTo(newScrollX, newScrollY);
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

export function isHorizontallyScrollable(elm: HTMLElement, isRightDir: boolean, isExact: boolean): boolean {
    const hScrollable = b.isScrollable(elm)[0];
    if (isExact)
        return hScrollable;
    return hScrollable && isRightDir
        ? (elm.scrollWidth - elm.clientWidth) > elm.scrollLeft
        : elm.scrollLeft > 0;
}

// inspired by: https://github.com/customd/jquery-visible/issues/11
const scrollReserve = 50;
export function scrollToElmIfNecessary(elm: HTMLElement, coordsInElm: t.ICoordinates = { x: 1, y: 1 }, autoScrollEnabled: boolean): void {
    if (!autoScrollEnabled)
        return;

    const windowHeight = document.documentElement.clientHeight;
    const windowWidth = document.documentElement.clientWidth;
    const elmRectOrig = elm.getBoundingClientRect();
    let rects: { elm: HTMLElement, rect: DOMRect }[] = [];
    let parent: HTMLElement | null = elm.parentElement;
    let elmRect = {
        left: elmRectOrig.left,
        right: elmRectOrig.right,
        top: elmRectOrig.top,
        bottom: elmRectOrig.bottom,
        width: elmRectOrig.width,
        height: elmRectOrig.height
    };

    while (parent) {
        const isScrollable = b.isScrollable(parent);
        if (isScrollable[0] === true || isScrollable[1] === true)
            rects.push({ elm: parent, rect: parent.getBoundingClientRect() });
        parent = parent.parentElement;
    }

    rects.forEach(r => {
        const isDocElm = r.elm === document.documentElement;

        elmRect.left = Math.max(elmRect.left, !isDocElm ? r.rect.left : 0);
        elmRect.top = Math.max(elmRect.top, !isDocElm ? r.rect.top : 0);
        elmRect.right = Math.min(elmRect.right, !isDocElm ? r.rect.right : windowWidth);
        elmRect.bottom = Math.min(elmRect.bottom, !isDocElm ? r.rect.bottom : windowHeight);
    });

    const cursorPointX = elmRectOrig.left + coordsInElm.x;
    const cursorPointY = elmRectOrig.top + coordsInElm.y;
    const isPointVisible = cursorPointX > 0 && cursorPointX < windowWidth && cursorPointX >= elmRect.left && cursorPointX <= elmRect.right
        && cursorPointY > 0 && cursorPointY < windowHeight && cursorPointY >= elmRect.top && cursorPointY <= elmRect.bottom

    if (!isPointVisible) {
        const scrollRegister: { elm: HTMLElement, scroll: { x?: number, y?: number } }[] = [];
        let childRelativeYPos = elmRectOrig.top + coordsInElm.y + scrollReserve;
        let childRelativeXPos = elmRectOrig.left + coordsInElm.x + scrollReserve;
        let childYAbsPosInParentBeforeScroll = 0;
        let childXAbsPosInParentBeforeScroll = 0;
        let targetElmRelativeXInCurElm = 0;
        let targetElmRelativeYInCurElm = 0;

        rects.forEach(r => {
            const isDocElm = r.elm === document.documentElement;
            const containerHeight = isDocElm ? window.innerHeight : r.rect.height;
            const containerWidth = isDocElm ? window.innerWidth : r.rect.width;
            const parentRelativeYPos = r.rect.top;
            const parentRelativeXPos = r.rect.left;

            childYAbsPosInParentBeforeScroll = childRelativeYPos - parentRelativeYPos + (isDocElm ? 0 : r.elm.scrollTop);
            targetElmRelativeYInCurElm = childYAbsPosInParentBeforeScroll + targetElmRelativeYInCurElm;
            const scrollY = Math.max(targetElmRelativeYInCurElm - containerHeight, 0);
            targetElmRelativeYInCurElm = targetElmRelativeYInCurElm > containerHeight ? containerHeight : targetElmRelativeYInCurElm;

            childXAbsPosInParentBeforeScroll = childRelativeXPos - parentRelativeXPos + (isDocElm ? 0 : r.elm.scrollLeft);
            targetElmRelativeXInCurElm = childXAbsPosInParentBeforeScroll + targetElmRelativeXInCurElm;
            const scrollX = Math.max(targetElmRelativeXInCurElm - containerWidth, 0);
            targetElmRelativeXInCurElm = targetElmRelativeXInCurElm > containerWidth ? containerWidth : targetElmRelativeXInCurElm;

            scrollRegister.push({ elm: r.elm, scroll: { y: scrollY, x: scrollX } });
            childRelativeXPos = parentRelativeXPos;
            childRelativeYPos = parentRelativeYPos;
        });

        scrollRegister.forEach(sRec => {
            const s = sRec.scroll;
            if (s.x != null || s.y != null)
                sRec.elm.scrollTo(s.x || elm.scrollLeft, s.y || elm.scrollTop);
        });

        /*
         * NOTE: There can be issues if some element with overflow: hidden
         * have content which is pushed away from visible zone 
         * e.g by negative margins or positioning.
         */
    }
}


export function getClickHandlerName(whichMouse: number): string {
    let name = "";
    if (whichMouse === t.MouseButton.Right)
        name = t.EventHandlers.rightClickHandlerName;
    else if (whichMouse === t.MouseButton.Left)
        name = t.EventHandlers.leftClickHandlerName;
    return name;
}


/*
    When nothing is blocking then browser renders new frame each 16.6 ms (60fps => 1000/60 = 16.6)
    => it counts on that the monitor is running at least at 60Hz to be able to redraw screen each 16.6 ms.
 */
const browserRenderIntervalBaseRateMS = 16;
const _maxInvalidationSequenceLength = 15;
/**
    Checks for some period if invalidate was initiated and then finished.
    If @param terminateAfterFirstInvalidate is enabled it ends waiting once the first invalidate is done.
    Has higher priority than @param maxDelay but 
    
    Using @param maxDelayMS with disabled @param terminateAfterFirstInvalidate forces to wait specified time period.
    Useful foc cases where the invalidation is not triggered immediately e.g. for HTTPS requests 
    => Invalidate can be initiated by response so it is necessary to wait for some time.
*/
export function carryOnActionChain(
    maxDelayMS?: number,
    terminateOnInvalidationFinished: boolean = true
): Promise<void> {
    /*
        If maxDelayMS or terminateAfterFirstInvalidate is not specified then carry on processing further
        action pipeline after 16ms to give browser time to react.
        MaxDelayMS has higher priority so if it is inserted then termination param is ignored.
        Otherwise trigger action pipeline after first successful invalidate if specified
        or trigger action pipeline after specified delay. 
    */
    const end: number | undefined = maxDelayMS ? b.now() + maxDelayMS : undefined;
    let int: number;

    return new Promise((resolve) => {
        if (!maxDelayMS && !terminateOnInvalidationFinished) {
            resolveAndCarryOn();
        }
        else {
            if (terminateOnInvalidationFinished) {
                if (b.invalidated()) {
                    let curInvalidate = 0;

                    const origAfterFrameCallback = b.setAfterFrame(
                        (root: string | b.IBobrilCacheNode[] | null | undefined) => {
                            origAfterFrameCallback(root);
                            curInvalidate++;

                            if (!b.invalidated() || (end && b.now() > end)) {
                                b.setAfterFrame(origAfterFrameCallback);
                                resolveAndCarryOn();
                            }
                            else if (curInvalidate < _maxInvalidationSequenceLength)
                                /**
                                 * To not freeze browser for long time
                                 * use syncUpdate only for a few cycles
                                 * then just invalidate (already registered) will do.
                                 */
                                b.syncUpdate();
                        }
                    );
                } else
                    resolveAndCarryOn();
            } else {
                /**
                 * Should not be terminated when invalidation finished
                 * therefore it is considered that action
                 * should continue after specified maxDelay time period expires
                 * therefore no syncUpdate and invalidation is necessary. 
                 */
                int = setInterval(() => {
                    if (b.now() >= end!) {
                        clearInterval(int);
                        resolve();
                    }
                }, browserRenderIntervalBaseRateMS)
            }
        }

        function resolveAndCarryOn(): void {
            setTimeout(
                resolve,
                browserRenderIntervalBaseRateMS
            );
        }
    });
}
