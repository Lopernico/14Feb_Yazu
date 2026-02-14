/* Visual Novel — simple engine
   - Interfaz para usuario final (tema San Valentín)
   - El guion se carga desde /dialogs/script.json (backend) o usa el ejemplo local
   - Soporta nodos lineales y nodos con "choices"
   - Campos de nodo: id, speaker, text, sprite (nombre de archivo en /assets sin extensión), next
   - Choice: { text: "texto", next: "nodeId" }
*/

const el = {
  speaker: document.getElementById('speaker'),
  text: document.getElementById('text'),
  sprite: document.getElementById('sprite'),
  choices: document.getElementById('choices'),
  backBtn: document.getElementById('backBtn'),
  nextBtn: document.getElementById('nextBtn'),
  sfxAudio: document.getElementById('sfxAudio'),
  musicAudio: document.getElementById('musicAudio'),
  endSfxAudio: document.getElementById('endSfxAudio'),
  musicVol: document.getElementById('musicVol'),
  sfxVol: document.getElementById('sfxVol'),
  audioControls: document.getElementById('audioControls'),
  endScreen: document.getElementById('endScreen'),
  restartBtn: document.getElementById('restartBtn'),
  lastDecisionBtn: document.getElementById('lastDecisionBtn')
};

let script = null;
let nodeMap = {};
let currentId = null;
let historyStack = [];
let typing = false;
let typingTimer = null;
let gameStarted = false;
let mouthInterval = null;
let mouthOpen = false;
let currentSpriteName = '';
let openSpriteSrc = '';
let closedSpriteSrc = '';
let musicVolume = 0.6;
let sfxVolume = 0.9;
let typingCompleteCallback = null;
let endPending = false;

// provide sensible defaults (backend may override via window.SCRIPT.audio)
if(el.musicAudio && !el.musicAudio.src){ el.musicAudio.src = 'assets/Ken Ashcorp - Absolute Territory.mp3'; el.musicAudio.loop = true; el.musicAudio.volume = musicVolume; }
if(el.sfxAudio && !el.sfxAudio.src){ el.sfxAudio.src = 'assets/talking.mp3'; el.sfxAudio.volume = sfxVolume; }

// --- Yazumimoon Valentine Visual Novel Script ---

