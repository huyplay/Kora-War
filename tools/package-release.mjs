import {mkdirSync,cpSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
const target='.release/kora-war';
if(!existsSync('dist/index.html'))throw new Error('Run npm run build first.');
mkdirSync(target,{recursive:true});
// Explicit allowlist: no .data, credentials, uploads, cache or node_modules.
for(const name of ['dist','server','src','package.json','package-lock.json','tsconfig.json','tsconfig.server.json','README.md','docs','backend','assets','public'])
  if(existsSync(name))cpSync(name,join(target,name),{recursive:true,filter:path=>!/[\\/](node_modules|bin|obj|\.data|\.env[^\\/]*)([\\/]|$)/.test(path)});
writeFileSync(join(target,'RELEASE.json'),JSON.stringify({commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),node:'24',entrypoint:'node --import tsx server/index.ts',install:'npm ci --include=dev',database:'Create or mount .data; never overwrite existing database'},null,2));
writeFileSync(join(target,'START.md'),'# Kora War runtime package\n\nNode 24: `npm ci --include=dev`, then `node --import tsx server/index.ts`. Production frontend is already built. Runtime configuration/SQLite/uploads live in `.data/`; back them up and retain them across releases. Local bind is loopback. Full public API/PvP hosting needs an HTTPS server/runtime; GitHub Pages deploys the static AI demo. See docs/TEAM-WORKFLOW.md.\n');
console.log('Release package prepared:',target);
