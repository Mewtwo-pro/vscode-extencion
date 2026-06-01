import * as vscode from 'vscode';
import { FileExplorerProvider } from './tree';
import * as fs from 'fs'; // <--- ESTA LÍNEA ES LA QUE FALTA O FALLA
import * as path from 'path';
let myvar = 0;
let flash_char = "e"
let sub_mode = 0
let miInput: vscode.InputBox | undefined;
let my_numero = 0;
let buscar_mode = 0;
let palabra_buscar = "def";
let savedLine= 1
let select_mode = 0
const labels =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
let lineMap:
Map<string,vscode.Range>=new Map();
const rangeDecoration =
    vscode.window.createTextEditorDecorationType({
        after:{
            margin:'0 0 0 10px'
        }
    });
function moverCursorDespuesDe(subcadena: string) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    const document = editor.document;
    const line = document.lineAt(editor.selection.active.line);
    const textLine = line.text;
    
    // Buscamos la subcadena empezando desde el cursor actual
    const startIndex = textLine.indexOf(subcadena, editor.selection.active.character);

    if (startIndex !== -1) {
        // Calculamos la nueva posición después de la palabra
        const newPos = new vscode.Position(
            editor.selection.active.line, 
            startIndex + subcadena.length
        );
        editor.selection = new vscode.Selection(newPos, newPos);
    }
}
    
    
function clearRangeLabels(
    editor:vscode.TextEditor
){
    editor.setDecorations(
        rangeDecoration,
        []
    );

    lineMap.clear();
}

let matches: {label:string,pos:number}[] = [];
const jumpDecoration =
    vscode.window.createTextEditorDecorationType({
        after:{
            margin:'0 0 0 5px'
        }
    });

function clearLabels(
    editor:vscode.TextEditor
){
    editor.setDecorations(
        jumpDecoration,
        []
    );

    matches=[];
}
function renderLabels(
    editor: vscode.TextEditor,
    query: string
) {

    clearLabels(editor);
    if (!query) return;
    const labels = 
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const decorations:
    vscode.DecorationOptions[]=[];
    matches=[];
    // Solo recorrer regiones visibles
    for(const visibleRange of editor.visibleRanges){
        const visibleText =
            editor.document.getText(
                visibleRange
            );

        let index=0;

        while(true){

            index=
                visibleText
                .toLowerCase()
                .indexOf(
                    query.toLowerCase(),
                    index
                );

            if(index===-1) break;

            // convertir índice local a global
            const startOffset =
                editor.document.offsetAt(
                    visibleRange.start
                );

            const globalOffset =
                startOffset + index;

            const position =
                editor.document.positionAt(
                    globalOffset
                );

            const label =
                labels[matches.length];

            if(!label) break;

            matches.push({
                label,
                pos:globalOffset
            });

            decorations.push({

                range:new vscode.Range(
                    position,
                    position
                ),

                renderOptions:{
                    after:{
                        contentText:
                            `[${label}]`
                    }
                }

            });

            index++;

        }

    }

    editor.setDecorations(
        jumpDecoration,
        decorations
    );

}

function renderRangeLabels(
    editor:vscode.TextEditor
){

    clearRangeLabels(editor);

    const decorations:
    vscode.DecorationOptions[]=[];

    let labelIndex=0;

    for(const visibleRange of editor.visibleRanges){

        const startLine =
            visibleRange.start.line;

        const endLine =
            visibleRange.end.line;

        for(
            let line=startLine;
            line<=endLine;
            line++
        ){

            const label =
                labels[labelIndex];

            if(!label) break;

            const lineRange =
                editor.document.lineAt(line)
                .range;

            lineMap.set(
                label,
                lineRange
            );

            decorations.push({

                range:new vscode.Range(
                    line,
                    0,
                    line,
                    0
                ),

                renderOptions:{
                    after:{
                        contentText:
                            `[${label}]`
                    }
                }

            });

            labelIndex++;

        }

    }

    editor.setDecorations(
        rangeDecoration,
        decorations
    );

}