const sampleScript = {
  start: "inicio",
  nodes: [

    {
      id: "inicio",
      speaker: "Sistema",
      text: "Es 14 de febrero.\n\nEncuentras un sobre rosa encima de tu mesa.",
      choices: [
        { text: "Abrir el sobre", next: "abrir_sobre" },
        { text: "Tirarlo a la basura", next: "fin_basura" }
      ]
    },

    {
      id: "fin_basura",
      speaker: "Sistema",
      text: "Yazu decidió que no valía la pena leer cartas de algún tonto seguidor suyo.\n\nLa tiró a la basura y siguió su vida como si nada hubiera pasado.",
      next: null
    },

    {
      id: "abrir_sobre",
      speaker: "Sistema",
      text: "Tomas el sobre en tus manos y lees lo que tiene escrito.",
      next: "leer_sobre"
    },
{
      id: "leer_sobre",
      speaker: "Sistema",
      text: "\"Confesiones de un seguidor anónimo\"",
      next: "abrir_sobre_2"
    },

    {
      id: "abrir_sobre_2",
      speaker: "Sistema",
      text: "Dentro hay una carta dirigida a:\n\nJamileth Montserrat\n (AKA Yazumimoon).",
      choices: [
        { text: "Esa soy yo", next: "intro_carta_1" },
        { text: "No es para mí", next: "fin_espionaje" }
      ]
    },

    {
      id: "fin_espionaje",
      speaker: "Sistema",
      text: "Te das cuenta de que no es correcto espiar el correo de otros.\n\nEsto constituye una ofensa criminal penada con 6 meses a 2 años de prisión y una multa de 100 a 300 días.\n\nDecides dejar la carta en su lugar y seguir con tu vida.",
      next: null
    },


      {
      id: "intro_carta_1",
      speaker: "Carta",
      text: "Te decides por leerla. ignorando las consecuencias que esto pueda traer. Asi empieza: \"Hola Yazu\"",
      next: "leer_intro_1"
    },

    {
      id: "leer_intro_1",
      speaker: "Carta",
      text: "esta carta es para ti.\n\nNo sé si alguna vez la leas,\n espero que si...",
      next: "leer_intro_2"
    },
     {
      id: "leer_intro_2",
      speaker: "Carta",
      text: "*Ese es el final de la introducción, empiezas a leer el cuerpo de la carta*",
      next: "leer_carta_1"
    },
    {
      id: "leer_carta_1",
      speaker: "Carta",
      text: "Es normal sentirte perdido, sentir que no encuentras tu lugar.\n\nNo todos tenemos la suerte de haber encontrado a alguien que nos entienda.\nNo todos podemos compartir lo que nos emociona sin temor a ser juzgados.",
      next: "leer_carta_1b"
    },

    {
      id: "leer_carta_1b",
      speaker: "Carta",
      text: "Y ese miedo a ser juzgado,\na hacer el ridículo por mostrar quién eres en realidad,\ngenera inseguridad, paranoia, ansiedad.\n\nTe hace sentir que, tarde o temprano,\nte vas a convertir en el hazmerreír de tus congéneres.",
      choices: [
        { text: "Seguir leyendo", next: "leer_carta_2" },
        { text: "Dejar de leer", next: "fin_canasta" }
      ]
    },

    {
      id: "fin_canasta",
      speaker: "Sistema",
      text: "“¿Qué tremenda estupidez es esta?”, te dices.\n\nHaces una bola la carta y la lanzas al bote de basura,\nencestando una canasta que, en el básquetbol profesional,\nte daría 2 puntos en el último segundo del partido,\nhaciendo ganar a tu equipo,\nllevándote a las semifinales estatales\ny asegurándote una beca para un…",
      next: null
    },

    {
      id: "leer_carta_2",
      speaker: "Carta",
      text: "Después de un tiempo viviendo así,\nes normal volverse tosco.\nAsocial.",
      next: "leer_carta_2b"
    },

    {
      id: "leer_carta_2b",
      speaker: "Carta",
      text: "Tratar cada interacción nueva con distintos grados de escepticismo,\ncomo si todo el mundo viniera con intenciones ocultas\n(o al menos con ganas de juzgarte un poco).",
      next: "leer_carta_2c"
    },

    {
      id: "leer_carta_2c",
      speaker: "Carta",
      text: "Porque una vez que has sido lastimado sin razón aparente,\ndesarrollas un miedo irracional\nque termina volviéndote duro, cerrado,\nmedio decerebrado incluso\n—no por elección, sino por supervivencia.",
      choices: [
        {
          text: "Comprendo perfectamente la prosa de esta obra de ficción y su subtexto",
          next: "leer_carta_3"
        },
        {
          text: "Unga bunga, letras difíciles, yo idiota",
          next: "fin_lianas"
        }
      ]
    },

    {
      id: "fin_lianas",
      speaker: "Sistema",
      text: "Después de comerte la carta y lanzar tu excremento al aire,\nte fuiste balanceandote entre las lianas de la selva.\n\nNunca se te volvió a ver.",
      next: null
    },

    {
      id: "leer_carta_3",
      speaker: "Carta",
      text: "Y entonces, un día,\n",
      next: "leer_carta_33"
    },
     {
      id: "leer_carta_33",
      speaker: "Carta",
      text: "un \"rayo\" cae sobre ti.\n",
      next: "leer_carta_3b"
    },

    {
      id: "leer_carta_3b",
      speaker: "Carta",
      text: "Te electrocuta.\nTe lanza fuera de tu zona de confort con violencia.\nTe obliga a cuestionar muchas cosas que dabas por sentadas.",
      next: "leer_carta_3c"
    },

    {
      id: "leer_carta_3c",
      speaker: "Carta",
      text: "¿No soy el único raro?\n¿Es posible que exista alguien con quien pueda compartir mi rareza\nsin miedo a ser juzgado?\n\n¿Será que aquí puedo ser realmente libre?\n¿Ser feliz?\n¿Ser yo?",
      next: "leer_carta_3d"
    },

    {
      id: "leer_carta_3d",
      speaker: "Carta",
      text: "…¿El \"rayo\" acaba de ladrarme?",
      choices: [
        {
          text: "Debo admitir que esa vez me mamé",
          next: "leer_carta_4"
        },
        {
          text: "¿De qué hablas, loquito? Yo nunca hice eso",
          next: "fin_clinica"
        }
      ]
    },

    {
      id: "fin_clinica",
      speaker: "Sistema",
      text: "Tu YO, tu ELLO y tu SUPERYÓ se separan.\n\nTu conciencia se fragmenta hasta que ya no distingues la realidad.\n\nTu anexión a una clínica mental se lleva a cabo sin problemas.\n\nMientras tu familia se despide por última vez, murmuras:\n“Yo soy Yazumimoon y nunca he dicho eso…”",
      next: null
    },

    {
      id: "leer_carta_4",
      speaker: "Carta",
      text: "Es en ese momento que no solo empiezas a perder tus inseguridades\ny el miedo constante a no ser aceptado,\nsino que también ganas la certeza\nde que no solo puedes ser aceptado con todas tus rarezas…",
      next: "leer_carta_4b"
    },

    {
      id: "leer_carta_4b",
      speaker: "Carta",
      text: "Sino que quizá —y esto es importante—\nni siquiera eres tan raro como pensabas.",
      next: "leer_carta_4c"
    },

    {
      id: "leer_carta_4c",
      speaker: "Carta",
      text: "\"O sea,\nesta chica está ladrándole a su micrófono\ny contando historias sobre gases con olor a Danonino\ny nadie parece querer irse.\"",
      next: "leer_carta_4d"
    },

    {
      id: "leer_carta_4d",
      speaker: "Carta",
      text: "Eso pone muchas cosas en perspectiva.\n\nTe da esperanza.\nEsperanza de ser aceptado,\nsin importar qué tan raro seas.",
      choices: [
        {
          text: "jajaja si soy, ahi les va otro rudigo banda, inhalen hondo para que les entre completo",
          next: "leer_carta_5"
        },
        {
          text: "Ya me cansé de que saquen mis trapos sucios a relucir. Me voy de aquí.",
          next: "fin_chica_pedorra"
        }
      ]
    },

    { id: "fin_chica_pedorra",
         speaker: "Sistema", 
         text: "Con un corazón lleno de odio, tomas la carta y la quemas, con la esperanza de que, al hacerlo tus pecados desaparezcan… pero... no es así.",
          next: "fin_chica_pedorra_2" }, 
          { id: "fin_chica_pedorra_2", 
            speaker: "Sistema", 
            text: "Tus ofensas trascienden la palabra escrita; tu conciencia pesa cada vez más sobre tus hombros, hasta llevarte a la locura y la paranoia.",
             next: "fin_chica_pedorra_3" }, 
             { id: "fin_chica_pedorra_3",
                 speaker: "Sistema", 
                 text: "Poco tiempo después, tras muchos intentos de limpiar tu imagen, descubres que todo esfuerzo por mejorar tu reputación es fútil.",
                  next: "fin_chica_pedorra_4" },
                   { id: "fin_chica_pedorra_4",
                     speaker: "Sistema",
                      text: "Aceptas tu realidad después de negarla por años: “la chica pedorra”. Así te llaman en la calle, pero a ti no te importa.", 
                      next: "fin_chica_pedorra_5" },
                       { id: "fin_chica_pedorra_5",
                         speaker: "Sistema",
                          text: "Sonríes y sigues adelante…", 
                          next:null },

    {
      id: "leer_carta_5",
      speaker: "Carta",
      text: "Mejor no entro en detalles.\nCreo que ya todos entendimos el punto.",
      next: "leer_carta_5b"
    },
{
  id: "leer_carta_5b",
  speaker: "Carta",
  text: "Yazu es… interesante.\nRara.\nMuy rara, en más de un sentido.",
  next: "leer_carta_5c"
},

{
  id: "leer_carta_5c",
  speaker: "Carta",
  text: "Actúa raro, pero no solo actúa raro:\nYazu, como concepto, como idea,\nes rara de encontrar.",
  next: "leer_carta_5d"
},

{
  id: "leer_carta_5d",
  speaker: "Carta",
  text: "Créanme, lo intenté.\nHe visto cosas…\nCosas que no volvería a ver por voluntad propia. (hablo de otros streamers, no pienses mal cochina)",
  next: "leer_carta_5e"
},

{
  id: "leer_carta_5e",
  speaker: "Carta",
  text: "Y mientras más lo piensas,\nmás afortunado te sientes de haberla encontrado,\nde haber entrado justo a ese stream de Twitch,\nen esa hora, ese día, ese momento exacto.",
  next: "leer_carta_5f"
},

{
  id: "leer_carta_5f",
  speaker: "Carta",
  text: "Todos los astros se alinearon\npara que te toparas con esta chica rara\nque va contra cualquier preconcepción\nde lo que una adulta de 23 años se atrevería a hacer\nfrente a un montón de desconocidos.",
  next: "leer_carta_5g"
},


    {
      id: "leer_carta_5g",
      speaker: "Carta",
      text: "Eso sonó mal.\n\nDéjame ponerlo en términos más simples.",
      choices: [
        { text: "Lo dejaré pasar", next: "leer_carta_6" },
        { text: "Ay, cochinote, De que hablas? Estas loquito", next: "fin_pure" }
      ]
    },

 { id: "fin_pure", 
    speaker: "Sistema",
     text: "El momento en que estas palabras abandonan tu boca, algo dentro de ti se retuerce.",
      next: "fin_pure_3" },
       { id: "fin_pure_3",
         speaker: "Sistema",
         text: "El dolor invade cada nervio. Al principio, confundida, caes al suelo hiperventilándote.",
          next: "fin_pure_4" },
           { id: "fin_pure_4",
             speaker: "Sistema",
              text: "Pero lentamente comprendes qué está pasando: este dolor inmenso es el dolor de ser aplastada.",
               next: "fin_pure_5" }, 
               { id: "fin_pure_5", 
                speaker: "Sistema", 
                text: "El peso de tu hipocresía fue demasiado para ti; terminó aplastándote.",
                next: "fin_pure_6" },
                { id: "fin_pure_6", 
                    speaker: "Sistema",
                     text: "Ahora un puré de Yazu yace en el suelo.", 
                     next: "fin_pure_7" }, 
                     { id: "fin_pure_7", 
                        speaker: "Sistema",
                         text: "*Fuiste comprimida por la fuerza de tu cinismo, después de juzgar la misma cosa de la que eres partícipe… ser obscena.*", 
                         next: null 

    

    },{
      id: "leer_carta_6",
      speaker: "Carta",
      text: "Yazumimoon.\n\nGracias por ser rara.\nPor no tener miedo de lo que otros piensan de ti al ser tú misma.",
      next: "leer_carta_6b"
    },

    {
      id: "leer_carta_6b",
      speaker: "Carta",
      text: "Porque no,\nno eres solo una loca con un parlante\ngritando aberraciones\n.",
      next: "leer_carta_6c"
    },

    {
      id: "leer_carta_6c",
      speaker: "Carta",
      text: "También eres amable.\nDivertida.\nY, a veces,\nincluso llego a creer\nque eres más inteligente de lo que dejas ver\n(aunque pase muy, muy rara vez).",
      next: "leer_carta_6d"
    },

    {
      id: "leer_carta_6d",
      speaker: "Carta",
      text: "Eres considerada, atenta,\ny muchas cosas más.\n\nCada seguidor tendrá su propia lista de adjetivos,\npero todos coinciden en algo:",
      choices: [
        { text: "¿En qué coinciden?", next: "final_verdadero_1" },
        {
          text: "todos coinciden en que soy inteligente, hermosa, graciosa, multifacetica, polifacetica, Brillante, Inigualable, perfecta...",
          next: "fin_egolatra"
        }
      ]
    },

    {
  id: "fin_egolatra",
  speaker: "Sistema",
  text: "Mientras seguías tu torrente de cumplidos hacia ti misma, lentamente tu postura cambiaba sin que te dieras cuenta.",
  next: "fin_egolatra_2"
},
{
  id: "fin_egolatra_2",
  speaker: "Sistema",
  text: "Tu espalda se encorvaba, tu cuello se torcía, pero tú seguías con tu dictamen narcisista.",
  next: "fin_egolatra_3"
},
{
  id: "fin_egolatra_3",
  speaker: "Sistema",
  text: "Finalmente llegaste a la cúspide evolutiva de los ególatras como tú.",
  next: "fin_egolatra_4"
},
{
  id: "fin_egolatra_4",
  speaker: "Sistema",
  text: "Habías logrado convertirte en un círculo perfecto.",
  next: "fin_egolatra_5"
},
{
  id: "fin_egolatra_5",
  speaker: "Sistema",
  text: "Has logrado la autofelación perpetua...",
  next: null
},

{
  id: "final_verdadero_1",
  speaker: "Carta",
  text: "Todos aprecian a Jamileth",
  next: "final_verdadero_2"
},
{
  id: "final_verdadero_2",
  speaker: "Carta",
  text: "Exactamente por la persona que es,",
  next: "final_verdadero_3"
},
{
  id: "final_verdadero_3",
  speaker: "Carta",
  text: "Con sus cosas buenas",
  next: "final_verdadero_4"
},
{
  id: "final_verdadero_4",
  speaker: "Carta",
  text: "Y sus cosas malas.",
  next: "final_verdadero_5"
},
{
  id: "final_verdadero_5",
  speaker: "Carta",
  text: "Pero, sin importar qué...",
  next: "final_verdadero_6"
},
{
  id: "final_verdadero_6",
  speaker: "Carta",
  text: "Te aprecian por ser TÚ.",
  next: "final_verdadero_7"
},
{
  id: "final_verdadero_7",
  speaker: "Carta",
  text: "YAZUMIMOON",
  next: "final_verdadero_8"
},
{
  id: "final_verdadero_8",
  speaker: "Carta",
  text: "Feliz 14 de febrero.",
  next: "final_verdadero"
},
{
  id: "final_verdadero",
  speaker: "Carta",
  text: "GRACIAS POR SER TÚ MISMA.",
  next: null
}

   

  ]
};



