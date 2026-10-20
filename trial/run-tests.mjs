import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
process.chdir(fileURLToPath(new URL('..',import.meta.url)));
const url='http://127.0.0.1:5187';
const vite=fileURLToPath(new URL('../app/node_modules/vite/bin/vite.js',import.meta.url));
const server=spawn(process.execPath,[vite,'--host','127.0.0.1','--port','5187','--strictPort'],{cwd:'app',stdio:['ignore','pipe','pipe']});
let log='';server.stdout.on('data',b=>{log+=b;});server.stderr.on('data',b=>{log+=b;});
const run=file=>new Promise((resolve,reject)=>{
 const child=spawn(process.execPath,['trial/'+file],{stdio:'inherit',env:{...process.env,TRIAL_URL:url}});
 child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(file+' exited '+code)));
});
try {
 let ready=false;
 for(let i=0;i<60;i++) {
  if(server.exitCode!==null)throw new Error(log);
  try {if((await fetch(url)).ok){ready=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,200));
 }
 if(!ready)throw new Error('Trial preview did not start: '+log);
 const selected=process.argv.slice(2);
 for(const file of selected.length?selected:['icon-tests.mjs','browser-tests.mjs','grid-edit-tests.mjs','visual-tests.mjs','panel-tests.mjs','navigation-sound-tests.mjs'])await run(file);
} finally {server.kill('SIGTERM');}
