// print("Hello world!")

// const x = net.get("https://example.com")
// print(x.readAll())

enum RikoPalette {
    Black = 1,
    DarkBlue,
    Magenta,
    DarkGreen,
    Brown,
    DarkGray,
    LightGray,
    Red,
    Orange,
    Yellow,
    LightGreen,
    Cyan,
    Purple,
    Pink,
    Peach,
    White
}

const LINE_HEIGHT = 6;
function measureText(text: string): { width: number, height: number } {
    // TODO: Newlines
    // TODO: Measure text using font
    return { width: text.length*4, height: LINE_HEIGHT };
}

function JSONStringify(obj: any, indent: string = ""): string {
    if (typeof obj === "string") {
        return `"${obj}"`;
    } else if (typeof obj === "number" || typeof obj === "boolean") {
        return obj.toString();
    } else if (Array.isArray(obj)) {
        const sindent = indent + " ";
        return `[\n${sindent}${obj.map((e) => JSONStringify(e, sindent + " ")).join(`,\n${sindent}`)}\n${indent}]`;
    } else if (typeof obj === "object") {
        return `{${Object.entries(obj).map(([key, value]) => `${JSONStringify(key, indent + " ")}: ${JSONStringify(value, indent + " ")}`).join(", ")}}`;
    } else {
        return "null";
    }
}

interface ElementContentSizing {
    getMinContentSize(
        maxInlineSize: number,
        maxBlockSize: number
    ): { inline: number, block: number };
    getMaxContentSize(): { inline: number, block: number };
}

enum ElementType {
    BLOCK = "block",
    // INLINE,
    TEXT = "text",
    BREAK = "break",
}

// TODO: Have more block types?

interface CommonStyle {
    padding: number;
    margin: number;
    backgroundColor?: RikoPalette;
}

class Element {
    public style: CommonStyle;

    constructor(
        public type: string,
        public children: Element[] | null = null,
        style: Partial<CommonStyle> = {},
    ) {
        this.style = {
            padding: 0,
            margin: 0,
            ...style,
        };
    }
}

class TextElement extends Element {
    constructor(
        public text: string,
    ) {
        super("text");
    }
}

interface Box {
    x: number;
    y: number;
    width: number;
    height: number;
}

enum DisplayCommandType {
    RECT,
    TEXT,
    BEGIN_SCISSOR,
    END_SCISSOR,
}

interface RectDisplayCommand {
    type: DisplayCommandType.RECT;
    x: number;
    y: number;
    width: number;
    height: number;
    color: number;
}

interface TextDisplayCommand {
    type: DisplayCommandType.TEXT;
    x: number;
    y: number;
    text: string;
    color: number;
}

interface BeginScissorDisplayCommand {
    type: DisplayCommandType.BEGIN_SCISSOR;
    x: number;
    y: number;
    width: number;
    height: number;
}

interface EndScissorDisplayCommand {
    type: DisplayCommandType.END_SCISSOR;
}

type DisplayCommand = 
    | RectDisplayCommand
    | TextDisplayCommand
    | BeginScissorDisplayCommand
    | EndScissorDisplayCommand;

type DisplayList = DisplayCommand[];

function paintBoxRect(box: Box, color: RikoPalette): RectDisplayCommand {
    return {
        type: DisplayCommandType.RECT,
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        color,
    }
}

interface LayoutNode extends ElementContentSizing {
    parent: LayoutNode | null;
    children: LayoutNode[];
    
    // computedBox: Partial<Box>;

    marginBox: Partial<Box>;
    borderBox: Partial<Box>;
    // contentBox: Partial<Box>; TODO

    layout(box: Box): void;
    paint(): DisplayList;
    paintUnwind?(): DisplayList;
}

class DocumentLayout implements LayoutNode {
    parent = null;
    children: LayoutNode[];

    // computedBox: Partial<Box> = {};
    marginBox: Partial<Box> = {};
    borderBox: Partial<Box> = {};

