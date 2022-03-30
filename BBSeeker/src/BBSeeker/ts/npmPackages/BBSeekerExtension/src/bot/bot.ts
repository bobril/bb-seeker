import * as b from "bobril";
import * as h from "./helper";
import * as t from "./types/all";

export * from "./types/public";

const _nonWritingKeyCodes: number[] = [8, 9, 16, 17, 18, 19, 20, 27, 33, 34, 35, 36, 37, 38, 39, 40, 45, 46, 91, 92, 93, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 144, 145];
/*
 * - keyDown and keyUp event returns physical keyboard keycode
 * - keyPress returns keycode of the pressed char in ASCII table 
 * ( for example "a" -keyDown or Up key: 96 but for keyPress keyCode is 65) 
 */
const _universalFakeKeyCode: number = 65; // a in ASCII
const _supportedInputTypes: string[] = ["text", "password", "search", "url", "tel"];
const _wheelScrollStep: number = 100;

/*
const keyCodesOfCharactersWhichMatchesKeyCodesOfNonWritingKeys = [
    33, // "!" vs PageUp
    34, // ' "" ' vs PageDown
    35, // "#" vs End
    36, // "$" vs Home
    37, // "&" vs leftArrow
    38, // "'" vs rightArrow
    39, // "(" vs downArrow
    40, // ")" vs upArrow
    46, // "." vs Delete
]
*/

class BBot implements t.IBBBot {
    /**
     * Because it is not possible to trigger native copy/pase/cut
     * (execCommand will no do the action because it was not initiated by user action
     * new Event("copy/paste/cut") and dispatching it does not work as well probably for the same reason
     * and clipboard API is currently supported only by Chrome and Firefox and must be also allowed in the browser)
     * there is no other way handle clipboard actions than handling it manually internally by
     * keeping and remembering copied/cut value in virtual clipboard.
     * 
     * NOTE: No style or format is copied, just text itself. 
     * 
     * => No way to have get value from outside of the page. 
     * 
     * TODO: create bobril library for clipboard actions and find the way
     * how to create (mock) the clipboard event object manually if it is even possible.   
     */
    private clipboard!: string;
    private pressedAndHoldKeys!: number[];
    private pressedAndHoldMouseButtons!: {
        left: boolean;
        right: boolean;
        wheel: boolean;
    }
    /**
     * StartPos indicates where the selection begins. 
     * If startPos is higher then endPos then backwards selection is applied.
     */
    private selectedPosition!: { startPos: number; endPos: number };
    private cursorOnVNode!: b.IBobrilCacheNode | undefined;
    private cursorCoordinates!: t.ICoordinates;
    private settings!: t.IBotSettings;

    constructor(settings?: t.IBotSettings) {
        this.setBotInitialState();
        settings
            ? this.updateSettings(settings)
            : this.setBotInitialSettings();
    }

    // ============================================= // 
    //      Click User Action Section - PUBLIC       //
    // ============================================= //

    public emitLeftMouseClickOnHTMLElement(
        elm: HTMLElement,
        maxNextActionDelayMS?: number,
        terminateAfterFirstInvalidate?: boolean,
        coordinatesInElm?: t.ICoordinates
    ): Promise<void> {
        return this.processClickOnElement(elm, t.MouseButton.Left, false, maxNextActionDelayMS, terminateAfterFirstInvalidate, coordinatesInElm);
    }

    public emitLeftMouseClickOnCoordinates(
        x: number,
        y: number,
        maxNextActionDelayMS?: number,
        terminateAfterFirstInvalidate?: boolean
    ): Promise<void> {
        return this.processClickOnCoord(x, y, t.MouseButton.Left, false, maxNextActionDelayMS, terminateAfterFirstInvalidate);
    }

    public emitLeftMouseDoubleClickOnSpecificHTMLElement(
        elm: HTMLElement,
        maxNextActionDelayMS?: number,
        terminateAfterFirstInvalidate?: boolean,
        coordinatesInElm?: t.ICoordinates
    ): Promise<void> {
        return this.processClickOnElement(elm, t.MouseButton.Left, true, maxNextActionDelayMS, terminateAfterFirstInvalidate, coordinatesInElm);
    }

    public emitLeftMouseDoubleClickOnCoordinates(
        x: number,
        y: number,
        maxNextActionDelayMS?: number,
        terminateAfterFirstInvalidate?: boolean
    ): Promise<void> {
        return this.processClickOnCoord(x, y, t.MouseButton.Left, true, maxNextActionDelayMS, terminateAfterFirstInvalidate);
    }

    public emitRightMouseClickOnHTMLElement(
        elm: HTMLElement,
        maxNextActionDelayMS?: number,
        terminateAfterFirstInvalidate?: boolean,
        coordinatesInElm?: t.ICoordinates
    ): Promise<void> {
        return this.processClickOnElement(elm, t.MouseButton.Right, false, maxNextActionDelayMS, terminateAfterFirstInvalidate, coordinatesInElm);
    }

    public emitRightMouseClickOnCoordinates(
        x: number,
        y: number,
        maxNextActionDelayMS?: number,
        terminateAfterFirstInvalidate?: boolean
    ): Promise<void> {
        return this.processClickOnCoord(x, y, t.MouseButton.Right, false, maxNextActionDelayMS, terminateAfterFirstInvalidate);
    }

    public emitWheelClickOnHTMLElement(
        elm: HTMLElement,
        maxNextActionDelayMS?: number,
        terminateAfterFirstInvalidate?: boolean,
        coordinatesInElm?: t.ICoordinates
    ): Promise<void> {
        return this.processClickOnElement(elm, t.MouseButton.Wheel, false, maxNextActionDelayMS, terminateAfterFirstInvalidate, coordinatesInElm);
    }

    public emitWheelClickOnCoordinates(
        x: number,
        y: number,
        maxNextActionDelayMS?: number,
        terminateAfterFirstInvalidate?: boolean
    ): Promise<void> {
        return this.processClickOnCoord(x, y, t.MouseButton.Wheel, false, maxNextActionDelayMS, terminateAfterFirstInvalidate);
    }

    public async emitLeftMousePressAndHold(targetInfo: t.MouseActionTarget | undefined): Promise<void> {
        let elm: HTMLElement | undefined | null;
        let vNode: b.IBobrilCacheNode | undefined | null;
        let coordsRel: t.ICoordinates = { x: -9999, y: -9999 };

        if (!targetInfo) {
            vNode = this.cursorOnVNode;
            elm = vNode ? vNode.element as HTMLElement : undefined;
        }

        else if (!targetInfo.target) {
            const coordsAbs = targetInfo.coordinates!;
            h.scrollIfCoordOutOfViewport(coordsAbs.x, coordsAbs.y);

            coordsRel = { x: coordsAbs.x - pageXOffset, y: coordsAbs.y - pageYOffset };
            elm = document.elementFromPoint(coordsRel.x, coordsRel.y) as HTMLElement | null;
            vNode = b.deref(elm);
        } else {
            const coordsInELm = targetInfo.coordinates;

            if (targetInfo.target instanceof HTMLElement) {
                elm = targetInfo.target;
            } else {
                vNode = targetInfo.target;
                if (!b.getDomNode(vNode))
                    return;
                elm = b.getDomNode(vNode) as HTMLElement;
            }

            h.scrollToElmIfNecessary(elm, coordsInELm, this.getAutoScrollSettings());

            coordsRel = h.enhanceCoordinates(h.getPointerActionPosition(elm), coordsInELm);
            elm = this.getMouseTopMostElmActionSettings()
                ? document.elementFromPoint(coordsRel.x, coordsRel.y) as HTMLElement
                : elm;
            vNode = b.deref(elm);
        }

        if (!elm || !vNode) {
            this.cursorOnVNode = undefined;
            this.cursorCoordinates = coordsRel;
            await h.carryOnActionChain();
            return;
        }

        this.processMousePressPipeline(elm, vNode, t.MouseButton.Left, coordsRel);
        await h.carryOnActionChain();
    }

    public async emitLeftMouseRelease(): Promise<void> {
        const vNode = this.cursorOnVNode;
        const elm = vNode ? vNode.element as HTMLElement : undefined;

        if (!elm || !vNode) {
            await h.carryOnActionChain();
            return;
        }
        // the screen should be already scrolled properly 
        this.processMouseReleasePipeline(elm, vNode, t.MouseButton.Left, this.cursorCoordinates);
        await h.carryOnActionChain();
    }

    public async emitDragAndDrop(
        sourceInfo: t.MouseActionTarget,
        targetInfo: t.MouseActionTarget,
        maxNextActionDelayMS?: number,
        terminateAfterFirstInvalidate?: boolean
    ): Promise<void> {
        /**
         * TODO: pull out emitLeftMousePressAndHold and emitLeftMouseRelease
         * into private methods and use them here as well. 
         */
        let sElm: HTMLElement | undefined | null;
        let tElm: HTMLElement | undefined | null;
        let sVNode: b.IBobrilCacheNode | undefined | null;
        let tVNode: b.IBobrilCacheNode | undefined | null;
        let sCoordsRel: t.ICoordinates = { x: -9999, y: -9999 };
        let tCoordsRel: t.ICoordinates = { x: -9999, y: -9999 };

        // handling press (drag) pipeline

        if (!sourceInfo.target) {
            const coordsAbs = sourceInfo.coordinates!;
            h.scrollIfCoordOutOfViewport(coordsAbs.x, coordsAbs.y);

            sCoordsRel = { x: coordsAbs.x - pageXOffset, y: coordsAbs.y - pageYOffset };
            sElm = document.elementFromPoint(sCoordsRel.x, sCoordsRel.y) as HTMLElement | null;
            sVNode = b.deref(sElm);
        } else {
            const coordsInELm = sourceInfo.coordinates;

            if (sourceInfo.target instanceof HTMLElement) {
                sElm = sourceInfo.target;
            } else {
                sVNode = sourceInfo.target;
                if (!b.getDomNode(sVNode))
                    return;
                sElm = b.getDomNode(sVNode) as HTMLElement;
            }

            h.scrollToElmIfNecessary(sElm, coordsInELm, this.getAutoScrollSettings());

            sCoordsRel = h.enhanceCoordinates(h.getPointerActionPosition(sElm), coordsInELm);
            sElm = this.getMouseTopMostElmActionSettings()
                ? document.elementFromPoint(sCoordsRel.x, sCoordsRel.y) as HTMLElement
                : sElm;
            sVNode = b.deref(sElm);
        }

        if (!sElm || !sVNode) {
            this.cursorOnVNode = undefined;
            this.cursorCoordinates = sCoordsRel;
            await h.carryOnActionChain();
            return;
        }

        this.hoverElmInternal(sElm, sVNode, sCoordsRel, true);
        this.processMousePressPipeline(sElm, sVNode, t.MouseButton.Left, sCoordsRel);
        await h.carryOnActionChain();

        // handling drop (button release) pipeline

        if (!targetInfo.target) {
            const coordsAbs = targetInfo.coordinates!;
            h.scrollIfCoordOutOfViewport(coordsAbs.x, coordsAbs.y);

            tCoordsRel = { x: coordsAbs.x - pageXOffset, y: coordsAbs.y - pageYOffset };
            tElm = document.elementFromPoint(tCoordsRel.x, tCoordsRel.y) as HTMLElement | null;
            tVNode = b.deref(tElm);
        }
        else {
            const coordsInELm = targetInfo.coordinates;

            if (targetInfo.target instanceof HTMLElement) {
                tElm = targetInfo.target;
            } else {
                tVNode = targetInfo.target;
                if (!b.getDomNode(tVNode))
                    return;
                tElm = b.getDomNode(tVNode) as HTMLElement;
            }

            h.scrollToElmIfNecessary(tElm, coordsInELm, this.getAutoScrollSettings());

            tCoordsRel = h.enhanceCoordinates(h.getPointerActionPosition(tElm), coordsInELm);
            tElm = this.getMouseTopMostElmActionSettings()
                ? document.elementFromPoint(tCoordsRel.x, tCoordsRel.y) as HTMLElement
                : tElm;
            tVNode = b.deref(tElm);
        }

        if (!tElm || !tVNode) {
            this.cursorOnVNode = undefined;
            this.cursorCoordinates = tCoordsRel;
            await h.carryOnActionChain();
            return;
        }

        this.hoverElmInternal(tElm, tVNode, tCoordsRel, true);
        this.processMouseReleasePipeline(tElm, tVNode, t.MouseButton.Left, tCoordsRel);

        await h.carryOnActionChain(
            this.getMaxActionDelayMS("mouse", maxNextActionDelayMS),
            this.getContinueOnInvalidationFinished("mouse", terminateAfterFirstInvalidate)
        );
        b.syncUpdate();
    }

