import * as b from "bobril";

export interface IBBBot {
    //////////////////
    // CLICK EVENTS //    
    //////////////////    
    /**
     * Emits click by left mouse button on specified element. If the specified element is out of the viewport (it is scrolled out) then the bot will
     * automatically also scroll to the position needed to make the element visible.
     * Note: By default are used coordinates of upper left corner of the element (x:1 y:1). If these coordinates are overlapped by child or another 
     * element (e.g. relatively positioned) then the top most element would be clicked (as would also in browser).
     * To make sure to click the desired element specify within element click coordinates @param coordinatesInElm .
     * @param elm - specifies HTML element which should be clicked on. 
     * @param maxNextActionDelayMS - Specifies maximum length of period after which should be triggered further action pipeline. 
     * E.G. it gives time to browser or server to react to user action.
     * @param terminateAfterFirstInvalidate - Specifies whether further action pipeline should be triggered right after first invalidate is done 
     * in case they some occurs within the interval specified by @param maxNextActionDelayMS .
     * @param coordinatesInElm - Specific coordinates which should be clicked within the element. 
     * (useful when element has some child which overlaps default click position - upper left corner of the element (x:1, y:1)) 
     */
    emitLeftMouseClickOnHTMLElement(
        elm: HTMLElement,
        maxNextActionDelayMS?: number,
        terminateAfterFirstInvalidate?: boolean,
        coordinatesInElm?: ICoordinates
    ): Promise<void>

    /**
     * Emits click by left mouse button on specified coordinates. If the specified coordinates are out of the viewport (it is scrolled out) then the bot will
     * automatically also scroll to the position needed to make the coordinates visible.
     * @param x - specifies absolute X coordinate of the click.
     * @param y - specifies absolute Y coordinate of the click. 
     * @param maxNextActionDelayMS - Specifies maximum length of period after which should be triggered further action pipeline. 
     * E.G. it gives time to browser or server to react to user action.
     * @param terminateAfterFirstInvalidate - Specifies whether further action pipeline should be triggered right after first invalidate is done 
     * in case they some occurs within the interval specified by @param maxNextActionDelayMS .
     */
    emitLeftMouseClickOnCoordinates(
        x: number,
        y: number,
        maxNextActionDelayMS?: number,
        terminateAfterFirstInvalidate?: boolean
    ): Promise<void>

    /**
     * Emits double click by left mouse button on specified element. If the specified element is out of the viewport (it is scrolled out) then the bot will
     * automatically also scroll to the position needed to make the element visible.
     * Note: By default are used coordinates of upper left corner of the element (x:1 y:1). If these coordinates are overlapped by child or another 
     * element (e.g. relatively positioned) then the top most element would be clicked (as would also in browser).
     * To make sure to click the desired element specify within element click coordinates @param coordinatesInElm .
     * @param elm - specifies HTML element which should be clicked on. 
     * @param maxNextActionDelayMS - Specifies maximum length of period after which should be triggered further action pipeline. 
     * E.G. it gives time to browser or server to react to user action.
     * @param terminateAfterFirstInvalidate - Specifies whether further action pipeline should be triggered right after first invalidate is done 
     * in case they some occurs within the interval specified by @param maxNextActionDelayMS .
     * @param coordinatesInElm - Specific coordinates which should be clicked within the element. 
     * (useful when element has some child which overlaps default click position - upper left corner of the element (x:1, y:1)) 
     */
    emitLeftMouseDoubleClickOnSpecificHTMLElement(
        elm: HTMLElement,
        maxNextActionDelayMS?: number,
        terminateAfterFirstInvalidate?: boolean,
        coordinatesInElm?: ICoordinates
    ): Promise<void>

