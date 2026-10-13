import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

function files(dir) { return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(path.join(dir,entry.name)):entry.name.endsWith('.ts')?[path.resolve(dir,entry.name)]:[]); }
const sources=files('src');
const options={target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler};
const service=ts.createLanguageService({
  getScriptFileNames:()=>sources,getScriptVersion:()=> '0',
  getScriptSnapshot:file=>fs.existsSync(file)?ts.ScriptSnapshot.fromString(fs.readFileSync(file,'utf8')):undefined,
  getCurrentDirectory:()=>process.cwd(),getCompilationSettings:()=>options,
  getDefaultLibFileName:opts=>ts.getDefaultLibFilePath(opts),fileExists:ts.sys.fileExists,readFile:ts.sys.readFile,readDirectory:ts.sys.readDirectory,
});
for(const file of sources){
  let source=fs.readFileSync(file,'utf8');
  const edits=service.organizeImports({type:'file',fileName:file},{},{}).flatMap(change=>change.textChanges).sort((a,b)=>b.span.start-a.span.start);
  for(const edit of edits)source=source.slice(0,edit.span.start)+edit.newText+source.slice(edit.span.start+edit.span.length);
  const tree=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);
  fs.writeFileSync(file,ts.createPrinter({newLine:ts.NewLineKind.LineFeed}).printFile(tree));
}
service.dispose();