function insertCharAndSuggest(editor: vscode.TextEditor, position: vscode.Position, char: string) {
  return editor.edit(editBuilder => {
    editBuilder.insert(position, char);
  }).then(() => {
    vscode.commands.executeCommand('editor.action.triggerSuggest');
  });
}
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

        // 2. Abrir el documento en el espacio de trabajo
        const document = await vscode.workspace.openTextDocument(uri);

        // 3. Mostrar el documento en el editor activo
        await vscode.window.showTextDocument(document);
    } catch (error) {
        vscode.window.showErrorMessage(`No se pudo abrir el archivo: ${error}`);
    }
        }else if (mode == 'd'){
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
        myvar = 0        
        await vscode.commands.executeCommand(
           'myExtension.inputEditItemExplorer'
           );
        
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
const resetcurrentexplorer = vscode.commands.registerCommand("myExtension.resetcurrentexplorer", async () => {
        await vscode.commands.executeCommand('myExtension.resetToActive');
})    
const subirnivelexplorer = vscode.commands.registerCommand("myExtension.subirnivelexplorer", async () => {
        await vscode.commands.executeCommand('myExtension.goUp');
})
const closexplorer = vscode.commands.registerCommand("myExtension.closexplorer", async () => {
        await vscode.commands.executeCommand(
            'workbench.action.toggleSidebarVisibility')
})
const toggleCommand = vscode.commands.registerCommand("myExtension.toggleCommand", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      myvar = 1
      my_numero = 0
      buscar_mode = 0
      select_mode = 0
      myStatus.text = `MODE = ${myvar}`;
    });