    // =========================================== //
    //      Mouse Move User Action - PUBLIC        //         
    // =========================================== //

    public async pointerMoveToElm(
        elm: HTMLElement,
        maxNextActionDelayMS?: number,
        terminateAfterFirstInvalidate?: boolean,
        coordinatesInElm?: t.ICoordinates
    ): Promise<void> {
        /*
            Scroll if necessary (elm is out of viewport
            or nested in another scrollable elm and 
            not visible)
        */
        h.scrollToElmIfNecessary(elm, coordinatesInElm, this.getAutoScrollSettings());
        /*
            It is also necessary to check whether the element 
            is the topmost element, because that one should be clicked.
            Note: elementFromPoint method returns only elm within the viewport
            => relative coordinates (ignores scroll) and also browser returns in event
            relative coordinates so it is necessary to use relative coords of the element.
        */
        const coordsRel = h.enhanceCoordinates(h.getPointerActionPosition(elm), coordinatesInElm);
        const topmostElm: HTMLElement | null = document.elementFromPoint(coordsRel.x, coordsRel.y) as HTMLElement | null;
        const topMostElmVNode: b.IBobrilCacheNode | undefined = b.deref(topmostElm);

        this.hoverElmInternal(topmostElm, topMostElmVNode, coordsRel);

        await h.carryOnActionChain(
            this.getMaxActionDelayMS("mouse", maxNextActionDelayMS),
            this.getContinueOnInvalidationFinished("mouse", terminateAfterFirstInvalidate)
        );
        b.syncUpdate();
    }

    public async pointerMoveToCoordinates(
        x: number,
        y: number,
        maxNextActionDelayMS?: number,
        terminateAfterFirstInvalidate?: boolean
    ): Promise<void> {
        h.scrollIfCoordOutOfViewport(x, y);
        const coordsRel: t.ICoordinates = { x: x - pageXOffset, y: y - pageYOffset };
        const elm = document.elementFromPoint(coordsRel.x, coordsRel.y) as HTMLElement | null;
        const vNode = b.deref(elm);

        this.hoverElmInternal(elm, vNode, coordsRel);
        await h.carryOnActionChain(
            this.getMaxActionDelayMS("mouse", maxNextActionDelayMS),
            this.getContinueOnInvalidationFinished("mouse", terminateAfterFirstInvalidate)
        );
        b.syncUpdate();
    }

    // ====================================== //
    //      SCROLL User Action - PUBLIC       //
    // ====================================== //

    public async scrollElmUpByWheelUp(elm: HTMLElement, maxNextActionDelayMS?: number, terminateAfterFirstInvalidate?: boolean): Promise<void> {
        this.scrollVerticallyInternal(elm, _wheelScrollStep, false, false, true);
        await h.carryOnActionChain(
            this.getMaxActionDelayMS("mouse", maxNextActionDelayMS),
            this.getContinueOnInvalidationFinished("mouse", terminateAfterFirstInvalidate)
        );
    }

    public async scrollElmDownByWheelDown(elm: HTMLElement, maxNextActionDelayMS?: number, terminateAfterFirstInvalidate?: boolean): Promise<void> {
        this.scrollVerticallyInternal(elm, _wheelScrollStep, true, false, true);
        await h.carryOnActionChain(
            this.getMaxActionDelayMS("mouse", maxNextActionDelayMS),
            this.getContinueOnInvalidationFinished("mouse", terminateAfterFirstInvalidate)
        );
    }

    public async scrollElmUpByStep(elm: HTMLElement, pxStep: number, maxNextActionDelayMS?: number, terminateAfterFirstInvalidate?: boolean): Promise<void> {
        this.scrollVerticallyInternal(elm, pxStep, false, false);
        await h.carryOnActionChain(
            this.getMaxActionDelayMS("synthetic", maxNextActionDelayMS),
            this.getContinueOnInvalidationFinished("mouse", terminateAfterFirstInvalidate)
        );
    }

    public async scrollElmDownByStep(elm: HTMLElement, pxStep: number, maxNextActionDelayMS?: number, terminateAfterFirstInvalidate?: boolean): Promise<void> {
        this.scrollVerticallyInternal(elm, pxStep, true, false);
        await h.carryOnActionChain(
            this.getMaxActionDelayMS("synthetic", maxNextActionDelayMS),
            this.getContinueOnInvalidationFinished("mouse", terminateAfterFirstInvalidate)
        );
    }

    public async scrollElmVerticallyExact(elm: HTMLElement, finalScrollTop: number, maxNextActionDelayMS?: number, terminateAfterFirstInvalidate?: boolean): Promise<void> {
        this.scrollVerticallyInternal(elm, finalScrollTop, true, true);
        await h.carryOnActionChain(
            this.getMaxActionDelayMS("synthetic", maxNextActionDelayMS),
            this.getContinueOnInvalidationFinished("mouse", terminateAfterFirstInvalidate)
        );
    }

    public async scrollElmLeftByStep(elm: HTMLElement, pxStep: number, maxNextActionDelayMS?: number, terminateAfterFirstInvalidate?: boolean): Promise<void> {
        this.scrollHorizontallyInternal(elm, pxStep, false, false);
        await h.carryOnActionChain(
            this.getMaxActionDelayMS("synthetic", maxNextActionDelayMS),
            this.getContinueOnInvalidationFinished("mouse", terminateAfterFirstInvalidate)
        );
    }

    public async scrollElmRightByStep(elm: HTMLElement, pxStep: number, maxNextActionDelayMS?: number, terminateAfterFirstInvalidate?: boolean): Promise<void> {
        this.scrollHorizontallyInternal(elm, pxStep, true, false);
        await h.carryOnActionChain(
            this.getMaxActionDelayMS("synthetic", maxNextActionDelayMS),
            this.getContinueOnInvalidationFinished("mouse", terminateAfterFirstInvalidate)
        );
    }

    public async scrollElmHorizontallyExact(elm: HTMLElement, finalScrollLeft: number, maxNextActionDelayMS?: number, terminateAfterFirstInvalidate?: boolean): Promise<void> {
        this.scrollHorizontallyInternal(elm, finalScrollLeft, false, true);
        await h.carryOnActionChain(
            this.getMaxActionDelayMS("synthetic", maxNextActionDelayMS),
            this.getContinueOnInvalidationFinished("mouse", terminateAfterFirstInvalidate)
        );
    }

    // ============================================== // 
    //      Keyboard User Action Section - PUBLIC     //
    // ============================================== //

    public async writeExpression(
        expression: string | number,
        maxNextActionDelayMS?: number,
        terminateAfterFirstInvalidate?: boolean,
        usedDelayForEachLetter?: boolean
    ): Promise<void> {
        if (typeof expression === "number")
            expression = expression.toString();
        for (let i = 0; i < expression.length; i++) {
            const keyCode: number = expression[i].charCodeAt(0);
            const useDelay: boolean = (i === expression.length - 1 || usedDelayForEachLetter === true);
            const delay = useDelay
                ? this.getMaxActionDelayMS("keyboard", maxNextActionDelayMS)
                : this.getMaxActionDelayMS("keyboard", maxNextActionDelayMS) / expression.length

            /*
                For each letter there is emitted one event handling cycle. But in reality 
                there are special chars that can be written only by combination of pressing
                of more keys (e.g "ň" - press and hold Shift, then press "ˇ" and release Shift and then press "n"  => three keys pressed).
                This is not simulated, each char has only one cycle.
            */
            await this.emitKeyPress(
                keyCode,
                delay,
                useDelay ? this.getContinueOnInvalidationFinished("keyboard", terminateAfterFirstInvalidate) : undefined,
                true
            );
        }
    }

    public async emitKeyPress(
        keyCode: number,
        maxNextActionDelayMS?: number,
        terminateAfterFirstInvalidate?: boolean,
        fakeWriting?: boolean
    ): Promise<void> {
        this.emitKeyPressAndHoldInternal(keyCode, fakeWriting);
        this.emitKeyReleaseInternal(keyCode);

        await h.carryOnActionChain(
            this.getMaxActionDelayMS("keyboard", maxNextActionDelayMS),
            this.getContinueOnInvalidationFinished("keyboard", terminateAfterFirstInvalidate)
        );
        b.syncUpdate();
    }

    public async emitKeyPressAndHold(keyCode: number): Promise<void> {
        this.emitKeyPressAndHoldInternal(keyCode);

        await h.carryOnActionChain();
        b.syncUpdate();
    }

    public async emitKeyRelease(keyCode: number): Promise<void> {
        this.emitKeyReleaseInternal(keyCode);
        await h.carryOnActionChain();
        b.syncUpdate();
    }

    // ===================== //
    //       BOT UTILS       //
    // ===================== //

    public getVirtualCursorPosition(): t.ICoordinates {
        return this.cursorCoordinates;
    }

    public getCurrentSettings(): t.IBotSettings {
        return this.settings;
    }

    public updateSettings(settings: t.IBotSettings, rewrite?: boolean): void {
        this.settings = rewrite
            ? settings
            : { ...this.settings, ...settings }
    }

    public resetState(): void {
        this.setBotInitialState();
    }

    public resetSettings(): void {
        this.setBotInitialSettings();
    }

    public resetBot(): void {
        this.setBotInitialSettings();
        this.setBotInitialState();
    }

    public setClipboard(value: string): void {
        this.clipboard = value;
    }


    // ============================ //
    //       PRIVATE SECTION        //
    // ============================ //



    // ================== //
    //        CLICK       //
    // ================== //

    private async processClickOnElement(
        elm: HTMLElement,
        whichMouse: t.MouseButton,
        doubleClick?: boolean,
        maxNextActionDelayMS?: number,
        terminateAfterFirstInvalidate?: boolean,
        coordinatesInElm?: t.ICoordinates
    ): Promise<void> {
        /*
        * TODO: normalize coordinates for cases when user accidentally 
        * inserts negative values or values out of the elms dimensions.
        */
        h.scrollToElmIfNecessary(elm, coordinatesInElm, this.getAutoScrollSettings());

        const coordRel = h.enhanceCoordinates(h.getPointerActionPosition(elm), coordinatesInElm);
        const elmToClick = this.getMouseTopMostElmActionSettings()
            ? document.elementFromPoint(coordRel.x, coordRel.y) as HTMLElement
            : elm
        const vNode: b.IBobrilCacheNode | undefined = b.deref(elmToClick);

        await this.emitClickEvent(elmToClick, vNode, whichMouse, coordRel, doubleClick, maxNextActionDelayMS, terminateAfterFirstInvalidate);
    }

    private async processClickOnCoord(
        x: number, // absolute x coordinate
        y: number, // absolute y coordinate
        whichMouse: t.MouseButton,
        doubleClick?: boolean,
        maxNextActionDelayMS?: number,
        terminateAfterFirstInvalidate?: boolean
    ): Promise<void> {
        h.scrollIfCoordOutOfViewport(x, y);
        const coordsRel: t.ICoordinates = { x: x - pageXOffset, y: y - pageYOffset };
        const elm = document.elementFromPoint(coordsRel.x, coordsRel.y) as HTMLElement | null;
        const vNode = b.deref(elm);

        await this.emitClickEvent(
            elm,
            vNode,
            whichMouse,
            coordsRel,
            doubleClick,
            maxNextActionDelayMS,
            terminateAfterFirstInvalidate
        );
    }