    /**
     * Emits double click by left mouse button on specified coordinates. If the specified coordinates are out of the viewport (it is scrolled out) then the bot will
     * automatically also scroll to the position needed to make the coordinates visible.
     * @param x - specifies absolute X coordinate of the click.
     * @param y - specifies absolute Y coordinate of the click. 
     * @param maxNextActionDelayMS - Specifies maximum length of period after which should be triggered further action pipeline. 
     * E.G. it gives time to browser or server to react to user action.
     * @param terminateAfterFirstInvalidate - Specifies whether further action pipeline should be triggered right after first invalidate is done 
     * in case they some occurs within the interval specified by @param maxNextActionDelayMS .
     */
    emitLeftMouseDoubleClickOnCoordinates(
        x: number,
        y: number,
        maxNextActionDelayMS?: number,
        terminateAfterFirstInvalidate?: boolean
    ): Promise<void>

    /**
     * Emits double click by Right mouse button on specified element. If the specified element is out of the viewport (it is scrolled out) then the bot will
     * automatically also scroll to the position needed to make the element visible.
     * Note: By default are used coordinates of upper left corner of the element (x:1 y:1). If these coordinates are overlapped by child or another 
     * element (e.g. relatively positioned) then the top most element would be clicked (as would also in browser).
     * To make sure to click the desired element specify within element click coordinates @param coordinatesInElm .
     * @param elm - specifies HTML element which should be clicked on. 
     * @param maxNextActionDelayMS - Specifies maximum length of period after which should be triggered further action pipeline. 
     * E.G. it gives time to browser or server to react to user action.
     * @param terminateAfterFirstInvalidate - Specifies whether further action pipeline should be triggered right after first invalidate is done 
     * in case they some occurs within the interval specified by @param maxNextActionDelayMS .
     * @param coordinatesInElm - Specific coordinates which should be clicked within the element. 
     * (useful when element has some child which overlaps default click position - upper left corner of the element (x:1, y:1)) 
     */
    emitRightMouseClickOnHTMLElement(
        elm: HTMLElement,
        maxNextActionDelayMS?: number,
        terminateAfterFirstInvalidate?: boolean,
        coordinatesInElm?: ICoordinates
    ): Promise<void>

    /**
     * Emits double click by Right mouse button on specified coordinates. If the specified coordinates are out of the viewport (it is scrolled out) then the bot will
     * automatically also scroll to the position needed to make the coordinates visible.
     * @param x - specifies absolute X coordinate of the click.
     * @param y - specifies absolute Y coordinate of the click. 
     * @param maxNextActionDelayMS - Specifies maximum length of period after which should be triggered further action pipeline. 
     * E.G. it gives time to browser or server to react to user action.
     * @param terminateAfterFirstInvalidate - Specifies whether further action pipeline should be triggered right after first invalidate is done 
     * in case they some occurs within the interval specified by @param maxNextActionDelayMS .
     */
    emitRightMouseClickOnCoordinates(
        x: number,
        y: number,
        maxNextActionDelayMS?: number,
        terminateAfterFirstInvalidate?: boolean
    ): Promise<void>

    /**
     * Emits click by wheel mouse button. If the specified element is out of the viewport (it is scrolled out) then the bot will
     * automatically also scroll to the position needed to make the element visible.
     * Note: By default are used coordinates of upper left corner of the element (x:1 y:1). If these coordinates are overlapped by child or another 
     * element (e.g. relatively positioned) then the top most element would be clicked (as would also in browser).
     * To make sure to click the desired element specify within element click coordinates @param coordinatesInElm .
     * @param elm - specifies HTML element which should be clicked on. 
     * @param maxNextActionDelayMS - Specifies maximum length of period after which should be triggered further action pipeline. 
     * E.G. it gives time to browser or server to react to user action.
     * @param terminateAfterFirstInvalidate - Specifies whether further action pipeline should be triggered right after first invalidate is done 
     * in case they some occurs within the interval specified by @param maxNextActionDelayMS .
     * @param coordinatesInElm - Specific coordinates which should be clicked within the element. 
     * (useful when element has some child which overlaps default click position - upper left corner of the element (x:1, y:1)) 
     */
    emitWheelClickOnHTMLElement(
        elm: HTMLElement,
        maxNextActionDelayMS?: number,
        terminateAfterFirstInvalidate?: boolean,
        coordinatesInElm?: ICoordinates
    ): Promise<void>

