import * as tstl from "typescript-to-lua";
import * as ts from "typescript";

const plugin: tstl.Plugin = {
    afterPrint(
        program: ts.Program,
        options: tstl.CompilerOptions,
        emitHost: tstl.EmitHost,
        result: tstl.ProcessedFile[]
    ) {
        void program;
        void options;
        void emitHost;

        for (const file of result) {
            file.code = `local __r = { pcall(function()
                ${file.code}
            end, ...) }

            if _G.__TS__originalTraceback then
                debug.traceback = _G.__TS__originalTraceback
            end

            if not __r[1] then
                error(__r[2])
            end
            table.remove(__r, 1)
            return table.unpack(__r)
            `;
        }
    },

    // visitors: {
    //     [ts.SyntaxKind.CallExpression]: (node, context) => {
    //         const result = context.superTransformExpression(node);

    //         console.log(result);

    //         return result;
    //     }
    // }
};

export default plugin;