    private async emitClickEvent(
        elm: HTMLElement | null,
        vNode: b.IBobrilCacheNode | undefined,
        whichMouse: t.MouseButton,
        clickedCoord: t.ICoordinates, // Must be relative to the viewport because browser sends relative coord in event object.
        doubleClick?: boolean,
        maxNextActionDelayMS?: number,
        terminateAfterFirstInvalidate?: boolean
    ): Promise<void> {
        if (!elm || !vNode) {
            /*
                No element (e.g. inserted wrong x or y coordinates if calling click on specific coord)
                so there is no action to do so carry on immediately. 
            */
            this.cursorOnVNode = undefined;
            this.cursorCoordinates = clickedCoord; // coords can be on document element or body so the coord is valid

            /**
             * TODO:
             * In most cases blur() will cause browser to trigger blur event
             * which bobril catches and then handle all necessities focus automatically.
             * Bot there were situations in some bobwai tests, when this did not trigger blur
             * event. (combobox editor i think) => investigate and if blur() not usable,
             * handle blur on bobril level manually.
             */
            //document.activeElement && (document.activeElement as HTMLElement).blur();
            await h.carryOnActionChain();
            return;
        }

        if (doubleClick) {
            /*
                In browser when double click is initiated it is first processed twice single click cycle with related events (pointerDown,pointerUp etc.)
                and after this is triggered dblclick handler.   
            */
            await this.emitClickEventInternal(elm, vNode, t.MouseButton.Left, clickedCoord);
            await this.emitClickEventInternal(elm, vNode, t.MouseButton.Left, clickedCoord);
            await this.emitClickEventInternal(elm, vNode, t.MouseButton.Left, clickedCoord, true);
        } else
            await this.emitClickEventInternal(elm, vNode, whichMouse, clickedCoord);

        await h.carryOnActionChain(
            this.getMaxActionDelayMS("mouse", maxNextActionDelayMS),
            this.getContinueOnInvalidationFinished("mouse", terminateAfterFirstInvalidate)
        );
        b.syncUpdate();
    }

    private async emitClickEventInternal(
        elm: HTMLElement,
        vNode: b.IBobrilCacheNode,
        whichMouse: t.MouseButton,
        clickedCoord: t.ICoordinates,
        doubleClick?: boolean
    ): Promise<void> {
        this.cursorOnVNode = vNode;
        this.cursorCoordinates = clickedCoord;
        /*
            Emitting all events carried by user click action in accurate order as would browser do.
            On PointerDown or Up Bobril also calls MouseDown and Up as well. This does bobril internally itself and 
            returns true (as preventing) if one or both of them returns true. 
            
            It is also called pointerMove to clicked coordinates because in real it is necessary to move
            cursor on the specific elm before click. This also calls all linked events (handlers) of mouse
            and elm hover action (mouseOut, mouseIn, mouseLeave, mouseEnter, mouseOver)
        */
        this.hoverElmInternal(elm, vNode, clickedCoord, true);
        b.syncUpdate(); // probably necessary to call syncUpdate after all hoverInternal which is done before the actual mousedown action

        this.processMousePressPipeline(elm, vNode, whichMouse, clickedCoord, doubleClick);
        this.processMouseReleasePipeline(elm, vNode, whichMouse, clickedCoord, doubleClick);
        await h.carryOnActionChain();
    }

    private processMousePressPipeline(
        elm: HTMLElement,
        vNode: b.IBobrilCacheNode,
        whichMouse: t.MouseButton,
        clickedCoord: t.ICoordinates,
        doubleClick?: boolean
    ): void {
        /*
            In browser double click is possible to trigger only via double fast click by left mouse button.
            Two single clicks cycles are done and after that is triggered double click handler itself.  
        */
        if (doubleClick && whichMouse === t.MouseButton.Left) {
            b.emitEvent(t.EventHandlers.leftDoubleClickHandlerName, this.createMouseEventObj(whichMouse, clickedCoord, elm, doubleClick), elm, vNode);
            return;
        }

        this.setMouseButtonPressState(whichMouse, true);
        /*
            Emitting all events carried by user click action in accurate order as would browser do.
            On PointerDown or Up Bobril also calls MouseDown and Up as well. This does bobril internally itself and 
            returns true (as preventing) if one or both of them returns true. 
            
            It is also called pointerMove to clicked coordinates because in real it is necessary to move
            cursor on the specific elm before click. This also calls all linked events (handlers) of mouse
            and elm hover action (mouseOut, mouseIn, mouseLeave, mouseEnter, mouseOver)
            this.hoverElmInternal(elm, vNode, clickedCoord);
        */


        if (h.isDisabled(elm))
            return;

        const prevent: boolean = b.emitEvent(t.EventHandlers.pointerDownHandlerName, this.createPointerEventObj(whichMouse, clickedCoord, elm, doubleClick), elm, vNode);
        /*
            If already prevented don't even try to process BLUR, FOCUS or SELECTSTART
        */
        if (!prevent) {
            /**
             * TODO: investigate whether multiple blurs or focus related events are not called on component.
             * Investigate another approach - if should blur, just focus body (browser does it as well) (just elm.blur) 
             * then native blur event will trigger and bobril will handle it (fire emitOnFocusChange).
             * Then fire native focus on target elm which will trigger native focus event 
             * and bobril will handle this change via calling emitOnFocusChange again. 
             */
            /*
                Emit Blur event on currently focused element if there is some focused element and clicked element is not currently focused one.
            */
            h.shouldBlur(elm, vNode) && b.emitEvent(t.EventHandlers.blurHandlerName, {}, h.getActiveHTMLElement(), h.getActiveVNode());
            /*
                Emit StartSelect event whether the clicked element is not focusable 
                !! (probably necessary to check whether it is not prevented by css user-select: none - also check pointer-event: none for clicking)
            */
            !h.isElmFocusable(elm, t.FocusableBy.MOUSE) && b.emitEvent(t.EventHandlers.selectStartHandlerName, {}, elm, vNode);
            /*
                Emit Focus event whether clicked element is focusable and is not currently focused - also really focus the desired elm.
                If element is not focused but also not focusable then the "body" element should be focused as browser usually do.
    
                (TODO: think of - revert the condition => when clicked on input elm (even already focused) put caret at the end (or start? => check))
            */
            // TODO: refactor the condition, this is just hotfix
            if (h.isElmFocusable(elm, t.FocusableBy.MOUSE)) {
                if (!h.isElmAlreadyFocused(elm, vNode)) {
                    elm.focus(); // if b.focus had better check for focusable elm (content editable missing i think) it would be better to call b.focus...it would handle all blur and focus events itself
                    b.emitEvent(t.EventHandlers.focusHandlerName, {}, elm, vNode);
                }
                /*
                    Setting the caret position to the start
                    if elm is focusable and some text editable elm.
                    (unlike browser there is not distinguished whether it is single or double click.
                    The browser on double click selects whole clicked word (or white space if clicked) - not supported (TODO?)
                    Also it is not possible to click to some specific position inside the element and place caret there.)
                */
                if (h.isElmSomeTextEditableElm(elm))
                    this.setCaretPosition(elm, 0);
            } else {
                const nearestFocusableParent: HTMLElement | null = h.getFirstFocusableParent(elm, t.FocusableBy.MOUSE);
                const nearestFocusableParentNode: b.IBobrilCacheNode = b.deref(nearestFocusableParent)!;
                if (nearestFocusableParent) {
                    nearestFocusableParent.focus();
                    b.emitEvent(t.EventHandlers.focusHandlerName, {}, elm, nearestFocusableParentNode);
                } else
                    (document.activeElement as HTMLElement).blur();
                if (h.isElmSomeTextEditableElm(elm))
                    this.setCaretPosition(elm, 0);
            }
        }
    }

    private processMouseReleasePipeline(
        elm: HTMLElement,
        vNode: b.IBobrilCacheNode,
        whichMouse: t.MouseButton,
        clickedCoord: t.ICoordinates,
        doubleClick?: boolean
    ): void {
        if (doubleClick && whichMouse === t.MouseButton.Left)
            return;

        this.setMouseButtonPressState(whichMouse, false);

        if (h.isDisabled(elm))
            return;

        b.emitEvent(t.EventHandlers.pointerUpHandlerName, this.createPointerEventObj(whichMouse, clickedCoord, elm, false), elm, vNode);

        const clickHandlerName = h.getClickHandlerName(whichMouse);
        /*
            Emit Click event whether user action was initiated with left(triggers click listener) or right mouse button(triggers contextmenu listener),
            wheel button does not trigger any click listener, only pointer or mouse listeners. 
        */
        clickHandlerName && b.emitEvent(clickHandlerName, this.createMouseEventObj(whichMouse, clickedCoord, elm, false), elm, vNode);
        /*
            Bobril registers two event listeners on "click" user event. Therefore if click is done via left mouse button
            it is necessary to trigger the second click handler as well.  
        */
        if (clickHandlerName === t.EventHandlers.leftClickHandlerName) {
            b.emitEvent(t.EventHandlers.secondClickHandler, { type: "click" }, elm, vNode);
            /*
                In browser when the clicked element is inside the label element and also it is not input or textarea (otherwise click would be done on the inner element itself)
                browser triggers all listeners derived from user click initiation on that element (already done above)
                but then finds the first input or textarea element inside label, triggers "click" listener on it 
                which focuses it and if input is type of radio button or checkbox it also sets value of it to its opposite value.   
                NOTE: only for left single click
            */
            this.handleLabelClickIfNecessary(vNode, clickedCoord);
            /*
                If the clicked element is radio button or checkbox and the click should be done directly on it (not label or other non-focusable elm in label)
                it is necessary to change its value and also emit bobril handlers for "input" and "change" event.
            */
            this.handleRadioOrCheckboxClickIfNecessary(elm as HTMLInputElement, vNode);
        }
    }

    private handleLabelClickIfNecessary(vNode: b.IBobrilCacheNode | undefined, clickedCoord: t.ICoordinates): void {
        /*  
            If input or textarea the click event was already properly served.
            Otherwise it is necessary to check if elm is nested in the label and if it is
            then must be found first input or textarea elm to handle.
        */
        if (!vNode || vNode.element && ["input", "textarea"].indexOf((vNode.element as HTMLElement).tagName.toLowerCase()) > -1)
            return;

        const parentLabel: b.IBobrilCacheNode | undefined = h.getParentLabel(vNode);

        if (parentLabel) {
            /*
                Get first input or textArea element and handle it properly.
                =>  Focus it (and blur currently focused element if clicked elm inside label is focusable), 
                    trigger "click" and "^click" handlers 
                    and if it is radio or checkbox it is necessary to set current value to opposite and 
                    trigger "input" and "change" handlers.
                    TODO: handle when "for" attribute is used
            */
            const nodeToServe: b.IBobrilCacheNode | undefined = h.getFirstInputOrTextAreaElm(parentLabel);
            const elm: HTMLElement | undefined = (nodeToServe && nodeToServe.element as HTMLElement) || undefined;
            if (nodeToServe && elm) {
                h.shouldBlur(elm, nodeToServe) && b.emitEvent(t.EventHandlers.blurHandlerName, {}, h.getActiveHTMLElement(), h.getActiveVNode());
                elm.focus();
                b.emitEvent(t.EventHandlers.focusHandlerName, {}, elm, nodeToServe);
                b.emitEvent(t.EventHandlers.leftClickHandlerName, this.createMouseEventObj(t.MouseButton.Left, clickedCoord, elm), elm, nodeToServe);
                b.emitEvent(t.EventHandlers.secondClickHandler, this.createMouseEventObj(t.MouseButton.Left, clickedCoord, elm), elm, nodeToServe);
                this.handleRadioOrCheckboxClickIfNecessary(elm as HTMLInputElement, nodeToServe);
            }
        }
    }

    private handleRadioOrCheckboxClickIfNecessary(elm: HTMLInputElement, vNode: b.IBobrilCacheNode | undefined): void {
        const type: string | null = elm.getAttribute("type");
        if (
            elm.tagName.toLowerCase() === "input" &&
            type && ["radio", "checkbox"].indexOf(type) > -1
        ) {
            /*
             * Set opposite value for checkbox every time but for radio only if it is not already checked
             */
            if (type !== "radio" || (type === "radio" && !elm.checked)) {
                elm.checked = !elm.checked;

                b.emitEvent(t.EventHandlers.inputHandlerName, { type: "input" }, elm, vNode);
                b.emitEvent(t.EventHandlers.changeHandlerName, { type: "change" }, elm, vNode);
            }
        }
    }

