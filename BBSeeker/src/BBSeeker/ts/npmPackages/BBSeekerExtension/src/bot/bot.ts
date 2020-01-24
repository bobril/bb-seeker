import * as b from "bobril";
import * as h from "./helper";
import * as t from "./types";

export { IBBBot } from "./types";

/*
    NOTE: 
    Jasmine does not support parallel testing for now (5.5.2019), but the next spec test can still
    start execution sooner if the currently one overlaps built-in time limit.
    Also there are requests for adding parallel testing, so the library will prepare for it
    and each test will run as a new instance of the class.      
    https://stackoverflow.com/questions/25652895/are-test-cases-in-jasmine-2-0-run-in-parallel
*/

const _clickPointerType: string = "mouse"; // deprecated
const _nonWritingKeyCodes: number[] = [8, 9, 16, 17, 18, 19, 20, 27, 33, 34, 35, 36, 37, 38, 39, 40, 45, 46, 91, 92, 93, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 144, 145];
/*
    - keyDown and keyUp event returns physical keyboard keycode
    - keyPress returns keycode of the pressed char in ASCII table - for example "a" -keyDown or Up key: 96 but for keyPress keyCode is 65 
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
]*/

export const enum KeyCodes {
    Backspace = 8,
    Tab = 9,
    Enter = 13,
    Shift = 16,
    Alt = 17,
    Ctrl = 18,
    Escape = 27,
    Spacebar = 32,
    PageUp = 33,
    PageDown = 34,
    End = 35,
    Home = 36,
    LeftArrow = 37,
    UpArrow = 38,
    RightArrow = 39,
    DownArrow = 40,
    Delete = 46,
    // CTRL + common key actions
    A = 65, // all
    C = 67, // copy,
    V = 86, // paste
    X = 88, // cut
}

class BBot implements t.IBBBot {
    /*
        innerHTML - there can pasted styled text in contentEditable elements...the same expression can be inserted to the input elements and textarea
        but the browser will insert only pure text (input) or pure text with keeping row order (text area) by default itself. 
        ( => it is necessary to cut the expression for these elements manually to simulate browser behavior )
    */
    //private clipboard: string;
    private pressedAndHoldKeys: number[];
    private selectedPosition: { startPos: number, endPos: number }; // startPos indicates whe the selection begins. If startPos is higher then endPos, then backwards sel is applied.