// --- Helpers ---
function buildMap(nodes){
  nodeMap = {};
  (nodes || []).forEach(n => { if(n.id) nodeMap[n.id] = n; });
}

// Initialize background hearts with multiple diagonal scrolling rows
function initializeBackgroundHearts(){
  const heartEmojis = ['💗', '💜']; // pink and purple only
  const tracks = document.querySelectorAll('.hearts-track');
  
  tracks.forEach(track => {
    // create multiple rows of hearts for full screen coverage
    const numRows = Math.ceil(window.innerHeight / 60) + 3; // 60px per row
    let html = '';
    
    for(let row = 0; row < numRows; row++){
      // each row gets a wrapper for individual animation
      html += `<div class="heart-row" style="animation-delay: ${row * 0.6}s;">`;
      
      // create enough hearts per row to fill screen width + extra for seamless loop
      const heartsPerRow = Math.ceil(window.innerWidth / 50) + 4; // 50px per heart
      for(let i = 0; i < heartsPerRow * 2; i++){ // 2x for seamless loop
        html += `<span>${heartEmojis[i % 2]}</span>`;
      }
      
      html += `</div>`;
    }
    
    track.innerHTML = html;
  });
}

function setSprite(name){
  if(!name){ el.sprite.style.opacity = '0'; el.sprite.src = ''; return; }
  // prefer PNG assets first, then SVG fallback
  el.sprite.style.opacity = '0';
  el.sprite.onload = () => { el.sprite.style.opacity = '1'; el.sprite.onerror = null; };
  el.sprite.onerror = () => {
    try{
      const src = el.sprite.src || '';
      if(src.endsWith('.png')){ el.sprite.onerror = null; el.sprite.src = `assets/${name}.svg`; }
      else { el.sprite.style.opacity = '0'; el.sprite.onerror = null; }
    }catch(e){ el.sprite.style.opacity = '0'; el.sprite.onerror = null; }
  };
  if(name.includes('.')){ el.sprite.src = `assets/${name}`; }
  else { el.sprite.src = `assets/${name}.png`; }
} 