    /**
     * Emits click by wheel mouse button. If the specified coordinates are out of the viewport (it is scrolled out) then the bot will
     * automatically also scroll to the position needed to make the coordinates visible.
     * @param x - specifies absolute X coordinate of the click.
     * @param y - specifies absolute Y coordinate of the click. 
     * @param maxNextActionDelayMS - Specifies maximum length of period after which should be triggered further action pipeline. 
     * E.G. it gives time to browser or server to react to user action.
     * @param terminateAfterFirstInvalidate - Specifies whether further action pipeline should be triggered right after first invalidate is done 
     * in case they some occurs within the interval specified by @param maxNextActionDelayMS .
     */
    emitWheelClickOnCoordinates(
        x: number,
        y: number,
        maxNextActionDelayMS?: number,
        terminateAfterFirstInvalidate?: boolean
    ): Promise<void>

    ///////////////////////
    // MOUSE MOVE EVENTS //    
    ///////////////////////

    /**
     * Simulates moving "virtual cursor" (hover) to the specified element (not possible to move physical visible cursor with JS).
     * (triggers events like mouseOver => mouseEnter => mouseIn => mouseMove)
     * If the specified element is out of viewport (it is scrolled out) then the bot will automatically also scroll to the position needed to make the element visible.
     * To leave the element call @method mouseLeaveCurrentlyHoveredElm . 
     * Note: By default are used coordinates of upper left corner of the element (x:1 y:1). If these coordinates are overlapped by child or another 
     * element (e.g. relatively positioned) then the top most element would be clicked (as would also in browser).
     * To make sure to click the desired element specify within element click coordinates @param coordinatesInElm .
     * @param elm - HTML element which should "cursor" move to 
     * @param maxNextActionDelayMS - Specifies maximum length of period after which should be triggered further action pipeline. 
     * E.G. it gives time to browser or server to react to user action.
     * @param terminateAfterFirstInvalidate - Specifies whether further action pipeline should be triggered right after first invalidate is done 
     * in case they some occurs within the interval specified by @param maxNextActionDelayMS .
     * @param coordinatesInElm - Specific coordinates which should be clicked within the element. 
     * (useful when element has some child which overlaps default click position - upper left corner of the element (x:1, y:1)) 
     */
    pointerMoveToElm(
        elm: HTMLElement,
        maxNextActionDelayMS?: number,
        terminateAfterFirstInvalidate?: boolean,
        coordinatesInElm?: ICoordinates
    ): Promise<void>

    /**
     * Simulates moving virtual cursor to specified coordinates.
     * Virtual cursor is accurate expression because it is not possible to move real cursor by JS. 
     * If the specified coordinates are out of the viewport (it is scrolled out) then the bot will
     * automatically also scroll to the position needed to make the coordinates visible.
     * @param x - Specifies absolute X coordinate where should be virtual cursor moved to.
     * @param y - Specifies absolute Y coordinate where should be virtual cursor moved to.
     * @param maxNextActionDelayMS - Specifies maximum length of period after which should be triggered further action pipeline. 
     * E.G. it gives time to browser or server to react to user action.
     * @param terminateAfterFirstInvalidate - Specifies whether further action pipeline should be triggered right after first invalidate is done 
     * in case they some occurs within the interval specified by @param maxNextActionDelayMS .
     */
    pointerMoveToCoordinates(
        x: number,
        y: number,
        maxNextActionDelayMS?: number,
        terminateAfterFirstInvalidate?: boolean
    ): Promise<void>

    ///////////////////
    // SCROLL EVENTS //    
    ///////////////////


