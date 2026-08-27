import * as vscode from 'vscode';
import { FileExplorerProvider } from './tree';
import * as fs from 'fs'; // <--- ESTA LÍNEA ES LA QUE FALTA O FALLA
import {GitBranchManager} from './gitBranchManager'
import {GitCommitManager} from './gitCommitManager'
import {GitGitHubManager} from './gitGitHubManager'
const path = require('path');
let myvar = 0;
let flash_char = "e"
let sub_mode = 0
let miInput: vscode.InputBox | undefined;
let my_numero = 0;
let buscar_mode = 0;
let palabra_buscar = "def";
let savedLine= 1
let select_mode = 0
export let explorer_mode = "abrir"

function prev_buscar(searchTerm: string) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const document = editor.document;
    const text = document.getText();
    const startIndex = document.offsetAt(editor.selection.start);

    // 1. Escapar caracteres especiales y crear Regex global e insensible a mayúsculas
    const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedSearchTerm, 'gi');

    // 2. Obtener todas las coincidencias en el documento
    const matches = Array.from(text.matchAll(regex));

    // 3. Filtrar las que terminan antes de la posición actual del cursor
    // Buscamos la última coincidencia que esté antes del startIndex
    const previousMatch = matches
        .filter(match => (match.index !== undefined && match.index < startIndex))
        .pop(); // .pop() obtiene la última del array (la más cercana a la izquierda)

    if (previousMatch && previousMatch.index !== undefined) {
        const index = previousMatch.index;
        const startPosition = document.positionAt(index);
        const endPosition = document.positionAt(index + previousMatch[0].length);

        const newSelection = new vscode.Selection(startPosition, endPosition);
        editor.selection = newSelection;
        editor.revealRange(newSelection, vscode.TextEditorRevealType.InCenter);
    } else {
        vscode.window.showInformationMessage("No se encontraron coincidencias anteriores.");
    }
}

function next_buscar(searchTerm: string) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    
    const document = editor.document;
    const text = document.getText();
    const startPos = editor.selection.active;
    const startIndex = document.offsetAt(startPos);

    // Creamos una expresión regular con el modificador 'i' (case-insensitive)
    // Escapamos el searchTerm por seguridad en caso de caracteres especiales
    const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedSearchTerm, 'gi');

    // Buscamos desde la posición actual
    // Establecemos el lastIndex de la regex para que empiece a buscar desde el offset deseado
    regex.lastIndex = startIndex + 1;
    const match = regex.exec(text);

    if (match) {
        const index = match.index;
        const startPosition = document.positionAt(index);
        const endPosition = document.positionAt(index + match[0].length);
        
        const newSelection = new vscode.Selection(startPosition, endPosition);
        editor.selection = newSelection;
        editor.revealRange(newSelection, vscode.TextEditorRevealType.InCenter);
    } else {
        vscode.window.showInformationMessage(`No se encontraron más coincidencias de "${searchTerm}".`);
    }
}
async function edit_select_item(mode: string,itemPath : string,provider : FileExplorerProvider){
        const name = path.basename(itemPath);
        if (mode == 'abrir'){
            try {
                // 1. Convertir la ruta en un objeto URI que VS Code entiende
                const uri = vscode.Uri.file(itemPath);
                const document = await vscode.workspace.openTextDocument(uri);
                await vscode.window.showTextDocument(document);
            } catch (error) {
                //vscode.window.showErrorMessage(`No se pudo abrir el archivo: ${error}`);
            } 
        }else if (mode == 'addgit'){
            const localPath = path.dirname(itemPath);
            const path_git= getGitRoot(localPath)
            if (!path_git){
                vscode.window.showWarningMessage("no git create")
                return
            }
            const ruta_relati = path.relative(path_git , itemPath)
            try {
                execSync(`git add ${ruta_relati}`, {
                    cwd: path_git,
                    encoding: 'utf8',
                    stdio: ['pipe', 'pipe', 'pipe'] // Oculta la salida y errores de la terminal
                });
                vscode.window.showInformationMessage(`git add : ${ruta_relati}`);
                return true;
            } catch (error) {
                vscode.window.showWarningMessage(`${error}`);
                return false;
            }
        
        }else if (mode == 'renombrar'){
            myvar = 0;
            const editor =
            vscode.window.activeTextEditor;
            if (!editor) return;
                miInput = vscode.window.createInputBox();

                const input = miInput; // referencia fija
                await vscode.commands.executeCommand(
                    'setContext',
                    'miInputFocus',
                    true
                );
                input.validationMessage = {
                    message: `set new name `,
                    severity: vscode.InputBoxValidationSeverity.Info
                };
                const oldName = itemPath
                input.value = name;
                input.onDidHide(async () => {

                    await vscode.commands.executeCommand(
                        'setContext',
                        'miInputFocus',
                        false
                    );
                    input.dispose();
                    miInput = undefined;
                });

                input.onDidChangeValue((text) => {
                    if (text.endsWith(" ")) {
                    if (!text.trim()) {
                        return;
                    }
                    const newName =text.trim();
                    if (!newName || newName === name) {
                        input.hide();
                        return;
                    }

                    const newPath = path.join(path.dirname(oldName), newName);

                    try {
                        // Función de Node.js para renombrar
                        fs.renameSync(oldName, newPath);
                
                        provider.refresh(); // Actualizamos el árbol
                        vscode.window.showInformationMessage(`Renombrado a: ${newName}`);
                    } catch (err: any) {
                        vscode.window.showErrorMessage(`Error al renombrar: ${err.message}`);
                    }
            
                    input.hide();

                myvar = 1
                input.hide();
            }
                });
                input.show();
            
        }else if (mode == 'eliminar'){
            const answer = await vscode.window.showWarningMessage(
                `¿mode : ${mode} , Eliminar "${name}"?`,
                { modal: true },
                'Eliminar'
            );
            if (answer !== 'Eliminar') {
                return;
            }
            try {

                const stat = fs.lstatSync(itemPath);

                if (stat.isDirectory()) {

                    fs.rmSync(itemPath, {
                        recursive: true,
                        force: true
                    });

                } else {

                    fs.unlinkSync(itemPath);

                }

                provider.refresh();

            } catch (err: any) {

                vscode.window.showErrorMessage(
                    `Error al eliminar: ${err.message}`
                );
            }
        }else{
            vscode.window.showInformationMessage('no accion :)')
        }
        
    }
function irALinea(numeroDeLinea: number) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    // VS Code maneja las líneas empezando desde 0. 
    // Si quieres que el usuario use base 1 (la línea 1 es la 0), restamos 1.
    const targetLine = Math.max(0, numeroDeLinea - 1);

    // Creamos la posición (línea, columna 0)
    const position = new vscode.Position(targetLine, 0);
    
    // Movemos el cursor y creamos una nueva selección
    editor.selection = new vscode.Selection(position, position);
    
    // Hacemos scroll hasta esa posición para que el usuario la vea
    editor.revealRange(new vscode.Selection(position, position), vscode.TextEditorRevealType.InCenter);
}
function insertChar(editor: vscode.TextEditor, position: vscode.Position, char: string) {
  // Inserta el carácter en la position indicada
  return editor.edit(editBuilder => {
    editBuilder.insert(position, char);
  })
}
const { execSync } = require('child_process');