    constructor() {
        //this.clipboard = "";    // because of it is not possible to get data from clipboard (maybe just in IE) 
        this.pressedAndHoldKeys = [];
        this.selectedPosition = { startPos: 0, endPos: 0 }; // virtual selection - if start has higher value then end it indicates that the backwards selection is applied
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

    // =========================================== //
    //      Mouse Move User Action - PUBLIC        //         
    // =========================================== //

    public async pointerMoveToElm(
        elm: HTMLElement,
        maxNextActionDelayMS?: number,
        terminateAfterFirstInvalidate?: boolean,
        coordinatesInElm?: t.ICoordinates
    ): Promise<void> {
        const coordAbs = h.enhanceCoordinates(h.getPointerActionPosition(elm, true), coordinatesInElm);
        /*
            Scroll if necessary (elm is out of viewport)
        */
        h.scrollIfCoordOutOfViewport(coordAbs.x, coordAbs.y);
        /*
            It is also necessary to check whether the element 
            is the topmost element, because that one should be clicked.
            Note: elementFromPoint method returns only elm within the viewport
            => relative coordinates (ignores scroll) and also browser returns in event
            relative coordinates so its is necessary to use relative coord of the element.
        */
        const coordRel = h.enhanceCoordinates(h.getPointerActionPosition(elm), coordinatesInElm);
        const topmostElm: HTMLElement | null = document.elementFromPoint(coordRel.x, coordRel.y) as HTMLElement | null;
        const topMostElmVNode: b.IBobrilCacheNode | undefined = b.deref(topmostElm);

        this.hoverElmInternal(topmostElm, topMostElmVNode, coordRel);

        await h.carryOnActionChain(maxNextActionDelayMS, terminateAfterFirstInvalidate);
        b.syncUpdate();
    }

    public async pointerMoveToCoordinates(
        x: number,
        y: number,
        maxNextActionDelayMS?: number,
        terminateAfterFirstInvalidate?: boolean
    ): Promise<void> {
        const elmWithCoord = h.getElmAndRelativeCoordsFromAbsPointAndScrollIfNecessary(x, y);
        const vNode = b.deref(elmWithCoord ? elmWithCoord.elm : undefined);
        this.hoverElmInternal(
            elmWithCoord ? elmWithCoord.elm : null,
            vNode,
            elmWithCoord ? elmWithCoord.coords : { x: 0, y: 0 }
        );

        await h.carryOnActionChain(maxNextActionDelayMS, terminateAfterFirstInvalidate);
        b.syncUpdate();
    }

    // ===================================== //
    //      SCROLL Use Action - PUBLIC       //
    // ===================================== //

    public async scrollElmUpByWheelUp(elm: HTMLElement, maxNextActionDelayMS?: number, terminateAfterFirstInvalidate?: boolean): Promise<void> {
        this.scrollVerticallyInternal(elm, _wheelScrollStep, false, false, true);
        await h.carryOnActionChain(maxNextActionDelayMS, terminateAfterFirstInvalidate);
    }

    public async scrollElmDownByWheelDown(elm: HTMLElement, maxNextActionDelayMS?: number, terminateAfterFirstInvalidate?: boolean): Promise<void> {
        this.scrollVerticallyInternal(elm, _wheelScrollStep, true, false, true);
        await h.carryOnActionChain(maxNextActionDelayMS, terminateAfterFirstInvalidate);
    }

    public async scrollElmUpByStep(elm: HTMLElement, pxStep: number, maxNextActionDelayMS?: number, terminateAfterFirstInvalidate?: boolean): Promise<void> {
        this.scrollVerticallyInternal(elm, pxStep, false, false);
        await h.carryOnActionChain(maxNextActionDelayMS, terminateAfterFirstInvalidate);
    }

    public async scrollElmDownByStep(elm: HTMLElement, pxStep: number, maxNextActionDelayMS?: number, terminateAfterFirstInvalidate?: boolean): Promise<void> {
        this.scrollVerticallyInternal(elm, pxStep, true, false);
        await h.carryOnActionChain(maxNextActionDelayMS, terminateAfterFirstInvalidate);
    }

    public async scrollElmVerticallyExact(elm: HTMLElement, finalScrollTop: number, maxNextActionDelayMS?: number, terminateAfterFirstInvalidate?: boolean): Promise<void> {
        this.scrollVerticallyInternal(elm, finalScrollTop, true, true);
        await h.carryOnActionChain(maxNextActionDelayMS, terminateAfterFirstInvalidate);
    }

    public async scrollElmLeftByStep(elm: HTMLElement, pxStep: number, maxNextActionDelayMS?: number, terminateAfterFirstInvalidate?: boolean): Promise<void> {
        this.scrollHorizontallyInternal(elm, pxStep, false, false);
        await h.carryOnActionChain(maxNextActionDelayMS, terminateAfterFirstInvalidate);
    }

    public async scrollElmRightByStep(elm: HTMLElement, pxStep: number, maxNextActionDelayMS?: number, terminateAfterFirstInvalidate?: boolean): Promise<void> {
        this.scrollHorizontallyInternal(elm, pxStep, true, false);
        await h.carryOnActionChain(maxNextActionDelayMS, terminateAfterFirstInvalidate);
    }

    public async scrollElmHorizontallyExact(elm: HTMLElement, finalScrollLeft: number, maxNextActionDelayMS?: number, terminateAfterFirstInvalidate?: boolean): Promise<void> {
        this.scrollHorizontallyInternal(elm, finalScrollLeft, false, true);
        await h.carryOnActionChain(maxNextActionDelayMS, terminateAfterFirstInvalidate);
    }

    // ============================================== // 
    //      Keyboard User Action Section - PUBLIC     //
    // ============================================== //

    public async  writeExpression(
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
            /*
                For each letter there is emitted one event handling cycle. But in reality 
                there are special chars that can be written only by combination of pressing
                of more keys (e.g "ň" - press and hold Shift, then press "ˇ" and release Shift and then press "n"  => three keys pressed).
                This is not simulated, each char has only one cycle.
            */
            await this.emitKeyPress(
                keyCode,
                useDelay ? maxNextActionDelayMS : undefined,
                useDelay ? terminateAfterFirstInvalidate : undefined,
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
        this.emitKeyPressInternal(keyCode, fakeWriting);

        await h.carryOnActionChain(maxNextActionDelayMS, terminateAfterFirstInvalidate);
        b.syncUpdate();
    }

    public async emitKeyPressAndHold(keyCode: number): Promise<void> {
        let activeKeys = this.pressedAndHoldKeys;
        /*
            In general, when key is pressed and held browser fires cycle of event in certain interval 
            (keyDown only for non-writing keys, keyDown, keyPress and all input events if necessary).
            Start new press and hold cycle only for nonWritable keycode (excluding Tab because by default TAB can focus non page elements like URL bar etc. - not possible by JS ) 
            and if the key is not already pressed and hold.
        */
        if (
            activeKeys.indexOf(keyCode) === -1
            && (
                _nonWritingKeyCodes.indexOf(keyCode) > -1
                /*
                     Delete and BackSpace belongs to non-writing keys (no keypress event)
                     but still edit test elms and still can run in press and hold loop.
                */
                || [KeyCodes.Delete, KeyCodes.Backspace].indexOf(keyCode) !== -1
            )
            && keyCode !== KeyCodes.Tab // repeated Tab is not supported for now
        ) {
            activeKeys.push(keyCode);

            const elm = h.getActiveHTMLElement();
            const vNode = h.getActiveVNode();
            /*
                When non-writable key is pressed and held, browser fires keyDown event and then after short delay (aprox. 150-200ms) 
                fires in short interval (approximately each 25ms) keyDown event repeatedly.
            */
            this.processKeyPressPipeline(elm, vNode, keyCode);

            setTimeout(() => {
                let intId = setInterval(() => {
                    /*
                        Repeating cycle can be active only for the last pressed key,
                        cannot be restored for some key pressed before even
                        if the last key is released sooner.
                        In situation like that, no cycle will be active
                        until new non-writable key is pressed and hold.
                    */
                    // TODO: kdyz vyvolam i normlani keyPress (ne pres pressAndHold a keyRelease), tak by me to melo prerusit pipelinu
                    // mozna pak taky priadavat na ten moment na zacatku do activeKeys a ubirat na konci pipeliny 
                    if (activeKeys[activeKeys.length - 1] === keyCode) {
                        this.processKeyPressPipeline(elm, vNode, keyCode);
                    } else
                        clearInterval(intId);


                }, 25)
            }, 150);
        }

        await h.carryOnActionChain();
        b.syncUpdate();
    }

    public async emitKeyRelease(keyCode: number): Promise<void> {
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
            if (keyCode !== lastPressedKey)
                this.emitKeyPressAndHold(lastPressedKey);
        }
        await h.carryOnActionChain();
    }


    private pasteClipboard(): void {
        // TODO: handle clipboard pasting 
    }

    private isKeyPressedAndHold(keyCode: number): boolean {
        return this.pressedAndHoldKeys.indexOf(keyCode) > -1;
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
        //const coordAbs = h.enhanceCoordinates(h.getPointerActionPosition(elm, true), coordinatesInElm);
        /*
            Scroll if necessary (elm is out of viewport)
        */
        //h.scrollIfCoordOutOfViewport(coordAbs.x, coordAbs.y);
        /*
            It is also necessary to check whether the element 
            is the topmost element, because that one should be clicked.
            Note: elementFromPoint method returns only elm within the viewport
            => relative coordinates (ignores scroll) and also browser returns in event object
            relative coordinates so it is necessary to use relative coord of the element in synthetic event object.
            It is also recalculate coordinates after scrolling.
        */

        /* const coordRel = h.enhanceCoordinates(h.getPointerActionPosition(elm), coordinatesInElm);
         const topmostElm: HTMLElement | null = document.elementFromPoint(coordRel.x, coordRel.y) as HTMLElement | null;
         const topMostElmVNode: b.IBobrilCacheNode | undefined = b.deref(topmostElm);
 
         await this.emitClickEvent(topmostElm, topMostElmVNode, whichMouse, coordRel, doubleClick, maxNextActionDelayMS, terminateAfterFirstInvalidate);
         */

        /*
        temporary disabled automatic scroll to elm because it causes problems when element is in overflowed area of some nested elm
        => need better solution and cover all cases (scrolling nested elements in more scrollable elms, all types of positioning etc.)
        */
        coordinatesInElm;
        const vNode = b.deref(elm);
        await this.emitClickEvent(elm, vNode, whichMouse, h.getPointerActionPosition(elm), doubleClick, maxNextActionDelayMS, terminateAfterFirstInvalidate);
    }

    private async processClickOnCoord(
        x: number, // absolute x coordinate
        y: number, // absolute y coordinate
        whichMouse: t.MouseButton,
        doubleClick?: boolean,
        maxNextActionDelayMS?: number,
        terminateAfterFirstInvalidate?: boolean
    ): Promise<void> {
        const elmWithCoord = h.getElmAndRelativeCoordsFromAbsPointAndScrollIfNecessary(x, y);
        const vNode: b.IBobrilCacheNode | undefined = b.deref(elmWithCoord ? elmWithCoord.elm : undefined);

        await this.emitClickEvent(
            elmWithCoord ? elmWithCoord.elm : null,
            vNode, whichMouse,
            elmWithCoord ? elmWithCoord.coords : { x: 0, y: 0 },
            doubleClick,
            maxNextActionDelayMS,
            terminateAfterFirstInvalidate
        );
    }

    private async emitClickEvent(
        elm: HTMLElement | null,
        vNode: b.IBobrilCacheNode | undefined,
        whichMouse: t.MouseButton,
        clickedCoord: t.ICoordinates, // must be relative to the viewport because browser sends relative coord in event
        doubleClick?: boolean,
        maxNextActionDelayMS?: number,
        terminateAfterFirstInvalidate?: boolean
    ): Promise<void> {
        if (!elm || !vNode) {
            /*
                No element (e.g. inserted wrong x or y coordinates if calling click on specific coord)
                so there is no action to do so carry on immediately. 
            */
            await h.carryOnActionChain();
            return;
        }
        if (doubleClick) {
            /*
                In browser when double click is initiated it is first processed twice single click cycle with related events (pointerDown,pointerUp etc.)
                and after this is triggered dblclick handler.   
            */
            this.emitClickEventInternal(elm, vNode, t.MouseButton.Left, clickedCoord);
            await h.carryOnActionChain();

            this.emitClickEventInternal(elm, vNode, t.MouseButton.Left, clickedCoord);
            await h.carryOnActionChain();

            this.emitClickEventInternal(elm, vNode, t.MouseButton.Left, clickedCoord, true);
        } else
            this.emitClickEventInternal(elm, vNode, whichMouse, clickedCoord);

        await h.carryOnActionChain(maxNextActionDelayMS, terminateAfterFirstInvalidate);
        b.syncUpdate();
    }

    private emitClickEventInternal(
        elm: HTMLElement,
        vNode: b.IBobrilCacheNode | undefined,
        whichMouse: t.MouseButton,
        clickedCoord: t.ICoordinates,
        doubleClick?: boolean
    ): void {
        /*
            In browser double click is possible to trigger only via double fast click by left mouse button.
            Two single clicks cycles are done and after that is triggered double click handler itself.  
        */
        if (doubleClick && whichMouse === t.MouseButton.Left) {
            b.emitEvent(t.EventHandlers.leftDoubleClickHandlerName, this.createMouseEventObj(whichMouse, clickedCoord, doubleClick), elm, vNode);
            return;
        }

        let clickHandlerName: string = "";
        if (whichMouse === t.MouseButton.Right) clickHandlerName = t.EventHandlers.rightClickHandlerName;
        else if (whichMouse === t.MouseButton.Left) clickHandlerName = t.EventHandlers.leftClickHandlerName;

        /*
            Emitting all events carried by user click action in accurate order as would browser do.
            On PointerDown or Up Bobril also calls MouseDown and Up as well. This does bobril internally itself and 
            returns true (as preventing) if one or both of them returns true. 
            
            It is also called pointerMove to clicked coordinates because in real it is necessary to move
            cursor on the specific elm before click. This also calls all linked events (handlers) of mouse
            and elm hover action (mouseOut, mouseIn, mouseLeave, mouseEnter, mouseOver)
        */
        const pointerEvObj = this.createPointerEventObj(whichMouse, clickedCoord, doubleClick);
        this.hoverElmInternal(elm, vNode, clickedCoord);
        const prevent: boolean = b.emitEvent(t.EventHandlers.pointerDownHandlerName, pointerEvObj, elm, vNode);
        /*
            If already prevented dont even try to process BLUR, FOCUS or SELECTSTART
        */
        if (!prevent) {
            /*
                Emit Blur event on currently focused element if there is some focused element and clicked element is not currently focused one.
            */
            h.shouldBlur(elm, vNode) && b.emitEvent(t.EventHandlers.blurHandlerName, {}, h.getActiveHTMLElement(), h.getActiveVNode());
            /*
                Emit StartSelect event whether the clicked element is not focusable
            */
            !h.isElmFocusable(elm) && b.emitEvent(t.EventHandlers.selectStartHandlerName, {}, elm, vNode);
            /*
                Emit Focus event whether clicked element is focusable and is not currently focused - also really focus the desired elm.
                If element is not focused but also not focusable then the "body" element should be focused as browser usually do.

                (TODO: think of - revert the condition => when clicked on input elm (even already focused) put caret at the end (or start? => check))
            */
            // TODO: refactor, vymyslet jinak ty podminky, tohle je jen rychlej provizorni fix
            if (h.isElmFocusable(elm)) {
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
                const nearestFocusableParent: HTMLElement | null = h.getFirstFocusableParent(elm);
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

        b.emitEvent(t.EventHandlers.pointerUpHandlerName, pointerEvObj, elm, vNode);

        /*
            Emit Click event whether user action was iniciated with left(triggers click listener) or right mouse button(triggers contextmenu listener),
            wheel button does not trigger any click listener, only pointer or mouse listeners. 
        */
        clickHandlerName && b.emitEvent(clickHandlerName, this.createMouseEventObj(whichMouse, clickedCoord, doubleClick), elm, vNode);
        /*
            Bobril registers two event listeners on "click" user event. Therefore if click is done via left mouse button
            it is necessary to trigger the second click handler as well.  
        */
        if (clickHandlerName === t.EventHandlers.leftClickHandlerName) {
            b.emitEvent(t.EventHandlers.secondClickHandler, { type: "click" }, elm, vNode);
            /*
                In browser when the clicked element is inside the label element and also it is not input or textarea (otherwise click would be done on the inner element itself)
                browser triggers all listeners derived from user click iniciation on that element (already done above)
                but then finds first input or textarea element inside label, browser triggers "click" listener on it 
                which focuses it and if input is type of radio button or checkbox it also sets value of it to its opposite value.   
                NOTE: only for left single click
            */
            this.handleLabelClickIfNecessary(vNode, clickedCoord);
            /*
                If the clicked element is radio button or checkbox and the click should be done directly on it (not label or other nonfocusable elm in label)
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
                b.emitEvent(t.EventHandlers.leftClickHandlerName, this.createMouseEventObj(t.MouseButton.Left, clickedCoord), elm, nodeToServe);
                b.emitEvent(t.EventHandlers.secondClickHandler, this.createMouseEventObj(t.MouseButton.Left, clickedCoord), elm, nodeToServe);
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
                Set opposite value for checkbox every time but for radio only if it is not already checked
            */
            if (type !== "radio" || (type === "radio" && !elm.checked)) {
                elm.checked = !elm.checked;

                b.emitEvent(t.EventHandlers.inputHandlerName, { type: "input" }, elm, vNode);
                b.emitEvent(t.EventHandlers.changeHandlerName, { type: "change" }, elm, vNode);
            }
        }
    }

    private createMouseEventObj(
        whichMouse: t.MouseButton,
        clickedCoord: t.ICoordinates,
        doubleClick?: boolean,
        pointerOrMouseEvent?: boolean
    ): t.IMouseEventInternal {
        let clickCount = 0;
        if (whichMouse !== t.MouseButton.None)
            clickCount = doubleClick ? 2 : 1;
        /*
            For pointer events like pointerDown/Up it is necessary to merge MouseEvent and b.IBobrilMouseEvent
            because bobril while handling these pointer actions calls also internal pointerHandlers which 
            builds its params from incoming ("native") ev object. For these cases it is necessary to make available
            also native event property to let bobril to build the params when it needs.
        */
        return {
            x: clickedCoord.x,
            y: clickedCoord.y,
            button: whichMouse - 1, // native event returns values 0-2
            count: clickCount,
            shift: this.isKeyPressedAndHold(KeyCodes.Shift),
            ctrl: this.isKeyPressedAndHold(KeyCodes.Ctrl),
            alt: this.isKeyPressedAndHold(KeyCodes.Alt),
            meta: false,
            cancelable: true,
            /*
                Native mouse event object properties which are not common (different names or values).
                These properties must be filled for cases when bobril builds internal params itself
                from native event object => necessary to simulate native properties as well.
            */
            shiftKey: this.isKeyPressedAndHold(KeyCodes.Shift),
            ctrlKey: this.isKeyPressedAndHold(KeyCodes.Ctrl),
            altKey: this.isKeyPressedAndHold(KeyCodes.Alt),
            buttons: whichMouse, // returns sum of all mouse button indicators pressed together (uses values from which prop => left and right pressed => 1+2=3) (because of bot does not support combine multiple buttons click it will return which prop value instead)
            clientX: clickedCoord.x,
            clientY: clickedCoord.y,
            metaKey: false,
            detail: pointerOrMouseEvent ? 0 : clickCount, // actual count is returned only if "click" handler should be called, for mouse and pointer handlers there is always 0
            which: whichMouse // native events return values 1-3 (button +1) 
        } as t.IMouseEventInternal
    }

    private createPointerEventObj(whichMouse: t.MouseButton, clickedCoord: t.ICoordinates, doubleClick?: boolean): t.IPointerEventInternal {
        return b.assign(
            this.createMouseEventObj(whichMouse, clickedCoord, doubleClick),
            {
                id: 1,
                type: b.BobrilPointerType.Mouse,
                /*
                    Native mouse event object properties which are not common (different names or values).
                    These properties must be filled for cases when bobril builds internal params itself
                    from native event object => necessary to simulate native properties as well.
                */
                pointerId: 1,
                pointerType: _clickPointerType
            } as t.IPointerEventInternal
        )
    }

    // coords are relative to viewport
    private hoverElmInternal(elm: HTMLElement | null, vNode: b.IBobrilCacheNode | undefined, coordinates: t.ICoordinates): void {
        if (!elm || !vNode)
            return;
        /*
            Browser separately triggers listeners for all mouse move and hover actions
            (mouseOver, mouseMove, mouseOut, mouseEnter, mouseLeave ...)
            But bobril only listens for pointermove event and the rest mouse events
            handles during pointermove event handling itself internally. 
        */
        b.emitEvent(t.EventHandlers.pointerMoveHandlerName, this.createPointerEventObj(t.MouseButton.None, coordinates), elm, vNode);
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

        let scrolabelElm = undefined;
        if (allowBubbling) {
            let elmTemp: HTMLElement | null = elm;
            while (!scrolabelElm && elmTemp) {
                if (h.isVerticallyScrollable(elmTemp, isDownDir, isExactPos))
                    scrolabelElm = elmTemp;
                else
                    elmTemp = elmTemp.parentElement;
            }
        } else
            scrolabelElm = h.isVerticallyScrollable(elm, isDownDir, isExactPos) ? elm : undefined;
        if (scrolabelElm) {
            scrolabelElm.scrollTop = isExactPos
                ? scrollPx
                : (isDownDir ? scrolabelElm.scrollTop + scrollPx : scrolabelElm.scrollTop - scrollPx);
            h.scrollIfElmOutOfViewport(scrolabelElm);
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
        if (h.isHorizontalyScrollable(elm, isRightDir, isExactPos))
            elm.scrollLeft = isExactPos
                ? scrollPx
                : (isRightDir ? elm.scrollLeft + scrollPx : elm.scrollLeft - scrollPx);
    }

    // ================= //
    //      KEYPRESS     //
    // ================= //

    private emitKeyPressInternal(keyCode: number, fakeWriting?: boolean): void {
        const elm: HTMLElement = h.getActiveHTMLElement();
        const vNode: b.IBobrilCacheNode | undefined = h.getActiveVNode();

        const prevented: boolean = this.processKeyPressPipeline(elm, vNode, keyCode, fakeWriting);
        if (!prevented)
            this.processKeyReleasePipeline(elm, vNode, keyCode, fakeWriting)
    }

    /*
        universalFakeKeyCode = 65 = "a" - just fake physical keyCode which is substracted to pointerDown and pointerUp handlers when simulating writing, 
        keyPress has the real keyCode of the specific char
        until I manage converting charCode to physical keyCode (if it is event possible). 
        Then can be even the "fakeWritingKeyCode" flag removed. 
        TODO: manage converting charCode to physical keyCode (if it is event possible).
     */
    private processKeyPressPipeline(elm: HTMLElement, vNode: b.IBobrilCacheNode | undefined, keyCode: number, fakeWriting?: boolean): boolean {
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
            Emit KeyPress event if the pressed key is one of the writing keys.
            (expecting that numlock is enabled otherwise number keys would not be writable 
                - there is no way to check hardware state from JavaScript)
            keypress event keycode is not actual keycode of keyboard key but actual char keycode from ASCII table.
            If the fakeWriting is active then the incoming keycode is actually converted char to ASCII code which 
            comes in keyPress event (other events send key of the keyboard) and some char codes are equal to some
            keycodes => necessary to handle these cases  
        */
        if (!prevented && _nonWritingKeyCodes.indexOf(!fakeWriting ? keyCode : _universalFakeKeyCode) === -1 && !this.isKeyPressedAndHold(KeyCodes.Ctrl)) {
            prevented = b.emitEvent(t.EventHandlers.keyPressHandlerName, this.createKeyboardEvent(keyCode), elm, vNode);
            /*
                Handle writing if the proper key (keycode) is pressed.
                Recommended to use writing method only for writing for now,
                until I manage converting ASCII keycode (which browser returns in keypress event object) to physical keycode of the pressed key 
            */
            !prevented && this.handleWriting(elm, vNode, keyCode, fakeWriting);
        }
        /*
            There are keys which are specially handled before (TAB, SPACE for checkboxes, arrows for Select ) and some are handler after (arrows for radio button)
            but it is not necessary to follow accurately this behavior (does not make actually any change of params (maybe value) of keyUp event).
            
            Known special cases: 
            checkbox - SPACE; radio - arrows; select - arrows; TAB - whatever;
            + selecting text and navigation in "text input elements" and common composed keyboard actions (ctrl+c etc.)    
        */
        !prevented && this.handleNonwrittingKeyPressEventSpecificallyToElement(elm, vNode, keyCode, fakeWriting); // in some cases there is triggered click event inside, so maybe i should return prevented too.
        return prevented;
    }

    private processKeyReleasePipeline(
        elm: HTMLElement,
        vNode: b.IBobrilCacheNode | undefined,
        keyCode: number,
        fakeWriting?: boolean
    ): void {
        b.emitEvent(t.EventHandlers.keyUpHandlerName, this.createKeyboardEvent(!fakeWriting ? keyCode : _universalFakeKeyCode), elm, vNode);
    }

    /*
        TODO: if no selection is applied and pressed ctrl + delete deletes whole word after caret 
        and ctrl + backspace erases whole word before caret
    */
    private handleWriting(elm: HTMLElement, vNode: b.IBobrilCacheNode | undefined, keyCode: number, fakeWriting?: boolean): void {
        /*
            Browsers (or at least some of them) have reserved combination Shift + Ctrl + some key
            for special actions (page or browser nature actions). 
        */
        if (!h.isElmSomeTextEditableElm(elm)
            || (this.isKeyPressedAndHold(KeyCodes.Shift) && this.isKeyPressedAndHold(KeyCodes.Ctrl)))
            return;

        // takhle to byt nemuze, protoze to je platny jen pro inputy a textareu..pro contenteditable elm ne
        // takze si opravdu budu muset nekde interne prevadet a ukladat selectionStart a nebo si tu udelat metodu, ktera to teprve getne 
        this.selectedPosition.startPos = (elm as HTMLInputElement).selectionStart!;
        this.selectedPosition.endPos = (elm as HTMLInputElement).selectionEnd!;

        const tag = elm.tagName.toLowerCase();
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
            return;
        // mozna by se to ziskavani resultTextu slo fakt vytahnout do separe metody, ktery by se jen v parametrech poslalo, co ma pouzit jako replecator. - v podstate se deje vsude to samy, jen pri deletovani se neinsertuje nic
        if (keyCode === KeyCodes.Delete && !fakeWriting) {
            if (!selectionApplied) {
                /*
                    If no selection is applied and CTRL is pressed
                    then Delete key removes whole/part of the word before current caret position.
                    (if caret in the middle of the word it removes the part of the word before caret).
                    // je to to samy jako pri selekci CTRL + SHIFT+ left/right arrow
                */
                if (this.pressedAndHoldKeys.indexOf(KeyCodes.Ctrl) !== -1) {

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
        else if (keyCode === KeyCodes.Backspace && !fakeWriting) {
            if (!selectionApplied) {
                /*
                    If caret position is not at the beginig of the elm content
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
        else if (keyCode === KeyCodes.Enter && !fakeWriting) {
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
        else if (keyCode === KeyCodes.Spacebar && !fakeWriting) {
            /*
                If no selection is applied then spacebar white space is inserted to the current caret position
                and caret postion is moved forward foor one place. 
                Otherwise selected text is erased and replaced by gap.
            */
            const spaceValue: string = isContentEditable ? "\u00a0" : " ";
            resultVal = !selectionApplied
                ? currentTextContent.substring(0, selectionStart) + spaceValue + currentTextContent.substring(selectionStart)
                : (currentTextContent.substring(0, Math.min(selectionStart, selectionEnd)) + spaceValue + currentTextContent.substring(Math.max(selectionStart, selectionEnd)))

            if (isContentEditable)
                elm.innerText = resultVal;
            else
                (elm as HTMLInputElement).value = resultVal;
            this.setCaretPosition(elm, selectionStart + 1);
        }
        else if (keyCode === KeyCodes.X && this.isKeyPressedAndHold(KeyCodes.Ctrl)) {
            if (!selectionApplied)
                return;
            resultVal = currentTextContent.substring(0, Math.min(selectionStart, selectionEnd)) + currentTextContent.substring(Math.max(selectionStart, selectionEnd))

            if (isContentEditable)
                elm.innerText = resultVal;
            else
                (elm as HTMLInputElement).value = resultVal;
            this.setCaretPosition(elm, selectionStart);
        }
        else if (keyCode === KeyCodes.C && this.isKeyPressedAndHold(KeyCodes.Ctrl)) {

        }
        else if (keyCode === KeyCodes.V && this.isKeyPressedAndHold(KeyCodes.V)) {
            this.pasteClipboard();
        }
        else {
            // HANDLE WRITTING
            /*
                If no selection is applied then specific char is inserted to the current caret position
                and caret postion is moved forward for one place. 
                Otherwise the selected text is erased and replaced by desired char. 
            */
            const char: string = isContentEditable && keyCode === KeyCodes.Spacebar ? "\u00a0" : String.fromCharCode(keyCode);
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

    /*
        TODO: 
        1) Shift+Tab
        2) scrolling of currently clicked scrollable element by arrows
            => it scrolls just clicked elm, it does not has to be focusable so it is necessary to keep in memory internaly which element was clicked as last
            => should work only for left mouseMouseButton click, because middle button click shows up quick scrolling shit and right opens contextMenu 
            and then it is necessary to click left mouse button to cancel the action (until then it is not possible to scroll with keyboard anyway)
            (middle and right does not trigger pointerDown evs (check it) so there is not possibility to prevent contextmenu or fast scroll) 
    */
    private handleNonwrittingKeyPressEventSpecificallyToElement(
        elm: HTMLElement,
        activeVNode: b.IBobrilCacheNode | undefined,
        keyCode: number,
        fakeWritting?: boolean
    ): void {
        /*
            Writing keys was already handeled in keypress part.
            But in combination with pressed and hold CTRL it makes
            shorcats which are exceptions because it does not write
            and have another purpose.   
        */
        if (
            fakeWritting ||
            !this.isKeyPressedAndHold(KeyCodes.Ctrl) && _nonWritingKeyCodes.indexOf(keyCode) === -1
        )
            return;

        const tag = elm.tagName.toLowerCase();
        const type = elm.getAttribute("type");

        if (h.isElmSomeTextEditableElm(elm) && keyCode !== KeyCodes.Tab) {
            this.handleTextEditableElmKeyPress(elm, activeVNode, keyCode);
            return;
        }
        /*
            Handle focusing by Tab key - focusing next focusable element if there is any.
            Limitaions: 
                - does not consider special behaviour what browser does in specific cases like with radiobuttons
                (natively TAB focuses only RB with true value or the first one of the group if no RB is checked)
                - does not focus editable textbox in specific cursor position as browser usualy does (it remembers internally last focus position)
                // TODO: handle focusing of diferrent tabIndex 
                // TODO2: tab should be processed after keyDown to make able to repeat the action in cycle when TAB is pressed and hold 
                // TODO3: if elm which should be focused by TAB is out of viewport, it should scroll to it
                // TODO4: checknout chovani tabu pro radio buttony ... zda se, ze kdyz jsem aktualne na radio buttonu, tak browser preskoci vsechny radiobuttony
                // se stejnou skupinou ktere jsou primym nasledujicim focusovatelnym elementem (3 stejny radio buttony, pak je skupinka dalsich 3 radiu buttonu,
                // ktere maji vsecny spolecnou skupinu, ale jinou nez ta prvni => tak tab preskoci ty zbyvajici radia prvni skupiny a skoci na prvni radio druhy skupiny)
                // situace2: mam skupinu 3 radii a uvnitr je jiny focusovatelny elm, treba text input (radio, textinput, radio, radio)
                // => tak tab zafocusi prvni radio, pak textinput, pak druhy radio a dalsi tab to treti radio preskoci, protoze je opet primym sousedem radia ze stejne skupiny
                // sipka dolu a nahoru nejen ze prehodi hodnotu true, ale taky ten danej radio element zafocusuje
        */
        if (keyCode === KeyCodes.Tab) {
            const vNodeToFocus: b.IBobrilCacheNode | null = h.getNextFocusableVNode(activeVNode);
            if (!vNodeToFocus || !vNodeToFocus.element) return;
            const elmToFocus: HTMLElement = vNodeToFocus.element as HTMLElement;
            /*
                Emit Blur event on currently focused element if there is some focused element and future focused element is not currently focused one.
            */
            h.shouldBlur(elm, activeVNode) && b.emitEvent(t.EventHandlers.blurHandlerName, {}, h.getActiveHTMLElement(), h.getActiveVNode());
            elmToFocus && elmToFocus.focus();
            b.emitEvent(t.EventHandlers.focusHandlerName, {}, elmToFocus, vNodeToFocus);
            /*
                Also select and highlight all text in text editable elements if 
                it is focused by TAB key as browser would do.
            */
            if (h.isElmSomeTextEditableElm(elmToFocus)) {
                // tady je jeste zmena...pro input oznaci vse, pro ostatni premisti caret na posledni pozici
                const textContentLength: number = h.getTextEditableElmTextContent(elmToFocus).length;
                this.selectTextOnTextEditableElm(
                    elmToFocus,
                    elmToFocus.tagName.toLowerCase() === "input" ? 0 : textContentLength,
                    textContentLength
                );
            }
        }

        /*
            Handle nonWriting keys in special situations.
            Known cases: radiobuttons, checkboxes, select
        */
        else if (tag === "input" || tag === "select") {
            let emitEvents: boolean = false;
            if (type === "radio") {
                /*
                    Natively working keys: 
                        - arrows key (navigation - focusing and checking radiobutton in the same group)
                        - space - checks currently focused radio as true if it already was not
                    It is necessary to find next radio button with same name(group).
                    Browser will skip other radiobuttons and check as true just the next one of specific group wherewer it is placed.
                    If there is no such a next radio button, browser marks as checked the first one of the group.
                */
                this.handleRadioButtonKeyPressBehaviour(activeVNode, elm as HTMLInputElement, keyCode);
            }
            else if (type === "checkbox") {
                /*
                    Natively Working keys: space - sets checkbox value to opposite;
                */
                if (keyCode === KeyCodes.Spacebar) {
                    (elm as HTMLInputElement).checked = !(elm as HTMLInputElement).checked;
                    emitEvents = true;
                }
            } else if (tag === "select") {
                /*
                    Natively working keys: all arrow keys => setting next or previous value in selectbox
                */
                const e: HTMLSelectElement = elm as HTMLSelectElement;
                const sIndex: number = e.selectedIndex;
                if (keyCode === KeyCodes.RightArrow || keyCode === KeyCodes.DownArrow) {
                    if (sIndex < e.length - 1) {
                        e.selectedIndex = sIndex + 1; // select next option if there is any
                        emitEvents = true;
                    }
                }
                else if (keyCode === KeyCodes.LeftArrow || keyCode === KeyCodes.UpArrow) {
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
            Handle nonwritting keys which edit texteditable elements content too.
            It is necessary to check if fakewritting is active. Fake writting sends actualy converted char code
            instead of keyboard key (only keypress event sends car code too) and there are some matching 
            char codes with nonwritting key codes:
            - 8:    ""-Backspace, 
            - 46:   "."-Delete
        */
        if (keyCode === KeyCodes.Delete || keyCode === KeyCodes.Backspace) {
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
        const selecitonEnd: number = this.selectedPosition.endPos;
        const selectionApplied: boolean = this.isKeyPressedAndHold(KeyCodes.Shift) && selectionStart !== selecitonEnd; // puvodne tu bylo nastaveny jenom false, zapomenuto nastavit, ale je divny, ze to pro textareu fakalo;

        switch (keyCode) {
            case KeyCodes.UpArrow:
                /* 
                    CTRL + SHIT + arrow up/down does the same as SHIFT + arrow up/down
                */
                if (this.isKeyPressedAndHold(KeyCodes.Shift))
                    /*
                        Set selection from the actual selection end position to the same position of the previous line or the closest available position to that.
                    */
                    this.selectTextOnTextEditableElm(elm, selectionStart, this.getPositionEndForNextOrPrevLineAction(elm, true))
                else
                    /*
                        Set caret posisiton to the same position on the previouse line or to the closest available position to that.
                    */
                    this.setCaretPosition(elm, this.getPositionEndForNextOrPrevLineAction(elm, true));
                break;
            case KeyCodes.DownArrow:
                if (this.isKeyPressedAndHold(KeyCodes.Shift)) {
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
            case KeyCodes.LeftArrow:
                if (this.isKeyPressedAndHold(KeyCodes.Shift)) {
                    if (this.isKeyPressedAndHold(KeyCodes.Ctrl)) {
                        /*
                            Select from the current position to the start of the previous word.
                            If there already is some selection it will continue adding/removing 
                            from/to selection depending on previous and current selection direction. 
                        */
                        this.selectTextOnTextEditableElm(elm, selectionStart, this.getPositionEndForNextOfPrevWordAction(elm, true));
                    } else {
                        /*
                            From current selection end position add previous character to the seleciton.
                            If there is already some selection and goes from the left to the right, then the selection will be shortened for last selected char.    
                        */
                        this.selectTextOnTextEditableElm(elm, selectionStart, selecitonEnd - 1);
                    }
                } else if (this.isKeyPressedAndHold(KeyCodes.Ctrl)) {
                    /*
                        Set the caret position after the current word (gap (white space) included if there is any after the current word).     
                    */
                    this.setCaretPosition(elm, this.getPositionEndForNextOfPrevWordAction(elm, true));
                } else {
                    /*
                        Set the caret positon to -1 of current postion (one position to the left)
                        if none selection is applied. Otherwise cancel selection and 
                        set caret position to minimum of selectionStart, selecitonEnd (not -1)                            
                    */
                    this.setCaretPosition(elm, Math.min(selectionStart, selecitonEnd) - (selectionApplied ? 0 : 1));
                }
                break;
            case KeyCodes.RightArrow:
                if (this.isKeyPressedAndHold(KeyCodes.Shift)) {
                    if (this.isKeyPressedAndHold(KeyCodes.Ctrl)) {
                        /*
                            Select from the current position to the start of the next word.
                            If there already is some selection it will continue adding/removing 
                            from/to selection depending on previous and current selection direction. 
                        */
                        this.selectTextOnTextEditableElm(elm, selectionStart, this.getPositionEndForNextOfPrevWordAction(elm, false));
                    } else {
                        /*
                            From current selection end position add next character to the seleciton.
                            If there is already some selection and goes from the right to the left (backwards selection), 
                            then the selection will be shortened for the visuly first selected char.    
                        */
                        this.selectTextOnTextEditableElm(elm, selectionStart, selecitonEnd + 1);
                    }
                } else if (this.isKeyPressedAndHold(KeyCodes.Ctrl)) {
                    /*
                        Set the caret position after the current word (gap (white space) included if there is any after the current word).     
                    */
                    this.setCaretPosition(elm, this.getPositionEndForNextOfPrevWordAction(elm, false));
                } else {
                    /*
                        Set the caret positon to +1 of current postion (one position to the right)
                        if none selection is applied. Otherwise cancel selection and 
                        set caret position to maximum of selectionStart, selecitonEnd (not +1) 
                        // note ozkouset pro textareu, byla zmena ve zjistovani podmince, jestli je selectionApplied                      
                    */
                    this.setCaretPosition(elm, Math.max(selectionStart, selecitonEnd) + (selectionApplied ? 0 : 1));
                }

                break;
            case KeyCodes.Home:
                if (this.isKeyPressedAndHold(KeyCodes.Shift)) {
                    if (this.isKeyPressedAndHold(KeyCodes.Ctrl)) {
                        /*
                            From current selectionStart position selects all text to beggining of the elm.
                            If there is already some selection applied and it is not backwards then it will be thrown away.
                        */
                        this.selectTextOnTextEditableElm(elm, selectionStart, 0);
                    } else {
                        /*
                            Selects all text from the selectionStart position to the begining of the line (backwards selection). 
                            If there is already some selection applied and it is not backwards then it will be thrown away.
                         */
                        this.selectTextOnTextEditableElm(elm, selectionStart, this.getStarPosOrEndPosForCurrentLine(elm, true));
                    }
                } else if (this.isKeyPressedAndHold(KeyCodes.Ctrl)) {
                    /*
                        Set caret position to the start of the elm.
                    */
                    this.setCaretPosition(elm, 0);
                } else {
                    /*
                        Set the caret position to the start of the currnet line.
                    */
                    this.setCaretPosition(elm, this.getStarPosOrEndPosForCurrentLine(elm, true));
                }
                break;
            case KeyCodes.End:
                if (this.isKeyPressedAndHold(KeyCodes.Shift)) {
                    if (this.isKeyPressedAndHold(KeyCodes.Ctrl)) {
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
                } else if (this.isKeyPressedAndHold(KeyCodes.Ctrl)) {
                    /*
                        Set the current position to the end of the elm.
                    */
                    this.setCaretPosition(elm, textContentLength);
                } else {
                    /*
                        Set caret positon to the end of the current line.
                    */
                    this.setCaretPosition(elm, this.getStarPosOrEndPosForCurrentLine(elm, false));
                }
                break;
            case KeyCodes.A:
                this.isKeyPressedAndHold(KeyCodes.Ctrl) && this.selectTextOnTextEditableElm(elm, 0, h.getTextEditableElmTextContent(elm).length)
                break;
            case KeyCodes.C:
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
    
            hint -  getPrevWod indicatest whether to find start of the previous word(start of current word - if caret start position is in the middle of the word)
                    or the start of the next word if there is any.
        */
        const end: number = this.selectedPosition.endPos;
        if (end === 0 && getPrevWord)
            return 0;

        const pureTextContent: string = h.getTextEditableElmTextContent(elm);
        if (end === pureTextContent.length && !getPrevWord)
            return pureTextContent.length;

        let done: boolean = false;
        let actualCheckedPosition: number = this.selectedPosition.endPos - 1;
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
            If none result was found that means that current position is amost at the end/start of the elm
            so no condition could fit. Therefore start/end of the elm is returned. 
            Just for case but should not happend.
        */
        if (!done)
            return getPrevWord ? 0 : pureTextContent.length;
        else
            return this.selectedPosition.endPos;
    }

    private getStarPosOrEndPosForCurrentLine(elm: HTMLElement, findStart: boolean): number {
        /*
            Returns index of the begining or ending of the current line.            
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
        let currentLineEndIndex: number = 0;

        if (linesWithItsContent.length === 1) {
            if (findStart)
                return 0;
            else
                return pureTextContent.length;
        } else {
            for (let i = 0; i < linesWithItsContent.length; i++) {
                currentLineEndIndex = currentLineEndIndex + linesWithItsContent[i].length;
                if (i > 0) {
                    --currentLineEndIndex; // zero index counts contains the char as well, so it is necessary to increase the endIndex for one shorter than length  
                    currentLineStartIndex = currentLineEndIndex + 1;
                }
                if (currentLineEndIndex + 1 > this.selectedPosition.endPos)  // +1 stands for the line break character
                    break;
            }
        }
        return findStart ? currentLineStartIndex : currentLineEndIndex;


    }

    /*
        !! For now it dows not support contentEditable elements
    */
    private getPositionEndForNextOrPrevLineAction(elm: HTMLElement, getPrevLinePos: boolean = false) {
        /*
            When navigating on the multi-line text editable elements (e.g. textarea or contentEditable elm)
            it is possible to vertically go to different (next/prev) line (e.g. by pressing up/down arrow keys)
            and set caret position on the same horizontal position as is on the current line
            if there is enough text in the desired line (if not, it goes to the last possible position on the line).
            for input (one line elm) it will move caret to the beggining or end of the line (depends on the direction of navigation action)
            
            HINT: - if the getPrevLinePos variable is false then gets the desireg position on the next line
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
        const isSelecting: boolean = this.isKeyPressedAndHold(KeyCodes.Shift);
        //let currentLineStartIndex: number = 0;
        let currentLineEndIndex: number = linesWithItsContent[0].length;

        if (linesWithItsContent.length === 1) {
            if (getPrevLinePos)
                return 0;
            else
                return pureTextContent.length;
        } else {
            let currentLine = 0;
            for (let i = 0; i < linesWithItsContent.length; i++) {
                if (i > 0)
                    currentLineEndIndex = currentLineEndIndex + linesWithItsContent[i].length + 1;
                if (currentLineEndIndex + 1 > this.selectedPosition.endPos) { // +1 stands for the line break character
                    currentLine = i;
                    break;
                }
                // currentLineStartIndex = currentLineEndIndex;
            }

            const currentPosisitonInLine: number = getCaretPositionInCurrentLine(currentLine);
            if (getPrevLinePos) {
                if (currentLine === 0)
                    return 0;
                else {
                    return getNewLineCaretPosition(currentPosisitonInLine, currentLine);
                }
            } else {
                if (currentLine === linesWithItsContent.length) // caret is on the last line so the action should place caret at the end of the line
                    return pureTextContent.length;
                else {
                    return getNewLineCaretPosition(currentPosisitonInLine, currentLine);
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

        function getNewLineCaretPosition(positionInCurrentLine: number, currentLine: number): number {
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
        if (document.getSelection && document.createRange) {
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

            const nodes: ChildNode[] = getAllNodesInElm(elm);

            for (let i = 0; i < nodes.length; i++) {
                /*
                    Because of text content is set via innerText 
                    (removes styles and both soft and hard enters are represented as <br> elm)
                    there should be present only textNodex and <br> elms as line breaks.
                    Note: handle the situation when browser adds one extra br as default (chrome does it for sure)
                */
                let node: ChildNode = nodes[i];

                const length = (node as any).length || 0;
                curTNodeEndIndex = curTNodeEndIndex + length;
                if (node.nodeName.toLowerCase() === "br") {
                    /*
                         "br" counts as line break character
                         but does not have available +1 space for selection
                         as textNode do therefore it is necessary to reflect it.
                    */
                    curTNodeEndIndex++;
                    curTNodeStartIndex++;
                }

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
                curTNodeStartIndex = curTNodeEndIndex;

            }

            this.selectedPosition.startPos = !backwardsSelection ? startIndex : endIndex;
            this.selectedPosition.endPos = !backwardsSelection ? endIndex : startIndex;

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

        function getAllNodesInElm(elm: ChildNode | HTMLElement): ChildNode[] {
            let nodes: ChildNode[] = [];
            nodes.push(elm);
            for (let i = 0; i < elm.childNodes.length; i++) {
                nodes.push(...getAllNodesInElm(elm.childNodes[i]))
            }
            return nodes;
        }
    }


    private handleRadioButtonKeyPressBehaviour(vNode: b.IBobrilCacheNode | undefined, elm: HTMLInputElement, keyCode: number): boolean | void {
        /*
            Natively working keys: 
                - arrows key (navigation - focusing and checking radiobutton in the same group)
                - space - checks currently focused radio as true if it already was not
            It is necessary to find next radio button with same name(group).
            Browser will skip other radiobuttons and check as true just the next one of specific group wherewer it is placed.
            If there is no such a next radio button, browser marks as checked the first one of the group.
        */
        if (keyCode === KeyCodes.Spacebar) {
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
                    h.isVisible(nodeElm) &&
                    !(node.element as HTMLInputElement).disabled
                ) {
                    radios.push(node);
                    if (node === vNode)
                        indexOfCurrentlyFocusedRadio = radios.length - 1;
                }
                loopChildren(node.children as b.IBobrilCacheNode[]);
            });
        }

        let goToRadioIndex: number = 0;
        let emitEvents: boolean = false;

        if (radios.length < 2 || indexOfCurrentlyFocusedRadio == undefined) // undefined index or 0 length should not happen and length 1 means that there is no other radio button to go to.
            return;

        if (keyCode === KeyCodes.DownArrow || keyCode === KeyCodes.RightArrow) {
            if (indexOfCurrentlyFocusedRadio < radios.length - 1)
                goToRadioIndex = ++indexOfCurrentlyFocusedRadio; // go to next radio button
            else goToRadioIndex = 0; // to to first radio of the group 
            emitEvents = true;
        }
        else if (keyCode === KeyCodes.UpArrow || keyCode === KeyCodes.LeftArrow) {
            if (indexOfCurrentlyFocusedRadio > 0)
                goToRadioIndex = --indexOfCurrentlyFocusedRadio; // go to previous radio of in the group
            else goToRadioIndex = radios.length - 1; // go to the last radio of the group
            emitEvents = true;
        }

        if (emitEvents) {
            const goToRadioNode: b.IBobrilCacheNode = radios[goToRadioIndex];
            const rElm: HTMLInputElement = goToRadioNode.element as HTMLInputElement;
            h.shouldBlur(rElm, goToRadioNode) && b.emitEvent(t.EventHandlers.blurHandlerName, {}, h.getActiveHTMLElement(), h.getActiveVNode());
            //b.focus(goToRadioNode);
            /*
                TODO: checknout, jestli by se neml volat fakt b.focus, aby se zavolali pripadne i 
                bobrili onFocusIn apod.
            */
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
            shiftKey: this.isKeyPressedAndHold(KeyCodes.Shift),
            ctrlKey: this.isKeyPressedAndHold(KeyCodes.Ctrl),
            altKey: this.isKeyPressedAndHold(KeyCodes.Alt),
            metaKey: false,
            keyCode: keyCode,
            charCode: keyCode
        } as KeyboardEvent;
    }
}

/*
    ==========================================
    END OF Simulation of emmiting user actions
    ==========================================
*/


// ================================= //
//     General - PUBLIC - UTILS      //
// ================================= //

/**
 * Method which focuses specified element (if focusable) and also handles blur on previusly focused one.
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
        if (h.isElmFocusable(element)) {
            element.focus();
            b.emitEvent(t.EventHandlers.focusHandlerName, {}, element, vNode);
        } else
            (document.activeElement as HTMLElement).blur();
    }
}

const browserRenderIntervalBaseRateMS = 16; // when nothing is blocking and browser renders new frame each 16.6 ms (60fpx => 1000/60 = 16.6) 
/**
 * Returns a promise which indicates whether the DOM has been rendered completelly or invalidation is still on. Also checks inifinete invalidation for the specified timeout. 
 * @param timeout - specifies how long should should be 
 */
export function checkIfFullyRendered(timeout?: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
        timeout = timeout ? timeout * 1000 : 5000;
        const start = new Date().getTime();
        const end = start + 5000;

        if (!b.invalidated()) {
            b.syncUpdate();
            resolveAndCarryOn();
        }

        const int = setInterval(() => {
            b.syncUpdate();
            if (!b.invalidated()) {
                clearInterval(int);
                resolveAndCarryOn();
            } else if (new Date().getTime() >= end) {
                clearInterval(int);
                reject(false);
            }
        }, browserRenderIntervalBaseRateMS);

        function resolveAndCarryOn(): void {
            setTimeout(() => {
                resolve(true);
            }, browserRenderIntervalBaseRateMS);
        }
    })
}

/**
 * Clears VDOM. Useful when there is an error so JS flow is stopped and destroy function of the components cannot properly proceed.
 */
export function clear() {
    b.init(() => { return null });
}

/**
 * Creates and returns new instance of BBBot class.
 */
export function createBot(): t.IBBBot {
    return new BBot();
}