    /**
     * Scrolls up on specified element by spinning the mouse wheel. Each emit runs only one wheel spin which scrolls for 100px if possible. 
     * Simulates browser native behavior => if the elm is not scrollable (or scrolled to max) the event bubbles
     * and looks for the closes scrollable parent and scroll it instead if there is any.
     * Note: If the element is out of viewport it is scrolled whole viewport to make the element visible (user also cannot scroll elm which cannot see).
     * @param elm - Specifies element on which should be done wheel scrolling.
     * @param maxNextActionDelayMS - Specifies maximum length of period after which should be triggered further action pipeline. 
     * E.G. it gives time to browser or server to react to user action.
     * @param terminateAfterFirstInvalidate - Specifies whether further action pipeline should be triggered right after first invalidate is done 
     * in case they some occurs within the interval specified by @param maxNextActionDelayMS .
     */
    scrollElmUpByWheelUp(
        elm: HTMLElement,
        maxNextActionDelayMS?: number,
        terminateAfterFirstInvalidate?: boolean
    ): Promise<void>

    /**
     * Scrolls down on specified element by spinning the mouse wheel. Each emit runs only one wheel spin which scrolls for 100px if possible. 
     * Simulates browser native behavior => if the elm is not scrollable (or scrolled to max) the event bubbles
     * and looks for the closes scrollable parent and scroll it instead if there is any.
     * Note: If the element is out of viewport it is scrolled whole viewport to make the element visible (user also cannot scroll elm which cannot see).
     * @param elm - Specifies element on which should be done wheel scrolling.
     * @param maxNextActionDelayMS - Specifies maximum length of period after which should be triggered further action pipeline. 
     * E.G. it gives time to browser or server to react to user action.
     * @param terminateAfterFirstInvalidate - Specifies whether further action pipeline should be triggered right after first invalidate is done 
     * in case they some occurs within the interval specified by @param maxNextActionDelayMS .
     */
    scrollElmDownByWheelDown(
        elm: HTMLElement,
        maxNextActionDelayMS?: number,
        terminateAfterFirstInvalidate?: boolean
    ): Promise<void>

    /**
     * Vertically scrolls the specified element to the up by specified px if the element is scrollable 
     * (current scrollTop value is modified (decreased) by pxStep).
     * Simulates dragging vertical scrollbar of specific element.
     * Note: If the element is out of viewport it is scrolled whole viewport to make the element visible (user also cannot scroll elm which cannot see).
     * @param elm - Specifies element which should be scrolled.
     * @param pxStep - Specifies how many pixels should scroll move.
     * @param maxNextActionDelayMS - Specifies maximum length of period after which should be triggered further action pipeline. 
     * E.G. it gives time to browser or server to react to user action.
     * @param terminateAfterFirstInvalidate - Specifies whether further action pipeline should be triggered right after first invalidate is done 
     * in case they some occurs within the interval specified by @param maxNextActionDelayMS .
     */
    scrollElmUpByStep(
        elm: HTMLElement,
        pxStep: number,
        maxNextActionDelayMS?: number,
        terminateAfterFirstInvalidate?: boolean
    ): Promise<void>

    /**
     * Scrolls the specified element down by specified px if the element is scrollable 
     * (current scrollTop value is modified (increased) by pxStep).
     * Simulates dragging vertical scrollbar of specific element.
     * Note: If the element is out of viewport it is scrolled whole viewport to make the element visible (user also cannot scroll elm which cannot see).
     * @param elm - Specifies element which should be scrolled.
     * @param pxStep - Specifies how many pixels should scroll move.
     * @param maxNextActionDelayMS - Specifies maximum length of period after which should be triggered further action pipeline. 
     * E.G. it gives time to browser or server to react to user action.
     * @param terminateAfterFirstInvalidate - Specifies whether further action pipeline should be triggered right after first invalidate is done 
     * in case they some occurs within the interval specified by @param maxNextActionDelayMS .
     */
    scrollElmDownByStep(
        elm: HTMLElement,
        pxStep: number,
        maxNextActionDelayMS?: number,
        terminateAfterFirstInvalidate?: boolean
    ): Promise<void>

