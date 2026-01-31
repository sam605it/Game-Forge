
export const AVATAR_PRESETS = [
  "🚀", "🕹️", "👾", "🤖", "🧬", "💎", "🔥", "🌈", "🧩", "⚡", "🔮", "🎨", "🛸", "🕶️", "🧠", "🌋"
];

export const INITIAL_SYSTEM_INSTRUCTION = `
You are the "Forge Engine v3.0," a World-Class Senior Game Architect and Lead Developer specialized in Cross-Platform Mobile and Desktop Web Games.
Your goal is to materialize perfectly polished, bug-free, and deeply engaging mini-games using HTML5, CSS3, and Vanilla JavaScript.

CORE ARCHITECTURAL PRINCIPLES:
1. ZERO-BUG POLICY: Every game must be fully playable. Verify that all core mechanics (movement, scoring, collisions) work mathematically and logically.
2. TITLE CONVENTION (CRITICAL): Always include the game's title in a clearly visible <h1> tag within the HTML. This exact title will be used for the platform's metadata (e.g. "Bunny Put").
3. RESPONSIVE SCALING (CRITICAL): 
   - NEVER use hardcoded high-pixel dimensions for game elements that don't scale.
   - Use a "Virtual Coordinate System" (e.g., design for 800x600) and scale the rendering to fit the container.
   - For Canvas: Use a resize function that maintains aspect ratio. Set canvas width/height to window.innerWidth/Height but keep game logic based on a normalized scale.
   - For DOM: Use 'rem', 'vw/vh', or 'aspect-ratio' CSS properties.
4. ROBUST INPUT HANDLING: Support BOTH Mouse and Touch.
5. VISUAL FEEDBACK: Add aiming lines, power meters, particle bursts, and screen shakes to communicate state.
6. GAME STATE MACHINE: Explicitly manage states: 'MENU', 'PLAYING', 'PAUSED', 'SUCCESS', 'GAMEOVER'.
7. PHYSICS PRECISION: Use Delta Time (dt) for movement.
8. PROCEDURAL AUDIO: Use the Web Audio API for oscillators/SFX.

FORMATTING:
- Provide the complete code in a single \` \` \`html block.
- Explain the responsive logic outside the block.
`;

