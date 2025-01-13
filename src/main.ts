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

function measureTextUtil(text: string, maxWidth: number): { text: string, leftover: string, width: number, height: number } {
    // TODO: Newlines
    // TODO: Measure text using font
    const maxChars = Math.floor(maxWidth / 4);
    if (text.length <= maxChars) {
        return { text, leftover: "", width: text.length*4, height: LINE_HEIGHT };
    }

    const leftover = text.slice(maxChars);
    const width = maxChars*4;
    const height = LINE_HEIGHT;
    return { text: text.slice(0, maxChars), leftover, width, height };
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
    getMinContentSizeConstrainedInline(): { inline: number, block: number };
    getMinContentSizeConstrainedBlock(): { inline: number, block: number };
    getPreferredContentSize(): { inline: number, block: number };
}

enum ElementType {
    BLOCK = "block",
    GRID = "grid",
    // INLINE,
    TEXT = "text",
    BREAK = "break",
}

// TODO: Have more block types?

interface CommonStyle {
    padding: number;
    margin: number;
    backgroundColor?: RikoPalette;

    // Grid item positioning
    gridColumnStart?: number;
    gridColumnEnd?: number;
    gridRowStart?: number; 
    gridRowEnd?: number;

    // Grid Shorthands
    gridColumn?: string; // e.g. "1 / 3" or "1 / span 2"
    gridRow?: string;
    gridArea?: string; // e.g. "1 / 1 / 3 / 3"
    
    // Grid/Flexbox Alignment
    justifySelf?: "start" | "end" | "center" | "stretch";
    alignSelf?: "start" | "end" | "center" | "stretch";
}

type DefiniteMeasure = { type: "px", value: number } | { type: "percent", value: number };
type FlexibleMeasure = DefiniteMeasure | { type: "flex", factor: number };
type GridTemplateMeasure = FlexibleMeasure
    | "auto" | "min-content" | "max-content"      
    | { type: "fit-content", limit: DefiniteMeasure }
    | { type: "repeat", count: number, measure: FlexibleMeasure }
    | { type: "repeat", count: "auto-fill" | "auto-fit", measure: DefiniteMeasure }
    ;

function parseFlexibleMeasureMeasure(measure: string): FlexibleMeasure {
    if (measure.endsWith("%")) {
        return { type: "percent", value: parseFloat(measure.slice(0, -1)) };
    } else if (measure.endsWith("fr")) {
        return { type: "flex", factor: parseFloat(measure.slice(0, -2)) };
    } else if (measure.endsWith("px")) {
        return { type: "px", value: parseFloat(measure.slice(0, -2)) };
    }

    throw new Error(`Invalid measure: ${measure}`);
}

type DefiniteMeasureStr = `${number}%` | `${number}px`
type FlexibleMeasureStr = `${number}fr` | DefiniteMeasureStr

function parseGridTemplateMeasure(
    measure: "auto" | "min-content" | "max-content" 
        | FlexibleMeasureStr 
        | `fit-content(${DefiniteMeasureStr})`
        | `repeat(${number}, ${FlexibleMeasureStr})`
        | `repeat(${"auto-fill" | "auto-fit"}, ${DefiniteMeasureStr})`
): GridTemplateMeasure {
    if (measure === "auto" || measure === "min-content" || measure === "max-content") {
        return measure;
    } else {
        // TODO: Implement
        throw new Error("Not implemented");
    }
}

interface GridContainerStyle extends CommonStyle {
    gridTemplateColumns?: GridTemplateMeasure[];
    gridTemplateRows?: GridTemplateMeasure[];

    justifyContent?: "start" | "end" | "center" | "space-between" | "space-around" | "space-evenly" | "stretch";
    alignContent?: "start" | "end" | "center" | "space-between" | "space-around" | "space-evenly" | "stretch";

    justifyItems?: "start" | "end" | "center" | "stretch";
    alignItems?: "start" | "end" | "center" | "stretch";
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
        super(ElementType.TEXT);
    }
}