function getGitRoot(localPath : string) {
    try {
        const fileDir = execSync('git rev-parse --show-toplevel', {
            cwd: localPath,
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'] // Evita que los errores salgan a la consola principal
        }).trim();
        return fileDir;
    } catch (error) {
        vscode.window.setStatusBarMessage(`Error al eliminar: ${error}`)
        return null;
    }
}
let myStatus: vscode.StatusBarItem;
export function activate(context: vscode.ExtensionContext) {
    const provider = new FileExplorerProvider();
    const treeView = vscode.window.createTreeView(
        'myCustomExplorer',
        {
            treeDataProvider: provider
        }
    );
treeView.onDidChangeSelection(async e => {
    if (e.selection.length > 0) {
        provider.currentSelectedPath =
            e.selection[0];
        //abrir_seleccion        
        await edit_select_item(explorer_mode, provider.currentSelectedPath, provider);
        
    }
});
context.subscriptions.push(
   treeView,
vscode.commands.registerCommand('myExtension.navigateFolder', (folderPath: string) => {
        provider.setRootPath(folderPath); // Cambiamos la ruta base
    }),
    vscode.commands.registerCommand('myExtension.resetToActive', () => {
        provider.resetToActiveEditor();
    })
    ,
    vscode.commands.registerCommand('myExtension.goUp', () => {
        provider.goUpLevel();
    })
);
    myStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    myStatus.text = "MODE = 1";
    myStatus.tooltip = "Mi modo personalizado";
    myStatus.show();
    context.subscriptions.push(myStatus);
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

    const flash = vscode.commands.registerCommand('myExtension.flash', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        miInput = vscode.window.createInputBox();
        const searchInput = miInput; // referencia fija
        await vscode.commands.executeCommand(
                "setContext",
                "miInputFocus",
                true
            );
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

        });

        searchInput.onDidHide(() => {
            if (matches.length === 0) {
                limpiarDecoraciones();
            }
            vscode.commands.executeCommand(
                'setContext',
                'miInputFocus',
                false
            );
            searchInput.dispose();
            miInput = undefined;
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
                myvar = 1
            }
        });

        selectionInput.onDidHide(() => {
            editor.setDecorations(highlightDecoration, []);
            editor.setDecorations(labelDecoration, []);
            selectionInput.dispose();
            myvar = 1
        });
    }
// --- NUEVO COMANDO: Salto de palabras en la línea actual (Ctrl + 2) ---
    const wordJump = vscode.commands.registerCommand('myExtension.wordJump', async () => {
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
            myvar = 1
        });

        wordInput.onDidHide(() => {
            editor.setDecorations(highlightDecoration, []);
            editor.setDecorations(labelDecoration, []);
            wordInput.dispose();
            myvar = 1
        });
        
    });    
    
const rangeSelect = vscode.commands.registerCommand(
        'myExtension.rangeSelect', // <-- Cambiado para evitar conflictos de ID
        async () => {
        
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                return;
            }

            const labels =
                "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

            const lineMap = new Map<string, number>();
            const decorations: vscode.DecorationOptions[] = [];

            const decorationType =
                vscode.window.createTextEditorDecorationType({});

            let index = 0;

            for (const visible of editor.visibleRanges) {

                for (
                    let line = visible.start.line;
                    line <= visible.end.line;
                    line++
                ) {

                    if (index >= labels.length) {
                        break;
                    }

                    const label = labels[index++];

                    lineMap.set(label, line);

                    decorations.push({

                        range: new vscode.Range(line, 0, line, 0),

                        renderOptions: {
                            before: {
                                contentText: ` ${label} `,
                                color: "#ffffff",
                                backgroundColor: "#e06c75",
                                fontWeight: "bold",
                                textDecoration:
                                    "none; margin-right:6px;"
                            }
                        }

                    });

                }

            }

            editor.setDecorations(
                decorationType,
                decorations
            );

            miInput = vscode.window.createInputBox();

            miInput.placeholder = "Reconoce atajos";
            miInput.prompt = "Prueba los atajos";

            await vscode.commands.executeCommand(
                "setContext",
                "miInputFocus",
                true
            );

            miInput.onDidHide(async () => {

                await vscode.commands.executeCommand(
                    "setContext",
                    "miInputFocus",
                    false
                );

                // Limpiamos las decoraciones visuales del editor al cerrar el input
                decorationType.dispose();

                miInput?.dispose();
                miInput = undefined;

            });

            miInput.onDidChangeValue(value => {

                // Esperar hasta que el usuario escriba un espacio
                if (!value.endsWith(" ")) {
                    return;
                }

                const text = value.trim();

                if (text.length === 1) {

                    const line = lineMap.get(text);

                    if (line !== undefined) {

                        const pos = new vscode.Position(line, 0);

                        editor.selection = new vscode.Selection(pos, pos);

                        editor.revealRange(
                            new vscode.Range(pos, pos)
                        );
            myvar = 2
            select_mode = 1
                    }

                    miInput?.hide();
                    return;
                }

                if (text.length >= 2) {

                    const a = lineMap.get(text[0]);
                    const b = lineMap.get(text[1]);

                    if (a !== undefined && b !== undefined) {

                        const first = Math.min(a, b);
                        const last = Math.max(a, b);

                        const start = new vscode.Position(first, 0);
                        const end = editor.document.lineAt(last).range.end;

                        editor.selection = new vscode.Selection(start, end);

                        editor.revealRange(
                            new vscode.Range(start, end)
                        );
            myvar = 2
            select_mode = 1
                    }

                    miInput?.hide();
                }

            }); 

            miInput.show();

        }
    );