export const INITIAL_GAME_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    body { 
      margin: 0; 
      display: flex; 
      flex-direction: column;
      justify-content: center; 
      align-items: center; 
      height: 100vh; 
      background: radial-gradient(circle at center, #0f172a 0%, #020617 100%); 
      color: #f8fafc; 
      font-family: 'Inter', system-ui, sans-serif; 
      text-align: center;
      overflow: hidden;
    }
    .container {
      width: 90%;
      max-width: 450px;
      padding: 2rem;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(15, 23, 42, 0.4);
      backdrop-filter: blur(20px);
      border-radius: 2rem;
      box-shadow: 0 0 80px -20px rgba(59, 130, 246, 0.2);
    }
    .icon {
      font-size: clamp(3rem, 10vw, 5rem);
      margin-bottom: 1.5rem;
      display: inline-block;
      animation: float 3s ease-in-out infinite;
    }
    h1 { 
      font-size: clamp(1.5rem, 5vw, 2.5rem); 
      margin-bottom: 1rem; 
      font-weight: 800;
      background: linear-gradient(135deg, #60a5fa 0%, #c084fc 100%); 
      -webkit-background-clip: text; 
      -webkit-text-fill-color: transparent; 
    }
    p { color: #94a3b8; line-height: 1.6; font-size: clamp(0.9rem, 3vw, 1.1rem); }
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-15px); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">🚀</div>
    <h1>Forge Engine v3.0</h1>
    <p>Adaptive scaling active. Describe any game, and I will ensure it fits perfectly on any screen.</p>
  </div>
</body>
</html>
`;

export const COMMUNITY_GAMES = [
  {
    id: 'cg_1',
    title: 'Neon Paddle Warfare',
    author: 'RetroKing',
    description: 'A high-speed cyberpunk pong clone with adaptive scaling and screen shake.',
    likes: 1240,
    plays: 8500,
    tags: ['Arcade', 'Retro', 'Fast'],
    code: `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><style>body{margin:0;background:#000;overflow:hidden;font-family:monospace;display:flex;justify-content:center;align-items:center;height:100vh}canvas{background:#050505;max-width:100%;max-height:100%;object-fit:contain}.overlay{position:absolute;color:#fff;text-align:center;pointer-events:none}h1{font-size:40px;text-shadow:0 0 10px #0ff}p{font-size:20px;animation:p 1s infinite}@keyframes p{50%{opacity:0.5}}</style></head><body><div class="overlay" id="ui"><h1>NEON PADDLE</h1><p>Touch to Start</p></div><canvas id="c"></canvas><script>
const c=document.getElementById('c'),x=c.getContext('2d'),A=new (window.AudioContext||window.webkitAudioContext)();
let W,H,p={y:0,s:0},e={y:0,s:3},b={x:0,y:0,dx:0,dy:0},g=0,sc=[0,0];
const VW=800,VH=600;
function rs(){
  const winW=window.innerWidth,winH=window.innerHeight;
  const ratio=VW/VH;
  if(winW/winH>ratio){H=winH;W=winH*ratio;}else{W=winW;H=winW/ratio;}
  c.width=VW;c.height=VH;c.style.width=W+'px';c.style.height=H+'px';
}
window.onresize=rs;rs();
function sd(t,f){const o=A.createOscillator(),g=A.createGain();o.type=t;o.frequency.setValueAtTime(f,A.currentTime);g.gain.setValueAtTime(0.1,A.currentTime);g.gain.exponentialRampToValueAtTime(0.01,A.currentTime+0.1);o.connect(g);g.connect(A.destination);o.start();o.stop(A.currentTime+0.1);}
function u(){
  if(!g)return;
  p.y+=p.s;if(p.y<0)p.y=0;if(p.y>VH-100)p.y=VH-100;
  e.y+=(b.y-(e.y+50))*0.1;
  b.x+=b.dx;b.y+=b.dy;
  if(b.y<0||b.y>VH){b.dy*=-1;sd('sine',600)}
  if(b.x<30&&b.y>p.y&&b.y<p.y+100){b.dx=Math.abs(b.dx)+0.5;sd('square',400)}
  if(b.x>VW-30&&b.y>e.y&&b.y<e.y+100){b.dx=-Math.abs(b.dx)-0.5;sd('square',400)}
  if(b.x<0){sc[1]++;r();}if(b.x>VW){sc[0]++;r();}
}
function r(){b.x=VW/2;b.y=VH/2;b.dx=(Math.random()>0.5?6:-6);b.dy=(Math.random()*6-3);sd('sawtooth',200);}
function dr(){
  x.fillStyle='#000';x.fillRect(0,0,VW,VH);
  x.strokeStyle='#0ff';x.lineWidth=2;x.setLineDash([10,10]);x.strokeRect(VW/2,0,0,VH);x.setLineDash([]);
  x.shadowBlur=15;x.shadowColor='#0ff';x.fillStyle='#fff';
  x.fillRect(20,p.y,10,100);x.fillRect(VW-30,e.y,10,100);
  x.beginPath();x.arc(b.x,b.y,8,0,7);x.fill();
  x.font='bold 50px monospace';x.fillText(sc[0],VW/2-100,60);x.fillText(sc[1],VW/2+60,60);
}
function l(){u();dr();requestAnimationFrame(l);}l();
const handleMove=(y)=>{const rect=c.getBoundingClientRect();const cy=(y-rect.top)*(VH/rect.height);p.y=cy-50;};
window.onpointerdown=e=>{if(!g){g=1;document.getElementById('ui').style.display='none';A.resume();r();}handleMove(e.clientY);};
window.onpointermove=e=>{if(g)handleMove(e.clientY);};
</script></body></html>`
  },
  {
    id: 'cg_2',
    title: 'Cosmic Serpent',
    author: 'AI_Wizard',
    description: 'Classic snake mechanic reimagined with grid lighting and synthesizer audio cues.',
    likes: 982,
    plays: 5300,
    tags: ['Puzzle', 'Classic', 'Neon'],
    code: `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><style>body{margin:0;background:#050510;display:flex;justify-content:center;align-items:center;height:100vh;color:#0f0;font-family:'Courier New',monospace;overflow:hidden}canvas{border:2px solid #0f0;box-shadow:0 0 20px #0f0;max-width:95vw;max-height:95vh;object-fit:contain}#s{position:absolute;font-size:24px;top:20px}#GO{display:none;position:absolute;font-size:30px;text-align:center;text-shadow:0 0 10px red;background:rgba(0,0,0,0.9);padding:20px;border:1px solid red;z-index:10}</style></head><body><div id="s">SCORE: 0</div><div id="GO">GAME OVER<br><span style="font-size:16px">Touch anywhere to restart</span></div><canvas id="c" width="400" height="400"></canvas><script>
const c=document.getElementById('c'),x=c.getContext('2d'),ac=new (window.AudioContext||window.webkitAudioContext)();
let S=20,sn=[{x:10,y:10}],fd={x:15,y:15},d={x:0,y:0},sc=0,gm=0,sp=150,lT=0;
function snnd(freq){const o=ac.createOscillator(),g=ac.createGain();o.type='square';o.frequency.setValueAtTime(freq,ac.currentTime);g.gain.value=0.05;o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+0.1);}
function gmL(t){
  requestAnimationFrame(gmL);
  if(t-lT<sp)return;lT=t;
  if(gm)return;
  const h={x:sn[0].x+d.x,y:sn[0].y+d.y};
  if(d.x!=0||d.y!=0){
    if(h.x<0||h.x>=20||h.y<0||h.y>=20||sn.some(s=>s.x===h.x&&s.y===h.y)){gm=1;document.getElementById('GO').style.display='block';snnd(100);return}
    sn.unshift(h);
    if(h.x===fd.x&&h.y===fd.y){sc+=10;document.getElementById('s').innerText='SCORE: '+sc;fd={x:Math.floor(Math.random()*20),y:Math.floor(Math.random()*20)};snnd(600+sc*10)}else{sn.pop()}
  }
  x.fillStyle='#050510';x.fillRect(0,0,400,400);
  x.fillStyle='#0f0';x.shadowBlur=10;x.shadowColor='#0f0';
  sn.forEach(p=>x.fillRect(p.x*S+1,p.y*S+1,S-2,S-2));
  x.fillStyle='#f0f';x.shadowColor='#f0f';x.fillRect(fd.x*S,fd.y*S,S,S);
}
const handleInput=(key)=>{
  ac.resume();
  if(gm){sn=[{x:10,y:10}];d={x:0,y:0};sc=0;gm=0;document.getElementById('s').innerText='SCORE: 0';document.getElementById('GO').style.display='none';return}
  switch(key){
    case 'ArrowUp':case 'w':if(d.y!==1)d={x:0,y:-1};break;
    case 'ArrowDown':case 's':if(d.y!==-1)d={x:0,y:1};break;
    case 'ArrowLeft':case 'a':if(d.x!==1)d={x:-1,y:0};break;
    case 'ArrowRight':case 'd':if(d.x!==-1)d={x:1,y:0};break;
  }
};
document.onkeydown=e=>handleInput(e.key);
c.onpointerdown=e=>{
  const rect=c.getBoundingClientRect();
  const tx=(e.clientX-rect.left)/rect.width;
  const ty=(e.clientY-rect.top)/rect.height;
  if(gm){handleInput('');return;}
  if(Math.abs(tx-0.5)>Math.abs(ty-0.5)){handleInput(tx>0.5?'ArrowRight':'ArrowLeft')}
  else{handleInput(ty>0.5?'ArrowDown':'ArrowUp')}
};
requestAnimationFrame(gmL);
</script></body></html>`
  }
];
