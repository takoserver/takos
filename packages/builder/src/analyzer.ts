import ts from "npm:typescript";
import type {
  DecoratorInfo,
  ExportInfo,
  ImportInfo,
  JSDocTagInfo,
  MethodCallInfo,
  ModuleAnalysis,
} from "./types.ts";

export class ASTAnalyzer {
  async analyze(filePath: string): Promise<ModuleAnalysis> {
    const code = await Deno.readTextFile(filePath);
    return this.analyzeCode(filePath, code);
  }

  analyzeCode(filePath: string, code: string): ModuleAnalysis {
    const sourceFile = ts.createSourceFile(
      filePath,
      code,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );

    const exports: ExportInfo[] = [];
    const imports: ImportInfo[] = [];
    const decorators: DecoratorInfo[] = [];
    const jsDocTags: JSDocTagInfo[] = [];
    const methodCalls: MethodCallInfo[] = [];

    const getPos = (node: ts.Node) => {
      const { line, character } =
        sourceFile.getLineAndCharacterOfPosition(node.getStart());
      return { line: line + 1, column: character };
    };

    const parseArg = (expr: ts.Expression): unknown => {
      if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) {
        return expr.text;
      }
      if (ts.isNumericLiteral(expr)) return Number(expr.text);
      if (expr.kind === ts.SyntaxKind.TrueKeyword) return true;
      if (expr.kind === ts.SyntaxKind.FalseKeyword) return false;
      if (ts.isIdentifier(expr)) return expr.text;
      return expr.getText(sourceFile);
    };

    const recordJsDoc = (
      node: ts.Node & { name?: ts.Identifier },
      targetClass?: string,
    ) => {
      const name = node.name ? node.name.getText(sourceFile) : "";
      const docs = ts.getJSDocTags(node) || [];
      for (const tag of docs) {
        const info: JSDocTagInfo = {
          tag: tag.tagName.getText(sourceFile),
          value: tag.comment ? String(tag.comment) : "",
          targetFunction: name,
          targetClass,
          line: getPos(tag).line,
        };
        jsDocTags.push(info);
      }
    };

    const recordDecorators = (
      node: ts.Node & { name?: ts.Identifier; decorators?: ts.NodeArray<ts.Decorator> },
      targetClass?: string,
    ) => {
      if (!node.decorators) return;
      const fnName = node.name ? node.name.getText(sourceFile) : "";
      for (const deco of node.decorators) {
        const expr = deco.expression;
        let decoName = "";
        const args: unknown[] = [];
        if (ts.isCallExpression(expr)) {
          decoName = expr.expression.getText(sourceFile);
          for (const arg of expr.arguments) args.push(parseArg(arg));
        } else {
          decoName = expr.getText(sourceFile);
        }
        const pos = getPos(deco);
        decorators.push({
          name: decoName,
          args,
          targetFunction: fnName,
          targetClass,
          line: pos.line,
        });
      }
    };

    const visit = (node: ts.Node, currentClass?: string) => {
      // Imports
      if (ts.isImportDeclaration(node)) {
        const source = (node.moduleSpecifier as ts.StringLiteral).text;
        const isTypeOnly = node.importClause?.isTypeOnly ?? false;
        const importNames: { name: string; alias?: string }[] = [];
        const clause = node.importClause;
        if (clause) {
          if (clause.name) {
            importNames.push({ name: "default", alias: clause.name.text });
          }
          if (clause.namedBindings) {
            if (ts.isNamespaceImport(clause.namedBindings)) {
              importNames.push({ name: "*", alias: clause.namedBindings.name.text });
            } else if (ts.isNamedImports(clause.namedBindings)) {
              for (const el of clause.namedBindings.elements) {
                importNames.push({
                  name: el.propertyName ? el.propertyName.text : el.name.text,
                  alias: el.propertyName ? el.name.text : undefined,
                });
              }
            }
          }
        }
        imports.push({
          source,
          imports: importNames,
          isTypeOnly,
          line: getPos(node).line,
        });
      }

      // Exports - functions, classes, const, types
      if (
        ts.isFunctionDeclaration(node) ||
        ts.isClassDeclaration(node) ||
        ts.isVariableStatement(node) ||
        ts.isTypeAliasDeclaration(node)
      ) {
        const mods = (node.modifiers ?? []).map((m) => m.kind);
        const isExport = mods.includes(ts.SyntaxKind.ExportKeyword);
        if (isExport) {
          const isDefault = mods.includes(ts.SyntaxKind.DefaultKeyword);
          if (ts.isFunctionDeclaration(node)) {
            const name = node.name ? node.name.text : "default";
            const pos = getPos(node);
            exports.push({
              name,
              type: "function",
              isDefault,
              line: pos.line,
              column: pos.column,
            });
          } else if (ts.isClassDeclaration(node)) {
            const name = node.name ? node.name.text : "default";
            const pos = getPos(node);
            exports.push({
              name,
              type: "class",
              isDefault,
              line: pos.line,
              column: pos.column,
            });
          } else if (ts.isVariableStatement(node)) {
            for (const decl of node.declarationList.declarations) {
              if (ts.isIdentifier(decl.name)) {
                const name = decl.name.text;
                const pos = getPos(decl);
                let instanceOf: string | undefined;
                const init = decl.initializer;
                if (init) {
                  if (ts.isNewExpression(init) && ts.isIdentifier(init.expression)) {
                    instanceOf = init.expression.text;
                  } else if (ts.isCallExpression(init) && ts.isIdentifier(init.expression)) {
                    instanceOf = init.expression.text;
                  }
                }
                exports.push({
                  name,
                  type: "const",
                  isDefault,
                  line: pos.line,
                  column: pos.column,
                  instanceOf,
                });
              }
            }
          } else if (ts.isTypeAliasDeclaration(node)) {
            const name = node.name.text;
            const pos = getPos(node);
            exports.push({
              name,
              type: "type",
              isDefault,
              line: pos.line,
              column: pos.column,
            });
          }
        }
      }

      // Record decorators and JSDoc tags for functions/methods/classes
      if (ts.isFunctionDeclaration(node)) {
        recordJsDoc(node, currentClass);
        recordDecorators(node, currentClass);
      }
      if (ts.isClassDeclaration(node)) {
        recordJsDoc(node);
        recordDecorators(node);
        currentClass = node.name ? node.name.text : undefined;
      }
      if (ts.isMethodDeclaration(node)) {
        recordJsDoc(node, currentClass);
        recordDecorators(node, currentClass);
      }

      // Method calls
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
        const obj = node.expression.expression.getText(sourceFile);
        const method = node.expression.name.getText(sourceFile);
        const args = node.arguments.map((a) => parseArg(a));
        const pos = getPos(node);
        methodCalls.push({
          objectName: obj,
          methodName: method,
          args,
          line: pos.line,
          column: pos.column,
        });
      }

      ts.forEachChild(node, (child) => visit(child, currentClass));
    };

    visit(sourceFile);

    return {
      filePath,
      exports,
      imports,
      decorators,
      jsDocTags,
      methodCalls,
    };
  }
}