const resetcurrentexplorer = vscode.commands.registerCommand("myExtension.resetcurrentexplorer", async () => {
        explorer_mode = "abrir"
        vscode.window.showInformationMessage('mode abrir');
        await vscode.commands.executeCommand('myExtension.resetToActive');
        
})    
const addgitfile = vscode.commands.registerCommand("myExtension.addgitfile", async () => {
        explorer_mode = "addgit"
        vscode.window.showInformationMessage('mode git');
        await vscode.commands.executeCommand('myExtension.resetToActive');
        
})    
const infoatajos = vscode.commands.registerCommand("myExtension.infoatajos", async () => {
    const info_atajos = ['add file Git (n),resetPath (s)' ,'filtrar (k)',
        'close (m)','deleteSelect (q)','newFile/carpeta (e)',
        'subirNivelCarpeta (j)', 'hotkeys (f2)' , 'bajar (space)' , 
        'subir (backspace)'];
    const seleccion = await vscode.window.showQuickPick(info_atajos,{
        placeHolder: 'selecciona un nombre de la lista'
    })
    if (seleccion){
        vscode.window.showInformationMessage('buena seleccion');
    }
})    
const git_tool = vscode.commands.registerCommand("myExtension.git_tool", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !editor.document.uri.fsPath) {
        vscode.window.setStatusBarMessage("No hay un archivo activo guardado en disco.", 4000);
        return;
    }
    const pathx= require('path')
    const filePath = editor.document.uri.fsPath;
    const localPath = pathx.dirname(filePath);
    const path_git= getGitRoot(localPath)
    if (!path_git){
        const answer = await vscode.window.showWarningMessage(
                `no git repository creado , desea init git`,{ modal: true },
                'init git'
        );
        if (answer !== 'init git') {
            return;
        } 
        try {
            execSync('git init', {
                cwd: localPath,
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'pipe'] // Oculta la salida y errores de la terminal
            });
            vscode.window.showInformationMessage("Repositorio Git inicializado con éxito.");
            return true;
        } catch (error) {
            vscode.window.showWarningMessage(`${error}`);
            return false;
        }
    }
    const info_atajos = ['new rama' ,'new commit','git add .',
    'ver commits','ver ramas','github', 'git ls']; 
    const seleccion = await vscode.window.showQuickPick(info_atajos,{
        placeHolder: 'selecciona la funcion git'
    })
    if (seleccion){
        if (seleccion == "git ls"){
            try{
                const stdout = execSync('git ls-files', {
                    cwd : path_git, 
                    encoding : 'utf8' , 
                    stdio : ['pipe' , 'pipe' , 'pipe']
                });
                const files = stdout.split(/\r?\n/).map((line: string) => line.trim()).filter(Boolean);
                if (files.length === 0) {
                    vscode.window.showInformationMessage("No hay archivos seguidos por Git.");
                    return;
                }
                vscode.window.showQuickPick(files, {
                    placeHolder: "Selecciona un archivo"
                }).then(selectedFile => {
                    if (selectedFile) {
                        // Equivalente a la función self.git_remove_ls(selected_index)
                        gitRemoveLs(selectedFile, path_git);
                    }
                });
            } catch (error) {
                vscode.window.showErrorMessage(`Error al obtener los archivos:\n${error}`);
            }
        }else if (seleccion == "new commit"){
            myvar = 0
            git_input(path_git, "new_commit")
        }else if (seleccion == "git add ."){
            try {
                execSync("git add .", {
                    cwd: path_git,
                    encoding: 'utf8',
                    stdio: ['pipe', 'pipe', 'pipe'] // Oculta la salida y errores de la terminal
                });
                vscode.window.showInformationMessage("git add all")
                return true;
            } catch (error) {
                vscode.window.showWarningMessage(`${error}`);
                return false;
            }
        }else if (seleccion == "new rama"){
            myvar = 0
            git_input(path_git, "new_rama")            
        }else if (seleccion == "ver ramas"){
            const branchManager = new GitBranchManager(path_git);
            branchManager.showBranches()
        }else if (seleccion == "ver commits"){
            const commitManager = new GitCommitManager(path_git);
            commitManager.showCommits()
        }else if (seleccion == "github"){
            const githubManager = new GitGitHubManager(path_git)
            await githubManager.github()
        }
    }
})    
async function gitRemoveLs(file: string, cwd: string) {
    const answer = await vscode.window.showWarningMessage(
            `desea quitar del git add`,{ modal: true },
            'quitar'
    );
    if (answer !== 'quitar') {
        return;
    } 
    try {
        execSync(`git rm --cached ${file}`, {
            cwd: cwd,
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'] // Oculta la salida y errores de la terminal
        });
        vscode.window.showInformationMessage(`file remove : ${file}`);
        return true;
    } catch (error) {
        vscode.window.showWarningMessage(`${error}`);
        return false;
    }    
}
const subirnivelexplorer = vscode.commands.registerCommand("myExtension.subirnivelexplorer", async () => {
        await vscode.commands.executeCommand('myExtension.goUp');
})
const closexplorer = vscode.commands.registerCommand("myExtension.closexplorer", async () => {
        await vscode.commands.executeCommand(
            'workbench.action.toggleSidebarVisibility')
})
function git_input(localPath : string , git_context : string){
        miInput = vscode.window.createInputBox();
        miInput.placeholder = "git";
        miInput.prompt = "Prueba los atajos";

        vscode.commands.executeCommand(
            "setContext",
            "miInputFocus",
            true
        );
        miInput.onDidHide(async () => {
            await vscode.commands.executeCommand(
                "setContext",
                "miInputFocus",
                false
            );
            miInput?.dispose();
            miInput = undefined;
        });

        miInput.onDidChangeValue(value => {

            if (value.endsWith(" ")) {
                if (!value.trim()) {
                    return;
                }
                if (git_context == "new_commit"){
                    try {
                        execSync(`git commit -am ${value}`, {
                            cwd: localPath,
                            encoding: 'utf8',
                            stdio: ['pipe', 'pipe', 'pipe'] // Oculta la salida y errores de la terminal
                        });
                        vscode.window.showInformationMessage(`commit creado : ${value}`)
                        return true;
                    } catch (error) {
                        vscode.window.showWarningMessage(`${error}`);
                        return false;
                    }
                }
                else if (git_context == "new_rama"){
                    try {
                        execSync(`git checkout -b ${value}`, {
                            cwd: localPath,
                            encoding: 'utf8',
                            stdio: ['pipe', 'pipe', 'pipe'] // Oculta la salida y errores de la terminal
                        });
                        vscode.window.showInformationMessage(`rama creado : ${value} y switch`)
                        return true;
                    } catch (error) {
                        vscode.window.showWarningMessage(`${error}`);
                        return false;
                    }
                }
                myvar = 1
                miInput?.hide();
                return;
            }
        });

        miInput.onDidAccept(() => {

            vscode.window.showInformationMessage(
                `Enviaste: ${miInput?.value}`
            );

            miInput?.hide();

        });

        miInput.show();

    }

const toggleCommand = vscode.commands.registerCommand("myExtension.toggleCommand", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      myvar = 1
      my_numero = 0
      buscar_mode = 0
      select_mode = 0
      myStatus.text = `MODE = ${myvar}`;
    });

const inputBuscar= vscode.commands.registerCommand(
    'myExtension.inputBuscar',
    async () => {

        const editor =
            vscode.window.activeTextEditor;

        if (!editor) return;
        miInput =
            vscode.window.createInputBox();
        const input = miInput;

        await vscode.commands.executeCommand(
            'setContext',
            'miInputFocus',
            true
        );

        input.placeholder =
            "buscar palabra : ";

        input.onDidChangeValue((text) => {

            // ejecutar al presionar espacio
            if (text.endsWith(" ")) {

                const value =
                    text.trim();
                myvar = 1;
                palabra_buscar=value
                next_buscar(value)
                input.hide();
                buscar_mode = 1

            }

        });

        input.onDidHide(async () => {

            await vscode.commands.executeCommand(
                'setContext',
                'miInputFocus',
                false
            );
            input.dispose();
            miInput = undefined;

        });

        input.show();

    }
);    

  const inputFilter = vscode.commands.registerCommand(
    'myExtension.inputFilter',
    async () => {

        const editor =
            vscode.window.activeTextEditor;

        if (!editor) return;

        miInput =
            vscode.window.createInputBox();

        const input = miInput;

        await vscode.commands.executeCommand(
            'setContext',
            'miInputFocus',
            true
        );

        input.placeholder =
            "filtrar";

input.onDidChangeValue((text) => {
    // 1. Detectar si el usuario presionó espacio
    if (text.endsWith(" ")) {
        // Obtenemos el texto sin el espacio final
        const filterQuery = text.trim();
        
        // 2. Aplicamos el filtro en tu provider
        provider.setFilter(filterQuery);
        
        // 3. Limpiamos el input visualmente o lo cerramos
        // Opción A: Mantenerlo abierto pero limpio
        input.value = ""; 
        
        input.hide();
        
        // 4. Feedback al usuario (opcional)
        vscode.window.setStatusBarMessage(`Filtrando por: "${filterQuery}"`, 2000);
    }
});
        input.onDidHide(async () => {

            await vscode.commands.executeCommand(
                'setContext',
                'miInputFocus',
                false
            );
            input.dispose();
            miInput = undefined;

        });

          input.show();

    }
);

const aCommand = vscode.commands.registerCommand("myExtension.aCommand" , async () =>{
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    const selections = editor.selections;
    for(const selection of selections){
      const position = selection.active;
      if (myvar == 0){
        insertChar(editor ,position, 'a')
      }else if (myvar == 3){    
        insertChar(editor ,position, ':')
        if (my_numero == 0){
          myvar = 0;
        }else{
          myvar = 4;
        }
      }else if (myvar == 5){   
        insertChar(editor ,position, 'A')
      }else{
          myvar = 0
          my_numero = 0
      }
      myStatus.text = `MODE = ${myvar}`;      
    }
})
const bCommand = vscode.commands.registerCommand("myExtension.bCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertChar(editor, position, 'b');
        } else if (myvar == 4) {
            insertChar(editor, position, '9');
        } else if (myvar == 3) {
            if (sub_mode == 0){
                insertChar(editor, position, '!');
            }else{
                insertChar(editor, position, '\\');
            }
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
        insertChar(editor ,position, 'B')
        }else if (myvar == 1){   
                   await vscode.commands.executeCommand(
                   'workbench.action.focusNextGroup'
);
        }else if (myvar == 2){   
            myvar = 1
            vscode.commands.executeCommand('workbench.action.splitEditorDown');
        }
        myStatus.text = `MODE = ${myvar}`;
    }
    
});


const cCommand = vscode.commands.registerCommand("myExtension.cCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertChar(editor, position, 'c');
        } else if (myvar == 1) {
            myvar = 2
            select_mode = 1
            if (savedLine === null) {
                vscode.window.showErrorMessage("Primero debes guardar una línea.");
                return;
            }
            const currentLine = editor.selection.active.line;
            const startLine = Math.min(savedLine, currentLine);
            const endLine = Math.max(savedLine, currentLine);
            
            // Obtener el final de la última línea para incluir todo el texto
            const endLineLength = editor.document.lineAt(endLine).range.end;
            
            // Crear el rango: desde el inicio de la primera línea hasta el final de la última
            const selectionRange = new vscode.Range(
                new vscode.Position(startLine, 0),
                endLineLength
            );
            editor.selection = new vscode.Selection(selectionRange.start, selectionRange.end);
            editor.revealRange(selectionRange);
        } else if (myvar == 3) {
            insertChar(editor, position, '""');
            vscode.commands.executeCommand('cursorLeft');
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
        insertChar(editor ,position, 'C')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});