    /**
     * Vertically scrolls the specified element to exact scrollTop position if the element is scrollable.
     * Simulates dragging vertical scrollbar of specific element.
     * Note: If the element is out of viewport it is scrolled whole viewport to make the element visible (user also cannot scroll elm which cannot see).
     * @param elm - Specifies element which should be scrolled.
     * @param finalScrollTop - Specifies exact scrollTop position to move on - no matter of current scrollTop.
     * @param maxNextActionDelayMS - Specifies maximum length of period after which should be triggered further action pipeline. 
     * E.G. it gives time to browser or server to react to user action.
     * @param terminateAfterFirstInvalidate - Specifies whether further action pipeline should be triggered right after first invalidate is done 
     * in case they some occurs within the interval specified by @param maxNextActionDelayMS .
     */
    scrollElmVerticallyExact(
        elm: HTMLElement,
        finalScrollTop: number,
        maxNextActionDelayMS?: number,
        terminateAfterFirstInvalidate?: boolean
    ): Promise<void>

    /**
     * Horizontally scrolls the specified element to the left by specified px if the element is scrollable 
     * (current scrollLeft value is modified (decreased) by pxStep).
     * Simulates dragging horizontal scrollbar of specific element.
     * Note: If the element is out of viewport it is scrolled whole viewport to make the element visible (user also cannot scroll elm which cannot see).
     * @param elm - Specifies element which should be scrolled.
     * @param pxStep - Specifies how many pixels should scroll move.
     * @param maxNextActionDelayMS - Specifies maximum length of period after which should be triggered further action pipeline. 
     * E.G. it gives time to browser or server to react to user action.
     * @param terminateAfterFirstInvalidate - Specifies whether further action pipeline should be triggered right after first invalidate is done 
     * in case they some occurs within the interval specified by @param maxNextActionDelayMS .
     */
    scrollElmLeftByStep(
        elm: HTMLElement,
        pxStep: number,
        maxNextActionDelayMS?: number,
        terminateAfterFirstInvalidate?: boolean
    ): Promise<void>

    /**
     * Horizontally scrolls the specified element to the right by specified px if the element is scrollable 
     * (current scrollLeft value is modified (increased) by pxStep).
     * Simulates dragging horizontal scrollbar of specific element.
     * Note: If the element is out of viewport it is scrolled whole viewport to make the element visible (user also cannot scroll elm which cannot see).
     * @param elm - Specifies element which should be scrolled.
     * @param pxStep - Specifies how many pixels should scroll move.
     * @param maxNextActionDelayMS - Specifies maximum length of period after which should be triggered further action pipeline. 
     * E.G. it gives time to browser or server to react to user action.
     * @param terminateAfterFirstInvalidate - Specifies whether further action pipeline should be triggered right after first invalidate is done 
     * in case they some occurs within the interval specified by @param maxNextActionDelayMS .
     */
    scrollElmRightByStep(
        elm: HTMLElement,
        pxStep: number,
        maxNextActionDelayMS?: number,
        terminateAfterFirstInvalidate?: boolean
    ): Promise<void>

    /**
     * Horizontally scrolls the specified element to exact scrollLeft position if the element is scrollable.
     * Simulates dragging horizontal scrollbar of specific element.
     * Note: If the element is out of viewport it is scrolled whole viewport to make the element visible (user also cannot scroll elm which cannot see).
     * @param elm - Specifies element which should be scrolled.
     * @param finalScrollLeft - Specifies exact scrollLeft position to move on - no matter of current scrollLeft.
     * @param maxNextActionDelayMS - Specifies maximum length of period after which should be triggered further action pipeline. 
     * E.G. it gives time to browser or server to react to user action.
     * @param terminateAfterFirstInvalidate - Specifies whether further action pipeline should be triggered right after first invalidate is done 
     * in case they some occurs within the interval specified by @param maxNextActionDelayMS .
     */
    scrollElmHorizontallyExact(
        elm: HTMLElement,
        finalScrollLeft: number,
        maxNextActionDelayMS?: number,
        terminateAfterFirstInvalidate?: boolean
    ): Promise<void>

    /////////////////////
    // KEYPRESS EVENTS //    
    ///////////////////// 

