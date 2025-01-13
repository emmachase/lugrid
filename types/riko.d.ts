declare function print(this: void, str: string, fg?: number, bg?: number, x?: number, y?: number): void;
declare function write(this: void, str: string, x: number, y: number, color: number): void;

declare function sleep(this: void, seconds: number): void;

interface ResponseHandle {
    readAll(this: void): string;
}

declare const net: {
    get(this: void, url: string): ResponseHandle;
}

declare const os: {
    clock(this: void): number;
}

declare const gpu: {
    drawRectangle(this: void, x: number, y: number, width: number, height: number, color: number): void;

    clear(this: void, color?: number): void;
    swap(this: void): void;

    width: number;
    height: number;
}

declare const coroutine: {
    yield(this: void, ...args: unknown[]): LuaMultiReturn<[unknown]>;
}

declare const string: {
    match(this: void, str: string, pattern: string): LuaMultiReturn<string[]>;
}