const tabCommand = vscode.commands.registerCommand("myExtension.tabCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    const selections = editor.selections;
    for (const selection of selections){
        const position = selection.active;    
        if (myvar == 0 || myvar == 4 ) {
            myvar = 3            
            sub_mode = 0
        }else if (myvar == 3){
            vscode.commands.executeCommand('cursorRight');
            myvar = 0;
        }else if (myvar == 5){
            myvar = 0
        }
    }
    myStatus.text = `MODE = ${myvar}`;
    
})

const dCommand = vscode.commands.registerCommand("myExtension.dCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertChar(editor, position, 'd');
        }else if (myvar == 1){
            const position = editor.selection.active;
            savedLine = position.line;
            vscode.window.showInformationMessage(`Línea ${savedLine + 1} guardada.`);
        }else if (myvar == 2){
          vscode.commands.executeCommand('cursorEnd');
          myvar = 1
        } else if (myvar == 3) {
            insertChar(editor, position, '=');

            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
      }else if (myvar == 5){   
        insertChar(editor ,position, 'D')
      }
        myStatus.text = `MODE = ${myvar}`;
    }
});


const eCommand = vscode.commands.registerCommand("myExtension.eCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertChar(editor, position, 'e');
        } else if (myvar == 3) {
            insertChar(editor, position, '$');

            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
        insertChar(editor ,position, 'E')
        } else if (myvar == 1){
           myvar = 0        
           await vscode.commands.executeCommand(
         'myExtension.wordJump'
           );
        }
        myStatus.text = `MODE = ${myvar}`;
    }
});


const fCommand = vscode.commands.registerCommand("myExtension.fCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertChar(editor, position, 'f');
        } else if (myvar == 1|| myvar == 2){
           vscode.commands.executeCommand('cursorLineStart');
           myvar = 0        
           await vscode.commands.executeCommand(
           'myExtension.rangeSelect'
           );
        } else if (myvar == 3) {
            insertChar(editor, position, '/');

            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
        insertChar(editor ,position, 'F')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});


const gCommand = vscode.commands.registerCommand("myExtension.gCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertChar(editor, position, 'g');
        } else if (myvar == 4) {
            insertChar(editor, position, '0');
        }else if (myvar == 2){
            select_mode = 1
            vscode.commands.executeCommand('editor.action.smartSelect.expand')
            myvar = 2
        } else if (myvar == 3) {
            insertChar(editor, position, '{}');
            vscode.commands.executeCommand('cursorLeft');
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
        insertChar(editor ,position, 'G')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});
const backspaceCommand = vscode.commands.registerCommand("myExtension.backspaceCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 5 || myvar == 0 || myvar == 4) {
            vscode.commands.executeCommand('deleteLeft');
        }else if (myvar == 1 && buscar_mode == 0){
            vscode.commands.executeCommand('redo'); 
        }else if (myvar == 1 && buscar_mode == 1){
            prev_buscar(palabra_buscar)
        }else if (myvar ==  2){
          if (select_mode == 1){
            vscode.commands.executeCommand('deleteLeft');
            myvar = 1
            select_mode = 0
          }else {
          const editor = vscode.window.activeTextEditor;
        if (!editor) return;
        vscode.commands.executeCommand('editorScroll', {
            to: 'down',
            by: 'halfPage',
            revealCursor: false
        });
        const lastRangeIndex = editor.visibleRanges.length - 1;
        const lastVisibleRange = editor.visibleRanges[lastRangeIndex];
        
        if (lastVisibleRange) {
            // Obtenemos la última línea visible
            const lastLine = lastVisibleRange.end.line;
            
            // Obtenemos la longitud de esa línea para poner el cursor al final
            const lastLineText = editor.document.lineAt(lastLine).text;
            const lastColumn = lastLineText.length;
            
            const newPosition = new vscode.Position(lastLine, lastColumn);
            
            // Movemos el cursor
            editor.selection = new vscode.Selection(newPosition, newPosition);
            
            // Aseguramos que la línea se vea bien (por si estaba cortada por la mitad)
            editor.revealRange(new vscode.Range(newPosition, newPosition), vscode.TextEditorRevealType.InCenterIfOutsideViewport);
          }
          vscode.commands.executeCommand('cursorLineStart');
        }
      }else if (myvar == 4){
        }else if (myvar ==  3){
            myvar = 4
            my_numero = 1
        }
        myStatus.text = `MODE = ${myvar}`;
    }
});
const spaceCommand = vscode.commands.registerCommand("myExtension.spaceCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;
        if (myvar == 0 || myvar == 5 || myvar == 4) {
            insertChar(editor ,position, ' ')
        }else if (myvar == 1 && buscar_mode == 0){
            vscode.commands.executeCommand('undo'); 
        }else if (myvar == 1 && buscar_mode ==1){
                next_buscar(palabra_buscar)
        } else if (myvar == 3) {
            const document = editor.document;
            const selection = editor.selection;
            const position = selection.active;

            const lineText = document.lineAt(position.line).text;
            const indentMatch = lineText.match(/^\s*/);
            const indent = indentMatch ? indentMatch[0] : "";

            // 1. Definimos la nueva posición (una línea abajo, al final de la indentación)
            const newPosition = new vscode.Position(position.line + 1, indent.length);

            editor.edit(editBuilder => {
                editBuilder.insert(new vscode.Position(position.line, lineText.length), "\n" + indent);
            }).then(success => {
                if (success) {
                    // 2. Movemos el cursor a la nueva posición
                    editor.selection = new vscode.Selection(newPosition, newPosition);
                    
                    // 3. (Opcional) Hacemos scroll si la nueva línea queda fuera de vista
                    editor.revealRange(new vscode.Range(newPosition, newPosition));
                }
            });
            myvar = 0;
        }else if (myvar == 2){
          const editor = vscode.window.activeTextEditor;
        if (!editor) return;
        vscode.commands.executeCommand('editorScroll', {
            to: 'up',
            by: 'halfPage',
            revealCursor: false
        });
        const firstVisibleRange = editor.visibleRanges[0];
        
        if (firstVisibleRange) {
            // La primera línea visible (toma en cuenta el scroll y folds)
            const startLine = firstVisibleRange.start.line;
            
            // Creamos la nueva posición al inicio de esa línea (columna 0)
            const newPosition = new vscode.Position(startLine, 0);
            
            // Movemos el cursor (la selección)
            editor.selection = new vscode.Selection(newPosition, newPosition);
            
            // Opcional: Asegurar que la línea sea visible (por si estaba a medias)
            editor.revealRange(new vscode.Range(newPosition, newPosition), vscode.TextEditorRevealType.InCenterIfOutsideViewport);
         }
        vscode.commands.executeCommand('cursorLineStart');
         
        }
    }
        myStatus.text = `MODE = ${myvar}`;
});

const hCommand = vscode.commands.registerCommand("myExtension.hCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;
        if (myvar == 0) {
            insertChar(editor, position, 'h');
        } else if (myvar == 3) {
            if (sub_mode == 0){
                myvar = 5   
            }else {
                insertChar(editor, position, '?');
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
            }
        }else if (myvar == 5){   
        insertChar(editor ,position, 'H')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});


const iCommand = vscode.commands.registerCommand("myExtension.iCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertChar(editor, position, 'i');
        } else if (myvar == 3) {
            insertChar(editor, position, '+');

            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 1){
            myvar = 2;
            buscar_mode = 0
            my_numero = 0
            select_mode = 0
        }else if (myvar == 5){   
        insertChar(editor ,position, 'I')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});


