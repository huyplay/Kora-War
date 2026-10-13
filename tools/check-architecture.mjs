import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(path.join(dir,entry.name)):entry.name.endsWith('.ts')?[path.join(dir,entry.name)]:[]);}
const errors=[];
for(const file of [...files('src/core'),...files('src/data')]){
  const source=fs.readFileSync(file,'utf8');
  const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);
  const visit=node=>{
    if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier&&ts.isStringLiteral(node.moduleSpecifier)){
      const specifier=node.moduleSpecifier.text;
      const target=path.resolve(path.dirname(file),specifier);
      const roots=file.startsWith(path.join('src','data'))?['src/data']:['src/core','src/data'];
      if(!specifier.startsWith('.')||!roots.some(root=>target.startsWith(path.resolve(root)+path.sep)))errors.push(`${file}: dependency không được phép: ${specifier}`);
    }
    if(ts.isIdentifier(node)&&['window','document','localStorage','requestAnimationFrame','performance'].includes(node.text))errors.push(`${file}: browser API trong mô phỏng: ${node.text}`);
    if(ts.isPropertyAccessExpression(node)&&['Math.random','Date.now'].includes(node.getText(ast)))errors.push(`${file}: clock/RNG không xác định: ${node.getText(ast)}`);
    ts.forEachChild(node,visit);
  };
  visit(ast);
}
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
if(pkg.dependencies.playcanvas)errors.push('Không thêm PlayCanvas khi stack hiện tại là Three.js.');
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log('Kiến trúc hợp lệ: core/data độc lập với UI, Three.js và clock trình duyệt.');