// Devuelve variantes de sprite (open/closed). Si el nombre incluye extensión, construye variante 'abierto' automáticamente
function getSpriteVariants(name){
  if(!name) return [ '', '' ];
  // si ya incluye path/extension
  const hasExt = name.includes('.');
  if(hasExt){
    const parts = name.split('.');
    const ext = parts.pop();
    const base = parts.join('.');
    const open = `assets/${base}.${ext}`;
    const closed = `assets/${base}abierto.${ext}`;
    return [open, closed];
  }
  // sin extension: prefer png (workspace assets are PNG), fallback to svg if needed
  return [`assets/${name}.png`, `assets/${name}abierto.png`];
} 

function clearTyping(){
  if(typingTimer) clearTimeout(typingTimer);
  typing = false;
}

function typeText(targetEl, text, speed = 18, onComplete){
  clearTyping();
  // ensure any previous mouth interval / sfx is stopped
  if(mouthInterval) clearInterval(mouthInterval);
  mouthOpen = false;
  targetEl.innerHTML = '';
  typing = true;
  typingCompleteCallback = typeof onComplete === 'function' ? onComplete : null;
  let i = 0;

  // start continuous talking SFX (loop) for the duration of typing
  if(el.sfxAudio && el.sfxAudio.src){
    try{ el.sfxAudio.loop = true; el.sfxAudio.currentTime = 0; el.sfxAudio.volume = sfxVolume; el.sfxAudio.play().catch(()=>{}); }catch(e){}
  }

  // mouth toggle interval
  mouthInterval = setInterval(()=>{
    mouthOpen = !mouthOpen;
    if(mouthOpen && openSpriteSrc) el.sprite.src = openSpriteSrc;
    else if(!mouthOpen && closedSpriteSrc) el.sprite.src = closedSpriteSrc;
  }, 140);

  (function step(){
    if(i >= text.length){
      typing = false;
      // stop mouth and talking SFX
      clearInterval(mouthInterval); mouthInterval = null;
      if(closedSpriteSrc) el.sprite.src = closedSpriteSrc;
      try{ if(el.sfxAudio){ el.sfxAudio.loop = false; el.sfxAudio.pause(); el.sfxAudio.currentTime = 0; } }catch(e){}
      if(typingCompleteCallback){ try{ typingCompleteCallback(); }catch(e){} typingCompleteCallback = null; }
      return;
    }
    targetEl.innerHTML += text[i++];
    typingTimer = setTimeout(step, speed);
  })();
}

