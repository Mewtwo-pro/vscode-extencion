import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    
    // Tipos de decoración requeridos
    const highlightDecoration = vscode.window.createTextEditorDecorationType({
        backgroundColor: '#4FC3F7',
        opacity: '1'
    });

    const labelDecoration = vscode.window.createTextEditorDecorationType({
        before: {
            color: 'white',
            backgroundColor: '#ff006e',
            fontWeight: 'bold',
            textDecoration: 'none; z-index: 100; position: absolute;'
        }
    });

    interface Match {
        position: vscode.Position;
        range: vscode.Range;
    }

    const letras = 'abcdefghijklmnopqrstuvwxyz';

    const flashCommand = vscode.commands.registerCommand('codium.flash', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        // --- PASO 1: Primer InputBox (Búsqueda en tiempo real) ---
        const searchInput = vscode.window.createInputBox();
        searchInput.placeholder = 'Escribe para buscar en líneas visibles... (Presiona Espacio para etiquetar)';
        searchInput.show();

        let currentQuery = '';
        let matches: Match[] = [];

        const limpiarDecoraciones = () => {
            editor.setDecorations(highlightDecoration, []);
            editor.setDecorations(labelDecoration, []);
        };

        // Escuchar cambios mientras se escribe la consulta
        searchInput.onDidChangeValue(async (value) => {
            // Si el usuario presiona Espacio, pasamos a la fase de etiquetas
            if (value.endsWith(' ')) {
                currentQuery = value.trim();
                searchInput.hide();
                await ejecutarFaseEtiquetas(editor, currentQuery, searchInput);
                return;
            }

            currentQuery = value;
            matches = [];

            if (currentQuery.length === 0) {
                limpiarDecoraciones();
                return;
            }

            // Buscar únicamente en las líneas visibles (editor.visibleRanges)
            const visibles = editor.visibleRanges;
            for (const rango of visibles) {
                for (let linea = rango.start.line; linea <= rango.end.line; linea++) {
                    const lineText = editor.document.lineAt(linea).text;
                    const queryToSearch = currentQuery.toLowerCase();
                    const textToSearch = lineText.toLowerCase();

                    let index = textToSearch.indexOf(queryToSearch);
                    while (index !== -1) {
                        const matchStart = new vscode.Position(linea, index);
                        const matchEnd = new vscode.Position(linea, index + queryToSearch.length);
                        matches.push({
                            position: matchStart,
                            range: new vscode.Range(matchStart, matchEnd)
                        });
                        index = textToSearch.indexOf(queryToSearch, index + 1);
                    }
                }
            }

            // Aplicar decoraciones de resaltado
            const highlightRanges = matches.map(m => m.range);
            editor.setDecorations(highlightDecoration, highlightRanges);
            editor.setDecorations(labelDecoration, []);
        });

        searchInput.onDidHide(() => {
            if (matches.length === 0) {
                limpiarDecoraciones();
            }
            searchInput.dispose();
        });
    });

    // --- PASO 2: Fase de Etiquetas y Segundo InputBox ---
    async function ejecutarFaseEtiquetas(
        editor: vscode.TextEditor, 
        query: string, 
        previousInput: vscode.InputBox
    ) {
        previousInput.dispose();

        // Recalcular coincidencias finales basadas en la query guardada
        const matches: Match[] = [];
        const visibles = editor.visibleRanges;
        for (const rango of visibles) {
            for (let linea = rango.start.line; linea <= rango.end.line; linea++) {
                const lineText = editor.document.lineAt(linea).text;
                const queryToSearch = query.toLowerCase();
                const textToSearch = lineText.toLowerCase();

                let index = textToSearch.indexOf(queryToSearch);
                while (index !== -1) {
                    const matchStart = new vscode.Position(linea, index);
                    const matchEnd = new vscode.Position(linea, index + queryToSearch.length);
                    matches.push({
                        position: matchStart,
                        range: new vscode.Range(matchStart, matchEnd)
                    });
                    index = textToSearch.indexOf(queryToSearch, index + 1);
                }
            }
        }

        if (matches.length === 0) {
            vscode.window.showInformationMessage('No se encontraron coincidencias para etiquetar.');
            editor.setDecorations(highlightDecoration, []);
            editor.setDecorations(labelDecoration, []);
            return;
        }

        const mapa = new Map<string, Match>();
        const labelOptions: vscode.DecorationOptions[] = [];
        const highlightRanges: vscode.Range[] = [];

        for (let i = 0; i < matches.length && i < letras.length; i++) {
            const char = letras[i];
            const match = matches[i];
            mapa.set(char, match);

            highlightRanges.push(match.range);
            labelOptions.push({
                range: new vscode.Range(match.position, new vscode.Position(match.position.line, match.position.character + 1)),
                renderOptions: {
                    before: { contentText: char }
                }
            });
        }

        editor.setDecorations(highlightDecoration, highlightRanges);
        editor.setDecorations(labelDecoration, labelOptions);

        // Segundo InputBox para capturar la letra de selección
        const selectionInput = vscode.window.createInputBox();
        selectionInput.placeholder = 'Selección: Presiona la letra de la etiqueta...';
        selectionInput.show();

        selectionInput.onDidChangeValue((value) => {
            const letraEscrita = value.trim().toLowerCase();
            if (mapa.has(letraEscrita)) {
                const target = mapa.get(letraEscrita)!;
                const pos = target.position;

                // Mover el cursor y revelar la posición seleccionada
                editor.selection = new vscode.Selection(pos, pos);
                editor.revealRange(
                    new vscode.Range(pos, pos),
                    vscode.TextEditorRevealType.InCenter
                );

                // Limpiar decoraciones y cerrar inputs
                editor.setDecorations(highlightDecoration, []);
                editor.setDecorations(labelDecoration, []);
                selectionInput.dispose();
            }
        });

        selectionInput.onDidHide(() => {
            editor.setDecorations(highlightDecoration, []);
            editor.setDecorations(labelDecoration, []);
            selectionInput.dispose();
        });
    }