    /**
     * It is necessary to have separate event objects for pointer and mouse events.
     * E.g.: Pointer events caries some more properties which Click event does not.  
     */
    private createMouseEventObj(
        whichMouse: t.MouseButton,
        clickedCoord: t.ICoordinates,
        target: HTMLElement | undefined,
        doubleClick?: boolean,
        pointerOrMouseEvent?: boolean,
        calledFromMove?: boolean
    ): t.IMouseEventInternal {
        let clickCount = 0;
        if (whichMouse !== t.MouseButton.None)
            clickCount = doubleClick ? 2 : 1;
        /**
         * It is necessary to hand over the native like event object
         * because bobril transfers it into internal synthetic event object itself.
         */
        return {
            x: clickedCoord.x,
            y: clickedCoord.y,
            /**
             * Native event returns values 0-2 (but for which 1-3).
             * If it's called from mouse(pointer)Move handler it is necessary to return +1 value
             * otherwise if the mouse button is being pressed and hold 
             * bobril would think that browser forgot to fire pointerUp
             * event and fire it internally itself.
             * This would reset (remove) dnd object and DnD would be wrongly prevented.  
             */
            button: calledFromMove ? whichMouse : whichMouse - 1,
            /**
             * Sum of all mouse button indicators pressed together. 
             * Uses values from which prop => left and right pressed => 1+2=3.
             * Because of bot does not support combine multiple buttons click it will return which prop value instead.
             */
            buttons: whichMouse,
            shiftKey: this.isKeyPressedAndHold(t.KeyCodes.Shift),
            ctrlKey: this.isKeyPressedAndHold(t.KeyCodes.Ctrl),
            altKey: this.isKeyPressedAndHold(t.KeyCodes.Alt),
            clientX: clickedCoord.x,
            clientY: clickedCoord.y,
            metaKey: false,
            /**
             * Actual count is returned only if "click" handler should be called,
             * for mouse and pointer handlers there is always 0.
             */
            detail: pointerOrMouseEvent ? 0 : clickCount,
            which: whichMouse, // native events return values 1-3 (button +1) 
            cancelable: true,
            target,
            /**
             * Since version 15.0 Bobril stores preventDefault
             * function of real event in the synthetic event and calls
             * it directly without checking if the method exists. 
             * Therefore it is necessary to include some preventDefault
             * callback function as well to not cause a crash. 
             * Since bot handles elements state of preventDefault itself
             * just some empty dummy callback will save the day.
             */
            preventDefault: () => { },
            stopPropagation: () => { }
        } as t.IMouseEventInternal
    }

    private createPointerEventObj(
        whichMouse: t.MouseButton,
        clickedCoord: t.ICoordinates,
        target: HTMLElement | undefined,
        doubleClick?: boolean,
        calledFromMove?: boolean
    ): t.IPointerEventInternal {
        return b.assign(
            this.createMouseEventObj(whichMouse, clickedCoord, target, doubleClick, false, calledFromMove),
            {
                pointerId: 1,
                pointerType: "mouse"
            } as t.IPointerEventInternal
        )
    }

    // coords are relative to viewport
    private hoverElmInternal(
        elm: HTMLElement | null | undefined,
        vNode: b.IBobrilCacheNode | null | undefined,
        coordinates: t.ICoordinates,
        forceSyncUpdate?: boolean
    ): void {
        if (
            !elm || !vNode
            || (
                coordinates.x === this.cursorCoordinates.x
                && coordinates.y === this.cursorCoordinates.y
            )
        )
            return;
        /*
            Browser separately triggers listeners for all mouse move and hover actions
            (mouseOver, mouseMove, mouseOut, mouseEnter, mouseLeave ...)
            But bobril only listens for pointermove event and the rest mouse events
            handles during pointermove event handling itself internally. 
        */
        this.cursorOnVNode = vNode;
        this.cursorCoordinates = coordinates;

        b.emitEvent(t.EventHandlers.pointerMoveHandlerName, this.createPointerEventObj(t.MouseButton.None, coordinates, elm, false, true), elm, vNode);
        forceSyncUpdate && b.syncUpdate();
    }

    private setMouseButtonPressState(whichMouse: number, state: boolean): void {
        switch (whichMouse) {
            case t.MouseButton.Left:
                this.pressedAndHoldMouseButtons.left = state;
                break;
            case t.MouseButton.Right:
                this.pressedAndHoldMouseButtons.right = state;
                break;
            case t.MouseButton.Wheel:
                this.pressedAndHoldMouseButtons.wheel = state;
                break;
        }
    }

    // ================= //
    //       SCROLL      //
    // ================= //

    /*
        Changing scroll position on HTML element will trigger scroll ev. listener
        which bobril catches itself so it is not necessary to call it manually here. 
    */

    private scrollVerticallyInternal(
        elm: HTMLElement,
        scrollPx: number,
        isDownDir: boolean = false,
        isExactPos: boolean = false,
        allowBubbling: boolean = false
    ) {
        if (scrollPx < 0)
            return;

        let scrollableElm = undefined;
        if (allowBubbling) {
            let elmTemp: HTMLElement | null = elm;
            while (!scrollableElm && elmTemp) {
                if (h.isVerticallyScrollable(elmTemp, isDownDir, isExactPos))
                    scrollableElm = elmTemp;
                else
                    elmTemp = elmTemp.parentElement;
            }
        } else
            scrollableElm = h.isVerticallyScrollable(elm, isDownDir, isExactPos) ? elm : undefined;
        if (scrollableElm) {
            scrollableElm.scrollTop = isExactPos
                ? scrollPx
                : (isDownDir ? scrollableElm.scrollTop + scrollPx : scrollableElm.scrollTop - scrollPx);
            h.scrollIfElmOutOfViewport(scrollableElm);
        }
    }

    private scrollHorizontallyInternal(
        elm: HTMLElement,
        scrollPx: number,
        isRightDir: boolean = false,
        isExactPos: boolean = false
    ) {
        if (scrollPx < 0)
            return;

        h.scrollIfElmOutOfViewport(elm);
        if (h.isHorizontallyScrollable(elm, isRightDir, isExactPos))
            elm.scrollLeft = isExactPos
                ? scrollPx
                : (isRightDir ? elm.scrollLeft + scrollPx : elm.scrollLeft - scrollPx);
    }

    // ================= //
    //      KEYPRESS     //
    // ================= //

    private emitKeyPressAndHoldInternal(keyCode: number, fakeWriting?: boolean): void {
        let activeKeys = this.pressedAndHoldKeys;
        let elm = h.getActiveHTMLElement();
        let vNode = h.getActiveVNode();
        let loopIntId: number | undefined;

        /*
            In general, when key is pressed and held browser fires cycle of event in certain interval 
            (keyDown only for non-writing keys, keyDown, keyPress and all input events if necessary).
            Start new press and hold cycle only for nonWritable keycode 
            (excluding Tab because by default TAB can focus non page elements like URL bar etc. - not possible by JS ) 
            and if the key is not already pressed and hold.
        */
        if (activeKeys.indexOf(keyCode) === -1) {
            this.processKeyPressPipeline(elm, vNode, keyCode, fakeWriting);
            activeKeys.push(keyCode);

            /**
             * When some key is pressed and held, browser fires keyDown event
             * (plus keyPress if it is writable key) and after short delay (approx. 200-250ms)
             * repeats this in short interval (approx. 36ms) over and over until the key 
             * is released or another one is pressed.
             */
            setTimeout(() => {
                /**
                 * Other keycode was pressed in the meantime
                 * or the original key was already released
                 * so no repeat loop is triggered.
                 */
                if (keyCode !== activeKeys[activeKeys.length - 1])
                    return;

                loopIntId = setInterval(() => {
                    elm = h.getActiveHTMLElement();
                    vNode = h.getActiveVNode();
                    /*
                        Repeating cycle can be active only for the last pressed key,
                        cannot be restored for some key pressed before even
                        if the last key is released sooner.
                        In situation like that, no cycle will be active
                        until new non-writable key is pressed and hold.
                    */
                    if (activeKeys[activeKeys.length - 1] === keyCode) {
                        this.processKeyPressPipeline(elm, vNode, keyCode);
                    }
                    else
                        clearInterval(loopIntId);
                }, 36);
            }, 250);
        }
        else if (loopIntId)
            clearInterval(loopIntId);
    }

    private emitKeyReleaseInternal(keyCode: number): void {
        let activeKeys = this.pressedAndHoldKeys;
        const idx = activeKeys.indexOf(keyCode);
        if (idx > -1) {
            this.processKeyReleasePipeline(h.getActiveHTMLElement(), h.getActiveVNode(), keyCode);
            /*
                After releasing some key, if the last pressed key is still pressed (released key is not the last pressed one)
                browser fires keyUp event (above) and stops for short period repeating cycle and then turns it again.
                If the released key is the last pressed key then repeating cycle is just stopped and not restored. 
                New non-writable key press and hold will start new cycle. 
                Therefore is simulated stop and press last pressed key again if it fits mentioned condition.
            */
            const lastPressedKey = activeKeys[activeKeys.length - 1];
            activeKeys[idx] = -1; // marks as released but still keeps record in the array to see whether the last pressed key is still active
            if (keyCode !== lastPressedKey && lastPressedKey !== -1)
                this.emitKeyPressAndHold(lastPressedKey);
        }
    }

    /*
        universalFakeKeyCode = 65 = "a" - just fake physical keyCode which is substracted to pointerDown and pointerUp handlers when simulating writing, 
        keyPress has the real keyCode of the specific char
        until I manage converting charCode to physical keyCode (if it is event possible). 
        Then can be even the "fakeWritingKeyCode" flag removed. 
        TODO: manage converting charCode to physical keyCode (if it is event possible - probably not directly from browser).
     */
    private processKeyPressPipeline(elm: HTMLElement, vNode: b.IBobrilCacheNode | undefined, keyCode: number, fakeWriting?: boolean): void {
        let prevented: boolean = false;
        /*
            Emitting all events carried by user keyPress action in accurate order as would browser do.
        */
        prevented = b.emitEvent(
            t.EventHandlers.keyDownHandlerName,
            this.createKeyboardEvent(!fakeWriting ? keyCode : _universalFakeKeyCode),
            elm,
            vNode
        );
        /*
            Emit KeyPress event if the pressed key is not non-writing key.
            Keypress event keycode is not actual keycode of keyboard key but actual char keycode from ASCII table.
            If the fakeWriting is active then the incoming keycode is actually converted char to ASCII code which 
            comes in keyPress event (other events send key of the keyboard) and some char codes are equal to some
            keyCodes => necessary to handle these cases.

            To be able to find out the actual char code from keycode it would be necessary to know 
            system state things like whether capsLock or numLock is active, which keyboard is set (e.g. ENG, CZ) 
            or whether some special characters was not preset before (e.g. umlauts which enhance next pressed character)
            => This is not possible from JS and even if it would it would be hardcore to get the character,
            therefore the only way how to actually write into native text editable elms is use "writeExpression" function.
        */
        if (!prevented && _nonWritingKeyCodes.indexOf(!fakeWriting ? keyCode : _universalFakeKeyCode) === -1 && !this.isKeyPressedAndHold(t.KeyCodes.Ctrl)) {
            prevented = b.emitEvent(
                t.EventHandlers.keyPressHandlerName,
                this.createKeyboardEvent(keyCode),
                elm,
                vNode
            );
            /*
                Handle writing if the proper key (keycode) is pressed.
                Recommended to use writing method only for writing for now,
                until I manage converting ASCII keycode (which browser returns in keypress event object) to physical keycode of the pressed key 
            */
            !prevented && this.handleWriting(elm, vNode, keyCode, fakeWriting);
        }
        /*
            There are keys which are specially handled before 
            (e.g. TAB, SPACE for checkboxes, arrows for Select ) 
            and some are handler after (e.g. arrows for radio button)
            but it is not necessary to follow accurately this behavior 
            (does not make actually any change of params (maybe value) of keyUp event).   
        */
        if (!prevented && !fakeWriting)
            /**
             * TODO: investigate:
             * In some cases there is triggered click event inside, 
             * so maybe i should return prevented too and called before keyPress event.
             */
            this.handleNonwrittingKeyPressEventSpecificallyToElement(elm, vNode, keyCode);
    }

    private processKeyReleasePipeline(
        elm: HTMLElement,
        vNode: b.IBobrilCacheNode | undefined,
        keyCode: number,
        fakeWriting?: boolean
    ): void {
        b.emitEvent(
            t.EventHandlers.keyUpHandlerName,
            this.createKeyboardEvent(!fakeWriting ? keyCode : _universalFakeKeyCode),
            elm,
            vNode
        );
    }