function finishTyping(){
  if(!typing) return;
  clearTyping();
  el.text.innerHTML = (nodeMap[currentId] && nodeMap[currentId].text) || '';
  // stop mouth animation and set closed mouth
  if(mouthInterval) { clearInterval(mouthInterval); mouthInterval = null; }
  mouthOpen = false;
  if(closedSpriteSrc) el.sprite.src = closedSpriteSrc;
  // stop talking SFX if active
  try{ if(el.sfxAudio){ el.sfxAudio.loop = false; el.sfxAudio.pause(); el.sfxAudio.currentTime = 0; } }catch(e){}
  if(typingCompleteCallback){ try{ typingCompleteCallback(); }catch(e){} typingCompleteCallback = null; }
}

function renderNode(id){
  const node = nodeMap[id];
  if(!node){ return endScene(); }
  currentId = id;
  el.speaker.textContent = node.speaker || '';
  // prepare sprite mouth variants and start with closed mouth
  // determine sprite for this node — default to previous or 'Louie' to avoid blank src
  currentSpriteName = (node.sprite && String(node.sprite).length > 0) ? node.sprite : (currentSpriteName || 'Louie');
  const variants = getSpriteVariants(currentSpriteName);
  openSpriteSrc = variants[0];
  closedSpriteSrc = variants[1] || variants[0];
  try{ if(closedSpriteSrc || openSpriteSrc){ el.sprite.src = closedSpriteSrc || openSpriteSrc; el.sprite.style.opacity = '1'; } }catch(e){}
  if(node.text){
    // terminal nodes: special handling for the `final_verdadero` celebration
    if(node.next === null && !(Array.isArray(node.choices) && node.choices.length)){
      if(node.id === 'final_verdadero'){
        // wait for the player's click before showing the big banner (allow reading)
        typeText(el.text, node.text, 18, () => { endPending = true; if(el.nextBtn) el.nextBtn.disabled = false; });
      } else {
        typeText(el.text, node.text, 18, () => { endPending = true; if(el.nextBtn) el.nextBtn.disabled = false; });
      }
    } else {
      typeText(el.text, node.text);
    }
  }
  else el.text.textContent = '';

  // choices
  el.choices.innerHTML = '';
  if(Array.isArray(node.choices) && node.choices.length){
    el.nextBtn.disabled = true;
    node.choices.forEach((c, idx) => {
      const btn = document.createElement('button');
      btn.textContent = c.text || `Opción ${idx+1}`;
      // stop propagation so the parent .click handler (which does skip/next) doesn't interfere
      btn.addEventListener('click', (e)=>{ e.stopPropagation(); historyStack.push(id); goTo(c.next); });
      el.choices.appendChild(btn);
    });
  } else {
    // no choices — show next if next exists
    el.nextBtn.disabled = (node.next === null || (node.next === undefined && !hasNextNode(id)));
  }

  el.backBtn.disabled = historyStack.length === 0;
}

function hasNextNode(id){
  // find index in original array
  if(!script || !Array.isArray(script.nodes)) return false;
  const nodes = script.nodes;
  const idx = nodes.findIndex(n=>n.id===id);
  return idx >= 0 && idx < nodes.length-1;
}

