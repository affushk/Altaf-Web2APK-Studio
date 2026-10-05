/* Bunny Teacher Phase 3 — Story Time, Parent Safety, Birthday & Badges */
(function(){
  "use strict";

  var SETTINGS_KEY="bunny-p3-settings-v1";
  var CELEBRATED_KEY="bunny-p3-birthday-celebrated-v1";
  var parentUnlockedUntil=0;
  var restTimer=null;
  var observerTimer=null;

  function readJson(key,fallback){try{var v=JSON.parse(localStorage.getItem(key)||"null");return v==null?fallback:v}catch(e){return fallback}}
  function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch(e){}}
  function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
  function active(){
    try{
      if(window.BunnyPhase2&&typeof window.BunnyPhase2.active==="function"){
        var p=window.BunnyPhase2.active();if(p)return p;
      }
      if(window.BunnyProfile&&typeof window.BunnyProfile.get==="function")return window.BunnyProfile.get();
    }catch(e){}
    return null;
  }
  function activeId(){var p=active();return p&&p.id?p.id:(p&&p.name?"legacy-"+p.name:"default")}
  function settingsMap(){return readJson(SETTINGS_KEY,{})}
  function settings(){
    var map=settingsMap(), id=activeId(), s=map[id]||{};
    return{
      parentLock:s.parentLock!==false,
      restMinutes:Number.isFinite(Number(s.restMinutes))?Number(s.restMinutes):20,
      birthday:s.birthday||"",
      bedtime:s.bedtime||""
    };
  }
  function saveSettings(s){
    var map=settingsMap();map[activeId()]=s;writeJson(SETTINGS_KEY,map);scheduleRest();
  }
  function childName(){var p=active();return p&&p.name?p.name:"Little Star"}
  function todayMMDD(){var d=new Date();return String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
  function thisYear(){return String(new Date().getFullYear())}

  function speak(text){
    try{
      if(!text)return;
      var u=new SpeechSynthesisUtterance(text);u.lang="hi-IN";u.rate=.88;window.speechSynthesis.cancel();window.speechSynthesis.speak(u);
    }catch(e){}
  }

  function isHome(){
    return !!([].slice.call(document.querySelectorAll("h2")).find(function(h){return(h.innerText||"").indexOf("क्या सीखना है")>=0}));
  }
  function homeHost(){
    var h=[].slice.call(document.querySelectorAll("h2")).find(function(x){return(x.innerText||"").indexOf("क्या सीखना है")>=0});
    return h?(h.parentElement||null):null;
  }

  function renderHome(){
    var old=document.getElementById("bunny-p3-home");
    if(!isHome()){if(old)old.remove();return}
    var host=homeHost();if(!host)return;
    var s=settings(), node=old||document.createElement("div");node.id="bunny-p3-home";node.setAttribute("data-bunny-premium-ui","1");
    node.innerHTML=
      '<div style="font-size:11px;font-weight:900;color:#475569;margin-bottom:8px">✨ Phase 3 Magic Zone</div>'+
      '<div class="bunny-p3-row">'+
        '<button class="bunny-p3-card" id="bunny-p3-story"><span>📖</span>Story Time<small>Listen • choose • learn</small></button>'+
        '<button class="bunny-p3-card" id="bunny-p3-badges"><span>🏅</span>Badge Book<small>See achievements</small></button>'+
        '<button class="bunny-p3-card" id="bunny-p3-rest"><span>🌙</span>Calm Break<small>'+(s.restMinutes>0?s.restMinutes+' min reminder':'Reminder off')+'</small></button>'+
      '</div>';
    if(!old){
      var p2=document.getElementById("bunny-p2-home");
      if(p2&&p2.parentNode===host)host.insertBefore(node,p2.nextSibling);
      else host.insertBefore(node,host.firstChild);
    }
    document.getElementById("bunny-p3-story").onclick=showStoryLibrary;
    document.getElementById("bunny-p3-badges").onclick=showBadges;
    document.getElementById("bunny-p3-rest").onclick=function(){showRest(true)};
  }

  var stories=[
    {
      id:"share",title:"The Sharing Star",emoji:"🌟🤝",desc:"Kindness & sharing",
      pages:[
        ["🌈","{name} ke paas ek pyara sa rainbow crayon box tha."],
        ["🧒🎨","Ek dost ke paas blue crayon nahi tha. {name} ne socha, main kya karun?"],
        ["🤝💙","{name} ne blue crayon share kiya. Dono ne milkar beautiful drawing banayi!"],
        ["🌟","Sharing se khushi badhti hai. Shabash {name}!"]
      ],
      choices:["Share karunga / karungi 🤝","Sirf apne paas rakhunga 🙈"],good:0
    },
    {
      id:"clean",title:"Bunny's Clean Hands",emoji:"🐰🫧",desc:"Healthy habits",
      pages:[
        ["🐰🍎","Bunny ko yummy apple khana tha."],
        ["👐","Bunny ne dekha uske hands play karne ke baad dirty the."],
        ["🫧🚿","Bunny ne soap aur paani se hands achchhe se wash kiye."],
        ["🍎✨","Ab Bunny safely apple kha sakta tha. Clean hands, happy tummy!"]
      ],
      choices:["Khaane se pehle hands wash 🫧","Seedha kha lo 😋"],good:0
    },
    {
      id:"stars",title:"Count the Moon Stars",emoji:"🌙⭐",desc:"Counting & wonder",
      pages:[
        ["🌙","Raat ko {name} ne aasman mein chamakta moon dekha."],
        ["⭐⭐⭐","Moon ke paas 3 bright stars chamak rahe the."],
        ["⭐⭐⭐⭐","Phir ek aur star aaya. Ab total kitne stars hue?"],
        ["✨","3 + 1 = 4! Amazing counting, {name}!"]
      ],
      choices:["4 stars ⭐⭐⭐⭐","5 stars ⭐⭐⭐⭐⭐"],good:0
    }
  ];
  var storyState=null;

  function personalize(t){return String(t||"").replace(/\{name\}/g,childName())}
  function showStoryLibrary(){
    removeModal();
    var m=document.createElement("div");m.id="bunny-p3-modal";m.setAttribute("data-bunny-premium-ui","1");
    m.innerHTML='<div class="bunny-p3-sheet"><div style="font-size:48px;text-align:center">📚🐰</div><h2 class="bunny-p3-title">Story Time</h2><p class="bunny-p3-sub">Short stories made for '+esc(childName())+'</p>'+
      stories.map(function(s){return'<button class="bunny-p3-story-card" data-story="'+s.id+'" style="width:100%;text-align:left"><span style="font-size:32px;float:right">'+s.emoji+'</span><strong>'+esc(s.title)+'</strong><small>'+esc(s.desc)+' • 1–2 min</small></button>'}).join("")+
      '<button class="bunny-p3-secondary" id="bunny-p3-close">Back</button></div>';
    document.body.appendChild(m);
    [].slice.call(m.querySelectorAll("[data-story]")).forEach(function(b){b.onclick=function(){startStory(b.getAttribute("data-story"))}});
    document.getElementById("bunny-p3-close").onclick=removeModal;
  }
  function startStory(id){
    var s=stories.find(function(x){return x.id===id});if(!s)return;
    storyState={story:s,page:0};renderStoryPage();
  }
  function renderStoryPage(){
    var m=document.getElementById("bunny-p3-modal");if(!m||!storyState)return;
    var s=storyState.story,p=storyState.page,row=s.pages[p],last=p===s.pages.length-1;
    var choices=last?'<div id="bunny-story-choices">'+s.choices.map(function(c,i){return'<button class="bunny-story-choice" data-choice="'+i+'">'+esc(c)+'</button>'}).join("")+'</div>':'';
    m.innerHTML='<div class="bunny-p3-sheet"><div class="bunny-p3-title">'+esc(s.title)+'</div><div class="bunny-p3-sub">Page '+(p+1)+'/'+s.pages.length+'</div><div id="bunny-story-visual">'+row[0]+'</div><div id="bunny-story-text">'+esc(personalize(row[1]))+'</div>'+choices+
      (!last?'<button class="bunny-p3-primary" id="bunny-story-next">Next ➜</button>':'')+
      '<button class="bunny-p3-secondary" id="bunny-story-exit">Exit Story</button></div>';
    speak(personalize(row[1]));
    var next=document.getElementById("bunny-story-next");if(next)next.onclick=function(){storyState.page++;renderStoryPage()};
    var exit=document.getElementById("bunny-story-exit");if(exit)exit.onclick=showStoryLibrary;
    [].slice.call(m.querySelectorAll("[data-choice]")).forEach(function(b){
      b.onclick=function(){
        var i=Number(b.getAttribute("data-choice")),good=i===s.good;
        b.classList.add(good?"good":"try");
        if(good){
          speak("Shabash "+childName()+"! Bahut achchha answer!");
          setTimeout(function(){finishStory(s.id)},650);
        }else{
          speak("Good try! Ek baar phir socho.");
          setTimeout(function(){b.classList.remove("try")},650);
        }
      };
    });
  }
  function finishStory(id){
    var key="bunny-p3-stories-v1", st=readJson(key,{done:[]});
    if(st.done.indexOf(id)<0)st.done.push(id);writeJson(key,st);
    showToast("📖 Story Complete! + Badge progress");
    showStoryLibrary();
  }

  function progress(){
    return readJson("bunny-teacher-progress",{totalStars:0,gamesWon:0,lessonsLearned:0,modulesCompleted:[]});
  }
  function p2stats(){return readJson("bunny-p2-stats-v1",{smartGames:0,smartPoints:0,correctAnswers:0})}
  function mission(){return readJson("bunny-p2-mission-v1",{})}
  function familyCount(){
    var f=readJson("bunny-family-profiles-v2",{profiles:[]});return Array.isArray(f.profiles)?f.profiles.length:0;
  }
  function storyCount(){var s=readJson("bunny-p3-stories-v1",{done:[]});return Array.isArray(s.done)?s.done.length:0}
  function badges(){
    var p=progress(),s=p2stats(),m=mission(),score=(Number(p.totalStars)||0)+(Number(s.smartPoints)||0);
    return[
      {i:"🌱",n:"First Steps",d:"Earn 5 learning points",ok:score>=5},
      {i:"🔤",n:"ABC Explorer",d:"Learn 5 lessons",ok:(Number(p.lessonsLearned)||0)>=5},
      {i:"🎮",n:"Game Hero",d:"Finish 3 games",ok:((Number(p.gamesWon)||0)+(Number(s.smartGames)||0))>=3},
      {i:"🎯",n:"Daily Hero",d:"Complete a daily mission",ok:!!m.awarded},
      {i:"📖",n:"Story Star",d:"Finish all 3 stories",ok:storyCount()>=3},
      {i:"🌈",n:"Rainbow Learner",d:"Reach 120 points",ok:score>=120},
      {i:"👨‍👩‍👧",n:"Family Learner",d:"2+ child profiles",ok:familyCount()>=2},
      {i:"🧠",n:"Quiz Champ",d:"20 correct smart answers",ok:(Number(s.correctAnswers)||0)>=20}
    ];
  }
  function showBadges(){
    removeModal();
    var list=badges(),unlocked=list.filter(function(x){return x.ok}).length;
    var m=document.createElement("div");m.id="bunny-p3-modal";m.setAttribute("data-bunny-premium-ui","1");
    m.innerHTML='<div class="bunny-p3-sheet"><div style="font-size:48px;text-align:center">🏅✨</div><h2 class="bunny-p3-title">'+esc(childName())+' Badge Book</h2><p class="bunny-p3-sub">'+unlocked+'/'+list.length+' badges unlocked</p><div class="bunny-badge-grid">'+
      list.map(function(b){return'<div class="bunny-badge '+(b.ok?"unlocked":"")+'"><div class="bunny-badge-icon">'+b.i+'</div><div class="bunny-badge-name">'+esc(b.n)+(b.ok?' ✅':' 🔒')+'</div><div class="bunny-badge-desc">'+esc(b.d)+'</div></div>'}).join("")+
      '</div><button class="bunny-p3-secondary" id="bunny-badge-close">Done</button></div>';
    document.body.appendChild(m);document.getElementById("bunny-badge-close").onclick=removeModal;
  }

  function removeModal(){var m=document.getElementById("bunny-p3-modal");if(m)m.remove()}

  function showGate(after){
    var old=document.getElementById("bunny-p3-gate");if(old)old.remove();
    var a=4+Math.floor(Math.random()*5),b=3+Math.floor(Math.random()*6),answer=a+b;
    var g=document.createElement("div");g.id="bunny-p3-gate";g.setAttribute("data-bunny-premium-ui","1");
    g.innerHTML='<div class="bunny-p3-sheet"><div style="font-size:48px">👨‍👩‍👧🔒</div><h2 class="bunny-p3-title">Parent Check</h2><p class="bunny-p3-sub">Parents ke liye ek simple question</p><div id="bunny-p3-question">'+a+' + '+b+' = ?</div><input class="bunny-p3-input" id="bunny-p3-answer" type="number" inputmode="numeric" autofocus><div id="bunny-p3-gate-error" style="min-height:18px;color:#dc2626;font-size:11px;font-weight:900;margin-top:6px"></div><button class="bunny-p3-primary" id="bunny-p3-unlock">Unlock Parent Zone</button><button class="bunny-p3-secondary" id="bunny-p3-gate-cancel">Cancel</button></div>';
    document.body.appendChild(g);
    document.getElementById("bunny-p3-unlock").onclick=function(){
      var v=Number(document.getElementById("bunny-p3-answer").value);
      if(v===answer){parentUnlockedUntil=Date.now()+120000;g.remove();if(after)after()}
      else document.getElementById("bunny-p3-gate-error").textContent="Answer match nahi hua. Phir try karein.";
    };
    document.getElementById("bunny-p3-gate-cancel").onclick=function(){g.remove()};
    setTimeout(function(){document.getElementById("bunny-p3-answer").focus()},120);
  }
  function protectParentButton(){
    var b=document.getElementById("bunny-parent-launch");if(!b||b.__p3Protected)return;
    var original=b.onclick;b.__p3Protected=true;
    b.onclick=function(e){
      var s=settings();
      if(!s.parentLock||Date.now()<parentUnlockedUntil){if(original)original.call(b,e);return}
      showGate(function(){if(original)original.call(b,e)});
    };
  }

  function augmentParent(){
    var modal=document.getElementById("bunny-parent-modal");if(!modal)return;
    var card=modal.querySelector(".bunny-premium-card");if(!card||document.getElementById("bunny-p3-settings-open"))return;
    var close=document.getElementById("bunny-parent-close");
    var btn=document.createElement("button");btn.id="bunny-p3-settings-open";btn.className="bunny-parent-action";btn.textContent="🎂 Birthday, Safety & Screen Time";
    btn.onclick=function(){modal.remove();showSettings()};
    card.insertBefore(btn,close||null);
  }

  function showSettings(){
    removeModal();
    var s=settings(),m=document.createElement("div");m.id="bunny-p3-modal";m.setAttribute("data-bunny-premium-ui","1");
    var bday=s.birthday||"";
    m.innerHTML='<div class="bunny-p3-sheet"><div style="font-size:48px;text-align:center">👨‍👩‍👧⚙️</div><h2 class="bunny-p3-title">Parent Safety</h2><p class="bunny-p3-sub">Settings for '+esc(childName())+'</p>'+
      '<label class="bunny-p3-label">🎂 Birthday (optional)</label><input class="bunny-p3-input" id="bunny-p3-birthday-input" type="date" value="'+esc(bday)+'">'+
      '<div class="bunny-p3-setting"><div><strong>🔒 Parent Lock</strong><small>Math question before Parent Zone</small></div><select class="bunny-p3-select" id="bunny-p3-lock"><option value="on" '+(s.parentLock?"selected":"")+'>On</option><option value="off" '+(!s.parentLock?"selected":"")+'>Off</option></select></div>'+
      '<div class="bunny-p3-setting"><div><strong>🌙 Rest Reminder</strong><small>Bunny reminds the child to rest</small></div><select class="bunny-p3-select" id="bunny-p3-rest-min"><option value="0" '+(s.restMinutes===0?"selected":"")+'>Off</option><option value="15" '+(s.restMinutes===15?"selected":"")+'>15 min</option><option value="20" '+(s.restMinutes===20?"selected":"")+'>20 min</option><option value="30" '+(s.restMinutes===30?"selected":"")+'>30 min</option></select></div>'+
      '<button class="bunny-p3-primary" id="bunny-p3-settings-save">Save Settings</button><button class="bunny-p3-secondary" id="bunny-p3-settings-close">Cancel</button></div>';
    document.body.appendChild(m);
    document.getElementById("bunny-p3-settings-save").onclick=function(){
      var next={parentLock:document.getElementById("bunny-p3-lock").value==="on",restMinutes:Number(document.getElementById("bunny-p3-rest-min").value),birthday:document.getElementById("bunny-p3-birthday-input").value||"",bedtime:s.bedtime||""};
      saveSettings(next);m.remove();renderHome();checkBirthday(true);showToast("✅ Parent settings saved");
    };
    document.getElementById("bunny-p3-settings-close").onclick=function(){m.remove()};
  }

  function scheduleRest(){
    if(restTimer){clearTimeout(restTimer);restTimer=null}
    var mins=settings().restMinutes;
    if(!mins||mins<=0)return;
    restTimer=setTimeout(function(){showRest(false)},mins*60*1000);
  }
  function showRest(manual){
    var old=document.getElementById("bunny-p3-rest-modal");if(old)old.remove();
    var r=document.createElement("div");r.id="bunny-p3-rest-modal";r.setAttribute("data-bunny-premium-ui","1");
    r.innerHTML='<div class="bunny-p3-sheet"><div class="bunny-rest-hero">🌙🐰</div><h2 class="bunny-p3-title">'+(manual?"Calm Break":"Time for a Little Break")+'</h2><p class="bunny-p3-sub">'+esc(childName())+', aankhon aur body ko thoda rest dete hain 💜</p><div style="padding:14px;border-radius:20px;background:#ecfeff;text-align:center;font-weight:900;color:#0f766e">👀 Look away from the screen<br>💧 Drink some water<br>🙆 Stretch your hands</div><button class="bunny-p3-primary" id="bunny-rest-done">I took a break ✅</button><button class="bunny-p3-secondary" id="bunny-rest-later">Continue Learning</button></div>';
    document.body.appendChild(r);speak(childName()+", thoda rest karte hain. Paani piyo aur aankhon ko aaram do.");
    function done(){r.remove();scheduleRest()}
    document.getElementById("bunny-rest-done").onclick=done;
    document.getElementById("bunny-rest-later").onclick=done;
  }

  function checkBirthday(force){
    var s=settings();if(!s.birthday)return;
    var parts=s.birthday.split("-");if(parts.length<3)return;
    var mmdd=parts[1]+"-"+parts[2];if(mmdd!==todayMMDD())return;
    var all=readJson(CELEBRATED_KEY,{}),id=activeId(),token=thisYear()+"-"+todayMMDD();
    if(!force&&all[id]===token)return;
    all[id]=token;writeJson(CELEBRATED_KEY,all);showBirthday();
  }
  function showBirthday(){
    var old=document.getElementById("bunny-p3-birthday");if(old)old.remove();
    var m=document.createElement("div");m.id="bunny-p3-birthday";m.setAttribute("data-bunny-premium-ui","1");
    m.innerHTML='<div class="bunny-p3-sheet"><div class="bunny-birthday-hero">🎂🎈🐰</div><h2 class="bunny-p3-title">Happy Birthday '+esc(childName())+'!</h2><p class="bunny-p3-sub">May your day be full of smiles, learning and lots of fun! 🌈⭐</p><button class="bunny-p3-primary" id="bunny-birthday-done">Yay! 🎉</button></div>';
    document.body.appendChild(m);speak("Happy Birthday "+childName()+"! Allah aapko hamesha khush rakhe.");
    document.getElementById("bunny-birthday-done").onclick=function(){m.remove()};
    for(var i=0;i<30;i++){
      var c=document.createElement("span");c.className="bunny-p2-confetti";c.textContent=["🎉","⭐","🎈","🌸","✨"][i%5];c.style.left=((i*37)%100)+"vw";c.style.animationDelay=((i%10)*.03)+"s";document.body.appendChild(c);setTimeout(function(n){return function(){n.remove()}}(c),2800);
    }
  }

  function showToast(msg){
    var old=document.querySelector(".bunny-p3-toast");if(old)old.remove();
    var t=document.createElement("div");t.className="bunny-p3-toast bunny-p2-toast";t.textContent=msg;document.body.appendChild(t);setTimeout(function(){t.remove()},1500);
  }

  function decorate(){
    renderHome();protectParentButton();augmentParent();
  }

  function start(){
    if(!document.body)return;
    decorate();scheduleRest();setTimeout(function(){checkBirthday(false)},1800);
    var mo=new MutationObserver(function(){clearTimeout(observerTimer);observerTimer=setTimeout(decorate,100)});
    mo.observe(document.body,{childList:true,subtree:true});
  }

  window.BunnyPhase3={
    stories:showStoryLibrary,
    badges:showBadges,
    settings:showSettings,
    rest:function(){showRest(true)},
    birthday:function(){showBirthday()},
    currentSettings:settings
  };

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",function(){setTimeout(start,180)},{once:true});
  else setTimeout(start,180);
})();