    /**
     * Writes expression to currently active writable element (input, textarea, content editable elms).
     * supported types of input elms: "text", "password", "search", "url", "tel"
     * Note: Input type number is not supported because chrome and other browsers does not allow setting selection start/end
     * therefore it is not possible to navigate via keyboard in it. Supported are elms which allow both writing and navigation.
     * @param expression - expression which should be inserted into the currently active writeable element.
     * @param maxNextActionDelayMS - Specifies maximum length of period after which should be triggered further action pipeline. 
     * E.G. it gives time to browser or server to react to user action.
     * @param terminateAfterFirstInvalidate - Specifies whether further action pipeline should be triggered right after first invalidate is done 
     * in case they some occurs within the interval specified by @param maxNextActionDelayMS .
     * @param usedDelayForEachLetter - specifies whether the delay should be applied for each letter or just after whole expression is inserted - default value is false. 
     */
    writeExpression(
        expression: string | number,
        maxNextActionDelayMS?: number,
        terminateAfterFirstInvalidate?: boolean,
        usedDelayForEachLetter?: boolean
    ): Promise<void>

    /**
     * Emits single keypress of various key defined by keyCode. 
     * @param keyCode - specifies which key should be pressed.
     * @param maxNextActionDelayMS - Specifies maximum length of period after which should be triggered further action pipeline. 
     * E.G. it gives time to browser or server to react to user action.
     * @param terminateAfterFirstInvalidate - Specifies whether further action pipeline should be triggered right after first invalidate is done 
     * in case they some occurs within the interval specified by @param maxNextActionDelayMS .
     * @param fakeWriting - Do not specify => will be removed in future.
     */
    emitKeyPress(
        keyCode: number,
        maxNextActionDelayMS?: number,
        terminateAfterFirstInvalidate?: boolean,
        fakeWriting?: boolean
    ): Promise<void>

    /**
     * Simulates keypress and hold user action. To release the key call method "emitKeyRelease" with.
     * @param keyCode - specifies which key should be pressed and held.
     * NOTE: Only non-writing keys are supported (Tab key excluded as well). For writing use method "writeExpression" instead.
     */
    emitKeyPressAndHold(keyCode: number): Promise<void>

    /**
     * Simulates releasing of specific holt key.
     * @param keyCode - keycode of the keyboard key which should be released.
     */
    emitKeyRelease(keyCode: number): Promise<void>
}


export interface IMouseEventInternal extends b.IBobrilMouseEvent {
    // MouseEvent properties
    clientX: number,
    clientY: number,
    which: number,
    button: number,
    shiftKey: boolean,
    ctrlKey: boolean,
    altKey: boolean,
    metaKey: boolean,
    detail: number,
    buttons: number
}

export interface IPointerEventInternal extends b.IBobrilPointerEvent, IMouseEventInternal {
    pointerType: string,
    pointerId: number
}

export const enum EventHandlers {
    leftClickHandlerName = "^click",
    secondClickHandler = "click", // bobril adds two listeners on click with different internal names (each has different function - "^click" - main "click" -emits emitOnChange)
    leftDoubleClickHandlerName = "^dblclick",
    rightClickHandlerName = "contextmenu",
    pointerDownHandlerName = "pointerdown", // bobril virtual pointer handlers handles all(touch, mouse and pointer) events => e.g. runs pointerDown and mouseDown
    pointerUpHandlerName = "pointerup",
    pointerMoveHandlerName = "pointermove",
    keyDownHandlerName = "keydown",
    keyPressHandlerName = "keypress",
    keyUpHandlerName = "keyup",
    blurHandlerName = "^blur",
    focusHandlerName = "^focus",
    selectStartHandlerName = "selectstart",
    inputHandlerName = "input",
    changeHandlerName = "change",
}

// Browser "button" property is in range 0-2 but bobril uses value from "which" property which is in range 1-3
export const enum MouseButton {
    None = 0,
    Left = 1,
    Wheel = 2,
    Right = 3
}

export interface ICoordinates {
    x: number,
    y: number
}