    private handleWriting(elm: HTMLElement, vNode: b.IBobrilCacheNode | undefined, keyCode: number, fakeWriting?: boolean): void {
        /*
            Browsers (or at least some of them) have reserved combination Shift + Ctrl + some key
            for special actions (page or browser nature actions). 
        */
        if (
            !h.isElmSomeTextEditableElm(elm)
            || (this.isKeyPressedAndHold(t.KeyCodes.Shift) && this.isKeyPressedAndHold(t.KeyCodes.Ctrl))
        )
            return;


        const tag = elm.tagName.toLowerCase();
        if (tag === "input" || tag === "textarea") {
            /**
             * Just a quick fix. Need to make more generic solution 
             * for all  input, textarea and contentEditable textBoxes.
             * It is also necessary to not relay on saved coordinates in bot, because
             * it could be changed from 3rd side so it is necessary to always check it.
             * Check: 
             * https://stackoverflow.com/questions/6249095/how-to-set-caretcursor-position-in-contenteditable-element-div/41034697#41034697
             * NOTE: to test it use bobwai combobox tests (e.g. "Clicking on cross icon when filtering is actived and ...")
             */
            this.selectedPosition.startPos = (elm as HTMLInputElement).selectionStart!;
            this.selectedPosition.endPos = (elm as HTMLInputElement).selectionEnd!;
        }

        const type = elm.getAttribute("type");
        const selectionStart: number = this.selectedPosition.startPos;
        const selectionEnd: number = this.selectedPosition.endPos;
        const isContentEditable: boolean = ["input", "textarea"].indexOf(tag) === -1 && elm.contentEditable === "true";
        const selectionApplied = Math.abs(selectionStart - selectionEnd) > 0;
        let currentTextContent: string = h.getTextEditableElmTextContent(elm);
        let resultVal: string = currentTextContent;

        /*
            Chrome from some reason restricted inputs and it is no longer possible to
            access and modify selectionStart element property on some input types.
            https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/setSelectionRange 
            => therefore input type number is now unsupported
        */
        if (tag === "input" && type && _supportedInputTypes.indexOf(type.toLowerCase()) === -1)
            /**
             * https://stackoverflow.com/questions/21177489/selectionstart-selectionend-on-input-type-number-no-longer-allowed-in-chrome
             * TODO: check the answer about changing type to text before using setSelectionRange and then setting it back 
             * (it is possible, i already checked, but it is necessary to trigger it asynchronously, eg. with timeout (even with 0 it works))
             */
            return;

        // mozna by se to ziskavani resultTextu slo fakt vytahnout do separe metody, ktery by se jen v parametrech poslalo, co ma pouzit jako replecator. - v podstate se deje vsude to samy, jen pri deletovani se neinsertuje nic
        if (keyCode === t.KeyCodes.Delete && !fakeWriting) {
            if (!selectionApplied) {
                /*
                    TODO:
                    If no selection is applied and CTRL is pressed
                    then Delete key removes whole/part of the word after current caret position.
                    (if caret in the middle of the word it removes the part of the word after caret).
                    It also removes all whiteSpaces after the removed word.
                    If the caret is currently on some white space it will do exactly the same
                    as described above including all white spaces to the next word
                    => erases all whiteSpaces to the next word and then removes this word also with all 
                    whiteSpaces after. 
                    NOTE: working with the same content as selection CTRL+SHIFT+right arrow.
                */
                if (this.pressedAndHoldKeys.indexOf(t.KeyCodes.Ctrl) !== -1) {

                }
                /*
                    If caret position is not at the end of elm content ()
                    next char is erased, caret position stays.  
                */
                if (selectionStart < currentTextContent.length)
                    resultVal = currentTextContent.substring(0, selectionStart) + currentTextContent.substring(selectionStart + 1);
            } else {
                /*
                    Erases all selected text and moves caret to proper position (min of selectionStart/End).
                */
                resultVal = currentTextContent.substring(0, Math.min(selectionStart, selectionEnd))
                    + currentTextContent.substring(Math.max(selectionStart, selectionEnd));
            }

            if (["input", "textarea"].indexOf(tag) === -1 && elm.contentEditable === "true")
                elm.innerText = resultVal;
            else
                (elm as HTMLInputElement).value = resultVal;

            this.setCaretPosition(elm, Math.min(selectionStart, selectionEnd))
        }
        else if (keyCode === t.KeyCodes.Backspace && !fakeWriting) {
            if (!selectionApplied) {
                /**
                 * TODO:
                 *  If no selection is applied and CTRL is pressed
                    then Backspace key removes whole/part of the word before current caret position.
                    (if caret in the middle of the word it removes the part of the word before caret).
                    If the caret is on some white space it will remove all whiteSpaces in the way
                    to the previous word and also erases whole previous word.
                    NOTE: working with the same content as selection CTRL + SHIFT+ left arrow.
                 */
                if (this.pressedAndHoldKeys.indexOf(t.KeyCodes.Ctrl) !== -1) {

                }
                /*
                    If caret position is not at the beginning of the elm content
                    then previous char is erased and caret position moved one place backwards.
                */
                if (selectionStart > 0) {
                    resultVal = currentTextContent.substring(0, selectionStart - 1) + currentTextContent.substring(selectionStart);

                    if (isContentEditable)
                        elm.innerText = resultVal;
                    else
                        (elm as HTMLInputElement).value = resultVal;

                    this.setCaretPosition(elm, selectionStart - 1);
                }
            } else {
                /*
                    Erases all selected text and moves caret to proper position (min of selectionStart/End).
                */
                resultVal = currentTextContent.substring(0, Math.min(selectionStart, selectionEnd))
                    + currentTextContent.substring(Math.max(selectionStart, selectionEnd));

                if (["input", "textarea"].indexOf(tag) === -1 && elm.contentEditable === "true")
                    elm.innerText = resultVal;
                else
                    (elm as HTMLInputElement).value = resultVal;

                this.setCaretPosition(elm, Math.min(selectionStart, selectionEnd));
            }
        }
        else if (keyCode === t.KeyCodes.Enter && !fakeWriting) {
            if (tag === "textarea" || isContentEditable) {
                resultVal = !selectionApplied
                    ? currentTextContent.substring(0, selectionStart) + "\n" + currentTextContent.substring(selectionStart)
                    : currentTextContent.substring(0, Math.min(selectionStart, selectionEnd)) + "\n" + currentTextContent.substring(Math.max(selectionStart, selectionEnd));

                if (tag === "textarea")
                    (elm as HTMLTextAreaElement).value = resultVal;
                else
                    elm.innerText = resultVal;
                this.setCaretPosition(elm, selectionStart + 1);
            }
        }
        else if (keyCode === t.KeyCodes.Spacebar && !fakeWriting) {
            /*
                If no selection is applied then spaceBar white space is inserted to the current caret position
                and caret position is moved one place forward. 
                Otherwise selected text is erased and replaced by gap.
            */
            const spaceValue: string = isContentEditable ? "\u00a0" : " ";
            resultVal = !selectionApplied
                ? currentTextContent.substring(0, selectionStart) + spaceValue + currentTextContent.substring(selectionStart)
                : (currentTextContent.substring(0, Math.min(selectionStart, selectionEnd))
                    + spaceValue + currentTextContent.substring(Math.max(selectionStart, selectionEnd)))

            if (isContentEditable)
                elm.innerText = resultVal;
            else
                (elm as HTMLInputElement).value = resultVal;
            this.setCaretPosition(elm, selectionStart + 1);
        }
        else if (keyCode === t.KeyCodes.X && this.isKeyPressedAndHold(t.KeyCodes.Ctrl)) {
            if (!selectionApplied)
                return;

            const start = Math.min(selectionStart, selectionEnd);
            const end = Math.max(selectionStart, selectionEnd);
            this.clipboard = currentTextContent.slice(start, end);
            resultVal = currentTextContent.substring(0, start) + currentTextContent.substring(end)

            if (isContentEditable)
                elm.innerText = resultVal;
            else
                (elm as HTMLInputElement).value = resultVal;
            this.setCaretPosition(elm, Math.min(selectionStart, selectionEnd));
        }
        else if (keyCode === t.KeyCodes.C && this.isKeyPressedAndHold(t.KeyCodes.Ctrl)) {
            if (!selectionApplied)
                return;
            this.clipboard = currentTextContent.slice(Math.min(selectionStart, selectionEnd), Math.max(selectionStart, selectionEnd));
        }
        else if (keyCode === t.KeyCodes.V && this.isKeyPressedAndHold(t.KeyCodes.Ctrl)) {
            const start = Math.min(selectionStart, selectionEnd);
            const end = Math.max(selectionStart, selectionEnd);
            let result = "";

            if (selectionApplied) {
                // removing selected text first
                //result = currentTextContent.substring(0, start)
                currentTextContent = currentTextContent.substring(0, start) + currentTextContent.substring(end);
            }
            result = currentTextContent.substring(0, start)
                + this.clipboard + currentTextContent.substring(start, currentTextContent.length);

            if (isContentEditable)
                elm.innerText = result;
            else
                (elm as HTMLInputElement).value = result;
            this.setCaretPosition(elm, start + this.clipboard.length);
        }
        else {
            /**
             * === HANDLE WRITING ===
             * 
             * If no selection is applied then specific char is inserted to the current caret position
             * and caret position is moved forward for one place. 
             * Otherwise the selected text is erased and replaced by desired char. 
             */
            if (this.isKeyPressedAndHold(t.KeyCodes.Shift) || this.isKeyPressedAndHold(t.KeyCodes.Ctrl))
                return;
            const char: string = isContentEditable && keyCode === t.KeyCodes.Spacebar ? "\u00a0" : String.fromCharCode(keyCode);
            resultVal = !selectionApplied
                ? currentTextContent.substring(0, selectionStart) + char + currentTextContent.substring(selectionStart)
                : (currentTextContent.substring(0, Math.min(selectionStart, selectionEnd)) + char + currentTextContent.substring(Math.max(selectionStart, selectionEnd)));

            if (isContentEditable)
                elm.innerText = resultVal;
            else
                (elm as HTMLInputElement).value = resultVal;
            this.setCaretPosition(elm, selectionStart + 1);
        }

        b.emitEvent(t.EventHandlers.inputHandlerName, { type: "input" }, elm, vNode);
    }

    private handleNonwrittingKeyPressEventSpecificallyToElement(
        elm: HTMLElement,
        activeVNode: b.IBobrilCacheNode | undefined,
        keyCode: number
    ): void {
        const tag = elm.tagName.toLowerCase();
        const type = elm.getAttribute("type");

        if (h.isElmSomeTextEditableElm(elm) && keyCode !== t.KeyCodes.Tab) {
            this.handleTextEditableElmKeyPress(elm, activeVNode, keyCode);
            return;
        }

        if (keyCode === t.KeyCodes.Enter || keyCode === t.KeyCodes.Spacebar) {
            /**
             * Browser fires also click event when hitting Enter or Spacebar upon
             * native button element. Both keys are handled differently:
             * 
             * Enter: fires keyDown, keyPress and click event are fired in keyPressAndHold pipeline. 
             * By holding pressed Enter browser triggers all mentioned events in the loop and on key release fires keyUp event.
             * 
             * Space: keyDown and KeyPress are triggered in keyPressAndHold pipeline and the rest is fired in keyRelease pipeline.
             * 
             * When keypress or keydown down is prevented then no click event is fired for both Enter nad Spacebar.
             * 
             * TODO: move handling of SpaceBar to KeyRelease pipeline, to fully follow browser behavior.
             */
            b.emitEvent(
                t.EventHandlers.leftClickHandlerName,
                this.createMouseEventObj(t.MouseButton.Left, h.getPointerActionPosition(elm), elm, false),
                elm,
                activeVNode
            );
        }

        if (keyCode === t.KeyCodes.Tab) {
            const vNodeToFocus: b.IBobrilCacheNode | null = h.getNextFocusableVNode(activeVNode, this.isKeyPressedAndHold(t.KeyCodes.Shift));
            /**
             * There is no other elm in focus path to focus
             * so browser would blur currently focused
             * element if there is some and focus body (default state). 
             */
            if (!vNodeToFocus || !vNodeToFocus.element) {
                if (document.activeElement !== document.body) {
                    b.emitEvent(t.EventHandlers.blurHandlerName, {}, h.getActiveHTMLElement(), h.getActiveVNode());
                    elm.blur();
                }
                return;
            };
            const elmToFocus: HTMLElement = vNodeToFocus.element as HTMLElement;
            elmToFocus && elmToFocus.focus();
            b.emitEvent(t.EventHandlers.focusHandlerName, {}, elmToFocus, vNodeToFocus);

            /*
             * Browser handles input, textarea and content-editable elm differently when focusing by TAB.
             * Focusing input will highlight whole text content,
             * textarea will just put caret at the end of the text
             * and content editable will put caret at the beginning. 
             * Limitation:
             * Does not put caret in specific position as browser usually does 
             * (if already been focused then browser remembers the last caret position)
             */
            if (h.isElmSomeTextEditableElm(elmToFocus)) {
                const tag = elmToFocus.tagName.toLowerCase();
                const textContentLength: number = h.getTextEditableElmTextContent(elmToFocus).length;
                this.selectTextOnTextEditableElm(
                    elmToFocus,
                    tag !== "textarea" ? 0 : textContentLength,
                    tag === "textarea" || tag === "input" ? textContentLength : 0
                );
            }
        }

        /*
            Handle nonWriting keys in special situations.
            Known cases: radioButtons, checkboxes, select
        */
        else if (tag === "input" || tag === "select") {
            let emitEvents: boolean = false;
            if (type === "radio") {
                /*
                    Natively working keys: 
                        - arrows key (navigation - focusing and checking radioButton in the same group)
                        - space - checks currently focused radio as true if it already was not
                    It is necessary to find next radio button with same name(group).
                    Browser will skip other radioButtons and check as true just the next one of specific group wherever it is placed.
                    If there is no such a next radio button, browser marks as checked the first one of the group.
                */
                this.handleRadioButtonKeyPressBehavior(activeVNode, elm as HTMLInputElement, keyCode);
            }
            else if (type === "checkbox") {
                /*
                    Natively Working keys: space - sets checkbox value to opposite;
                */
                if (keyCode === t.KeyCodes.Spacebar) {
                    (elm as HTMLInputElement).checked = !(elm as HTMLInputElement).checked;
                    emitEvents = true;
                }
            } else if (tag === "select") {
                /*
                    Natively working keys: all arrow keys => setting next or previous value in selectBox
                */
                const e: HTMLSelectElement = elm as HTMLSelectElement;
                const sIndex: number = e.selectedIndex;
                if (keyCode === t.KeyCodes.RightArrow || keyCode === t.KeyCodes.DownArrow) {
                    if (sIndex < e.length - 1) {
                        e.selectedIndex = sIndex + 1; // select next option if there is any
                        emitEvents = true;
                    }
                }
                else if (keyCode === t.KeyCodes.LeftArrow || keyCode === t.KeyCodes.UpArrow) {
                    if (sIndex > 0)
                        e.selectedIndex = sIndex - 1; // select previous option if there is any
                    emitEvents = true;
                }

            }
            if (emitEvents) {
                b.emitEvent(t.EventHandlers.inputHandlerName, { type: "input" }, elm, activeVNode);
                b.emitEvent(t.EventHandlers.changeHandlerName, { type: "change" }, elm, activeVNode);
            }
        }
    }