    constructor(
        // private documentWidth: number,
        public node: Element,
        // public child: LayoutNode,
    ) {
        this.children = [new BlockLayout(
            node,
            this,
        )]
    }

    getMinContentSize(maxInlineSize: number, maxBlockSize: number): { inline: number; block: number; } {
        return this.children[0].getMinContentSize(maxInlineSize, maxBlockSize);
    }
    getMaxContentSize(): { inline: number; block: number; } {
        return this.children[0].getMaxContentSize();
    }

    layout(box: Box): void {
        this.marginBox = { ...box };
        this.borderBox = { ...box };
        this.children[0].layout(box);
        this.marginBox.height = this.children[0].marginBox.y! + this.children[0].marginBox.height!;
        this.borderBox.height = this.marginBox.height;
    }

    paint(): DisplayList {
        return [];
    }
}

class BlockLayout implements LayoutNode {
    // computedBox: Partial<Box> = {};
    marginBox: Partial<Box> = {};
    borderBox: Partial<Box> = {};
    children: LayoutNode[];

    constructor(
        // public children: LayoutNode[],
        public node: Element,
        public parent: LayoutNode
    ) {
        this.children = [];

        if (node.children !== null) {
            // If we have mixed children, we need to create anonymous blocks
            const createAnonBlocks = node.children.some(child => child.type === ElementType.BLOCK);

            let currentInline: Element[] | null = null;
            for (const child of node.children) {
                if (child.type === ElementType.BLOCK) {
                    this.children.push(new BlockLayout(
                        child,
                        this,
                    ));

                    // Reset current inline to start a new block
                    currentInline = null;
                } else {
                    if (currentInline === null) {
                        currentInline = [child];
                        
                        if (createAnonBlocks) {
                            this.children.push(new BlockLayout(
                                new Element("block", currentInline),
                                this,
                            ));
                        } else {
                            this.children.push(new InlineLayout(
                                currentInline,
                                this,
                            ));
                        }

                    } else {
                        currentInline.push(child);
                    }
                }
            }
        }
    }

    getMinContentSize(maxInlineSize: number, maxBlockSize: number): { inline: number; block: number; } {
        let inline = 0;
        let block = 0;

        for (const child of this.children) {
            const { inline: childInline, block: childBlock } = child.getMinContentSize(maxInlineSize, maxBlockSize - block);
            inline = Math.max(inline, childInline);
            block += childBlock;
        }

        return {
            inline: inline + this.node.style.padding * 2 + this.node.style.margin * 2,
            block: block + this.node.style.padding * 2 + this.node.style.margin * 2
        };
    }

    getMaxContentSize(): { inline: number; block: number; } {
        let inline = 0;
        let block = 0;

        for (const child of this.children) {
            const { inline: childInline, block: childBlock } = child.getMaxContentSize();
            inline = Math.max(inline, childInline);
            block += childBlock;
        }

        return {
            inline: inline + this.node.style.padding * 2 + this.node.style.margin * 2,
            block: block + this.node.style.padding * 2 + this.node.style.margin * 2
        };
    }

    layout(box: Box): void {
        const padding = this.node.style.padding;
        const margin = this.node.style.margin;

        const computedMarginBox = {
            width: box.width,
            x: box.x,
            y: box.y,
            height: 0
        }
        const computedBox = {
            width: box.width - margin * 2,
            x: box.x + margin,
            y: box.y + margin,
            height: 0
        };
        this.marginBox = computedMarginBox;
        this.borderBox = computedBox;

        const elWidth = computedBox.width - padding * 2;
        let currentY = computedBox.y + padding;
        for (const child of this.children) {
            child.layout({
                x: computedBox.x + padding,
                y: currentY,
                width: elWidth,
                height: Infinity // height: box.height - (currentY - box.y) - padding * 2 // TODO: SUS
            });
            // const yDiff = child.computedBox.y! - currentY;
            currentY += child.marginBox.height ?? 0;
        }

        // Only need to add padding once since it's already added to the child's y
        computedBox.height = currentY - computedBox.y + padding;
        computedMarginBox.height = computedBox.height + margin * 2;
    }