// --- NUEVO COMANDO: Salto de palabras en la línea actual (Ctrl + 2) ---
    const wordJumpCommand = vscode.commands.registerCommand('codium.wordJump', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        const position = editor.selection.active;
        const row = position.line;
        const lineText = editor.document.lineAt(row).text;

        // Función auxiliar equivalente a get_word_starts de tu código de Neovim
        const getWordStarts = (text: string): number[] => {
            const starts: number[] = [];
            let prevType: string | null = null;

            for (let col = 0; col < text.length; col++) {
                const ch = text[col];
                let currentType: string;

                if (/\s/.test(ch)) {
                    currentType = 'space';
                } else if (/\w/.test(ch)) { // Aproximación a caracteres de palabra (\k)
                    currentType = 'keyword';
                } else {
                    currentType = 'symbol';
                }

                if (currentType !== 'space') {
                    if (prevType === null || prevType !== currentType) {
                        starts.push(col);
                    }
                }
                prevType = currentType;
            }
            return starts;
        };

        const starts = getWordStarts(lineText);
        if (starts.length === 0) {
            return;
        }

        interface WordMatch {
            position: vscode.Position;
            range: vscode.Range;
        }

        const words: WordMatch[] = starts.map(col => {
            const pos = new vscode.Position(row, col);
            return {
                position: pos,
                range: new vscode.Range(pos, new vscode.Position(row, col + 1))
            };
        });

        // Si solo hay una palabra, saltar directamente
        if (words.length === 1) {
            const targetPos = words[0].position;
            editor.selection = new vscode.Selection(targetPos, targetPos);
            editor.revealRange(new vscode.Range(targetPos, targetPos), vscode.TextEditorRevealType.InCenter);
            return;
        }

        const mapa = new Map<string, WordMatch>();
        const labelOptions: vscode.DecorationOptions[] = [];
        const highlightRanges: vscode.Range[] = [];

        for (let i = 0; i < words.length && i < letras.length; i++) {
            const char = letras[i];
            const word = words[i];
            mapa.set(char, word);

            highlightRanges.push(word.range);
            labelOptions.push({
                range: word.range,
                renderOptions: {
                    before: { contentText: char }
                }
            });
        }

        editor.setDecorations(highlightDecoration, highlightRanges);
        editor.setDecorations(labelDecoration, labelOptions);

        // Abrir el InputBox único para capturar la letra del salto instantáneo
        const wordInput = vscode.window.createInputBox();
        wordInput.placeholder = 'Salto de palabra: Presiona la etiqueta...';
        wordInput.show();

        wordInput.onDidChangeValue((value) => {
            const letraEscrita = value.trim().toLowerCase();
            if (mapa.has(letraEscrita)) {
                const target = mapa.get(letraEscrita)!;
                const pos = target.position;

                editor.selection = new vscode.Selection(pos, pos);
                editor.revealRange(
                    new vscode.Range(pos, pos),
                    vscode.TextEditorRevealType.InCenter
                );

                editor.setDecorations(highlightDecoration, []);
                editor.setDecorations(labelDecoration, []);
                wordInput.dispose();
            }
        });

        wordInput.onDidHide(() => {
            editor.setDecorations(highlightDecoration, []);
            editor.setDecorations(labelDecoration, []);
            wordInput.dispose();
        });
    });

    context.subscriptions.push(flashCommand, wordJumpCommand);
}

export function deactivate() {}