    private handleTextEditableElmKeyPress(
        elm: HTMLElement,
        vNode: b.IBobrilCacheNode | undefined,
        keyCode: number,
    ): void {
        /*
            Handle nonWriting keys which edit textEditable elements content too.
            It is necessary to check if fake writing is active. Fake writing sends actually converted char code
            instead of keyboard key (only keypress event sends char code too) and there are some matching 
            char codes with nonWriting key codes:
            - 8:    ""-Backspace, 
            - 46:   "."-Delete
        */
        if (
            keyCode === t.KeyCodes.Delete
            || keyCode === t.KeyCodes.Backspace
            || (
                // otazka, jestli clipboard akce resit v handle writting nebo naopak tady dal a nebo to splitnout a copy tady a ostatni v handle writting
                this.isKeyPressedAndHold(t.KeyCodes.Ctrl)
                && !this.isKeyPressedAndHold(t.KeyCodes.Shift)
                && [t.KeyCodes.X, t.KeyCodes.C, t.KeyCodes.V].indexOf(keyCode) > -1
            )
        ) {
            /*
                There are special non-writting keys which also can edit text content
                of text editable element.
            */
            this.handleWriting(elm, vNode, keyCode, false);
            return;
        }

        /*
            Handle caret navigation and text selection
        */
        const textContentLength: number = h.getTextEditableElmTextContent(elm).length;
        const selectionStart: number = this.selectedPosition.startPos;
        const selectionEnd: number = this.selectedPosition.endPos;
        const selectionApplied: boolean = this.isKeyPressedAndHold(t.KeyCodes.Shift) && selectionStart !== selectionEnd; // puvodne tu bylo nastaveny jenom false, zapomenuto nastavit, ale je divny, ze to pro textareu fakalo;

        switch (keyCode) {
            case t.KeyCodes.UpArrow:
                /* 
                    CTRL + SHIT + arrow up/down does the same as SHIFT + arrow up/down
                */
                if (this.isKeyPressedAndHold(t.KeyCodes.Shift))
                    /*
                        Set selection from the actual selection end position to the same position of the previous line or the closest available position to that.
                    */
                    this.selectTextOnTextEditableElm(elm, selectionStart, this.getPositionEndForNextOrPrevLineAction(elm, true))
                else
                    /*
                        Set caret position to the same position on the previous line or to the closest available position to that.
                    */
                    this.setCaretPosition(elm, this.getPositionEndForNextOrPrevLineAction(elm, true));
                break;
            case t.KeyCodes.DownArrow:
                if (this.isKeyPressedAndHold(t.KeyCodes.Shift)) {
                    /*
                        Set selection from the actual selection end position to the same position of the next line or the closest available position to that.
                    */
                    this.selectTextOnTextEditableElm(elm, selectionStart, this.getPositionEndForNextOrPrevLineAction(elm, false))
                } else {
                    /*
                        Set selection from actual the position to the same position of the next line or the closest available position to that.
                    */
                    this.setCaretPosition(elm, this.getPositionEndForNextOrPrevLineAction(elm, false));
                }
                break;
            case t.KeyCodes.LeftArrow:
                if (this.isKeyPressedAndHold(t.KeyCodes.Shift)) {
                    if (this.isKeyPressedAndHold(t.KeyCodes.Ctrl)) {
                        /*
                            Select from the current position to the start of the previous word.
                            If there already is some selection it will continue adding/removing 
                            from/to selection depending on previous and current selection direction. 
                        */
                        this.selectTextOnTextEditableElm(elm, selectionStart, this.getPositionEndForNextOfPrevWordAction(elm, true));
                    } else {
                        /*
                            From current selection end position add previous character to the selection.
                            If there is already some selection and goes from the left to the right, then the selection will be shortened for last selected char.    
                        */
                        this.selectTextOnTextEditableElm(elm, selectionStart, selectionEnd - 1);
                    }
                } else if (this.isKeyPressedAndHold(t.KeyCodes.Ctrl)) {
                    /*
                        Set the caret position after the current word (gap (white space) included if there is any after the current word).     
                    */
                    this.setCaretPosition(elm, this.getPositionEndForNextOfPrevWordAction(elm, true));
                } else {
                    /*
                        Set the caret position to -1 of current position (one position to the left)
                        if none selection is applied. Otherwise cancel selection and 
                        set caret position to minimum of selectionStart, selectionEnd (not -1)                            
                    */
                    this.setCaretPosition(elm, Math.min(selectionStart, selectionEnd) - (selectionApplied ? 0 : 1));
                }
                break;
            case t.KeyCodes.RightArrow:
                if (this.isKeyPressedAndHold(t.KeyCodes.Shift)) {
                    if (this.isKeyPressedAndHold(t.KeyCodes.Ctrl)) {
                        /*
                            Select from the current position to the start of the next word.
                            If there already is some selection it will continue adding/removing 
                            from/to selection depending on previous and current selection direction. 
                        */
                        this.selectTextOnTextEditableElm(elm, selectionStart, this.getPositionEndForNextOfPrevWordAction(elm, false));
                    } else {
                        /*
                            From current selection end position add next character to the selection.
                            If there is already some selection and goes from the right to the left (backwards selection), 
                            then the selection will be shortened for the visually first selected char.    
                        */
                        this.selectTextOnTextEditableElm(elm, selectionStart, selectionEnd + 1);
                    }
                } else if (this.isKeyPressedAndHold(t.KeyCodes.Ctrl)) {
                    /*
                        Set the caret position after the current word (gap (white space) included if there is any after the current word).     
                    */
                    this.setCaretPosition(elm, this.getPositionEndForNextOfPrevWordAction(elm, false));
                } else {
                    /*
                        Set the caret position to +1 of current position (one position to the right)
                        if none selection is applied. Otherwise cancel selection and 
                        set caret position to maximum of selectionStart, selecitonEnd (not +1) 
                        // note ozkouset pro textareu, byla zmena ve zjistovani podmince, jestli je selectionApplied                      
                    */
                    this.setCaretPosition(elm, Math.max(selectionStart, selectionEnd) + (selectionApplied ? 0 : 1));
                }

                break;
            case t.KeyCodes.Home:
                if (this.isKeyPressedAndHold(t.KeyCodes.Shift)) {
                    if (this.isKeyPressedAndHold(t.KeyCodes.Ctrl)) {
                        /*
                            From current selectionStart position selects all text to beginning of the elm.
                            If there is already some selection applied and it is not backwards then it will be thrown away.
                        */
                        this.selectTextOnTextEditableElm(elm, selectionStart, 0);
                    } else {
                        /*
                            Selects all text from the selectionStart position to the beginning of the line (backwards selection). 
                            If there is already some selection applied and it is not backwards then it will be thrown away.
                         */
                        this.selectTextOnTextEditableElm(elm, selectionStart, this.getStarPosOrEndPosForCurrentLine(elm, true));
                    }
                } else if (this.isKeyPressedAndHold(t.KeyCodes.Ctrl)) {
                    /*
                        Set caret position to the start of the elm.
                    */
                    this.setCaretPosition(elm, 0);
                } else {
                    /*
                        Set the caret position to the start of the current line.
                    */
                    this.setCaretPosition(elm, this.getStarPosOrEndPosForCurrentLine(elm, true));
                }
                break;
            case t.KeyCodes.End:
                if (this.isKeyPressedAndHold(t.KeyCodes.Shift)) {
                    if (this.isKeyPressedAndHold(t.KeyCodes.Ctrl)) {
                        /*
                           From current selectionStart position selects all text to end of the elm.
                           If there is already some selection applied and it is backwards then it will be thrown away.
                       */
                        this.selectTextOnTextEditableElm(elm, selectionStart, textContentLength);

                    } else {
                        /*
                            From current selectionStart position selects all text to end of the line.
                            If there is already some selection applied and it is backwards then it will be thrown away.
                        */
                        this.selectTextOnTextEditableElm(elm, selectionStart, this.getStarPosOrEndPosForCurrentLine(elm, false));
                    }
                } else if (this.isKeyPressedAndHold(t.KeyCodes.Ctrl)) {
                    /*
                        Set the current position to the end of the elm.
                    */
                    this.setCaretPosition(elm, textContentLength);
                } else {
                    /*
                        Set caret position to the end of the current line.
                    */
                    this.setCaretPosition(elm, this.getStarPosOrEndPosForCurrentLine(elm, false));
                }
                break;
            case t.KeyCodes.A:
                this.isKeyPressedAndHold(t.KeyCodes.Ctrl) && this.selectTextOnTextEditableElm(elm, 0, h.getTextEditableElmTextContent(elm).length)
                break;
            case t.KeyCodes.C:
                this.copyToClipboardSelectedText(elm)
                break;
        }
    }

    private copyToClipboardSelectedText(elm: HTMLElement): void {
        elm;
        /* const elmTextContent: string = h.getTextEditableElmTextContent(elm);
         if (elmTextContent.length === 0)
             return;
         const start: number = Math.min(this.selectedPosition.startPos, this.selectedPosition.endPos);
         const end: number = Math.max(this.selectedPosition.startPos, this.selectedPosition.endPos);
         this.saveExpressionToClipboard(elmTextContent.substring(start, end + 1));
         */
        // TODO: handle saving expression to clipboard 
    }