class GridElement extends Element {
    constructor(
        public children: Element[],
        style: Partial<GridContainerStyle> = {},
    ) {
        super(ElementType.GRID, children, style);
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

    getMinContentSizeConstrainedInline(): { inline: number; block: number; } {
        return this.children[0].getMinContentSizeConstrainedInline();
    }
    getMinContentSizeConstrainedBlock(): { inline: number; block: number; } {
        return this.children[0].getMinContentSizeConstrainedBlock();
    }
    getPreferredContentSize(): { inline: number; block: number; } {
        return this.children[0].getPreferredContentSize();
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

function hydrateBlockChildrenNodes(node: Element, parent: LayoutNode, allowDirectInline: boolean): LayoutNode[] {
    const children: LayoutNode[] = [];

    if (node.children !== null) {
        // If we have mixed children, we need to create anonymous blocks
        const createAnonBlocks = allowDirectInline ? node.children.some(child => child.type === ElementType.BLOCK) : true;

        let currentInline: Element[] | null = null;
        for (const child of node.children) {
            if (child.type === ElementType.BLOCK) {
                children.push(new BlockLayout(
                    child,
                    parent,
                ));

                // Reset current inline to start a new block
                currentInline = null;
            } else if (child.type === ElementType.GRID) {
                children.push(new GridLayout(
                    child,
                    parent,
                ));

                // Reset current inline to start a new grid
                currentInline = null;
            } else {
                if (currentInline === null) {
                    currentInline = [child];
                    
                    if (createAnonBlocks) {
                        children.push(new BlockLayout(
                            new Element("block", currentInline),
                            parent,
                        ));
                    } else {
                        children.push(new InlineLayout(
                            currentInline,
                            parent,
                        ));
                    }

                } else {
                    currentInline.push(child);
                }
            }
        }
    }

    return children;
}

class BlockLayout implements LayoutNode {
    marginBox: Partial<Box> = {};
    borderBox: Partial<Box> = {};
    children: LayoutNode[];

    constructor(
        public node: Element,
        public parent: LayoutNode
    ) {
        this.children = hydrateBlockChildrenNodes(node, parent, true);
    }

    getMinContentSizeConstrainedInline(): { inline: number; block: number; } {
        let inline = 0;
        let block = 0;

        const contentPadding = this.node.style.padding * 2 + this.node.style.margin * 2;

        for (const child of this.children) {
            const { inline: childInline, block: childBlock } = child.getMinContentSizeConstrainedInline();
            inline = Math.max(inline, childInline);
            block += childBlock;
        }

        return {
            inline: inline + contentPadding,
            block: block + contentPadding
        };
    }

    getMinContentSizeConstrainedBlock(): { inline: number; block: number; } {
        // TODO
        return {
            inline: 0,
            block: 0
        };
    }

    getPreferredContentSize(): { inline: number; block: number; } {
        let inline = 0;
        let block = 0;

        const contentPadding = this.node.style.padding * 2 + this.node.style.margin * 2;

        for (const child of this.children) {
            const { inline: childInline, block: childBlock } = child.getPreferredContentSize();
            inline = Math.max(inline, childInline);
            block += childBlock;
        }

        return {
            inline: inline + contentPadding,
            block: block + contentPadding
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

class GridLayout implements LayoutNode {
    children: LayoutNode[];
    marginBox: Partial<Box> = {};
    borderBox: Partial<Box> = {};

    constructor(
        public node: Element,
        public parent: LayoutNode,
    ) {
        // Group inline children into anonymous blocks
        this.children = hydrateBlockChildrenNodes(node, parent, false);
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

        // TODO: Layout children
        this.placeGridItems();
        this.sizeGrid();
        this.layoutGridItems();
    }

    placeGridItems() {
        throw new Error("Method not implemented.");
    }
    sizeGrid() {
        throw new Error("Method not implemented.");
    }
    layoutGridItems() {
        throw new Error("Method not implemented.");
    }

    paint(): DisplayList {
        const commands: DisplayList = [];

        if (this.node.style.backgroundColor) {
            commands.push(paintBoxRect(this.borderBox as Box, this.node.style.backgroundColor));
        }

        return commands;
    }

    getMinContentSizeConstrainedInline(): { inline: number; block: number; } {
        throw new Error("Method not implemented.");
    }
    getMinContentSizeConstrainedBlock(): { inline: number; block: number; } {
        throw new Error("Method not implemented.");
    }
    getPreferredContentSize(): { inline: number; block: number; } {
        throw new Error("Method not implemented.");
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
    ) {}

    getMinContentSizeConstrainedInline(): { inline: number; block: number; } {
        this.layout({
            x: 0,
            y: 0,
            width: 0, // maxInlineSize,
            height: Infinity
        }); // TODO: This is a hack

        return { inline: this.marginBox.width!, block: this.marginBox.height! };
    }

    getMinContentSizeConstrainedBlock(): { inline: number; block: number; } {
        return this.getPreferredContentSize(); // TODO: Is this correct?
    }

    getPreferredContentSize(): { inline: number; block: number; } {
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

        // First pass: combine sibling text nodes
        const combinedNodes: Element[] = [];
        let currentText: TextElement | null = null;
        for (const node of this.nodes) {
            if (node instanceof TextElement) {
                if (currentText === null) {
                    currentText = new TextElement(node.text);
                    combinedNodes.push(currentText);
                } else {
                    currentText.text += node.text;
                }
            } else {
                combinedNodes.push(node);
                currentText = null;
            }
        }

        // Second pass: layout the combined nodes
        for (const node of combinedNodes) {
            if (node instanceof TextElement) {
                // Split text into words and process each word
                const words = node.text.split(" ")
                for (let i = 0; i < words.length; i++) {
                    const word = words[i];
                    if (word == "") continue;

                    // Add space before word if not first word on line
                    let wordWith = word;
                    if (currentLine.length > 0 && i > 0) {
                        wordWith = " " + wordWith;
                    }

                    // Measure the word's dimensions
                    const { width, height } = measureText(wordWith);

                    // Check if word needs to start a new line:
                    // - Current line width + word width exceeds container width AND
                    // - Current line has content, otherwise we need to break the word
                    if (currentInlineSize + width > containerInlineSize) {
                        if (
                            currentLine.length !== 0 &&
                            width < containerInlineSize // If the word is longer than the whole container, don't bother starting a new line first
                        ) {
                            // Start new line
                            currentLine = [];
                            currentInlineSize = 0;
                            currentBlockHeight += height;
                            lines.push(currentLine);

                            words[i] = word;
                            i--; // Recheck this word
                        } else {
                            // Break the word
                            const { text: firstPart, width: firstPartWidth, leftover: secondPart } = measureTextUtil(wordWith, containerInlineSize - currentInlineSize);

                            // Add first part to current line
                            currentLine.push(firstPart);
                            currentInlineSize += firstPartWidth;
                            maxInlineSize = Math.max(maxInlineSize, currentInlineSize);

                            currentLine = [];
                            currentInlineSize = 0;
                            currentBlockHeight += height;
                            lines.push(currentLine);

                            words[i] = secondPart; 
                            i--; // Recheck this word
                        }
                    } else {
                        // Add word to current line
                        currentLine.push(wordWith);
                        currentInlineSize += width;
                        maxInlineSize = Math.max(maxInlineSize, currentInlineSize);
                    }

                    hadText = true;
                }
            } else if (node.type === ElementType.BREAK) {
                // Handle line break elements by starting new empty line
                currentLine = [];
                currentInlineSize = 0;
                currentBlockHeight += LINE_HEIGHT;
                lines.push(currentLine);
            }
        }

        // Add final line height if there was any text, TODO: Should probably calculate the block height more accurately
        if (hadText) currentBlockHeight += LINE_HEIGHT;

        this.marginBox.width = maxInlineSize;
        this.marginBox.height = currentBlockHeight;
        this.marginBox.x = box.x;
        this.marginBox.y = box.y;

        this.lines = lines
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
    new Element(ElementType.BLOCK, [
        new TextElement("HelloHelloHelloHelloHelloHelloHelloHellookay, world"),
        new TextElement(" "),
        new TextElement("This is a test."),
        new Element(ElementType.BREAK),
        new TextElement("Okay."),
    ], { 
        padding: 0, margin: 10,
        backgroundColor: RikoPalette.DarkGreen,
    }),
    new Element(ElementType.BLOCK, [
        new TextElement("Hello, world"),
        new TextElement(" "),
        new TextElement("ThisThisThisThisThisThis is a test."),
        new Element(ElementType.BREAK),
        new TextElement("Okay."),
    ], { 
        padding: 5, margin: 10,
        backgroundColor: RikoPalette.Magenta,
    }),

    new Element(ElementType.GRID, [
        new Element(ElementType.BLOCK, [
            new TextElement("Hello"),
        ], { backgroundColor: RikoPalette.DarkGreen }),
        new Element(ElementType.BLOCK, [
            new TextElement("World"),
        ], { backgroundColor: RikoPalette.DarkGreen }),
        new Element(ElementType.BLOCK, [
            new TextElement("This"),
        ], { backgroundColor: RikoPalette.DarkGreen }),
        new Element(ElementType.BLOCK, [
            new TextElement("Is"),
        ], { backgroundColor: RikoPalette.DarkGreen }),
        new Element(ElementType.BLOCK, [
            new TextElement("A"),
        ], { backgroundColor: RikoPalette.DarkGreen }),
        new Element(ElementType.BLOCK, [
            new TextElement("Test"),
        ], { backgroundColor: RikoPalette.DarkGreen }),
    ], {
        padding: 0, margin: 10,
        backgroundColor: RikoPalette.DarkBlue,
    }),
], {
    backgroundColor: RikoPalette.DarkBlue,
});

// const startTime = os.clock();

const myLayout = new DocumentLayout(myDocument);
// print(JSONStringify(myLayout.getMinContentSize(50, 50)));
// print(JSONStringify(myLayout.getPreferredContentSize()));

// const endTime = os.clock();

// print(JSONStringify(commands));
// print(`Time: ${(endTime - startTime)*1000*1000}us`);

function render(commands: DisplayCommand[]) {
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


// sleep(3)
// for (let i = 0; i < 10; i++) {
//     const x = coroutine.yield();
//     print(x.length + x.join())
// }

while (true) {
    myLayout.layout({
        x: 0,
        y: 0,
        width: 150 + Math.sin(os.clock()) * 75,
        height: Infinity
    });
    const commands: DisplayList = []
    paintTree(myLayout, commands);
    render(commands);

    const e = coroutine.yield();
    if (e.length > 0) {
        const [key, ...args] = e;
        if (key === "key") {
            break;
        }
    }
}

// print(JSONStringify(myLayout))
