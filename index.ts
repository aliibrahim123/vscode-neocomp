import * as ts from 'typescript/lib/tsserverlibrary';
import { decorateWithTemplateLanguageService, TemplateContext } from 'typescript-template-language-service-decorator';
import * as html from 'vscode-html-languageservice';

// 1. Initialize the HTML Language Service
const htmlService = html.getLanguageService();

class HtmlTemplateLanguageService {
    
    // 2. Handle Completions (Auto-complete)
    getCompletionsAtPosition(context: TemplateContext, position: ts.LineAndCharacter): ts.CompletionInfo {
		const doc = this.createVirtualDocument(context);
        const htmlDoc = htmlService.parseHTMLDocument(doc);
        const offset = doc.positionAt(doc.offsetAt(position));

        const items = htmlService.doComplete(doc, offset, htmlDoc);
        
        // Convert VS Code HTML items to TypeScript Completion items
        return {
            isGlobalCompletion: false,
            isMemberCompletion: false,
            isNewIdentifierLocation: false,
            entries: items.items.map(item => ({
                name: item.label,
                kind: item.kind,
                sortText: item.sortText || item.label,
				insertText: item.insertText,
                replacementSpan: {
                    start: doc.offsetAt(item.textEdit!.range.start),
                    length: doc.offsetAt(item.textEdit!.range.end) - doc.offsetAt(item.textEdit!.range.start)
                }
            }))
        };
    }

	getQuickInfoAtPosition(context: TemplateContext, position: ts.LineAndCharacter): ts.QuickInfo | undefined {
       const doc = this.createVirtualDocument(context);
        const htmlDoc = htmlService.parseHTMLDocument(doc);
        const offset = doc.positionAt(doc.offsetAt(position));

        
        const hover = htmlService.doHover(doc, offset, htmlDoc);
        if (!hover || !hover.range) return undefined;

        // Convert HTML markdown to TS display parts
        const content = typeof hover.contents === 'string' ? hover.contents : (hover.contents as any).value;

        return {
            kind: 'string',
            kindModifiers: '',
            textSpan: {
                start: doc.offsetAt(hover.range.start),
                length: doc.offsetAt(hover.range.end) - doc.offsetAt(hover.range.start)
            },
            displayParts: [],
            documentation: [{ kind: 'text', text: content }]
        };
    }

    // 3. Helper to create a virtual document for the HTML parser
    // This replaces ${...} with whitespace so the HTML parser doesn't crash on JS code
    private createVirtualDocument(context: TemplateContext): html.TextDocument {
        return html.TextDocument.create(
            'temp://doc.html',
            'html',
            0,
            context.text
        );
    }
}

// 4. The Factory Function required by TS Server
export = (mod: { typescript: typeof ts }) => {
    return {
        create(info: ts.server.PluginCreateInfo) {
            return decorateWithTemplateLanguageService(
                mod.typescript,
                info.languageService,
                info.project,
                new HtmlTemplateLanguageService(),
                {
                    tags: ['$temp'], 
                    enableForStringWithSubstitutions: true
                }
            );
        }
    };
};