    private getPositionEndForNextOfPrevWordAction(elm: HTMLElement, getPrevWord: boolean = false): number {
        const whiteSpaceGapsAndRowsChars = ["\u00a0", " ", "\n"]; // TODO: move to global scope
        /*
            Finds the start index position of the next/prev word in the whole text editable element content.
    
            hint -  getPrevWod indicates whether to find start of the previous word(start of current word - if caret start position is in the middle of the word)
                    or the start of the next word if there is any.
        */
        const end: number = this.selectedPosition.endPos;
        if (end === 0 && getPrevWord)
            return 0;

        const pureTextContent: string = h.getTextEditableElmTextContent(elm);
        if (end === pureTextContent.length && !getPrevWord)
            return pureTextContent.length;

        let done: boolean = false;
        let actualCheckedPosition: number = Math.max(this.selectedPosition.endPos - 1, 0);
        let actualChar: string = pureTextContent[actualCheckedPosition];
        let wordEnded: boolean = false;

        while (!done && actualChar) {

            if (getPrevWord) {
                if (!wordEnded && whiteSpaceGapsAndRowsChars.indexOf(actualChar) === -1) {
                    wordEnded = true; // word separator found
                } else if (wordEnded && whiteSpaceGapsAndRowsChars.indexOf(actualChar) !== -1)
                    return actualCheckedPosition + 1; // return position of the first letter of the word 
                actualChar = pureTextContent[--actualCheckedPosition];
            } else {
                if (!wordEnded && whiteSpaceGapsAndRowsChars.indexOf(actualChar) === -1) {
                    wordEnded = true; // then it is necessary to find first letter in the next word if there is any
                } else if (wordEnded && whiteSpaceGapsAndRowsChars.indexOf(actualChar) !== -1) {
                    return actualCheckedPosition + 1;
                }
                actualChar = pureTextContent[++actualCheckedPosition];
            }
        }

        /*
            If none result was found that means that current position is almost at the end/start of the elm
            so no condition could fit. Therefore start/end of the elm is returned. 
            Just for case but should not happened.
        */
        if (!done)
            return getPrevWord ? 0 : pureTextContent.length;
        else
            return this.selectedPosition.endPos;
    }

    private getStarPosOrEndPosForCurrentLine(elm: HTMLElement, findStart: boolean): number {
        /*
            Returns index of the beginning or ending of the current line.            
        */
        const tag: string = elm.tagName.toLowerCase();
        const pureTextContent: string = h.getTextEditableElmTextContent(elm);

        if (tag === "input") {
            if (findStart)
                return 0;
            else
                return pureTextContent.length;
        }

        const linesWithItsContent: string[] = pureTextContent.split(/[/\n/\r]/gmi);
        let currentLineStartIndex: number = 0;
        let currentLineEndIndex: number = linesWithItsContent[0].length;

        if (linesWithItsContent.length === 1) {
            if (findStart)
                return 0;
            else
                return pureTextContent.length;
        } else {
            for (let i = 0; i < linesWithItsContent.length; i++) {
                if (i > 0) {
                    currentLineStartIndex = currentLineEndIndex + 1;
                    currentLineEndIndex += linesWithItsContent[i].length + 1; // +1 stands for line breaker
                }
                if (currentLineEndIndex >= this.selectedPosition.endPos)
                    break;
            }
        }

        return findStart ? currentLineStartIndex : currentLineEndIndex;
    }

    private getPositionEndForNextOrPrevLineAction(elm: HTMLElement, getPrevLinePos: boolean = false) {
        /*
            When navigating on the multi-line text editable elements (e.g. textarea or contentEditable elm)
            it is possible to vertically go to different (next/prev) line (e.g. by pressing up/down arrow keys)
            and set caret position on the same horizontal position as is on the current line
            if there is enough text in the desired line (if not, it goes to the last possible position on the line).
            for input (one line elm) it will move caret to the beginning or end of the line (depends on the direction of navigation action)
            
            HINT: - if the getPrevLinePos variable is false then gets the desired position on the next line
        */
        const tag: string = elm.tagName.toLowerCase();
        const pureTextContent: string = h.getTextEditableElmTextContent(elm);

        if (tag === "input") {
            if (getPrevLinePos)
                return 0;
            else
                return pureTextContent.length;
        }

        const linesWithItsContent: string[] = pureTextContent.split(/[/\n/\r]/gmi);
        const sel = this.selectedPosition;
        const isSelecting: boolean = this.isKeyPressedAndHold(t.KeyCodes.Shift);
        let currentLineEndIndex: number = linesWithItsContent[0].length;

        if (linesWithItsContent.length === 1) {
            if (getPrevLinePos)
                return 0;
            else
                return pureTextContent.length;
        } else {
            let currentLineIdx = 0;
            for (let i = 0; i < linesWithItsContent.length; i++) {
                /**
                 * +1 stands for the line break character or just end of the row place
                 * => cursor can be place behind the last char (undefined)
                 */
                if (i > 0)
                    currentLineEndIndex = currentLineEndIndex + linesWithItsContent[i].length + 1;
                if (currentLineEndIndex + 1 > this.selectedPosition.endPos) {
                    currentLineIdx = i;
                    break;
                }
            }

            const currentPositionInLine: number = getCaretPositionInCurrentLine(currentLineIdx);
            if (getPrevLinePos) {
                if (currentLineIdx === 0)
                    return 0;
                else {
                    return getNextOrPrevLineCaretPosition(currentPositionInLine, currentLineIdx);
                }
            } else {
                if (currentLineIdx === linesWithItsContent.length - 1) // caret is on the last line so the action should place caret at the end of the line
                    return pureTextContent.length;
                else {
                    return getNextOrPrevLineCaretPosition(currentPositionInLine, currentLineIdx);
                }
            }
        }

        function getCaretPositionInCurrentLine(currentLine: number): number {
            let result: number = isSelecting ? sel.endPos : Math.min(sel.startPos, sel.endPos);
            for (let i = 0; i < currentLine; i++) {
                result = result - (linesWithItsContent[i].length + 1);
            }
            return result;
        }

        function getNextOrPrevLineCaretPosition(positionInCurrentLine: number, currentLine: number): number {
            /**
             * If the current line is the last one then return position of its end
             * or if the current line is the first line then return the start (0). 
             */
            const desiredLineIdx: number = getPrevLinePos === true ? currentLine - 1 : currentLine + 1;
            let desiredLineStartIdx: number = 0;
            for (let i = 0; i < desiredLineIdx; i++) {
                desiredLineStartIdx = desiredLineStartIdx + linesWithItsContent[i].length + 1;
                /*   if (i === 0)
                       --desiredLineStartIdx; // first row text starts from 0 index*/
            }
            const desiredLineTextLength: number = linesWithItsContent[desiredLineIdx].length;

            if (desiredLineTextLength >= positionInCurrentLine)
                return desiredLineStartIdx + positionInCurrentLine;
            else
                return desiredLineStartIdx + desiredLineTextLength;
        }

    }

    private selectTextOnTextEditableElm(elm: HTMLElement, startPos: number, endPos: number): void {
        if (!h.isElmSomeTextEditableElm(elm))
            return;

        const tag: string = elm.tagName.toLowerCase();
        const type: string | undefined | null = elm.getAttribute("type");

        if (tag === "textarea" || tag === "input") {
            /*
                Chrome from some reason restricted inputs and it is no longer possible to
                access and modify selectionStart element property on some input types.
                https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/setSelectionRange 
            */
            if (type && _supportedInputTypes.indexOf(type.toLowerCase()) === -1)
                return;
            (elm as HTMLInputElement | HTMLTextAreaElement).selectionStart = startPos < endPos ? startPos : endPos;
            (elm as HTMLInputElement | HTMLTextAreaElement).selectionEnd = startPos < endPos ? endPos : startPos;
            this.selectedPosition.startPos = startPos;
            this.selectedPosition.endPos = endPos;

        } else {
            this.selectContentEditableElmText(elm, startPos, endPos);
        }
    }

    private setCaretPosition(activeElm: HTMLElement, desiredPos: number) {
        const contentLen: number = h.getTextEditableElmTextContent(activeElm).length;
        if (desiredPos < 0)
            desiredPos = 0;
        else if (desiredPos > contentLen)
            desiredPos = contentLen;

        this.selectTextOnTextEditableElm(activeElm, desiredPos, desiredPos);
    }

    private selectContentEditableElmText(elm: HTMLElement, startIndex: number, endIndex: number): void {
        let backwardsSelection: boolean = false;
        if (startIndex > endIndex) {
            [startIndex, endIndex] = [endIndex, startIndex];
            backwardsSelection = true;
        }
        /*
            Because of new row "character" is not part of textNode
            and also are not returned in textNodes arr, it will select next available char instead.
            When filling endIndex, the row "chars" should not be included on that count 
        */
        let range = document.createRange();
        range.selectNodeContents(elm);
        let selection = window.getSelection()!; // ugly hack, will not work in IE => TODO
        selection.removeAllRanges();
        const textNodes: ChildNode[] = getTextNodesInElm(elm);
        let curTNodeStartIndex = 0;
        let curTNodeEndIndex = 0;
        let foundStart: boolean = false;
        let startI = 0;
        let endI = 0;

        if (!textNodes) {
            /*
                If none text node was found that means the elm is empty
                therefore set selectionPos to 0 and e.focus will handle the
                browser selection setting itself.
            */
            elm.focus();
            this.selectedPosition.startPos = this.selectedPosition.endPos = 0;
            return;
        }

        const nodes: ChildNode[] = getAllNodesInElm(elm.childNodes);

        for (let i = 0; i < nodes.length; i++) {
            /*
                Because of text content is set via innerText 
                (removes styles and both soft and hard enters are represented as <br> elm)
                there should be present only textNodes and <br> elms as line breaks.
                Note: handle the situation when browser adds one extra br as default (chrome does it for sure)
            */
            let node: ChildNode = nodes[i];

            const length = (node as any).length || 0;
            curTNodeEndIndex = curTNodeEndIndex + length;
            if (i === 0)
                curTNodeEndIndex--;
            /**
              * Caret can be placed also at the end of the text
              * or at the end of the row (position behind the text)
              * therefore its necessary to count the last gap in the text
              * or last (empty) place of the row as well. 
              */
            if (
                nodes[i + 1] && nodes[i + 1].nodeName.toLowerCase() === "br"
                || i === nodes.length - 1
            ) {
                curTNodeEndIndex++;
                //curTNodeStartIndex++;
            }
            /* if (node.nodeName.toLowerCase() === "br") {
                 curTNodeStartIndex++;
             }*/


            /*if (node.nodeName.toLowerCase() === "br") {

                //"br" counts as line break character
                //but does not have available +1 space for selection
                //as textNode do therefore it is necessary to reflect it.

                curTNodeEndIndex++;
                curTNodeStartIndex++;
                //continue;
            }*/

            if (!foundStart && startIndex <= curTNodeEndIndex) {
                startI = startIndex - curTNodeStartIndex;
                range.setStart(node, startI);
                foundStart = true;
            }
            if (foundStart && endIndex <= curTNodeEndIndex) {
                endI = endIndex - curTNodeStartIndex;
                range.setEnd(node, endI);
                break;
            } else if (foundStart && endIndex > curTNodeEndIndex && !nodes[i]) {
                endI = curTNodeStartIndex;
                range.setEnd(node, endI);
                break;
            }
            curTNodeStartIndex = curTNodeEndIndex + 1;

        }

        this.selectedPosition.startPos = !backwardsSelection ? startIndex : endIndex;
        this.selectedPosition.endPos = !backwardsSelection ? endIndex : startIndex;

        if (foundStart)
            selection.addRange(range);

        function getTextNodesInElm(elm: ChildNode | HTMLElement): ChildNode[] {
            let textNodes: ChildNode[] = [];
            if (elm.nodeType === 3) // TextNode
                textNodes.push(elm);
            else {
                const ch = elm.childNodes;
                for (let i = 0; i < ch.length; i++) {
                    textNodes.push(...getTextNodesInElm(ch[i]));
                }
            }
            return textNodes;
        }

        function getAllNodesInElm(childNodes: NodeListOf<ChildNode>): ChildNode[] {
            let nodes: ChildNode[] = [];
            childNodes.forEach(n => {
                nodes.push(n);
                nodes.push(...getAllNodesInElm(n.childNodes));
            });

            return nodes;
        }

        /* function getAllNodesInElmOld(elm: ChildNode | HTMLElement): ChildNode[] {
             let nodes: ChildNode[] = [];
             nodes.push(elm);
             elm.childNodes.forEach(n => nodes.push(...getAllNodesInElmOld(n)));
             return nodes;
         }*/
    }

