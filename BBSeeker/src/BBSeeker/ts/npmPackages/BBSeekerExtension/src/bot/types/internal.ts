export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
    {
        [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
    }[Keys];

export interface IMouseEventInternal {
    clientX: number;
    clientY: number;
    which: number;
    button: number;
    shiftKey: boolean;
    ctrlKey: boolean;
    altKey: boolean;
    metaKey: boolean;
    detail: number;
    buttons: number;
    target: HTMLElement;
    preventDefault: () => void;
}

export interface IPointerEventInternal extends IMouseEventInternal {
    pointerType: string;
    pointerId: number;
    target: HTMLElement;
}

export const enum EventHandlers {
    leftClickHandlerName = "click",
    secondClickHandler = "^click", // bobril adds two listeners on click with different internal names (each has different function - "^click" - main "click" -emits emitOnChange)
    leftDoubleClickHandlerName = "dblclick",
    rightClickHandlerName = "contextmenu",
    pointerDownHandlerName = "pointerdown", // bobril virtual pointer handlers handles all(touch, mouse and pointer) events => e.g. runs pointerDown and mouseDown
    pointerUpHandlerName = "pointerup",
    pointerMoveHandlerName = "pointermove",
    pointerCancelHandlerName = "pointercancel",
    keyDownHandlerName = "keydown",
    keyPressHandlerName = "keypress",
    keyUpHandlerName = "keyup",
    blurHandlerName = "^blur",
    focusHandlerName = "^focus",
    selectStartHandlerName = "selectstart",
    inputHandlerName = "input",
    changeHandlerName = "change"
}

// Browser "button" property is in range 0-2 but bobril uses value from "which" property which is in range 1-3
export const enum MouseButton {
    None = 0,
    Left = 1,
    Wheel = 2,
    Right = 3
}

export const enum FocusableBy {
    MOUSE = "mouse",
    KEYBOARD = "keyboard"
}