const jCommand = vscode.commands.registerCommand("myExtension.jCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertChar(editor, position, 'j');
        } else if (myvar == 1|| myvar == 2){
           myvar = 0        
            const position = editor.selection.active;
            savedLine = position.line;
           await vscode.commands.executeCommand(
           'myExtension.inputBuscar'
           );
        } else if (myvar == 4) {
            insertChar(editor, position, '3');
        } else if (myvar == 3) {
            myvar = 4
            my_numero = 1
        }else if (myvar == 5){   
        insertChar(editor ,position, 'J')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});


const kCommand = vscode.commands.registerCommand("myExtension.kCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertChar(editor, position, 'k');
        } else if (myvar == 4) {
            insertChar(editor, position, '2');
        } else if (myvar == 2) {
            myvar = 1
            const fileUri = vscode.Uri.joinPath(context.extensionUri, 'resources', 'datos.txt');
            
            try {
                // 1. Leer el archivo
                const readData = await vscode.workspace.fs.readFile(fileUri);
                const content = Buffer.from(readData).toString('utf8');
                
                // 2. Procesar líneas
                const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
                
                if (lines.length === 0) {
                    vscode.window.showInformationMessage("No hay rutas registradas todavía.");
                    return;
                }

                // 3. Crear los elementos para el QuickPick
                const items: vscode.QuickPickItem[] = lines.map(line => ({
                    label: path.basename(line), // Nombre del archivo
                    description: line           // Ruta completa como subtítulo
                }));

                // 4. Mostrar el selector
                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: 'Selecciona un archivo para abrir:'
                });

                // 5. Abrir el archivo seleccionado
                if (selected && selected.description) {
                    const docUri = vscode.Uri.file(selected.description);
                    const document = await vscode.workspace.openTextDocument(docUri);
                    await vscode.window.showTextDocument(document);
                }

            } catch (e) {
                vscode.window.showErrorMessage("No se pudo leer el archivo de registros o no existe.");
            }
        } else if (myvar == 1) {
           await vscode.commands.executeCommand('myExtension.git_tool');
            
        } else if (myvar == 3) {
            insertChar(editor, position, '_');

            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
        insertChar(editor ,position, 'K')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});
const primerItem = vscode.commands.registerCommand("myExtension.primerItem", async () => {
const items = provider.getVisibleItems(); 
    
    if (items.length > 0) {
        const target = items[0];
        if (fs.lstatSync(target).isDirectory()) {
            // Si es carpeta, navegamos
            vscode.commands.executeCommand('myExtension.navigateFolder', target);
        } else {
            // Si es archivo, lo abrimos
            const uri = vscode.Uri.file(target);
            await vscode.commands.executeCommand('vscode.open', uri);
            
        }
    }
    })
const lCommand = vscode.commands.registerCommand("myExtension.lCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertChar(editor, position, 'l');
        } else if (myvar == 4) {
            insertChar(editor, position, '1');
        } else if (myvar == 3) {
            insertChar(editor, position, "''");
            vscode.commands.executeCommand('cursorLeft');
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
            insertChar(editor ,position, 'L')
        }else if (myvar == 2){
                vscode.commands.executeCommand('editor.action.outdentLines')          
        }else if (myvar == 1){   
            myvar = 1
            await vscode.commands.executeCommand(
                'myCustomExplorer.focus'
            )            
            await vscode.commands.executeCommand('myExtension.resetToActive');
            
        }
        myStatus.text = `MODE = ${myvar}`;
    }
});


const mCommand = vscode.commands.registerCommand("myExtension.mCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertChar(editor, position, 'm');
        } else if (myvar == 4) {
            insertChar(editor, position, '8');
        } else if (myvar == 1) {
        const tabs: vscode.Tab[] = [];
        vscode.window.tabGroups.all.forEach(group => {
            tabs.push(...group.tabs);
        });

        if (tabs.length === 0) {
            vscode.window.showInformationMessage("No hay pestañas abiertas.");
            return;
        }

        const items: vscode.QuickPickItem[] = [];
        const uris: (vscode.Uri | undefined)[] = [];

        for (const tab of tabs) {
            let label = "";
            let description = "";
            let uri: vscode.Uri | undefined;

            if (tab.input instanceof vscode.TabInputText || tab.input instanceof vscode.TabInputNotebook) {
                uri = tab.input.uri;
            } else if (tab.input instanceof vscode.TabInputTextDiff) {
                uri = tab.input.modified;
            }

            uris.push(uri);

            if (uri) {
                label = path.basename(uri.fsPath);
                description = path.dirname(uri.fsPath);
            } else {
                label = tab.label;
                description = "Pestaña especial / Sin archivo";
            }

            if (tab.isDirty) {
                label = `● ${label}`;
            }

            items.push({
                label: label,
                description: description,
            });
        }

        const selectedItem = await vscode.window.showQuickPick(items, {
            placeHolder: 'Buscar pestañas abiertas...'
        });

        if (selectedItem) {
            const selectedIndex = items.indexOf(selectedItem);
            if (selectedIndex !== -1) {
                const targetUri = uris[selectedIndex];
                if (targetUri) {
                    // Abrir y enfocar el archivo de la pestaña seleccionada
                    const document = await vscode.workspace.openTextDocument(targetUri);
                    await vscode.window.showTextDocument(document);
                }
            }
        }
        } else if (myvar == 2) {
        vscode.commands.executeCommand('workbench.action.closeActiveEditor');
           myvar = 1
        } else if (myvar == 3) {
            sub_mode = 1
        }else if (myvar == 5){   
            insertChar(editor ,position, 'M')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});


const nCommand = vscode.commands.registerCommand("myExtension.nCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertChar(editor, position, 'n');
            
        } else if (myvar == 4) {
            insertChar(editor, position, '7');
        } else if (myvar == 3) {
            if (sub_mode == 0){
                insertChar(editor, position, '>');
            }else{
                vscode.commands.executeCommand('cursorLeft');
            }
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 1){   
            vscode.commands.executeCommand('editor.action.addSelectionToNextFindMatch');
            myvar = 2
            select_mode = 1
        }else if (myvar == 5){   
        insertChar(editor ,position, 'N')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});


const oCommand = vscode.commands.registerCommand("myExtension.oCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertChar(editor, position, 'o');
        } else if (myvar == 4) {
            insertChar(editor, position, '5');
        }else if (myvar == 1){
            vscode.commands.executeCommand('cursorDown');
        } else if (myvar == 3) {
            if (sub_mode == 0){
                insertChar(editor, position, '|');
            }else{
                insertChar(editor, position, '@');
            }
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
        insertChar(editor ,position, 'O')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});


const pCommand = vscode.commands.registerCommand("myExtension.pCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertChar(editor, position, 'p');
        } else if (myvar == 4) {
            insertChar(editor, position, '4');
        }else if (myvar == 1){
            vscode.commands.executeCommand('cursorUp');
        }else if (myvar == 2){
            vscode.commands.executeCommand(
               'editor.action.indentLines'
            );
        } else if (myvar == 3) {
            insertChar(editor, position, '[]');
            vscode.commands.executeCommand('cursorLeft');
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
        insertChar(editor ,position, 'P')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});


const qCommand = vscode.commands.registerCommand("myExtension.qCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertChar(editor, position, 'q');
                              }else if (myvar == 1){
        vscode.commands.executeCommand('editor.unfold');
              }else if (myvar == 2){
        vscode.commands.executeCommand('editor.unfoldAll')
        } else if (myvar == 3) {
            insertChar(editor, position, '#');

            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
        insertChar(editor ,position, 'Q')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});
    const selectllaves = vscode.commands.registerCommand(
        'myExtension.selectllaves',
        () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        const document = editor.document;
        const position = editor.selection.active;
        const offset = document.offsetAt(position);
        const text = document.getText();

        // Verificar si el cursor está justo al lado de una llave de apertura '{'
        let openBraceOffset = -1;

        if (text[offset] === '{') {
            openBraceOffset = offset;
        } else if (offset > 0 && text[offset - 1] === '{') {
            openBraceOffset = offset - 1;
        } else {
            // Si no estás sobre una llave, no hacemos nada (o podrías mostrar un mensaje)
            return;
        }

        // Algoritmo para encontrar la llave de cierre '}' respetando la anidación
        let stack = 0;
        let closeBraceOffset = -1;

        for (let i = openBraceOffset; i < text.length; i++) {
            if (text[i] === '{') {
                stack++;
            } else if (text[i] === '}') {
                stack--;
                if (stack === 0) {
                    closeBraceOffset = i;
                    break;
                }
            }
        }

        if (closeBraceOffset !== -1) {
            // --- CORRECCIÓN AQUÍ ---
            // Inicio: justo después de '{' (+1)
            const startPos = document.positionAt(openBraceOffset + 1);
            // Fin: justo antes de '}' (sin el +1)
            const endPos = document.positionAt(closeBraceOffset);

            // Si startPos es anterior a endPos, hay contenido, si no, está vacío
            if (startPos.isBefore(endPos)) {
                editor.selection = new vscode.Selection(startPos, endPos);
            } else {
                // Caso de bloque vacío: {} -> Ponemos el cursor en medio
                editor.selection = new vscode.Selection(startPos, startPos);
            }
            
            // Opcional: hacer un revealRange para asegurar que la selección sea visible
            editor.revealRange(editor.selection);
        } else {
            vscode.window.showWarningMessage("No se encontró una llave de cierre '}' correspondiente.");
        }
    });
