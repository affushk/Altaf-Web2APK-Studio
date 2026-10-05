/* Bunny Teacher Phase 2 — Multi-child + Smart Learning */
(function(){
  "use strict";

  var FAMILY_KEY="bunny-family-profiles-v2";
  var ACTIVE_KEY="bunny-family-active-v2";
  var LEGACY_KEY="bunny-child-profile-v1";
  var SESSION_KEY="bunny-family-chosen-session-v2";
  var STATS_KEY="bunny-p2-stats-v1";
  var MISSION_KEY="bunny-p2-mission-v1";
  var CONTINUE_KEY="bunny-p2-continue-v1";
  var GAME_KEY="bunny-p2-game-v1";
  var SCOPED_KEYS=[
    "bunny-teacher-progress",
    "bunny-premium-stickers-v1",
    "bunny-premium-streak-v1",
    "bunny-premium-learning-taps-v1",
    STATS_KEY,MISSION_KEY,CONTINUE_KEY,GAME_KEY
  ];

  function readJson(key,fallback){
    try{var v=JSON.parse(localStorage.getItem(key)||"null");return v==null?fallback:v}catch(e){return fallback}
  }
  function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch(e){}}
  function raw(key){try{return localStorage.getItem(key)}catch(e){return null}}
  function setRaw(key,value){try{if(value==null)localStorage.removeItem(key);else localStorage.setItem(key,value)}catch(e){}}
  function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
  function cleanName(v){return String(v||"").trim().replace(/\s+/g," ").slice(0,28)}
  function today(){var d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
  function uid(){return "kid-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8)}
  function avatarFor(g){return g==="girl"?"👧":g==="boy"?"👦":"🧒"}
  function modeForAge(age){
    age=Number(age)||6;
    if(age<=5)return{name:"Little Learner",icon:"🌱",desc:"Pictures + easy play",band:"Ages 2–5"};
    if(age<=8)return{name:"Curious Explorer",icon:"🚀",desc:"Learn + practice",band:"Ages 6–8"};
    return{name:"Super Challenger",icon:"🧠",desc:"More choices + challenges",band:"Ages 9+"};
  }

  function loadFamily(){
    var f=readJson(FAMILY_KEY,{version:2,profiles:[]});
    if(!f||!Array.isArray(f.profiles))f={version:2,profiles:[]};
    f.version=2;
    return f;
  }
  function saveFamily(f){writeJson(FAMILY_KEY,f)}
  function legacy(){return readJson(LEGACY_KEY,null)}
  function activeId(){return raw(ACTIVE_KEY)||""}
  function captureScoped(){
    var d={};
    SCOPED_KEYS.forEach(function(k){var v=raw(k);if(v!=null)d[k]=v});
    return d;
  }
  function restoreScoped(data){
    data=data||{};
    SCOPED_KEYS.forEach(function(k){setRaw(k,Object.prototype.hasOwnProperty.call(data,k)?data[k]:null)});
  }
  function findProfile(f,id){
    for(var i=0;i<f.profiles.length;i++)if(f.profiles[i].id===id)return f.profiles[i];
    return null;
  }
  function activeProfile(){
    var f=loadFamily();
    var p=findProfile(f,activeId());
    if(p)return p;
    return f.profiles[0]||legacy();
  }
  function syncNative(p){
    try{
      if(p&&window.AndroidTTS&&typeof window.AndroidTTS.setProfile==="function")window.AndroidTTS.setProfile(String(p.name||""),String(p.gender||"other"));
    }catch(e){}
  }
  function syncLegacy(p){
    if(!p)return;
    writeJson(LEGACY_KEY,{name:p.name,age:Number(p.age),gender:p.gender||"other",updatedAt:p.updatedAt||Date.now()});
    syncNative(p);
  }
  function saveCurrentIntoActive(){
    var f=loadFamily(), id=activeId(), p=findProfile(f,id);
    if(!p)return;
    var l=legacy();
    if(l&&l.name){
      p.name=cleanName(l.name)||p.name;
      p.age=Number(l.age)||p.age;
      p.gender=l.gender||p.gender;
    }
    p.data=captureScoped();
    p.updatedAt=Date.now();
    saveFamily(f);
  }
  function bootstrapFamily(){
    var f=loadFamily(), l=legacy(), migrated=false;
    if(!f.profiles.length&&l&&l.name){
      var p={id:uid(),name:cleanName(l.name),age:Number(l.age)||6,gender:l.gender||"other",createdAt:Date.now(),updatedAt:Date.now(),data:captureScoped()};
      f.profiles.push(p);
      localStorage.setItem(ACTIVE_KEY,p.id);
      saveFamily(f);
      sessionStorage.setItem(SESSION_KEY,"1");
      migrated=true;
    }
    if(f.profiles.length){
      var id=activeId();
      if(!findProfile(f,id)){
        id=f.profiles[0].id;
        localStorage.setItem(ACTIVE_KEY,id);
      }
      var a=findProfile(f,id);
      if(a&&l&&l.name){
        if(cleanName(l.name)!==a.name||Number(l.age)!==Number(a.age)||(l.gender||"other")!==(a.gender||"other")){
          a.name=cleanName(l.name)||a.name;
          a.age=Number(l.age)||a.age;
          a.gender=l.gender||a.gender;
          a.updatedAt=Date.now();
          saveFamily(f);
        }
      }
      syncLegacy(a);
    }
    return{family:f,migrated:migrated};
  }

  function switchProfile(id){
    saveCurrentIntoActive();
    var f=loadFamily(), p=findProfile(f,id);
    if(!p)return;
    restoreScoped(p.data||{});
    localStorage.setItem(ACTIVE_KEY,id);
    syncLegacy(p);
    sessionStorage.setItem(SESSION_KEY,"1");
    location.reload();
  }

  function showChildEditor(editId){
    var old=document.getElementById("bunny-family-editor");if(old)old.remove();
    var f=loadFamily(), current=editId?findProfile(f,editId):null;
    var wrap=document.createElement("div");wrap.id="bunny-family-editor";wrap.setAttribute("data-bunny-profile-ui","1");
    wrap.innerHTML=
      '<div class="bunny-p2-sheet">'+
        '<div style="font-size:48px;text-align:center">🐰✨</div>'+
        '<h2 class="bunny-p2-title">'+(current?"Edit Child":"Add a Child")+'</h2>'+
        '<p class="bunny-p2-sub">Har child ka apna naam, stars aur progress rahega</p>'+
        '<label class="bunny-p2-label">Child Name</label>'+
        '<input class="bunny-p2-input" id="p2-child-name" maxlength="28" placeholder="e.g. Aafiya, Arhan, Rehan">'+
        '<label class="bunny-p2-label">Age</label>'+
        '<input class="bunny-p2-input" id="p2-child-age" type="number" min="2" max="18" inputmode="numeric" placeholder="e.g. 5">'+
        '<label class="bunny-p2-label">Boy / Girl</label>'+
        '<select class="bunny-p2-input" id="p2-child-gender"><option value="boy">👦 Boy</option><option value="girl">👧 Girl</option><option value="other">🧒 Neutral</option></select>'+
        '<div id="p2-child-error" style="min-height:18px;margin-top:7px;text-align:center;color:#dc2626;font-size:12px;font-weight:800"></div>'+
        '<button class="bunny-p2-primary" id="p2-child-save">'+(current?"Save Changes":"Add & Start Learning")+'</button>'+
        (current&&f.profiles.length>1?'<button class="bunny-p2-danger" id="p2-child-delete">Remove this profile</button>':'')+
        '<button class="bunny-p2-secondary" id="p2-child-cancel">Cancel</button>'+
      '</div>';
    document.body.appendChild(wrap);
    var name=document.getElementById("p2-child-name"),age=document.getElementById("p2-child-age"),gender=document.getElementById("p2-child-gender");
    if(current){name.value=current.name||"";age.value=current.age||"";gender.value=current.gender||"other"}
    document.getElementById("p2-child-save").onclick=function(){
      var n=cleanName(name.value),a=parseInt(age.value,10),g=gender.value||"other",err=document.getElementById("p2-child-error");
      if(!n){err.textContent="Please enter a name.";name.focus();return}
      if(!Number.isFinite(a)||a<2||a>18){err.textContent="Age 2 se 18 ke beech rakhein.";age.focus();return}
      var fam=loadFamily();
      if(current){
        var cp=findProfile(fam,current.id);if(!cp)return;
        cp.name=n;cp.age=a;cp.gender=g;cp.updatedAt=Date.now();saveFamily(fam);
        if(cp.id===activeId()){
          syncLegacy(cp);
          sessionStorage.setItem(SESSION_KEY,"1");
          location.reload();
          return;
        }
        wrap.remove();renderHome();augmentParent();
      }else{
        saveCurrentIntoActive();
        var np={id:uid(),name:n,age:a,gender:g,createdAt:Date.now(),updatedAt:Date.now(),data:{}};
        fam=loadFamily();fam.profiles.push(np);saveFamily(fam);
        wrap.remove();switchProfile(np.id);
      }
    };
    var del=document.getElementById("p2-child-delete");
    if(del)del.onclick=function(){
      if(!confirm("Remove "+current.name+" profile from this device?"))return;
      var fam=loadFamily();fam.profiles=fam.profiles.filter(function(x){return x.id!==current.id});
      if(current.id===activeId()){
        var next=fam.profiles[0];saveFamily(fam);
        if(next)switchProfile(next.id);
      }else{saveFamily(fam);wrap.remove()}
    };
    document.getElementById("p2-child-cancel").onclick=function(){wrap.remove()};
    setTimeout(function(){name.focus()},150);
  }

  function showChooser(force){
    var f=loadFamily();
    if(!f.profiles.length)return;
    if(!force&&sessionStorage.getItem(SESSION_KEY)==="1")return;
    var old=document.getElementById("bunny-family-chooser");if(old)old.remove();
    var splash=document.getElementById("bunny-splash-premium");if(splash)splash.remove();
    var wrap=document.createElement("div");wrap.id="bunny-family-chooser";wrap.setAttribute("data-bunny-profile-ui","1");
    var cards=f.profiles.map(function(p){
      return '<button class="bunny-family-card" data-kid="'+esc(p.id)+'"><div class="bunny-family-avatar">'+avatarFor(p.gender)+'</div><div class="bunny-family-name">'+esc(p.name)+'</div><div class="bunny-family-age">Age '+Number(p.age||6)+' • '+esc(modeForAge(p.age).name)+'</div></button>';
    }).join("");
    wrap.innerHTML='<div class="bunny-p2-sheet"><div style="font-size:50px;text-align:center">🐰🌈</div><h2 class="bunny-p2-title">Kaun seekhega?</h2><p class="bunny-p2-sub">Choose a learner — har bacche ka progress alag save hoga</p><div class="bunny-family-grid">'+cards+'<button class="bunny-family-card bunny-family-add" id="p2-family-add"><div class="bunny-family-avatar">➕</div><div class="bunny-family-name">Add Child</div><div class="bunny-family-age">New learning profile</div></button></div>'+(force?'<button class="bunny-p2-secondary" id="p2-family-close">Cancel</button>':'')+'</div>';
    document.body.appendChild(wrap);
    [].slice.call(wrap.querySelectorAll("[data-kid]")).forEach(function(b){b.onclick=function(){switchProfile(b.getAttribute("data-kid"))}});
    document.getElementById("p2-family-add").onclick=function(){wrap.remove();showChildEditor(null)};
    var close=document.getElementById("p2-family-close");if(close)close.onclick=function(){wrap.remove()};
  }

  function getStats(){
    var s=readJson(STATS_KEY,{smartPoints:0,smartGames:0,moduleOpens:0,learnedTaps:0,correctAnswers:0,gamesByType:{},lastActive:null});
    if(!s.gamesByType)s.gamesByType={};
    return s;
  }
  function saveStats(s){s.lastActive=Date.now();writeJson(STATS_KEY,s)}
  function appProgress(){return readJson("bunny-teacher-progress",{totalStars:0,gamesWon:0,lessonsLearned:0,modulesCompleted:[]})}
  function totalScore(){
    var p=appProgress(),s=getStats();
    return(Number(p.totalStars)||0)+(Number(s.smartPoints)||0);
  }
  function levelInfo(score){
    var levels=[
      {name:"Bronze Star",icon:"🥉",min:0,next:25},
      {name:"Silver Star",icon:"🥈",min:25,next:60},
      {name:"Gold Star",icon:"🥇",min:60,next:120},
      {name:"Rainbow Hero",icon:"🌈",min:120,next:220},
      {name:"Super Learner",icon:"🏆",min:220,next:400}
    ];
    var cur=levels[0];
    for(var i=0;i<levels.length;i++)if(score>=levels[i].min)cur=levels[i];
    var pct=cur.next?Math.max(0,Math.min(100,Math.round((score-cur.min)/(cur.next-cur.min)*100))):100;
    return{name:cur.name,icon:cur.icon,pct:pct,next:cur.next};
  }

  function missionTemplate(age){
    age=Number(age)||6;
    if(age<=5)return{learn:3,game:1,module:1};
    if(age<=8)return{learn:5,game:2,module:2};
    return{learn:7,game:3,module:3};
  }
  function getMission(){
    var p=activeProfile()||{age:6}, target=missionTemplate(p.age), m=readJson(MISSION_KEY,null);
    if(!m||m.date!==today())m={date:today(),learn:0,game:0,module:0,target:target,awarded:false};
    m.target=target;
    return m;
  }
  function saveMission(m){writeJson(MISSION_KEY,m)}
  function missionDone(m){return m.learn>=m.target.learn&&m.game>=m.target.game&&m.module>=m.target.module}
  function celebrate(message){
    var old=document.querySelector(".bunny-p2-toast");if(old)old.remove();
    var t=document.createElement("div");t.className="bunny-p2-toast";t.textContent=message||"🌟 Amazing!";document.body.appendChild(t);setTimeout(function(){t.remove()},1600);
    var chars=["⭐","✨","🎉","🌈","💜","💙"];
    for(var i=0;i<24;i++){
      var c=document.createElement("span");c.className="bunny-p2-confetti";c.textContent=chars[i%chars.length];c.style.left=((i*31+7)%100)+"vw";c.style.animationDelay=((i%8)*.03)+"s";document.body.appendChild(c);setTimeout(function(n){return function(){n.remove()}}(c),2700);
    }
    try{if(navigator.vibrate)navigator.vibrate([25,40,25])}catch(e){}
  }
  function bumpMission(type,amount){
    var m=getMission();amount=amount||1;
    if(type==="learn")m.learn=Math.min(m.target.learn,m.learn+amount);
    if(type==="game")m.game=Math.min(m.target.game,m.game+amount);
    if(type==="module")m.module=Math.min(m.target.module,m.module+amount);
    if(missionDone(m)&&!m.awarded){
      m.awarded=true;
      var s=getStats();s.smartPoints=(s.smartPoints||0)+10;saveStats(s);
      celebrate("🎁 Daily Mission Complete! +10 ⭐");
    }
    saveMission(m);renderHome();
  }

  var moduleMap=[
    {id:"alphabet",keys:["abc","अंग्रेज़ी"]},
    {id:"arabic",keys:["अरबी","arabic"]},
    {id:"numbers",keys:["गिनती","numbers"]},
    {id:"colors",keys:["रंग","colors"]},
    {id:"shapes",keys:["आकार","shapes"]},
    {id:"animals",keys:["जानवर","animals"]},
    {id:"matching",keys:["गेम","memory"]},
    {id:"manners",keys:["तहज़ीब","आदत","manners"]},
    {id:"duas",keys:["दुआ","duas"]},
    {id:"fruits",keys:["फल","fruits"]},
    {id:"drawing",keys:["ड्रॉ","drawing"]},
    {id:"poems",keys:["कविता","poem"]},
    {id:"quiz",keys:["क्विज़","quiz"]}
  ];
  function detectModule(text){
    text=String(text||"").toLowerCase();
    for(var i=0;i<moduleMap.length;i++)for(var j=0;j<moduleMap[i].keys.length;j++)if(text.indexOf(moduleMap[i].keys[j].toLowerCase())>=0)return moduleMap[i].id;
    return null;
  }
  function moduleLabel(id){
    var labels={alphabet:"ABC",arabic:"Arabic",numbers:"Ginti",colors:"Colors",shapes:"Shapes",animals:"Animals",matching:"Memory Game",manners:"Good Manners",duas:"Duas",fruits:"Fruits",drawing:"Drawing",poems:"Poems",quiz:"Quiz"};
    return labels[id]||id;
  }
  function buttonForModule(id){
    var spec=moduleMap.filter(function(x){return x.id===id})[0];if(!spec)return null;
    var buttons=[].slice.call(document.querySelectorAll("button"));
    for(var i=0;i<buttons.length;i++){
      var tx=(buttons[i].innerText||buttons[i].textContent||"").toLowerCase();
      for(var j=0;j<spec.keys.length;j++)if(tx.indexOf(spec.keys[j].toLowerCase())>=0)return buttons[i];
    }
    return null;
  }
  function openModule(id){
    var home=isHome();
    if(!home){
      var back=[].slice.call(document.querySelectorAll("button")).filter(function(b){return (b.innerText||"").indexOf("वापस")>=0})[0];
      if(back){back.click();setTimeout(function(){var b=buttonForModule(id);if(b)b.click()},500);return}
    }
    var b=buttonForModule(id);if(b)b.click();
  }
  function saveContinue(id,label){
    if(!id)return;
    writeJson(CONTINUE_KEY,{module:id,label:label||id,at:Date.now()});
    var s=getStats();s.lastModule=id;s.lastModuleLabel=label||id;s.moduleOpens=(s.moduleOpens||0)+1;saveStats(s);
    bumpMission("module",1);
  }

  function isHome(){
    return !!([].slice.call(document.querySelectorAll("h2")).filter(function(h){return(h.innerText||"").indexOf("क्या सीखना है")>=0})[0]);
  }
  function homeHost(){
    var h=[].slice.call(document.querySelectorAll("h2")).filter(function(x){return(x.innerText||"").indexOf("क्या सीखना है")>=0})[0];
    return h?(h.parentElement||null):null;
  }

  function renderHome(){
    var old=document.getElementById("bunny-p2-home");
    if(!isHome()){if(old)old.remove();return}
    var host=homeHost();if(!host)return;
    var p=activeProfile()||legacy();if(!p)return;
    var m=getMission(), score=totalScore(), level=levelInfo(score), mode=modeForAge(p.age), cont=readJson(CONTINUE_KEY,null);
    var node=old||document.createElement("div");node.id="bunny-p2-home";node.setAttribute("data-bunny-premium-ui","1");
    var missionHtml=[
      {k:"learn",i:"📚",n:"Learn",v:m.learn,t:m.target.learn},
      {k:"game",i:"🎮",n:"Smart Game",v:m.game,t:m.target.game},
      {k:"module",i:"🧭",n:"Explore",v:m.module,t:m.target.module}
    ].map(function(x){return'<div class="bunny-p2-mission '+(x.v>=x.t?"done":"")+'"><div class="bunny-p2-mission-icon">'+x.i+'</div><div class="bunny-p2-mission-name">'+x.n+'</div><div class="bunny-p2-mission-count">'+Math.min(x.v,x.t)+'/'+x.t+(x.v>=x.t?' ✅':'')+'</div></div>'}).join("");
    node.innerHTML=
      '<div class="bunny-p2-row"><div class="bunny-p2-level"><div class="bunny-p2-level-icon">'+level.icon+'</div><div><div class="bunny-p2-level-title">'+esc(level.name)+' • '+score+' ⭐</div><div class="bunny-p2-level-sub">Next reward level is getting closer!</div></div></div><div class="bunny-p2-mode">'+mode.icon+' '+esc(mode.name)+'</div></div>'+
      '<div class="bunny-p2-progress"><span style="width:'+level.pct+'%"></span></div>'+
      '<div style="font-size:11px;font-weight:900;color:#475569;margin-bottom:6px">🎯 Today\'s Mission</div>'+
      '<div class="bunny-p2-missions">'+missionHtml+'</div>'+
      '<div class="bunny-p2-actions"><button id="bunny-p2-continue" '+(!cont?"disabled style=\"opacity:.55\"":"")+'>'+(cont?'▶ Continue '+esc(cont.label||"Learning"):'▶ Start exploring')+'</button><button id="bunny-p2-games-launch">🎮 Smart Games</button></div>';
    var premium=document.getElementById("bunny-premium-welcome");
    if(!old){
      if(premium&&premium.parentNode===host)host.insertBefore(node,premium.nextSibling);
      else host.insertBefore(node,host.firstChild);
    }
    var cb=document.getElementById("bunny-p2-continue");if(cb)cb.onclick=function(){var c=readJson(CONTINUE_KEY,null);if(c&&c.module)openModule(c.module)};
    var gb=document.getElementById("bunny-p2-games-launch");if(gb)gb.onclick=showGamesHub;
  }

  var gameSession=null;
  function rand(n){return Math.floor(Math.random()*n)}
  function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=rand(i+1),t=a[i];a[i]=a[j];a[j]=t}return a}
  function choiceKey(x){
    if(x&&typeof x==="object")return String(x.n||x.w||x.value||JSON.stringify(x));
    return String(x);
  }
  function uniqueChoices(answer,pool,count){
    var key=choiceKey(answer);
    var arr=[answer],copy=shuffle(pool.filter(function(x){return choiceKey(x)!==key}));
    while(arr.length<count&&copy.length)arr.push(copy.shift());
    return shuffle(arr);
  }
  function gameConfig(){
    var p=activeProfile()||{age:6},age=Number(p.age)||6;
    return{age:age,choices:age<=5?3:age<=8?4:6,countMax:age<=5?5:age<=8?10:20,numberMax:age<=5?10:age<=8?20:50};
  }
  function showGamesHub(){
    var old=document.getElementById("bunny-p2-modal");if(old)old.remove();
    var mode=modeForAge((activeProfile()||{age:6}).age);
    var m=document.createElement("div");m.id="bunny-p2-modal";m.setAttribute("data-bunny-premium-ui","1");
    m.innerHTML='<div class="bunny-p2-sheet"><div style="font-size:46px;text-align:center">🎮🌈</div><h2 class="bunny-p2-title">Smart Games</h2><p class="bunny-p2-sub">'+esc(mode.name)+' difficulty • 5 quick learning games</p><div class="bunny-p2-game-grid">'+
      '<button class="bunny-p2-game-card" data-game="letter"><span class="emoji">🔤</span><strong>Letter Hunt</strong><small>Find the right letter</small></button>'+
      '<button class="bunny-p2-game-card" data-game="count"><span class="emoji">🍎</span><strong>Count & Tap</strong><small>Count cute objects</small></button>'+
      '<button class="bunny-p2-game-card" data-game="color"><span class="emoji">🎨</span><strong>Color Quest</strong><small>Find the color</small></button>'+
      '<button class="bunny-p2-game-card" data-game="missing"><span class="emoji">🔢</span><strong>Missing Number</strong><small>Complete the sequence</small></button>'+
      '<button class="bunny-p2-game-card" data-game="picture"><span class="emoji">🦁</span><strong>Picture Match</strong><small>Match word & picture</small></button>'+
      '<button class="bunny-p2-game-card" id="bunny-p2-dashboard-open"><span class="emoji">🏆</span><strong>My Progress</strong><small>Stars, level & streak</small></button>'+
      '</div><button class="bunny-p2-secondary" id="bunny-p2-game-close">Back to Learning</button></div>';
    document.body.appendChild(m);
    [].slice.call(m.querySelectorAll("[data-game]")).forEach(function(b){b.onclick=function(){startGame(b.getAttribute("data-game"))}});
    document.getElementById("bunny-p2-dashboard-open").onclick=showProgressDashboard;
    document.getElementById("bunny-p2-game-close").onclick=function(){m.remove()};
  }

  function gameMeta(type){
    var map={
      letter:{title:"Letter Hunt",emoji:"🔤"},
      count:{title:"Count & Tap",emoji:"🍎"},
      color:{title:"Color Quest",emoji:"🎨"},
      missing:{title:"Missing Number",emoji:"🔢"},
      picture:{title:"Picture Match",emoji:"🦁"}
    };return map[type];
  }
  function startGame(type){
    gameSession={type:type,round:0,score:0,locked:false};
    renderGameRound();
  }
  function renderGameRound(){
    var modal=document.getElementById("bunny-p2-modal");if(!modal)return;
    var meta=gameMeta(gameSession.type),cfg=gameConfig(),q=makeQuestion(gameSession.type,cfg);
    gameSession.question=q;gameSession.locked=false;
    modal.innerHTML='<div class="bunny-p2-sheet"><div id="bunny-p2-game-view"><div style="font-size:43px">'+meta.emoji+'</div><h2 class="bunny-p2-title">'+meta.title+'</h2><div class="bunny-game-score">Round '+(gameSession.round+1)+'/5 • Score '+gameSession.score+'</div><div class="bunny-game-prompt">'+q.prompt+'</div><div class="bunny-game-visual">'+q.visual+'</div><div class="bunny-game-options">'+q.options.map(function(o,i){return'<button class="bunny-game-option" data-answer="'+i+'">'+o.html+'</button>'}).join("")+'</div><button class="bunny-p2-secondary" id="bunny-game-exit">Exit Game</button></div></div>';
    [].slice.call(modal.querySelectorAll("[data-answer]")).forEach(function(b){b.onclick=function(){answerGame(Number(b.getAttribute("data-answer")),b)}});
    document.getElementById("bunny-game-exit").onclick=showGamesHub;
  }
  function makeQuestion(type,cfg){
    if(type==="letter"){
      var letters="ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),answer=letters[rand(letters.length)],opts=uniqueChoices(answer,letters,cfg.choices);
      return{prompt:"Find letter <b>"+answer+"</b>",visual:"🐰✨",answer:String(answer),options:opts.map(function(x){return{value:String(x),html:esc(x)}})};
    }
    if(type==="count"){
      var n=1+rand(cfg.countMax),emoji=["🍎","⭐","🐥","🦋","🎈"][rand(5)],nums=[];for(var x=1;x<=cfg.countMax;x++)nums.push(x);
      var choices=uniqueChoices(n,nums,Math.min(cfg.choices,5));
      return{prompt:"How many?",visual:new Array(n+1).join(emoji+" "),answer:String(n),options:choices.map(function(x){return{value:String(x),html:String(x)}})};
    }
    if(type==="color"){
      var colors=[
        {n:"Red",h:"लाल",c:"#ef4444"},{n:"Blue",h:"नीला",c:"#3b82f6"},{n:"Green",h:"हरा",c:"#22c55e"},{n:"Yellow",h:"पीला",c:"#eab308"},{n:"Pink",h:"गुलाबी",c:"#ec4899"},{n:"Purple",h:"बैंगनी",c:"#a855f7"}
      ],a=colors[rand(colors.length)],ops=uniqueChoices(a,colors,Math.min(cfg.choices,4));
      return{prompt:"Find "+a.h+" • "+a.n,visual:"🎨",answer:a.n,options:ops.map(function(x){return{value:x.n,html:'<span style="display:inline-block;width:34px;height:34px;border-radius:50%;background:'+x.c+';box-shadow:inset 0 0 0 3px white,0 3px 9px rgba(0,0,0,.15)"></span>'}})};
    }
    if(type==="missing"){
      var max=Math.max(6,cfg.numberMax),start=1+rand(max-4),miss=rand(4),seq=[start,start+1,start+2,start+3],answerN=seq[miss],pool=[];for(var y=1;y<=max;y++)pool.push(y);
      var optsN=uniqueChoices(answerN,pool,Math.min(cfg.choices,5));
      return{prompt:"Which number is missing?",visual:seq.map(function(v,i){return i===miss?"❓":String(v)}).join("  "),answer:String(answerN),options:optsN.map(function(x){return{value:String(x),html:String(x)}})};
    }
    var pics=[
      {w:"Lion",e:"🦁"},{w:"Cat",e:"🐱"},{w:"Dog",e:"🐶"},{w:"Fish",e:"🐟"},{w:"Apple",e:"🍎"},{w:"Car",e:"🚗"},{w:"Moon",e:"🌙"},{w:"Star",e:"⭐"}
    ],pa=pics[rand(pics.length)],po=uniqueChoices(pa,pics,Math.min(cfg.choices,4));
    return{prompt:"Find: <b>"+pa.w+"</b>",visual:"👀",answer:pa.w,options:po.map(function(x){return{value:x.w,html:'<span style="font-size:34px">'+x.e+'</span><br><small>'+x.w+'</small>'}})};
  }
  function answerGame(index,btn){
    if(gameSession.locked)return;
    var q=gameSession.question, option=q.options[index], correct=String(option.value)===String(q.answer);
    if(correct){
      gameSession.locked=true;btn.classList.add("correct");gameSession.score++;
      var s=getStats();s.correctAnswers=(s.correctAnswers||0)+1;s.smartPoints=(s.smartPoints||0)+2;saveStats(s);
      setTimeout(function(){
        gameSession.round++;
        if(gameSession.round>=5)finishGame();else renderGameRound();
      },650);
    }else{
      btn.classList.add("wrong");setTimeout(function(){btn.classList.remove("wrong")},500);
    }
  }
  function finishGame(){
    var s=getStats(),type=gameSession.type;
    s.smartGames=(s.smartGames||0)+1;s.smartPoints=(s.smartPoints||0)+5;s.gamesByType[type]=(s.gamesByType[type]||0)+1;saveStats(s);
    bumpMission("game",1);
    writeJson(GAME_KEY,{last:type,score:gameSession.score,at:Date.now()});
    celebrate("🏆 Great job "+esc((activeProfile()||{name:""}).name)+"! +5 ⭐");
    var modal=document.getElementById("bunny-p2-modal"),meta=gameMeta(type);
    if(modal)modal.innerHTML='<div class="bunny-p2-sheet" style="text-align:center"><div style="font-size:70px">🏆🌈</div><h2 class="bunny-p2-title">Amazing!</h2><p class="bunny-p2-sub">You finished '+meta.title+'</p><div style="font-size:42px;font-weight:900;color:#6d28d9;margin:16px 0">'+gameSession.score+'/5 ⭐</div><button class="bunny-p2-primary" id="bunny-game-again">Play Again</button><button class="bunny-p2-secondary" id="bunny-game-hub">Choose Another Game</button></div>';
    document.getElementById("bunny-game-again").onclick=function(){startGame(type)};
    document.getElementById("bunny-game-hub").onclick=showGamesHub;
    renderHome();
  }

  function profileMetrics(p,isActive){
    var progress,stats;
    if(isActive){
      progress=appProgress();stats=getStats();
    }else{
      var d=p.data||{};
      try{progress=JSON.parse(d["bunny-teacher-progress"]||"{}")}catch(e){progress={}}
      try{stats=JSON.parse(d[STATS_KEY]||"{}")}catch(e){stats={}}
    }
    return{
      stars:Number(progress.totalStars)||0,
      lessons:Number(progress.lessonsLearned)||0,
      games:(Number(progress.gamesWon)||0)+(Number(stats.smartGames)||0),
      smartPoints:Number(stats.smartPoints)||0,
      score:(Number(progress.totalStars)||0)+(Number(stats.smartPoints)||0)
    };
  }
  function showProgressDashboard(){
    saveCurrentIntoActive();
    var old=document.getElementById("bunny-p2-parent-dashboard");if(old)old.remove();
    var fam=loadFamily(),active=activeId(),ap=findProfile(fam,active)||fam.profiles[0],met=ap?profileMetrics(ap,true):{stars:0,lessons:0,games:0,smartPoints:0,score:0},lev=levelInfo(met.score),mission=getMission();
    var summaries=fam.profiles.map(function(p){
      var m=profileMetrics(p,p.id===active),l=levelInfo(m.score);
      return'<div class="bunny-profile-summary '+(p.id===active?"active":"")+'"><div class="bunny-profile-summary-head"><div class="bunny-profile-summary-avatar">'+avatarFor(p.gender)+'</div><div style="flex:1"><div class="bunny-profile-summary-name">'+esc(p.name)+(p.id===active?' • Learning now':'')+'</div><div class="bunny-profile-summary-meta">Age '+Number(p.age||6)+' • '+esc(l.name)+' • '+m.score+' total points</div></div></div></div>';
    }).join("");
    var wrap=document.createElement("div");wrap.id="bunny-p2-parent-dashboard";wrap.setAttribute("data-bunny-premium-ui","1");
    wrap.innerHTML='<div class="bunny-p2-sheet"><div style="font-size:44px;text-align:center">'+(ap?avatarFor(ap.gender):"🧒")+'</div><h2 class="bunny-p2-title">'+(ap?esc(ap.name):"Child")+' Progress</h2><p class="bunny-p2-sub">'+lev.icon+' '+esc(lev.name)+' • '+esc(modeForAge(ap?ap.age:6).name)+'</p>'+
      '<div class="bunny-dashboard-grid"><div class="bunny-stat-card"><div class="bunny-stat-value">'+met.stars+' ⭐</div><div class="bunny-stat-label">Core Stars</div></div><div class="bunny-stat-card"><div class="bunny-stat-value">'+met.smartPoints+'</div><div class="bunny-stat-label">Smart Points</div></div><div class="bunny-stat-card"><div class="bunny-stat-value">'+met.lessons+'</div><div class="bunny-stat-label">Lessons</div></div><div class="bunny-stat-card"><div class="bunny-stat-value">'+met.games+'</div><div class="bunny-stat-label">Games</div></div></div>'+
      '<div style="font-size:12px;font-weight:900;color:#475569;margin:8px 0">🎯 Today: '+Math.min(mission.learn,mission.target.learn)+'/'+mission.target.learn+' learning • '+Math.min(mission.game,mission.target.game)+'/'+mission.target.game+' games • '+Math.min(mission.module,mission.target.module)+'/'+mission.target.module+' explore</div>'+
      '<div style="font-size:12px;font-weight:900;color:#475569;margin-top:15px">👨‍👩‍👧 Family Learners</div>'+summaries+
      '<button class="bunny-p2-primary" id="p2-dash-switch">Switch Child</button><button class="bunny-p2-secondary" id="p2-dash-add">Add Child</button><button class="bunny-p2-secondary" id="p2-dash-close">Close</button></div>';
    document.body.appendChild(wrap);
    document.getElementById("p2-dash-switch").onclick=function(){wrap.remove();showChooser(true)};
    document.getElementById("p2-dash-add").onclick=function(){wrap.remove();showChildEditor(null)};
    document.getElementById("p2-dash-close").onclick=function(){wrap.remove()};
  }

  function augmentParent(){
    var modal=document.getElementById("bunny-parent-modal");if(!modal)return;
    var card=modal.querySelector(".bunny-premium-card");if(!card)return;
    if(!document.getElementById("bunny-p2-family-dashboard")){
      var dash=document.createElement("button");dash.id="bunny-p2-family-dashboard";dash.className="bunny-parent-action bunny-p2-parent-btn";dash.textContent="📊 Family Progress Dashboard";dash.onclick=function(){modal.remove();showProgressDashboard()};
      var close=document.getElementById("bunny-parent-close");card.insertBefore(dash,close||null);
      var sw=document.createElement("button");sw.id="bunny-p2-switch-child";sw.className="bunny-parent-action bunny-p2-parent-btn";sw.textContent="👨‍👩‍👧 Switch / Add Child";sw.onclick=function(){modal.remove();showChooser(true)};card.insertBefore(sw,close||null);
    }
    var edit=document.getElementById("bunny-edit-profile");
    if(edit)edit.onclick=function(){modal.remove();var p=activeProfile();showChildEditor(p&&p.id?p.id:null)};
  }
  function overrideProfileButton(){
    var b=document.getElementById("bunny-profile-launch");
    if(b&&!b.getAttribute("data-family-ready")){
      b.setAttribute("data-family-ready","1");b.title="Switch child";b.setAttribute("aria-label","Switch child profile");b.onclick=function(){showChooser(true)};
    }
  }

  function interactionTracker(e){
    var b=e.target&&e.target.closest?e.target.closest("button"):null;if(!b)return;
    if(b.closest&&b.closest("#bunny-p2-modal,#bunny-family-chooser,#bunny-family-editor,#bunny-p2-parent-dashboard"))return;
    var text=(b.innerText||b.textContent||"").trim(),mod=detectModule(text);
    if(mod&&isHome())saveContinue(mod,moduleLabel(mod));
    if(/^[A-Z]$/.test(text)||/^(?:[0-9]|10)$/.test(text)){
      var s=getStats();s.learnedTaps=(s.learnedTaps||0)+1;s.smartPoints=(s.smartPoints||0)+1;saveStats(s);bumpMission("learn",1);
    }
  }

  function startPhase2(){
    var boot=bootstrapFamily(), fam=boot.family;
    if(!fam.profiles.length)return;
    var a=activeProfile();syncNative(a);
    var sessionStatKey="bunny-p2-session-"+(a&&a.id?a.id:"legacy");
    if(!sessionStorage.getItem(sessionStatKey)){
      sessionStorage.setItem(sessionStatKey,"1");
      var s=getStats();s.sessionCount=(s.sessionCount||0)+1;saveStats(s);
    }
    document.addEventListener("click",interactionTracker,true);
    window.addEventListener("beforeunload",saveCurrentIntoActive);
    setInterval(saveCurrentIntoActive,5000);

    var timer=null;
    var observer=new MutationObserver(function(){
      clearTimeout(timer);timer=setTimeout(function(){renderHome();augmentParent();overrideProfileButton()},90);
    });
    observer.observe(document.body,{childList:true,subtree:true});
    renderHome();augmentParent();overrideProfileButton();

    if(!boot.migrated)setTimeout(function(){showChooser(false)},500);
  }

  window.BunnyPhase2={
    family:loadFamily,
    active:activeProfile,
    switchChild:switchProfile,
    chooser:function(){showChooser(true)},
    addChild:function(){showChildEditor(null)},
    dashboard:showProgressDashboard,
    games:showGamesHub,
    mission:getMission,
    stats:getStats
  };

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",function(){setTimeout(startPhase2,80)},{once:true});
  else setTimeout(startPhase2,80);
})();