function goTo(nextId){
  if(!nextId){ return endScene(); }
  if(!nodeMap[nextId]){ alert('El id destino no existe: '+nextId); return; }
  renderNode(nextId);
}

function next(){
  // if we're at a terminal node that finished typing, show the appropriate screen only after a click
  if(endPending){ endPending = false; if(currentId === 'final_verdadero'){ showFinalBanner(); } else { showEndScreen(); } return; }
  if(!gameStarted) return;
  if(typing){ finishTyping(); return; }
  const node = nodeMap[currentId];
  if(!node) return endScene();
  if(Array.isArray(node.choices) && node.choices.length) return; // espera elección
  if(node.next){ historyStack.push(currentId); goTo(node.next); return; }
  // try sequential fallback
  if(hasNextNode(currentId)){
    const nodes = script.nodes;
    const idx = nodes.findIndex(n=>n.id===currentId);
    if(idx>=0){ historyStack.push(currentId); goTo(nodes[idx+1].id); return; }
  }
  endScene();
}

function back(){
  if(!gameStarted) return;
  if(typing){ finishTyping(); return; }
  if(historyStack.length===0) return;
  const prev = historyStack.pop();
  renderNode(prev);
} 

function endScene(){
  // marque END pendiente para que el jugador de click para confirmar; mantén el texto visible
  endPending = true;
  if(el.nextBtn) el.nextBtn.disabled = false;
  // no borres el texto ni ocultes el sprite: el jugador debe poder leer antes de confirmar
  return;
}

function fadeOutMusic(duration = 800){
  if(!el.musicAudio) return;
  const audio = el.musicAudio;
  if(audio.paused) return;
  const startVol = (typeof audio.volume === 'number') ? audio.volume : musicVolume;
  const steps = 20;
  const stepTime = Math.max(16, Math.floor(duration/steps));
  let step = 0;
  const iv = setInterval(()=>{
    step++;
    const v = Math.max(0, startVol * (1 - step/steps));
    try{ audio.volume = v; }catch(e){}
    if(step >= steps){
      clearInterval(iv);
      try{ audio.pause(); }catch(e){}
      try{ audio.volume = musicVolume; }catch(e){}
    }
  }, stepTime);
}

function fadeInMusic(duration = 800){
  if(!el.musicAudio) return;
  const audio = el.musicAudio;
  try{ audio.volume = 0; audio.play().catch(()=>{}); }catch(e){}
  const target = musicVolume;
  const steps = 20;
  const stepTime = Math.max(16, Math.floor(duration/steps));
  let step = 0;
  const iv = setInterval(()=>{
    step++;
    const v = Math.min(target, target * (step/steps));
    try{ audio.volume = v; }catch(e){}
    if(step >= steps){ clearInterval(iv); try{ audio.volume = target; }catch(e){} }
  }, stepTime);
}

function showEndScreen(){
  endPending = false;
  fadeOutMusic(900);
  const end = el.endScreen || document.getElementById('endScreen');
  const vn = document.querySelector('.vn');
  if(vn) vn.classList.add('dimmed');
  if(end){
    end.classList.remove('hidden');
    // attach buttons
    if(el.restartBtn){ el.restartBtn.onclick = restartGame; }
    if(el.lastDecisionBtn){ el.lastDecisionBtn.onclick = backToLastDecision; }
  }
  // play special end SFX if provided
  try{
    if(el.endSfxAudio && el.endSfxAudio.src){ el.endSfxAudio.volume = sfxVolume; el.endSfxAudio.currentTime = 0; el.endSfxAudio.play().catch(()=>{}); }
  }catch(e){}
}

// --- Final banner (celebration) ---

// spawn confetti pieces and hearts for the banner; auto-remove after animation
function spawnFinalBurst(parentEl, confettiCount = 20, heartCount = 6){
  const parent = parentEl || document.getElementById('finalBanner') || document.body;
  const colors = ['#FF6B6B','#FF9AD6','#FFB86B','#FFD56B','#B08CFF','#7DD3FC','#FF8AA1'];
  const pieces = [];
  const now = Date.now();

  for(let i=0;i<confettiCount;i++){
    const d = 800 + Math.floor(Math.random()*900); // ms
    const tx = (Math.random() * (Math.random() > 0.5 ? 1 : -1)) * (80 + Math.random()*220);
    const ty = - (120 + Math.random()*260); // move mostly upward
    const rot = Math.floor(Math.random()*720) + 'deg';
    const w = 6 + Math.floor(Math.random()*10);
    const h = 10 + Math.floor(Math.random()*14);
    const elp = document.createElement('div');
    elp.className = 'confetti-piece';
    elp.style.width = w + 'px';
    elp.style.height = h + 'px';
    elp.style.background = colors[Math.floor(Math.random()*colors.length)];
    elp.style.left = '50%';
    elp.style.top = '35%';
    elp.style.setProperty('--tx', tx + 'px');
    elp.style.setProperty('--ty', ty + 'px');
    elp.style.setProperty('--rot', rot);
    elp.style.setProperty('--d', d + 'ms');
    // slightly stagger start
    elp.style.animationDelay = (Math.floor(Math.random()*220)) + 'ms';
    parent.appendChild(elp);
    pieces.push({el: elp, t: d + 600});
  }

  for(let j=0;j<heartCount;j++){
    const d = 900 + Math.floor(Math.random()*900);
    const tx = (Math.random() * (Math.random() > 0.5 ? 1 : -1)) * (40 + Math.random()*120);
    const ty = - (160 + Math.random()*160);
    const rot = (Math.random()>0.5?1:-1) * (10 + Math.floor(Math.random()*60)) + 'deg';
    const he = document.createElement('div');
    he.className = 'burst-heart';
    he.textContent = ['💜','💖','💗','💘'][Math.floor(Math.random()*4)];
    he.style.left = (50 + (Math.random()*12-6)) + '%';
    he.style.top = (32 + (Math.random()*10-5)) + '%';
    he.style.setProperty('--tx', tx + 'px');
    he.style.setProperty('--ty', ty + 'px');
    he.style.setProperty('--rot', rot);
    he.style.setProperty('--d', d + 'ms');
    he.style.animationDelay = (Math.floor(Math.random()*180)) + 'ms';
    parent.appendChild(he);
    pieces.push({el: he, t: d + 700});
  }

  // cleanup
  pieces.forEach(p => setTimeout(()=>{ try{ p.el.remove(); }catch(e){} }, p.t));
}