const rangeselectInput = vscode.commands.registerCommand(
        'myExtension.rangeselectInput',
        () => {

            const input = vscode.window.createInputBox();
            input.prompt = "Escribe algo para ver la magia en tiempo real";

            input.onDidChangeValue(value => {
                if (value === "g"){
                    input.hide();
                    input.dispose();
                    myvar = 2
                    select_mode = 1
                    vscode.commands.executeCommand(
                        'myExtension.selectllaves'
                    );                    
                }else if (value === "m"){
                    input.hide();
                    input.dispose();
                    myvar = 1
                    vscode.commands.executeCommand('myExtension.endfileCommand');
                }else if (value === "n"){
                    input.hide();
                    input.dispose();
                    myvar = 1
                    vscode.commands.executeCommand('myExtension.topfileCommand');
                }else if (value === "b"){
                    input.hide();
                    input.dispose();
                    select_mode = 1
                    myvar = 2
                    vscode.commands.executeCommand('editor.action.selectAll');
                }
            });

            input.onDidAccept(() => {

                vscode.window.showInformationMessage(
                    `Enviaste: ${input.value}`
                );

                input.hide();
                input.dispose();

            });

            input.show();

        }
    );

const rCommand = vscode.commands.registerCommand("myExtension.rCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertChar(editor, position, 'r');
        } else if (myvar == 3) {
            insertChar(editor, position, '()');
            vscode.commands.executeCommand('cursorLeft');
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
        insertChar(editor ,position, 'R')
        }else if (myvar == 1){  
            vscode.commands.executeCommand('editor.action.clipboardCutAction');
        }else if (myvar == 2){  
            vscode.commands.executeCommand('editor.action.clipboardCutAction');
            myvar = 1
            select_mode = 0
        }        
        
        myStatus.text = `MODE = ${myvar}`;
    }
});


const sCommand = vscode.commands.registerCommand("myExtension.sCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    const selections = editor.selections;
    for (const selection of selections) {
        const position = selection.active;
        if (myvar == 0) {
            insertChar(editor, position, 's');
        }else if (myvar == 1){
            vscode.commands.executeCommand('workbench.action.files.save');
        
            const filePath = editor.document.uri.fsPath;
            // 2. Definir la ruta exacta que solicitaste
            const fileUri = vscode.Uri.joinPath(context.extensionUri, 'resources', 'datos.txt');
            let fileContent = "";
            try {
                // Intentar leer el archivo existente en la carpeta de la extensión
                const readData = await vscode.workspace.fs.readFile(fileUri);
                fileContent = Buffer.from(readData).toString('utf8');
            } catch (e) {
                // Si el archivo no existe, lo crearemos vacío
                console.log("El archivo de registro no existe aún, se creará al guardar.");
            }
            // 3. Verificar duplicados (separamos por salto de línea)
            const lines = fileContent.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
            if (!lines.includes(filePath)) {
                // 4. Agregar nueva ruta
                lines.push(filePath);
                const newContent = lines.join('\n') + '\n';
                // 5. Escribir de vuelta en la carpeta de la extensión
                await vscode.workspace.fs.writeFile(
                    fileUri, 
                    Buffer.from(newContent, 'utf8')
                );
            }
        
        }else if (myvar == 2){
          vscode.commands.executeCommand('cursorHome');
          myvar = 1
        } else if (myvar == 3) {
            insertChar(editor, position, '.');

            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
        insertChar(editor ,position, 'S')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});
    const enterCommand = vscode.commands.registerCommand("myExtension.enterCommand", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      if (myvar === 1 || myvar === 2) {
        myvar = 1
        select_mode = 0
        buscar_mode = 0
        vscode.commands.executeCommand('workbench.action.showCommands');
        
      } else if (myvar === 0 ) {
        const document = editor.document;
        const newSelections: vscode.Selection[] = [];
        await editor.edit(editBuilder => {
            editor.selections.forEach(selection => {
                const position = selection.active;
                if (position.character > 0 || position.line > 0) {
                    const previousPosition = document.positionAt(document.offsetAt(position) - 1);
                    const range = new vscode.Range(previousPosition, position);
                    const text = document.getText(range);
                    editBuilder.replace(range, text.toUpperCase());
                    newSelections.push(new vscode.Selection(position, position));
                } else {
                    newSelections.push(selection);
                }
            });
        });
        editor.selections = newSelections;
      }else if (myvar == 3){
    const document = editor.document;
    const selection = editor.selection;
    const position = selection.active;

    // Texto de la línea actual
    const lineText = document.lineAt(position.line).text;

    // Separar izquierda y derecha del cursor
    const left = lineText.substring(0, position.character);
    const right = lineText.substring(position.character);

    // Detectar indentación
    const indentMatch = lineText.match(/^\s*/);
    const indent = indentMatch ? indentMatch[0] : "";

    editor.edit(editBuilder => {

        const range = new vscode.Range(
        new vscode.Position(position.line, 0),
        new vscode.Position(position.line, lineText.length)
        );

        const newText =
        left + "\n" +
        indent + "    " + "\n" +
        indent + right;

        editBuilder.replace(range, newText);

    }).then(success => {

        if (success) {

        // Cursor en la línea intermedia
        const newPos = new vscode.Position(
            position.line + 1,
            indent.length + 4
        );

        editor.selection = new vscode.Selection(newPos, newPos);
        }

        });
    myvar = 0;
      }

      myStatus.text = `MODE = ${myvar}`;
    });
const tCommand = vscode.commands.registerCommand("myExtension.tCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertChar(editor, position, 't');
        } else if (myvar == 1|| myvar == 2){
           myvar = 0        
           await vscode.commands.executeCommand(
           'myExtension.flash'
           );
        } else if (myvar == 3) {
            insertChar(editor, position, '-');
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
        insertChar(editor ,position, 'T')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});


const uCommand = vscode.commands.registerCommand("myExtension.uCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertChar(editor, position, 'u');
        } else if (myvar == 4) {
            insertChar(editor, position, '6');
        } else if (myvar == 3) {
            if (sub_mode == 0){
                insertChar(editor, position, ';');
            }else {
                insertChar(editor, position, '``');
                vscode.commands.executeCommand('cursorLeft');
            }
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar === 1) {
            
            vscode.commands.executeCommand('editor.action.clipboardCopyAction');
        }else if (myvar === 2) {
            vscode.commands.executeCommand('editor.action.clipboardCopyAction');
            vscode.commands.executeCommand('cancelSelection');
            myvar = 1
            select_mode = 0
        }else if (myvar == 5){   
            insertChar(editor ,position, 'U')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});
const pathcopyCommand = vscode.commands.registerCommand("myExtension.pathcopyCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    const filePath = editor.document.uri.fsPath;
    const folderPath = path.dirname(filePath);
    await vscode.env.clipboard.writeText(folderPath);
    vscode.window.showInformationMessage(`Carpeta copiada: ${folderPath}`);
});