    private handleRadioButtonKeyPressBehavior(vNode: b.IBobrilCacheNode | undefined, elm: HTMLInputElement, keyCode: number): boolean | void {
        /*
            Natively working keys: 
                - arrows key (navigation - focusing and checking radioButton in the same group)
                - space - checks currently focused radio as true if it already was not
            It is necessary to find next radio button with same name(group).
            Browser will skip other radioButtons and check as true just the next one of specific group wherever it is placed.
            If there is no such a next radio button, browser marks as checked the first one of the group.
        */
        if (keyCode === t.KeyCodes.Spacebar) {
            if (!elm.checked) {
                elm.checked = true;
                emitRadioCheckEvents(vNode, elm);
                return;
            }
        }

        let radios: b.IBobrilCacheNode[] = [];
        let indexOfCurrentlyFocusedRadio: number | undefined = undefined;
        const rGroup = elm.getAttribute("name");
        const roots: b.IBobrilRoots = b.getRoots();
        const rKeys: string[] = Object.keys(roots);

        rKeys.forEach((key: string) => {
            const r = roots[key];
            loopChildren(r.c as b.IBobrilCacheNode[]);
        });

        function loopChildren(chldrn: b.IBobrilCacheNode[]): void {
            if (!b.isArray(chldrn)) return;
            chldrn.forEach((node: b.IBobrilCacheNode) => {
                const nodeElm: HTMLInputElement = node.element as HTMLInputElement;
                if (
                    nodeElm &&
                    nodeElm.tagName.toLowerCase() === "input" &&
                    nodeElm.getAttribute("type") === "radio" &&
                    nodeElm.getAttribute("name") === rGroup &&
                    !(node.element as HTMLInputElement).disabled
                ) {
                    radios.push(node);
                    if (node === vNode)
                        indexOfCurrentlyFocusedRadio = radios.length - 1;
                }
                loopChildren(node.children as b.IBobrilCacheNode[]);
            });
        }

        let goToRadioIndex = 0;
        let emitEvents = false;

        if (radios.length < 2 || indexOfCurrentlyFocusedRadio == undefined) // undefined index or 0 length should not happen and length 1 means that there is no other radio button to go to.
            return;

        if (keyCode === t.KeyCodes.DownArrow || keyCode === t.KeyCodes.RightArrow) {
            if (indexOfCurrentlyFocusedRadio < radios.length - 1)
                goToRadioIndex = ++indexOfCurrentlyFocusedRadio; // go to next radio button
            else goToRadioIndex = 0; // to to first radio of the group 
            emitEvents = true;
        }
        else if (keyCode === t.KeyCodes.UpArrow || keyCode === t.KeyCodes.LeftArrow) {
            if (indexOfCurrentlyFocusedRadio > 0)
                goToRadioIndex = --indexOfCurrentlyFocusedRadio; // go to previous radio of in the group
            else goToRadioIndex = radios.length - 1; // go to the last radio of the group
            emitEvents = true;
        }

        if (emitEvents) {
            const goToRadioNode: b.IBobrilCacheNode = radios[goToRadioIndex];
            const rElm: HTMLInputElement = goToRadioNode.element as HTMLInputElement;
            // TODO: blur bych volat nemel, tim, ze se focusuje se trignou bobril listenery a ten zavola interni emitOnFocusChange
            // a ten se postara uz o blur a vsechny eventy spojeny s focusem
            h.shouldBlur(rElm, goToRadioNode) && b.emitEvent(t.EventHandlers.blurHandlerName, {}, h.getActiveHTMLElement(), h.getActiveVNode());
            rElm.focus();
            rElm.checked = true;
            b.emitEvent(t.EventHandlers.focusHandlerName, {}, rElm, goToRadioNode);

            emitRadioCheckEvents(goToRadioNode, rElm);
        }

        function emitRadioCheckEvents(vNode: b.IBobrilCacheNode | undefined, elm: HTMLElement) {
            b.emitEvent(t.EventHandlers.leftClickHandlerName, { type: "click" }, elm, vNode);
            b.emitEvent(t.EventHandlers.secondClickHandler, { type: "click" }, elm, vNode);
            b.emitEvent(t.EventHandlers.inputHandlerName, { type: "input" }, elm, vNode);
            b.emitEvent(t.EventHandlers.changeHandlerName, { type: "change" }, elm, vNode);
        }
        return emitEvents;
    }

    private createKeyboardEvent(keyCode: number): KeyboardEvent {
        return {
            shiftKey: this.isKeyPressedAndHold(t.KeyCodes.Shift),
            ctrlKey: this.isKeyPressedAndHold(t.KeyCodes.Ctrl),
            altKey: this.isKeyPressedAndHold(t.KeyCodes.Alt),
            metaKey: false,
            keyCode: keyCode,
            charCode: keyCode,
            preventDefault: () => { },
            stopPropagation: () => { }
        } as KeyboardEvent;
    }

    private isKeyPressedAndHold(keycode: number): boolean {
        return this.pressedAndHoldKeys.indexOf(keycode) !== -1;
    }


    // ======================== //
    // ======== UTILS ========= //
    // ======================== //

    private setBotInitialState(): void {
        this.clipboard = "";
        this.pressedAndHoldKeys = [];
        this.pressedAndHoldMouseButtons = {
            left: false,
            right: false,
            wheel: false
        };
        this.selectedPosition = { startPos: 0, endPos: 0 };
        this.cursorOnVNode = undefined;
        this.cursorCoordinates = { x: -9999, y: -9999 };
    }

    private setBotInitialSettings(): void {
        this.settings = {
            keyboardAction: {},
            mouseAction: {
                automaticScroll: true,
                topMostElmAction: true
            },
            continueOnInvalidationFinished: true,
            maxNextActionDelayMS: undefined
        }
    }

    private getMaxActionDelayMS(actionType?: "mouse" | "keyboard" | "synthetic", callValue?: number): number {
        if (callValue != null)
            return callValue;

        if (!actionType || actionType === "synthetic")
            return this.settings.maxNextActionDelayMS!;

        const settObj = actionType === "mouse"
            ? this.settings.mouseAction
            : this.settings.keyboardAction;

        return (settObj && settObj.maxNextActionDelayMS != null)
            ? settObj.maxNextActionDelayMS
            : this.settings.maxNextActionDelayMS!;
    }

    private getContinueOnInvalidationFinished(actionType?: "mouse" | "keyboard" | "synthetic", callValue?: boolean): boolean {
        if (callValue != null)
            return callValue;

        if (!actionType || actionType === "synthetic")
            return this.settings.continueOnInvalidationFinished!;

        const settObj = actionType === "mouse"
            ? this.settings.mouseAction
            : this.settings.keyboardAction;

        return (settObj && settObj.continueOnInvalidationFinished != null)
            ? settObj.continueOnInvalidationFinished
            : this.settings.continueOnInvalidationFinished!;
    }

    private getAutoScrollSettings(): boolean {
        return this.settings.mouseAction && this.settings.mouseAction.automaticScroll || false;
    }

    private getMouseTopMostElmActionSettings(): boolean {
        return this.settings.mouseAction && this.settings.mouseAction.topMostElmAction || false;
    }

}

/*
    ==========================================
    END OF Simulation of emitting user actions
    ==========================================
*/


// ================================= //
//     General - PUBLIC - UTILS      //
// ================================= //

/**
 * Method which focuses specified element (if focusable) and also handles blur on previously focused one.
 * Just for testing purposes for focusing element directly without pressing any mouse button or key.
 * !! NOTE: Obsolete - will be removed probably in future versions.  
 * @param element - specifies element which should be focused
 */
export function focusElement(element: HTMLElement): void {
    const vNode: b.IBobrilCacheNode | undefined = b.deref(element);
    if (!vNode)
        return;

    h.shouldBlur(element, vNode)
        && b.emitEvent(t.EventHandlers.blurHandlerName, {}, h.getActiveHTMLElement(), h.getActiveVNode());
    if (!h.isElmAlreadyFocused(element, vNode)) {
        if (h.isElmFocusable(element, t.FocusableBy.MOUSE)) {
            element.focus();
            b.emitEvent(t.EventHandlers.focusHandlerName, {}, element, vNode);
        } else
            (document.activeElement as HTMLElement).blur();
    }
}

const _maxInvalidateCycles = 15;
/**
 * @deprecated - Use @throwIfNotRendered method instead.
 * 
 * Returns a promise which indicates whether the DOM has been rendered completely or invalidation is still on. 
 * Also checks infinite invalidation for the specified timeout. Since this method does run the invalidation check in timeout loop
 * but constantly invokes recalculating the VDOM by calling b.syncUpdate in afterFrame the @param timeout is deprecated.   
 * @param timeout - specifies how many seconds should the check last at max. This param is deprecated, use @param invalidationCount instead.
 * @param maxInvalidationCount - Specifies how many invalidation cycles at max should the bot check. If not set, bot performs at max 15 validation cycles
 * then it assumes that the infinite invalidation cycle is happening. This variant is preferred and has higher priority over @param timeout .
 */
export function checkIfFullyRendered(timeout?: number | null, maxInvalidationCount?: number | null): Promise<boolean> {
    return new Promise((resolve) => {
        const end = timeout ? b.now() + timeout * 1000 : undefined;
        let origAfterFrameCallback: ((root: string | b.IBobrilCacheNode[] | null | undefined) => void) | undefined;
        let curInvalidateCycle = 0;

        if (!b.invalidated())
            resolveAndCarryOn();

        if (timeout == null && maxInvalidationCount == null)
            maxInvalidationCount = _maxInvalidateCycles;

        if (maxInvalidationCount) {
            origAfterFrameCallback = b.setAfterFrame(
                (root: string | b.IBobrilCacheNode[] | null | undefined) => {
                    origAfterFrameCallback!(root);
                    curInvalidateCycle++;

                    if (!b.invalidated())
                        resolveAndCarryOn();

                    if (curInvalidateCycle > maxInvalidationCount! || (end && b.now() > end))
                        resolveAndCarryOn(true);

                    b.syncUpdate();
                });
            b.syncUpdate();
        }
        else {
            origAfterFrameCallback = b.setAfterFrame(
                (root: string | b.IBobrilCacheNode[] | null | undefined) => {
                    origAfterFrameCallback!(root);
                    curInvalidateCycle++;

                    if (!b.invalidated())
                        resolveAndCarryOn();

                    if (b.now() >= end!)
                        resolveAndCarryOn(true);

                    if (curInvalidateCycle < _maxInvalidateCycles)
                        /**
                         * To not freeze the browser for long time
                         * use syncUpdate only for a few cycles
                         * then just invalidate (already registered) will do.
                         */
                        b.syncUpdate();
                });
        }

        function resolveAndCarryOn(failed?: boolean): void {
            origAfterFrameCallback && b.setAfterFrame(origAfterFrameCallback);
            resolve(failed ? false : true);
        }
    });
}

/**
 * Returns a promise which indicates whether the DOM has been rendered completely or invalidation is still on.
 * If the specified invalidation cycles limit is reached then the error is thrown.   
 * @param invalidationCount - Specifies how many invalidation cycles at max should the bot check. If not specified it is used
 * 15 invalidation cycles as max allowed cycles.
 */
export async function throwIfNotRendered(invalidationCount?: number | null): Promise<void> {
    if (await checkIfRenderedInternal(invalidationCount))
        return Promise.resolve();
    else
        throw new Error("Not rendered, too many invalidation cycles in row.");

    function checkIfRenderedInternal(invalidationCount?: number | null): Promise<boolean> {
        return new Promise((resolve, _reject) => {                
            let origAfterFrameCallback: ((root: b.IBobrilCacheChildren | null) => void) | undefined;

            if (!b.invalidated())
                resolveAndCarryOn();

            if (invalidationCount == null)
                invalidationCount = _maxInvalidateCycles;

            origAfterFrameCallback = b.setAfterFrame(
                (root: string | b.IBobrilCacheNode[] | null | undefined) => {
                    origAfterFrameCallback!(root);

                    if (!b.invalidated())
                        resolveAndCarryOn();

                    if (curInvalidateCycle > invalidationCount!)
                        resolveAndCarryOn(true);

                    curInvalidateCycle++;
                    b.syncUpdate();
                });

            let curInvalidateCycle = 0;

            function resolveAndCarryOn(failed?: boolean): void {
                origAfterFrameCallback && b.setAfterFrame(origAfterFrameCallback);
                resolve(failed ? false : true);
            }
        });
    }
}

/**
 * Clears VDOM. Useful when there is an error so JS flow is stopped and destroy function of the components cannot properly proceed.
 */
export function clear() {
    b.init(() => { return null });
}

/**
 * Creates and returns new instance of BBBot class.
 * @param - uses inserted settings object as default bot settings.
 */
export function createBot(settings?: t.IBotSettings): t.IBBBot {
    return new BBot(settings);
}







