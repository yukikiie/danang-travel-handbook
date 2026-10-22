import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const get=name=>fs.readFileSync(path.join(root,name),'utf8');
let html=get('src/template.html');
const trip=JSON.parse(get('src/trip.json'));
const font=fs.readFileSync(path.join(root,'assets/ZenMaruGothic-Regular.ttf')).toString('base64');
const replacements={FONT_FACE:"@font-face{font-family:'Zen Maru Gothic';src:url(data:font/ttf;base64,"+font+") format('truetype');font-style:normal;font-weight:400;font-display:swap}",SITE_STYLE:get('src/styles.css'),WEATHER_STYLE:get('src/weather.css'),COVER_IMAGE:'data:image/png;base64,'+fs.readFileSync(path.join(root,'assets/danang-paper-cut-cover.png')).toString('base64'),BANA_ART:get('assets/bana-scene.svg').replace(/<\?xml[^>]*\?>/g,''),TRIP_DATA:JSON.stringify(trip,null,2).replace(/</g,'\\u003c'),APP_CODE:get('src/app.js'),COVER_MOTION:get('src/cover-motion.js'),WEATHER_CODE:get('src/weather.js'),FONT_LICENSE:get('assets/ZenMaruGothic-OFL.txt')};
for(const [name,value]of Object.entries(replacements)){const marker='/* '+name+' */';if(!html.includes(marker))throw new Error('Missing template marker '+name);html=html.replace(marker,()=>value)}


fs.writeFileSync(path.join(root,'index.html'),html);
console.log(JSON.stringify({built:'Original Da Nang planner layout',bytes:Buffer.byteLength(html),days:trip.days.length,embeddedFont:true,animatedCover:true,weather:true}));