function showFinalBanner(){
  // play a short flourish if available
  try{ if(el.endSfxAudio && el.endSfxAudio.src){ el.endSfxAudio.currentTime = 0; el.endSfxAudio.volume = sfxVolume; el.endSfxAudio.play().catch(()=>{}); } }catch(e){}
  const fb = document.getElementById('finalBanner');
  if(!fb) return;

  // split title into <span> per-letter for staggered animation (only once)
  const nameEl = fb.querySelector('.final-name');
  if(nameEl && !nameEl.dataset.split){
    const txt = (nameEl.textContent || '').trim();
    nameEl.textContent = '';
    Array.from(txt).forEach((ch, i)=>{
      const sp = document.createElement('span');
      sp.textContent = ch;
      sp.style.animationDelay = (i * 60) + 'ms';
      nameEl.appendChild(sp);
    });
    nameEl.dataset.split = '1';
  }

  // split final-thanks into words so CSS pop animation can stagger them
  const thanksEl = fb.querySelector('.final-thanks');
  if(thanksEl && !thanksEl.dataset.split){
    const words = (thanksEl.textContent || '').trim().split(/\s+/);
    thanksEl.textContent = '';
    words.forEach((w, i)=>{
      const spw = document.createElement('span');
      spw.className = 'thanks-word';
      // always add space after word to maintain spacing between words
      spw.textContent = w + '_'  ;
      spw.style.animationDelay = (i * 120) + 'ms';
      thanksEl.appendChild(spw);
    });
    thanksEl.dataset.split = '1';
  }

  fb.classList.remove('hidden');
  const vn = document.querySelector('.vn'); if(vn) vn.classList.add('dimmed');
  const btn = document.getElementById('finalContinue');
  if(btn){ btn.onclick = ()=>{ hideFinalBanner(); }; }

  // spawn two quick bursts for a richer effect
  try{ spawnFinalBurst(fb, 22, 7); setTimeout(()=>spawnFinalBurst(fb, 14, 5), 220); }catch(e){}
}
function hideFinalBanner(){
  const fb = document.getElementById('finalBanner');
  if(fb) fb.classList.add('hidden');
  const vn = document.querySelector('.vn'); if(vn) vn.classList.remove('dimmed');
  // after the celebratory banner, show the regular end screen so player can restart/back
  showEndScreen();
}

function restartGame(){
  // Return to title screen so user can restart from the splash
  const end = el.endScreen || document.getElementById('endScreen');
  if(end) end.classList.add('hidden');
  const vn = document.querySelector('.vn');
  if(vn) vn.classList.remove('dimmed');
  // reset state
  historyStack = [];
  typing = false;
  if(mouthInterval){ clearInterval(mouthInterval); mouthInterval = null; }
  gameStarted = false;
  // restore music volume/state (do not autoplay)
  try{ if(el.musicAudio){ el.musicAudio.volume = musicVolume; el.musicAudio.currentTime = 0; } }catch(e){}
  // show title, hide dialogue
  const title = document.getElementById('titleScreen');
  if(title) title.classList.remove('hidden');
  const dialogue = document.getElementById('dialogue');
  if(dialogue) dialogue.classList.add('hidden');
  // reset sprite to default if available
  try{ setSprite('Louie'); }catch(e){}
}

function backToLastDecision(){
  // find last history entry that had choices
  for(let i = historyStack.length - 1; i >= 0; i--){
    const nid = historyStack[i];
    const node = nodeMap[nid];
    if(node && Array.isArray(node.choices) && node.choices.length){
      // pop until that point
      historyStack = historyStack.slice(0, i);
      const end = el.endScreen || document.getElementById('endScreen');
      if(end) end.classList.add('hidden');
      const vn = document.querySelector('.vn');
      if(vn) vn.classList.remove('dimmed');
      renderNode(nid);
      return;
    }
  }
  // if none found, restart
  restartGame();
}