const inputEditItemExplorer= vscode.commands.registerCommand(
    'myExtension.inputEditItemExplorer',
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
            "d : eliminar sel - e : rename sel ";
        input.onDidChangeValue((text) => {

            // ejecutar al presionar espacio
            if (text.endsWith(" ")) {

                const value =
                    text.trim();
                myvar = 1;
                if (value == ''){
                    edit_select_item("abrir", provider.currentSelectedPath, provider)
                }else{
                    edit_select_item(value, provider.currentSelectedPath, provider)
                }
                input.hide();

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
const inputgit= vscode.commands.registerCommand(
    'myExtension.inputgit',
    async () => {
        
        const editor =
            vscode.window.activeTextEditor;

        if (!editor) return;
        miInput =
            vscode.window.createInputBox();
        const input = miInput;
        palabra_buscar = "git_init"
        await vscode.commands.executeCommand(
            'setContext',
            'miInputFocus',
            true
        );

        input.placeholder =
            "git init : ";

        input.onDidChangeValue((text) => {

            // ejecutar al presionar espacio
            if (text.endsWith(" ")) {

                const value =
                    text.trim();
                myvar = 0;
                vscode.window.setStatusBarMessage(`"${palabra_buscar}"`, 2000);
                if (palabra_buscar == "git_init"){
                    const terminal = vscode.window.createTerminal('github')
                    terminal.sendText('git init')
                    terminal.show()
                    palabra_buscar = "git_remote"
                    
                }else{
                    input.hide();
                }
                
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
const inputLinea = vscode.commands.registerCommand(
    'myExtension.inputLinea',
    async () => {

        const editor =
            vscode.window.activeTextEditor;

        if (!editor) return;

        renderRangeLabels(editor);

        miInput =
            vscode.window.createInputBox();

        const input = miInput;

        await vscode.commands.executeCommand(
            'setContext',
            'miInputFocus',
            true
        );

        input.placeholder =
            "a = salto | ab = rango";

        input.onDidChangeValue((text) => {

            // ejecutar al presionar espacio
            if (text.endsWith(" ")) {
                
                const value =
                    text.trim();

                // 1 letra → salto
                if (value.length === 1) {
                    myvar = 1
                    const lineRange =
                        lineMap.get(value);

                    if (lineRange) {

                        const pos =
                            lineRange.start;

                        editor.selection =
                            new vscode.Selection(
                                pos,
                                pos
                            );

                        editor.revealRange(
                            lineRange
                        );
                    }
                }
                // 2 letras → rango
                else if (value.length >= 2) {
                    myvar = 2                
                    select_mode = 1
                    const start =
                        lineMap.get(value[0]);

                    const end =
                        lineMap.get(value[1]);

                    if (start && end) {

                        const selection =
                            new vscode.Selection(
                                start.start,
                                end.end
                            );

                        editor.selection =
                            selection;

                        editor.revealRange(
                            selection
                        );

                    }

                }

                clearRangeLabels(editor);

                input.hide();

            }

        });

        input.onDidHide(async () => {

            await vscode.commands.executeCommand(
                'setContext',
                'miInputFocus',
                false
            );

            clearRangeLabels(editor);

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
        insertCharAndSuggest(editor ,position, 'a')
      }else if (myvar == 3){    
        insertChar(editor ,position, ':')
        if (my_numero == 0){
          myvar = 0;
        }else{
          myvar = 4;
        }
      }else if (myvar == 5){   
        insertCharAndSuggest(editor ,position, 'A')
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
            insertCharAndSuggest(editor, position, 'b');
        } else if (myvar == 4) {
            insertCharAndSuggest(editor, position, '9');
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
        insertCharAndSuggest(editor ,position, 'B')
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
            insertCharAndSuggest(editor, position, 'c');
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
        insertCharAndSuggest(editor ,position, 'C')
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
            insertCharAndSuggest(editor, position, 'd');
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
        insertCharAndSuggest(editor ,position, 'D')
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
            insertCharAndSuggest(editor, position, 'e');
        } else if (myvar == 3) {
            insertChar(editor, position, '$');

            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
        insertCharAndSuggest(editor ,position, 'E')
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
            insertCharAndSuggest(editor, position, 'f');
        } else if (myvar == 1|| myvar == 2){
           vscode.commands.executeCommand('cursorLineStart');
           myvar = 0        
           await vscode.commands.executeCommand(
           'myExtension.inputLinea'
           );
        } else if (myvar == 3) {
            insertChar(editor, position, '/');

            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
        insertCharAndSuggest(editor ,position, 'F')
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
            insertCharAndSuggest(editor, position, 'g');
        } else if (myvar == 4) {
            insertCharAndSuggest(editor, position, '0');
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
        insertCharAndSuggest(editor ,position, 'G')
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
            insertCharAndSuggest(editor, position, 'h');
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
        insertCharAndSuggest(editor ,position, 'H')
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
            insertCharAndSuggest(editor, position, 'i');
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
        insertCharAndSuggest(editor ,position, 'I')
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
            insertCharAndSuggest(editor, position, 'j');
        } else if (myvar == 1|| myvar == 2){
           myvar = 0        
            const position = editor.selection.active;
            savedLine = position.line;
           await vscode.commands.executeCommand(
           'myExtension.inputBuscar'
           );
        } else if (myvar == 4) {
            insertCharAndSuggest(editor, position, '3');
        } else if (myvar == 3) {
            insertChar(editor, position, '``');
            vscode.commands.executeCommand('cursorLeft');
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
        insertCharAndSuggest(editor ,position, 'J')
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
            insertCharAndSuggest(editor, position, 'k');
        } else if (myvar == 4) {
            insertCharAndSuggest(editor, position, '2');
        } else if (myvar == 2) {
            myvar = 1
            vscode.commands.executeCommand('workbench.action.quickOpen');
        } else if (myvar == 1) {
            irALinea(savedLine)
        } else if (myvar == 3) {
            insertChar(editor, position, '_');

            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
        insertCharAndSuggest(editor ,position, 'K')
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
            insertCharAndSuggest(editor, position, 'l');
        } else if (myvar == 4) {
            insertCharAndSuggest(editor, position, '1');
        } else if (myvar == 3) {
            insertChar(editor, position, "''");
            vscode.commands.executeCommand('cursorLeft');
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
        insertCharAndSuggest(editor ,position, 'L')
              }else if (myvar == 2){
        vscode.commands.executeCommand('editor.action.outdentLines')          
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
            insertCharAndSuggest(editor, position, 'm');
        } else if (myvar == 4) {
            insertCharAndSuggest(editor, position, '8');
        } else if (myvar == 1) {
            vscode.commands.executeCommand('workbench.action.quickOpenPreviousRecentlyUsedEditorInGroup');
        } else if (myvar == 2) {
        vscode.commands.executeCommand('workbench.action.closeActiveEditor');
           myvar = 1
        } else if (myvar == 3) {
            sub_mode = 1
        }else if (myvar == 5){   
        insertCharAndSuggest(editor ,position, 'M')
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
            insertCharAndSuggest(editor, position, 'n');
            
        } else if (myvar == 4) {
            insertCharAndSuggest(editor, position, '7');
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
        insertCharAndSuggest(editor ,position, 'N')
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
            insertCharAndSuggest(editor, position, 'o');
        } else if (myvar == 4) {
            insertCharAndSuggest(editor, position, '5');
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
        insertCharAndSuggest(editor ,position, 'O')
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
            insertCharAndSuggest(editor, position, 'p');
        } else if (myvar == 4) {
            insertCharAndSuggest(editor, position, '4');
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
        insertCharAndSuggest(editor ,position, 'P')
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
            insertCharAndSuggest(editor, position, 'q');
        }else if (myvar == 1){
            vscode.commands.executeCommand('editor.fold');
        }else if (myvar == 2){
            vscode.commands.executeCommand('editor.foldAll');
            myvar = 1
        } else if (myvar == 3) {
            insertChar(editor, position, '#');

            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
        insertCharAndSuggest(editor ,position, 'Q')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});


const rCommand = vscode.commands.registerCommand("myExtension.rCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertCharAndSuggest(editor, position, 'r');
        } else if (myvar == 3) {
            insertChar(editor, position, '()');
            vscode.commands.executeCommand('cursorLeft');
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
        insertCharAndSuggest(editor ,position, 'R')
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
            insertCharAndSuggest(editor, position, 's');
        }else if (myvar == 1){
            vscode.commands.executeCommand('workbench.action.files.save');
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
        insertCharAndSuggest(editor ,position, 'S')
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
        
      } else if (myvar === 0 || myvar ===  4 || myvar ===  5) {
        await vscode.commands.executeCommand('acceptSelectedSuggestion');
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
            insertCharAndSuggest(editor, position, 't');
        } else if (myvar == 1|| myvar == 2){
           myvar = 0        
           await vscode.commands.executeCommand(
           'myExtension.showInput'
           );
        } else if (myvar == 3) {
            insertChar(editor, position, '-');

            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
        insertCharAndSuggest(editor ,position, 'T')
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
            insertCharAndSuggest(editor, position, 'u');
        } else if (myvar == 4) {
            insertCharAndSuggest(editor, position, '6');
        } else if (myvar == 3) {
            insertChar(editor, position, ';');

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
            vscode.commands.executeCommand('cursorLineStart');
            
        }else if (myvar == 5){   
            insertCharAndSuggest(editor ,position, 'U')
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
            insertCharAndSuggest(editor, position, 'v');
        } else if (myvar == 1){
           myvar = 0        
           await vscode.commands.executeCommand(
           'myExtension.currentInput'
           );
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
           
        } else if (myvar == 3) {
            insertChar(editor, position, '*');

            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
            insertCharAndSuggest(editor ,position, 'V')
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
            insertCharAndSuggest(editor, position, 'w');
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
            insertCharAndSuggest(editor ,position, 'W')
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
            insertCharAndSuggest(editor, position, 'x');
        } else if (myvar == 1) {
            vscode.commands.executeCommand('editor.action.deleteLines');
        }else if (myvar == 2){
            myvar = 1
            await vscode.commands.executeCommand(
                'myCustomExplorer.focus'
            )            
        } else if (myvar == 3) {
            insertChar(editor, position, '&');

            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
            insertCharAndSuggest(editor ,position, 'X')
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
            insertCharAndSuggest(editor, position, 'y');
        } else if (myvar == 3) {
            insertChar(editor, position, '%');

            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
            insertCharAndSuggest(editor ,position, 'Y')
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
        myStatus.text = `MODE = ${myvar}`;
});
//atajos contexto explorador
const bajarexplorer = vscode.commands.registerCommand("myExtension.bajarexplorer", async () => {
        await vscode.commands.executeCommand('list.focusDown');
});
const newfileexplorer = vscode.commands.registerCommand("myExtension.newfileexplorer", async () => {
        myvar = 0
        await vscode.commands.executeCommand('myExtension.newfileInput');
});
const subirexplorer = vscode.commands.registerCommand("myExtension.subirexplorer", async () => {
        await vscode.commands.executeCommand('list.focusUp');
});
const filtrarexplorer = vscode.commands.registerCommand("myExtension.filtrarexplorer", async () => {
        myvar = 0
        await vscode.commands.executeCommand('myExtension.inputFilter');
});

const deleteItem = vscode.commands.registerCommand(
    'myExtension.deleteItem',
    async () => {
        vscode.window.showInformationMessage(
            `sel : ${provider.currentSelectedPath}`
        );
            myvar = 0        
           await vscode.commands.executeCommand(
           'myExtension.inputLinea'
           );
    }
);

const zCommand = vscode.commands.registerCommand("myExtension.zCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertCharAndSuggest(editor, position, 'z');
                  }else if (myvar == 1){
        vscode.commands.executeCommand('editor.unfold');
              }else if (myvar == 2){
        vscode.commands.executeCommand('editor.unfoldAll')
           myvar = 1
        } else if (myvar == 3) {
            insertChar(editor, position, '<');

            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
            insertCharAndSuggest(editor ,position, 'Z')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});

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

        input.placeholder = "Escribe algo...";

        input.onDidHide(async () => {

            await vscode.commands.executeCommand(
                'setContext',
                'miInputFocus',
                false
            );

            input.dispose();
            miInput = undefined;
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
const currentInput = vscode.commands.registerCommand(
    'myExtension.currentInput',
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

        input.placeholder = "Escribe algo...";

        input.onDidHide(async () => {

            await vscode.commands.executeCommand(
                'setContext',
                'miInputFocus',
                false
            );

    if(editor){
        clearLabels(editor);
    }
            input.dispose();
            miInput = undefined;
        });


            renderLabels(
            editor,
            flash_char,
            );
input.onDidChangeValue((text) => {
    if (text.endsWith(" ")) {
    if (!text.trim()) {
        clearLabels(editor);
        return;
    }
    const jump =text.trim();


    if (jump) {
        const match =
            matches.find(
                m => m.label === jump.toLowerCase()
            );

        if (match) {
           
            const pos =
                editor.document.positionAt(
                    match.pos
                );

            editor.selection =
                new vscode.Selection(
                    pos,
                    pos
                );

            editor.revealRange(
                new vscode.Range(
                    pos,
                    pos
                )
            );

            clearLabels(editor);

            input.hide();
            moverCursorDespuesDe(flash_char)
            myvar = 1
                    }
               }
    }
        });
        input.show();
    }
);
//editor.action.nextMatchFindAction
const showInput = vscode.commands.registerCommand(
    'myExtension.showInput',
    async () => {

        miInput = vscode.window.createInputBox();

        const input = miInput; // referencia fija

        await vscode.commands.executeCommand(
            'setContext',
            'miInputFocus',
            true
        );

        input.placeholder = "Escribe algo...";

        input.onDidHide(async () => {

            await vscode.commands.executeCommand(
                'setContext',
                'miInputFocus',
                false
            );
   const editor =
        vscode.window.activeTextEditor;

    if(editor){
        clearLabels(editor);
    }
            input.dispose();
            miInput = undefined;
        });
input.onDidChangeValue((text) => {

    const editor =
        vscode.window.activeTextEditor;

    if (!editor) return;

    // texto vacío → limpiar todo
    if (!text.trim()) {
        clearLabels(editor);
        return;
    }

    // separar solo en dos partes
    const [query, jump] =
        text.split(" ", 2);

    renderLabels(
        editor,
        query
    );

    if (jump) {

        const match =
            matches.find(
                m => m.label === jump.toLowerCase()
            );

        if (match) {
           
            const pos =
                editor.document.positionAt(
                    match.pos
                );

            editor.selection =
                new vscode.Selection(
                    pos,
                    pos
                );

            editor.revealRange(
                new vscode.Range(
                    pos,
                    pos
                )
            );

            clearLabels(editor);

            input.hide();
            moverCursorDespuesDe(query)
            flash_char = query
            myvar = 1
        }
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
            if (miInput) {
                my_numero = 1;
                myvar = 4
            }
        }
    );

    context.subscriptions.push(
        showInput,
        dKey,
        tabKey
    );
}