const vCommand = vscode.commands.registerCommand("myExtension.vCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertChar(editor, position, 'v');
        } else if (myvar == 2){
           const document = editor.document;
           const texto_seleccionado = document.getText(selection);
           if (texto_seleccionado.length > 0){
               palabra_buscar = texto_seleccionado
               buscar_mode = 1
               vscode.window.showInformationMessage(`buscar : ${palabra_buscar}`)
           }
           myvar = 1
        } else if (myvar == 1) {
            myvar = 0        
            await vscode.commands.executeCommand(
           'myExtension.rangeselectInput'
           ); 
        } else if (myvar == 3) {
            insertChar(editor, position, '*');

            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
            insertChar(editor ,position, 'V')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});


const wCommand = vscode.commands.registerCommand("myExtension.wCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;
        if (myvar == 0) {
            insertChar(editor, position, 'w');
        } else if (myvar == 1) {
            vscode.commands.executeCommand('editor.action.clipboardPasteAction');
        } else if (myvar == 3) {
            insertChar(editor, position, ',');

            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
            insertChar(editor ,position, 'W')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});


const xCommand = vscode.commands.registerCommand("myExtension.xCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertChar(editor, position, 'x');
        } else if (myvar == 1) {
            vscode.commands.executeCommand('editor.action.deleteLines');
        } else if (myvar == 2) {
            vscode.commands.executeCommand('myExtension.buscarOnCommand');
        } else if (myvar == 3) {
            insertChar(editor, position, '&');

            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
            insertChar(editor ,position, 'X')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});


const yCommand = vscode.commands.registerCommand("myExtension.yCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertChar(editor, position, 'y');
        } else if (myvar == 3) {
            insertChar(editor, position, '%');

            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
            insertChar(editor ,position, 'Y')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});

const topfileCommand = vscode.commands.registerCommand("myExtension.topfileCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
        myvar = 1
        vscode.commands.executeCommand('cursorTop');
        myStatus.text = `MODE = ${myvar}`;
});
const endfileCommand = vscode.commands.registerCommand("myExtension.endfileCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
        myvar = 1
        vscode.commands.executeCommand('cursorBottom');
        myStatus.text = `MODE = ${myvar}`;
});
const buscarOnCommand = vscode.commands.registerCommand("myExtension.buscarOnCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
        myvar = 1
        buscar_mode = 1
        select_mode = 0
        vscode.window.showInformationMessage("modo buscar activado")
        myStatus.text = `MODE = ${myvar}`;
});
//atajos contexto explorador
const bajarexplorer = vscode.commands.registerCommand("myExtension.bajarexplorer", async () => {
        await vscode.commands.executeCommand('list.focusDown');
});
const renamefileexplorer = vscode.commands.registerCommand("myExtension.renamefileexplorer", async () => {
    //    myvar = 0
    //  await vscode.commands.executeCommand('myExtension.renamefileInput');
    explorer_mode = "renombrar"
    provider.refresh();
    vscode.window.showInformationMessage("selecciona para renombrar")
});
const newfileexplorer = vscode.commands.registerCommand("myExtension.newfileexplorer", async () => {
        myvar = 0
        await vscode.commands.executeCommand('myExtension.newfileInput');
});
const setnewfolder = vscode.commands.registerCommand("myExtension.setnewfolder", async () => {
        myvar = 0
        await vscode.commands.executeCommand('myExtension.createfolderinput');
});
const subirexplorer = vscode.commands.registerCommand("myExtension.subirexplorer", async () => {
        await vscode.commands.executeCommand('list.focusUp');
});
const filtrarexplorer = vscode.commands.registerCommand("myExtension.filtrarexplorer", async () => {
        myvar = 0
        await vscode.commands.executeCommand('myExtension.inputFilter');
});

const deleteItem = vscode.commands.registerCommand('myExtension.deleteItem', async () => {
    explorer_mode = "eliminar"
    provider.refresh();
    vscode.window.showInformationMessage("selecciona para eliminar")
});

const zCommand = vscode.commands.registerCommand("myExtension.zCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertChar(editor, position, 'z');
        }else if (myvar == 1){
            vscode.commands.executeCommand('editor.fold');
        }else if (myvar == 2){
            vscode.commands.executeCommand('editor.foldAll');
            myvar = 1           
        } else if (myvar == 3) {
            insertChar(editor, position, '<');

            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
            insertChar(editor ,position, 'Z')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});
const createfolderinput = vscode.commands.registerCommand(
    'myExtension.createfolderinput',
    async () => {

    const editor =
        vscode.window.activeTextEditor;

    if (!editor) return;
        miInput = vscode.window.createInputBox();

        const input = miInput; // referencia fija

        await vscode.commands.executeCommand(
            'setContext',
            'miInputFocus',
            true
        );
        input.validationMessage = {
            message: `ruta de la nueva carpeta :`,
            severity: vscode.InputBoxValidationSeverity.Info
        };
        input.value= `${provider.currentPath}/`
        input.onDidHide(async () => {

            await vscode.commands.executeCommand(
                'setContext',
                'miInputFocus',
                false
            );
7
            input.dispose();
            miInput = undefined;
        });

input.onDidChangeValue((text) => {
    if (text.endsWith(" ")) {
    if (!text.trim()) {
        return;
    }
    const name =text.trim();

        const fullPath = name

        try {
			fs.mkdirSync(fullPath, {
				recursive: true
			});
            provider.refresh();

        } catch (err: any) {

            vscode.window.showErrorMessage(
                `Error: ${err.message}`
            );
        }
        myvar = 1
        input.hide();
    }
        });
        input.show();
    }
);
const newfileInput = vscode.commands.registerCommand(
    'myExtension.newfileInput',
    async () => {

    const editor =
        vscode.window.activeTextEditor;

    if (!editor) return;
        miInput = vscode.window.createInputBox();

        const input = miInput; // referencia fija

        await vscode.commands.executeCommand(
            'setContext',
            'miInputFocus',
            true
        );
        input.validationMessage = {
            message: `name newFile o carpeta/`,
            severity: vscode.InputBoxValidationSeverity.Info
        };
        input.onDidHide(async () => {

            await vscode.commands.executeCommand(
                'setContext',
                'miInputFocus',
                false
            );
            input.dispose();
            miInput = undefined;
        });

input.onDidChangeValue((text) => {
    if (text.endsWith(" ")) {
    if (!text.trim()) {
        return;
    }
    const name =text.trim();

        const basePath = provider.currentPath;
        const fullPath = path.join(basePath, name);

        try {

            if (name.endsWith('/')) {

                fs.mkdirSync(fullPath, {
                    recursive: true
                });

            } else {

                fs.mkdirSync(
                    path.dirname(fullPath),
                    { recursive: true }
                );

                if (!fs.existsSync(fullPath)) {
                    fs.writeFileSync(fullPath, '');
                }
            }

            provider.refresh();

        } catch (err: any) {

            vscode.window.showErrorMessage(
                `Error: ${err.message}`
            );
        }
        myvar = 1
        input.hide();
    }
        });
        input.show();
    }
);
const renamefileInput = vscode.commands.registerCommand(
    'myExtension.renamefileInput',
    async () => {

    const editor =
        vscode.window.activeTextEditor;

    if (!editor) return;
        miInput = vscode.window.createInputBox();

        const input = miInput; // referencia fija

        await vscode.commands.executeCommand(
            'setContext',
            'miInputFocus',
            true
        );
        input.validationMessage = {
            message: `set new name `,
            severity: vscode.InputBoxValidationSeverity.Info
        };
        const oldName = provider.currentPath;
        input.value = oldName;
        input.onDidHide(async () => {

            await vscode.commands.executeCommand(
                'setContext',
                'miInputFocus',
                false
            );
            input.dispose();
            miInput = undefined;
        });

        input.onDidChangeValue((text) => {
            if (text.endsWith(" ")) {
            if (!text.trim()) {
                return;
            }
            const newName =text.trim();
            if (!newName || newName === oldName) {
                input.hide();
                return;
            }

            const newPath = path.join(path.dirname(oldName), newName);

            try {
                // Función de Node.js para renombrar
                fs.renameSync(oldName, newPath);
                
                provider.refresh(); // Actualizamos el árbol
                vscode.window.showInformationMessage(`Renombrado a: ${newName}`);
            } catch (err: any) {
                vscode.window.showErrorMessage(`Error al renombrar: ${err.message}`);
            }
            
            input.hide();

        myvar = 1
        input.hide();
    }
        });
        input.show();
    }
);