    paint(): DisplayList {
        const commands: DisplayList = [];

        if (this.node.style.backgroundColor) {
            commands.push(paintBoxRect(this.borderBox as Box, this.node.style.backgroundColor));
        }

        return commands;
    }
}

class InlineLayout implements LayoutNode {
    // computedBox: Partial<Box> = {};
    marginBox: Partial<Box> = {};
    borderBox: Partial<Box> = this.marginBox;
    children: LayoutNode[] = [];
    lines: string[][] = [];

    constructor(
        public nodes: Element[],
        public parent: LayoutNode
    ) {


        // this.children = [];

        // if (node.children !== null) {
        //     for (const child of node.children) {
        //         if (child.type === ElementType.BLOCK) {
        //             this.children.push(new BlockLayout(
        //                 child,
        //                 this,
        //             ));
        //         } else {
        //             this.children.push(new InlineLayout(
        //                 child,
        //                 this,
        //             ));
        //         }
        //     }
        // }
    }

    getMinContentSize(maxInlineSize: number, maxBlockSize: number): { inline: number; block: number; } {
        // let inline = 0;
        // let block = 0;

        // // TODO: This doesn't seem right

        // for (const node of this.nodes) {
        //     if (node instanceof TextElement) {
        //         for (const word of node.text.split(" ")) {
        //             const { width, height } = measureText(word);
        //             inline = Math.max(inline, width);
        //             block += height;
        //         }
        //         // const { width, height } = measureText(node.text);
        //         // inline = Math.max(inline, width);
        //         // block += height;
        //     }
        // }

        // return { inline, block };

        this.layout({
            x: 0,
            y: 0,
            width: 0, // maxInlineSize,
            height: maxBlockSize
        }); // TODO: This is a hack

        return { inline: this.marginBox.width!, block: this.marginBox.height! };
    }

    getMaxContentSize(): { inline: number; block: number; } {
        // let inline = 0;
        // let block = 0;

        // for (const node of this.nodes) {
        //     if (node instanceof TextElement) {
        //         for (const word of node.text.split(" ")) {
        //             const { width, height } = measureText(word);
        //             inline = Math.max(inline, width);
        //             block += height;
        //         }
        //         // const { width, height } = measureText(node.text);
        //         // inline = Math.max(inline, width);
        //         // block += height;
        //     }
        // }
        this.layout({
            x: 0,
            y: 0,
            width: Infinity,
            height: Infinity
        }); // TODO: This is a hack

        return { inline: this.marginBox.width!, block: this.marginBox.height! };
    }

    layout(box: Box): void {
        const containerInlineSize = box.width;

        let currentInlineSize = 0;
        let currentBlockHeight = 0;
        let maxInlineSize = 0;
        let currentLine: string[] = [];
        let lines = [currentLine];

        // TODO: Split words

        let hadText = false;

        for (const node of this.nodes) {
            if (node instanceof TextElement) {
                const words = node.text.split(" ")
                for (let i = 0; i < words.length; i++) {
                    const word = words[i];
                    if (word == "") continue;

                    // FIXME: Spaces are not kept properly between nodes.
                    // Maybe we should combine the text nodes beforehand

                    let wordWith = word;
                    if (currentLine.length > 0 && i > 0) {
                        wordWith = " " + wordWith;
                    }

                    const { width, height } = measureText(wordWith);

                    // print(`${word} ${currentInlineSize + width}, ${containerInlineSize}`)
                    if (currentInlineSize + width > containerInlineSize && (width < containerInlineSize || currentLine.length !== 0)) {
                        // TODO: Do we need to check if the next word is too long and break it?
                        currentLine = [word];
                        currentInlineSize = width;
                        currentBlockHeight += height; // TODO: Track max for line height if support variable line heights
                        lines.push(currentLine);
                    } else {
                        currentLine.push(wordWith);
                        currentInlineSize += width;
                        maxInlineSize = Math.max(maxInlineSize, currentInlineSize);
                    }

                    hadText = true;
                }
            } else if (node.type === ElementType.BREAK) {
                currentLine = [];
                currentInlineSize = 0;
                currentBlockHeight += LINE_HEIGHT;
                lines.push(currentLine);
            }
        }

        // TODO: Should probably calculate the block height more accurately
        if (hadText) currentBlockHeight += LINE_HEIGHT;

        this.marginBox.width = maxInlineSize;
        this.marginBox.height = currentBlockHeight;
        this.marginBox.x = box.x;
        this.marginBox.y = box.y;

        this.lines = lines
        // this.computedBox.width = this.parent.computedBox.width;
        // this.computedBox.x = this.parent.computedBox.x;
        // this.computedBox.y = this.parent.computedBox.y;

        // for (const child of this.children) {
        //     child.layout();
        // }

        // this.computedBox.height = this.children.reduce(
        //     (acc, child) => Math.max(acc, child.computedBox.height ?? 0), // TODO: Throw error if height is undefined
        //     0
        // );
    }