// --- Load / parse ---
function loadScript(obj){
  if(!obj || !Array.isArray(obj.nodes)) { alert('Guion inválido — se requiere un array "nodes"'); return; }
  script = obj;
  buildMap(script.nodes);
  const startId = script.start || (script.nodes[0] && script.nodes[0].id);
  historyStack = [];
  renderNode(startId);
}

function prepareScript(obj){
  // guarda y construye el mapa pero NO inicia la reproducción; la iniciará startGame()
  if(!obj || !Array.isArray(obj.nodes)) { console.warn('Guion inválido en prepareScript'); return; }
  script = obj; buildMap(script.nodes);
  // si el backend provee URLs de audio en window.SCRIPT.audio, úsalas (music/sfx/endSfx)
  try{
    if(obj.audio){
      if(obj.audio.music && el.musicAudio) el.musicAudio.src = obj.audio.music;
      if(obj.audio.sfx && el.sfxAudio) el.sfxAudio.src = obj.audio.sfx;
      if(obj.audio.endSfx && el.endSfxAudio) el.endSfxAudio.src = obj.audio.endSfx;
    }
  }catch(e){/* noop */}
}

// --- Audio / UI wiring ---
function wireAudioControls(){
  // only wire volume controls (audio files come from backend)
  if(el.musicVol){ el.musicVol.addEventListener('input', (e)=>{ musicVolume = Number(e.target.value); if(el.musicAudio) el.musicAudio.volume = musicVolume; }); el.musicVol.value = musicVolume; }
  if(el.sfxVol){ el.sfxVol.addEventListener('input', (e)=>{ sfxVolume = Number(e.target.value); if(el.sfxAudio) el.sfxAudio.volume = sfxVolume; if(el.endSfxAudio) el.endSfxAudio.volume = sfxVolume; }); el.sfxVol.value = sfxVolume; }
  // set defaults
  if(el.musicAudio){ el.musicAudio.volume = musicVolume; }
  if(el.sfxAudio){ el.sfxAudio.volume = sfxVolume; }
  if(el.endSfxAudio){ el.endSfxAudio.volume = sfxVolume; }
}

// --- Server script loader (no autoplay) ---
async function fetchScriptFromServer(){
  // prioriza window.SCRIPT si fue inyectado por el backend
  if(window.SCRIPT && typeof window.SCRIPT === 'object'){ prepareScript(window.SCRIPT); return; }
  try{
    const res = await fetch('/dialogs/script.json', {cache:'no-store'});
    if(res.ok){ prepareScript(await res.json()); return; }
  } catch(e){}
  try{
    const res2 = await fetch('/dialogs/sample.json', {cache:'no-store'});
    if(res2.ok){ prepareScript(await res2.json()); return; }
  } catch(e){}
  prepareScript(sampleScript);
}

function startGame(){
  if(gameStarted) return;
  gameStarted = true;
  const title = document.getElementById('titleScreen');
  if(title) title.classList.add('hidden');
  document.getElementById('dialogue').classList.remove('hidden');
  // wire audio controls when game starts (elements exist)
  wireAudioControls();
  // start background music with fade-in (user gesture has occurred)
  try{ fadeInMusic(900); }catch(e){}
  // si el script no está preparado (rare), arranca el ejemplo; si está preparado, comienza en start
  if(!script){ loadScript(sampleScript); return; }
  const startId = script.start || (script.nodes && script.nodes[0] && script.nodes[0].id);
  renderNode(startId);
} 

// --- Events ---
el.nextBtn.onclick = next;
el.backBtn.onclick = back;
// tap/click para avanzar (útil en móviles/pantalla completa) — si no ha empezado, inicia el juego
const sceneEl = document.getElementById('scene');
const dialogueEl = document.getElementById('dialogue');
const titleEl = document.getElementById('titleScreen');
if(sceneEl) sceneEl.addEventListener('click', (e) => {
  if(!gameStarted){ startGame(); return; }
  // ignore clicks on controls inside scene
  if(e.target && e.target.closest && e.target.closest('button, a, input')) return;
  if(typing) finishTyping(); else next();
});
if(dialogueEl) dialogueEl.addEventListener('click', (e) => {
  if(!gameStarted){ startGame(); return; }
  // ignore clicks that originate on interactive controls so choice buttons can handle navigation
  if(e.target && e.target.closest && e.target.closest('button, a, input')) return;
  if(typing) finishTyping(); else next();
});
if(titleEl) titleEl.addEventListener('click', startGame);

// Keyboard: si no ha empezado, Enter/Space/→ inician la pantalla de novela
window.addEventListener('keydown', (e) => {
  if(!gameStarted){
    if(['Enter',' '].includes(e.key) || e.key === 'ArrowRight'){
      e.preventDefault(); startGame();
    }
    return;
  }

  // if a button is focused, let the button receive Enter/Space (do not override)
  const active = document.activeElement;
  if((e.key === 'Enter' || e.key === ' ') && active && active.tagName === 'BUTTON') return;

  if(['Enter',' '].includes(e.key) || e.key === 'ArrowRight'){
    e.preventDefault(); next();
  } else if(e.key === 'ArrowLeft'){
    e.preventDefault(); back();
  }
});

// init
window.addEventListener('load', () => {
  // initialize background hearts animation
  initializeBackgroundHearts();
  // carga preferente desde backend (/dialogs/script.json). Si no existe, usa el ejemplo.
  fetchScriptFromServer();
});