const aKey = vscode.commands.registerCommand(
    'myExtension.aKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'a';
        } else if (myvar == 5 && miInput){
            miInput.value += 'A';
        } else if (myvar === 3 && miInput) {
            miInput.value += ':';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else {
           my_numero = 0
           myvar = 0
        }
    }
);
const toggleKey = vscode.commands.registerCommand(
    'myExtension.toggleKey',
    () => {
        if (miInput){
            myvar = 0
            my_numero = 0
        }
    }
)

const bKey = vscode.commands.registerCommand(
    'myExtension.bKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'b';
        } else if (myvar === 4 && miInput) {
            miInput.value += '9';
        } else if (myvar == 5 && miInput){
            miInput.value += 'B';
        } else if (myvar === 3 && miInput) {
            miInput.value += '!';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const cKey = vscode.commands.registerCommand(
    'myExtension.cKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'c';
        } else if (myvar == 5 && miInput){
            miInput.value += 'C';
        } else if (myvar === 3 && miInput) {
            miInput.value += '"';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const dKey = vscode.commands.registerCommand(
    'myExtension.dKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'd';
        } else if (myvar == 5 && miInput){
            miInput.value += 'D';
        } else if (myvar === 3 && miInput) {
            miInput.value += '=';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const eKey = vscode.commands.registerCommand(
    'myExtension.eKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'e';
        } else if (myvar == 5 && miInput){
            miInput.value += 'E';
        } else if (myvar === 3 && miInput) {
            miInput.value += '$';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const fKey = vscode.commands.registerCommand(
    'myExtension.fKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'f';
        } else if (myvar == 5 && miInput){
            miInput.value += 'F';
        } else if (myvar === 3 && miInput) {
            miInput.value += '/';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const gKey = vscode.commands.registerCommand(
    'myExtension.gKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'g';
        } else if (myvar == 5 && miInput){
            miInput.value += 'G';
        } else if (myvar === 4 && miInput) {
            miInput.value += '0';
        } else if (myvar === 3 && miInput) {
            miInput.value += '{}';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const hKey = vscode.commands.registerCommand(
    'myExtension.hKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'h';
        } else if (myvar == 5 && miInput){
            miInput.value += 'H';
        } else if (myvar === 3 && miInput) {
            miInput.value += '?';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const iKey = vscode.commands.registerCommand(
    'myExtension.iKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'i';
        } else if (myvar == 5 && miInput){
            miInput.value += 'I';
        } else if (myvar === 3 && miInput) {
            miInput.value += '+';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const jKey = vscode.commands.registerCommand(
    'myExtension.jKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'j';
        } else if (myvar == 5 && miInput){
            miInput.value += 'J';
        } else if (myvar === 4 && miInput) {
            miInput.value += '3';
        } else if (myvar === 3 && miInput) {
            miInput.value += '``';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const kKey = vscode.commands.registerCommand(
    'myExtension.kKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'k';
        } else if (myvar == 5 && miInput){
            miInput.value += 'K';
        } else if (myvar === 4 && miInput) {
            miInput.value += '2';
        } else if (myvar === 3 && miInput) {
            miInput.value += '_';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const lKey = vscode.commands.registerCommand(
    'myExtension.lKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'l';
        } else if (myvar == 5 && miInput){
            miInput.value += 'L';
        } else if (myvar === 4 && miInput) {
            miInput.value += '1';
        } else if (myvar === 3 && miInput) {
            miInput.value += "'";
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const mKey = vscode.commands.registerCommand(
    'myExtension.mKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'm';
        } else if (myvar == 5 && miInput){
            miInput.value += 'M';
        } else if (myvar === 3 && miInput) {
            miInput.value += '\\';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const nKey = vscode.commands.registerCommand(
    'myExtension.nKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'n';
        } else if (myvar == 5 && miInput){
            miInput.value += 'N';
        } else if (myvar === 4 && miInput) {
            miInput.value += '8';
        } else if (myvar === 3 && miInput) {
            miInput.value += '>';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const oKey = vscode.commands.registerCommand(
    'myExtension.oKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'o';
        } else if (myvar == 5 && miInput){
            miInput.value += 'O';
        } else if (myvar === 4 && miInput) {
            miInput.value += '5';
        } else if (myvar === 3 && miInput) {
            miInput.value += '@';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const pKey = vscode.commands.registerCommand(
    'myExtension.pKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'p';
        } else if (myvar == 5 && miInput){
            miInput.value += 'P';
        } else if (myvar === 4 && miInput) {
            miInput.value += '4';
        } else if (myvar === 3 && miInput) {
            miInput.value += '[]';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const qKey = vscode.commands.registerCommand(
    'myExtension.qKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'q';
        } else if (myvar == 5 && miInput){
            miInput.value += 'Q';
        } else if (myvar === 3 && miInput) {
            miInput.value += '#';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const rKey = vscode.commands.registerCommand(
    'myExtension.rKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'r';
        } else if (myvar == 5 && miInput){
            miInput.value += 'R';
        } else if (myvar === 3 && miInput) {
            miInput.value += '()';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const sKey = vscode.commands.registerCommand(
    'myExtension.sKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 's';
        } else if (myvar == 5 && miInput){
            miInput.value += 'S';
        } else if (myvar === 3 && miInput) {
            miInput.value += '.';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const tKey = vscode.commands.registerCommand(
    'myExtension.tKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 't';
        } else if (myvar == 5 && miInput){
            miInput.value += 'T';
        } else if (myvar === 3 && miInput) {
            miInput.value += '-';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const uKey = vscode.commands.registerCommand(
    'myExtension.uKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'u';
        } else if (myvar == 5 && miInput){
            miInput.value += 'U';
        } else if (myvar === 4 && miInput) {
            miInput.value += '6';
        } else if (myvar === 3 && miInput) {
            miInput.value += ';';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const vKey = vscode.commands.registerCommand(
    'myExtension.vKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'v';
        } else if (myvar == 5 && miInput){
            miInput.value += 'V';
        } else if (myvar === 3 && miInput) {
            miInput.value += '*';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const wKey = vscode.commands.registerCommand(
    'myExtension.wKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'w';
        } else if (myvar == 5 && miInput){
            miInput.value += 'W';
        } else if (myvar === 3 && miInput) {
            miInput.value += ',';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const xKey = vscode.commands.registerCommand(
    'myExtension.xKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'x';
        } else if (myvar == 5 && miInput){
            miInput.value += 'X';
        } else if (myvar === 3 && miInput) {
            miInput.value += '&';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const yKey = vscode.commands.registerCommand(
    'myExtension.yKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'y';
        } else if (myvar == 5 && miInput){
            miInput.value += 'Y';
        } else if (myvar === 3 && miInput) {
            miInput.value += '%';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const zKey = vscode.commands.registerCommand(
    'myExtension.zKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'z';
        } else if (myvar == 5 && miInput){
            miInput.value += 'Z';
        } else if (myvar === 3 && miInput) {
            miInput.value += '<';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);

    const tabKey = vscode.commands.registerCommand(
        'myExtension.tabKey',
        () => {
            if (myvar == 0 && miInput) {
                myvar = 3;
            }else{
                myvar = 5;
            }
        }
    );
   const enterKey = vscode.commands.registerCommand(
        'myExtension.enterKey',
        () => {
            if (myvar == 0 && miInput) {
                let val = miInput.value;
                if (val.length > 0) {
                    const lastChar = val.slice(-1);
                    miInput.value = val.slice(0, -1) + lastChar.toUpperCase();
                }
            }
        }
    );
    const gionKey = vscode.commands.registerCommand(
        'myExtension.gionKey',
        () => {
            if (miInput) {
                my_numero = 1;
                myvar = 4
            }
        }
    );

    context.subscriptions.push(
        dKey,
        tabKey
    );
}