    paint(): DisplayList {
        const commands: DisplayList = [];

        let currentY = this.marginBox.y!;
        for (const line of this.lines) {
            // let currentX = this.computedBox.x!;
            // for (const text of line) {
            //     commands.push({
            //         type: DisplayCommandType.TEXT,
            //         x: currentX,
            //         y: currentY,
            //         text,
            //         color: RikoPalette.White,
            //     });

            //     currentX += measureText(text).width;
            // }
            commands.push({
                type: DisplayCommandType.TEXT,
                x: this.marginBox.x!,
                y: currentY,
                text: line.join(""),
                color: RikoPalette.White,
            });

            currentY += LINE_HEIGHT;
        }

        return commands;
    }
}

function paintTree(node: LayoutNode, displayList: DisplayList) {
    displayList.push(...node.paint());
    for (const child of node.children) {
        paintTree(child, displayList);
    }
    if (node.paintUnwind) {
        displayList.push(...node.paintUnwind());
    }
}

const myDocument = new Element("document", [
    new Element("block", [
        new TextElement("Hello, world"),
        new TextElement(" "),
        new TextElement("This is a test."),
        new Element("break"),
        new TextElement("Okay."),
    ], { 
        padding: 0, margin: 10,
        backgroundColor: RikoPalette.DarkGreen,
    }),
    new Element("block", [
        new TextElement("Hello, world"),
        new TextElement(" "),
        new TextElement("This is a test."),
        new Element("break"),
        new TextElement("Okay."),
    ], { 
        padding: 5, margin: 10,
        backgroundColor: RikoPalette.Magenta,
    }),
], {
    backgroundColor: RikoPalette.DarkBlue,
});

const startTime = os.clock();

const myLayout = new DocumentLayout(myDocument);
// print(JSONStringify(myLayout.getMinContentSize(50, 50)));
// print(JSONStringify(myLayout.getMaxContentSize()));

myLayout.layout({
    x: 0,
    y: 0,
    width: 100,
    height: Infinity
});
const commands: DisplayList = []
paintTree(myLayout, commands);

const endTime = os.clock();

print(JSONStringify(commands));
print(`Time: ${(endTime - startTime)*1000*1000}us`);

function render() {
    gpu.clear();
    for (const command of commands) {
        if (command.type === DisplayCommandType.TEXT) {
            write(command.text, command.x - 1, command.y - 1, command.color);
        } else if (command.type === DisplayCommandType.RECT) {
            gpu.drawRectangle(command.x, command.y, command.width, command.height, command.color);
        }
    }
    gpu.swap();
}

render()
// sleep(3)
// for (let i = 0; i < 10; i++) {
//     const x = coroutine.yield();
//     print(x.length + x.join())
// }

while (true) {
    const e = coroutine.yield();
    if (e.length > 0) {
        const [key, ...args] = e;
        if (key === "key") {
            break;
        }
    }
}
