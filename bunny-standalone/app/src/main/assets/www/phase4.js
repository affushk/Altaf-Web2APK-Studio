/* Bunny Teacher Phase 4 — Adventure Rewards, Avatar & Weekly Growth */
(function(){
  "use strict";

  var KEY="bunny-p4-data-v1";
  var observerTimer=null;

  function readJson(key,fallback){try{var v=JSON.parse(localStorage.getItem(key)||"null");return v==null?fallback:v}catch(e){return fallback}}
  function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch(e){}}
  function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
  function today(){var d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
  function isoDate(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
  function active(){
    try{if(window.BunnyPhase2&&window.BunnyPhase2.active)return window.BunnyPhase2.active()}catch(e){}
    try{if(window.BunnyProfile&&window.BunnyProfile.get)return window.BunnyProfile.get()}catch(e){}
    return null;
  }
  function childId(){var p=active();return p&&p.id?p.id:(p&&p.name?"legacy-"+p.name:"default")}
  function childName(){var p=active();return p&&p.name?p.name:"Little Star"}
  function childAge(){var p=active();return Number(p&&p.age)||6}
  function defaultAvatar(){var p=active();return p&&p.gender==="girl"?"👧":p&&p.gender==="boy"?"👦":"🧒"}

  function allData(){return readJson(KEY,{})}
  function data(){
    var all=allData(),id=childId(),d=all[id]||{};
    if(!d.avatar)d.avatar=defaultAvatar();
    if(!d.weeklyGoal)d.weeklyGoal=5;
    if(!d.activity)d.activity={};
    if(!d.moduleCounts)d.moduleCounts={};
    if(!d.rewards)d.rewards={claimed:[],items:[]};
    if(!d.rewards.claimed)d.rewards.claimed=[];
    if(!d.rewards.items)d.rewards.items=[];
    if(typeof d.nightEnabled!=="boolean")d.nightEnabled=false;
    if(!Number.isFinite(Number(d.nightStart)))d.nightStart=20;
    return d;
  }
  function save(d){var all=allData();all[childId()]=d;writeJson(KEY,all);applyNight();renderHome();decorateFamilyChooser()}
  function appProgress(){return readJson("bunny-teacher-progress",{totalStars:0,lessonsLearned:0,gamesWon:0})}
  function p2stats(){return readJson("bunny-p2-stats-v1",{smartPoints:0,smartGames:0,correctAnswers:0})}
  function totalPoints(){var p=appProgress(),s=p2stats();return(Number(p.totalStars)||0)+(Number(s.smartPoints)||0)}
  function markActivity(kind,module){
    var d=data(),t=today();
    if(!d.activity[t])d.activity[t]={taps:0,modules:0,games:0};
    if(kind==="tap")d.activity[t].taps++;
    if(kind==="module")d.activity[t].modules++;
    if(kind==="game")d.activity[t].games++;
    if(module)d.moduleCounts[module]=(d.moduleCounts[module]||0)+1;
    save(d);
  }

  function weekDates(){
    var now=new Date(),day=now.getDay(),diff=(day===0?-6:1-day),monday=new Date(now);
    monday.setHours(12,0,0,0);monday.setDate(now.getDate()+diff);
    var out=[];
    for(var i=0;i<7;i++){var d=new Date(monday);d.setDate(monday.getDate()+i);out.push(d)}
    return out;
  }
  function weeklyActiveCount(d){
    return weekDates().filter(function(x){return !!d.activity[isoDate(x)]}).length;
  }

  var modules=[
    {id:"alphabet",label:"ABC",emoji:"🔤",keys:["abc","अंग्रेज़ी"]},
    {id:"arabic",label:"Arabic",emoji:"🕌",keys:["अरबी","عربی"]},
    {id:"numbers",label:"Numbers",emoji:"🔢",keys:["गिनती"]},
    {id:"colors",label:"Colors",emoji:"🎨",keys:["रंग"]},
    {id:"shapes",label:"Shapes",emoji:"🔷",keys:["आकार"]},
    {id:"animals",label:"Animals",emoji:"🦁",keys:["जानवर"]},
    {id:"quiz",label:"Quiz",emoji:"🧠",keys:["क्विज़"]},
    {id:"manners",label:"Manners",emoji:"🤝",keys:["तहज़ीब","आदत"]},
    {id:"duas",label:"Duas",emoji:"🤲",keys:["दुआ"]}
  ];
  function moduleById(id){return modules.find(function(m){return m.id===id})}
  function detectModule(text){
    text=String(text||"").toLowerCase();
    for(var i=0;i<modules.length;i++)for(var j=0;j<modules[i].keys.length;j++)if(text.indexOf(modules[i].keys[j].toLowerCase())>=0)return modules[i];
    return null;
  }
  function recommended(){
    var age=childAge(),d=data(),ids=age<=5?["alphabet","numbers","colors","shapes","animals"]:age<=8?["alphabet","numbers","arabic","colors","quiz"]:["quiz","arabic","numbers","manners","duas"];
    ids.sort(function(a,b){return(d.moduleCounts[a]||0)-(d.moduleCounts[b]||0)});
    return moduleById(ids[0])||modules[0];
  }
  function findCoreButton(m){
    var buttons=[].slice.call(document.querySelectorAll("button"));
    for(var i=0;i<buttons.length;i++){
      if(buttons[i].closest&&buttons[i].closest("#bunny-p4-modal,#bunny-p4-report"))continue;
      var t=(buttons[i].innerText||buttons[i].textContent||"").toLowerCase();
      for(var j=0;j<m.keys.length;j++)if(t.indexOf(m.keys[j].toLowerCase())>=0)return buttons[i];
    }
    return null;
  }
  function openRecommended(){
    var m=recommended(),b=findCoreButton(m);
    if(b){b.click();showToast(m.emoji+" "+m.label+" time!")}
    else showRecommendation();
  }

  function isHome(){
    return !!([].slice.call(document.querySelectorAll("h2")).find(function(h){return(h.innerText||"").indexOf("क्या सीखना है")>=0}));
  }
  function host(){
    var h=[].slice.call(document.querySelectorAll("h2")).find(function(x){return(x.innerText||"").indexOf("क्या सीखना है")>=0});
    return h?(h.parentElement||null):null;
  }

  function renderHome(){
    var old=document.getElementById("bunny-p4-home");
    if(!isHome()){if(old)old.remove();return}
    var h=host();if(!h)return;
    var d=data(),days=weekDates(),activeDays=weeklyActiveCount(d),goal=Math.max(1,Math.min(7,Number(d.weeklyGoal)||5)),pct=Math.min(100,Math.round(activeDays/goal*100)),rec=recommended();
    var node=old||document.createElement("div");node.id="bunny-p4-home";node.setAttribute("data-bunny-premium-ui","1");
    var labels=["M","T","W","T","F","S","S"];
    node.innerHTML=
      '<div class="bunny-p4-head"><button class="bunny-p4-avatar" id="bunny-p4-avatar-top">'+esc(d.avatar)+'</button><div class="bunny-p4-headtext"><div class="bunny-p4-title">'+esc(childName())+' Adventure Board 🌈</div><div class="bunny-p4-sub">Weekly goal '+activeDays+'/'+goal+' days • '+totalPoints()+' total points</div></div><div style="font-size:28px">'+rec.emoji+'</div></div>'+
      '<div class="bunny-p4-week">'+days.map(function(day,i){var k=isoDate(day),done=!!d.activity[k],now=k===today();return'<div class="bunny-p4-day '+(done?"done ":"")+(now?"today":"")+'"><strong>'+labels[i]+'</strong><span>'+(done?"⭐":"○")+'</span></div>'}).join("")+'</div>'+
      '<div class="bunny-p4-meter"><span style="width:'+pct+'%"></span></div>'+
      '<div class="bunny-p4-actions"><button id="bunny-p4-next"><span>'+rec.emoji+'</span>Learn Next<small style="display:block">'+esc(rec.label)+'</small></button><button id="bunny-p4-chest"><span>🎁</span>Treasure<small style="display:block">Rewards</small></button><button id="bunny-p4-avatar-btn"><span>'+esc(d.avatar)+'</span>Avatar<small style="display:block">Customize</small></button></div>';
    if(!old){
      var p3=document.getElementById("bunny-p3-home"),p2=document.getElementById("bunny-p2-home");
      if(p3&&p3.parentNode===h)h.insertBefore(node,p3.nextSibling);
      else if(p2&&p2.parentNode===h)h.insertBefore(node,p2.nextSibling);
      else h.insertBefore(node,h.firstChild);
    }
    document.getElementById("bunny-p4-next").onclick=openRecommended;
    document.getElementById("bunny-p4-chest").onclick=showChest;
    document.getElementById("bunny-p4-avatar-btn").onclick=showAvatarStudio;
    document.getElementById("bunny-p4-avatar-top").onclick=showAvatarStudio;
  }

  function removeModal(){var m=document.getElementById("bunny-p4-modal");if(m)m.remove()}
  function showAvatarStudio(){
    removeModal();var d=data(),choices=["👧","👦","🧒","🐰","🦄","🐼","🦁","🦸","🧚","🚀","🌈","⭐"];
    var m=document.createElement("div");m.id="bunny-p4-modal";m.setAttribute("data-bunny-premium-ui","1");
    m.innerHTML='<div class="bunny-p4-sheet"><div style="font-size:50px;text-align:center">'+esc(d.avatar)+'</div><h2 class="bunny-p4-title2">Avatar Studio</h2><p class="bunny-p4-sub2">Choose '+esc(childName())+'\'s learning buddy icon</p><div class="bunny-avatar-grid">'+choices.map(function(a){return'<button class="bunny-avatar-choice '+(a===d.avatar?"selected":"")+'" data-avatar="'+a+'">'+a+'</button>'}).join("")+'</div><button class="bunny-p4-secondary" id="bunny-avatar-close">Done</button></div>';
    document.body.appendChild(m);
    [].slice.call(m.querySelectorAll("[data-avatar]")).forEach(function(b){b.onclick=function(){var x=data();x.avatar=b.getAttribute("data-avatar");save(x);showAvatarStudio()}});
    document.getElementById("bunny-avatar-close").onclick=removeModal;
  }

  var rewards=[
    {at:10,i:"🌟",n:"Shiny Star"},
    {at:25,i:"🎈",n:"Happy Balloon"},
    {at:50,i:"👑",n:"Little Crown"},
    {at:80,i:"🦄",n:"Magic Unicorn"},
    {at:120,i:"🚀",n:"Space Rocket"},
    {at:180,i:"🏆",n:"Super Trophy"}
  ];
  function showChest(){
    removeModal();var d=data(),pts=totalPoints(),available=rewards.filter(function(r){return pts>=r.at&&d.rewards.claimed.indexOf(r.at)<0});
    var m=document.createElement("div");m.id="bunny-p4-modal";m.setAttribute("data-bunny-premium-ui","1");
    m.innerHTML='<div class="bunny-p4-sheet"><div class="bunny-chest-hero">🎁✨</div><h2 class="bunny-p4-title2">Treasure Chest</h2><p class="bunny-p4-sub2">'+pts+' points • '+(available.length?available.length+' reward ready!':'Keep learning to unlock more')+'</p><div class="bunny-reward-grid">'+rewards.map(function(r){var owned=d.rewards.claimed.indexOf(r.at)>=0,ready=pts>=r.at;return'<div class="bunny-reward '+(owned?"owned":"")+'"><div class="bunny-reward-icon">'+r.i+'</div><div class="bunny-reward-name">'+esc(r.n)+'<br>'+(owned?'Owned ✅':ready?'Ready! 🎉':r.at+' pts 🔒')+'</div></div>'}).join("")+'</div>'+(available.length?'<button class="bunny-p4-primary" id="bunny-chest-claim">Open '+available.length+' Reward'+(available.length>1?'s':'')+' 🎉</button>':'')+'<button class="bunny-p4-secondary" id="bunny-chest-close">Back</button></div>';
    document.body.appendChild(m);
    var claim=document.getElementById("bunny-chest-claim");if(claim)claim.onclick=function(){
      var x=data(),ready=rewards.filter(function(r){return pts>=r.at&&x.rewards.claimed.indexOf(r.at)<0});
      ready.forEach(function(r){x.rewards.claimed.push(r.at);x.rewards.items.push(r.i)});save(x);celebrate("🎁 "+ready.length+" treasure reward unlocked!");showChest();
    };
    document.getElementById("bunny-chest-close").onclick=removeModal;
  }

  function showRecommendation(){
    removeModal();var r=recommended(),d=data();
    var m=document.createElement("div");m.id="bunny-p4-modal";m.setAttribute("data-bunny-premium-ui","1");
    m.innerHTML='<div class="bunny-p4-sheet"><h2 class="bunny-p4-title2">What should I learn next?</h2><p class="bunny-p4-sub2">Bunny picked this from '+esc(childName())+'\'s activity</p><div class="bunny-next-card"><div class="bunny-next-icon">'+r.emoji+'</div><div class="bunny-next-title">'+esc(r.label)+'</div><div class="bunny-next-reason">You have explored this less than your other activities. Let\'s give it a try!</div></div><button class="bunny-p4-secondary" id="bunny-next-close">Okay</button></div>';
    document.body.appendChild(m);document.getElementById("bunny-next-close").onclick=removeModal;
  }

  function showReport(){
    var old=document.getElementById("bunny-p4-report");if(old)old.remove();
    var d=data(),p=appProgress(),s=p2stats(),activeDays=weeklyActiveCount(d),goal=Number(d.weeklyGoal)||5;
    var favorite=Object.keys(d.moduleCounts).sort(function(a,b){return(d.moduleCounts[b]||0)-(d.moduleCounts[a]||0)})[0],fav=moduleById(favorite);
    var rows=Object.keys(d.moduleCounts).sort(function(a,b){return(d.moduleCounts[b]||0)-(d.moduleCounts[a]||0)}).slice(0,6).map(function(id){var m=moduleById(id);return m?'<div class="bunny-report-module"><strong>'+m.emoji+' '+esc(m.label)+'</strong><span>'+d.moduleCounts[id]+' opens</span></div>':''}).join("");
    var w=document.createElement("div");w.id="bunny-p4-report";w.setAttribute("data-bunny-premium-ui","1");
    w.innerHTML='<div class="bunny-p4-sheet"><div style="font-size:46px;text-align:center">'+esc(d.avatar)+'📊</div><h2 class="bunny-p4-title2">'+esc(childName())+' Weekly Report</h2><p class="bunny-p4-sub2">'+activeDays+'/'+goal+' active days this week'+(fav?' • Favorite: '+fav.label:'')+'</p><div class="bunny-report-grid"><div class="bunny-report-stat"><b>'+totalPoints()+'</b><small>Total Points</small></div><div class="bunny-report-stat"><b>'+activeDays+'</b><small>Active Days</small></div><div class="bunny-report-stat"><b>'+(Number(p.lessonsLearned)||0)+'</b><small>Core Lessons</small></div><div class="bunny-report-stat"><b>'+((Number(p.gamesWon)||0)+(Number(s.smartGames)||0))+'</b><small>Games Played</small></div></div><div style="font-size:12px;font-weight:900;color:#475569;margin:12px 0 6px">📚 Most explored</div>'+(rows||'<div style="text-align:center;color:#94a3b8;font-weight:800;padding:12px">Start learning to build this report 🌱</div>')+'<button class="bunny-p4-primary" id="bunny-report-next">Smart Recommendation</button><button class="bunny-p4-secondary" id="bunny-report-close">Close</button></div>';
    document.body.appendChild(w);
    document.getElementById("bunny-report-next").onclick=function(){w.remove();showRecommendation()};
    document.getElementById("bunny-report-close").onclick=function(){w.remove()};
  }

  function applyNight(){
    var d=data(),h=new Date().getHours(),on=d.nightEnabled&&(h>=Number(d.nightStart)||h<6);
    document.body&&document.body.classList.toggle("bunny-p4-night",!!on);
  }
  function showSettings(){
    removeModal();var d=data(),m=document.createElement("div");m.id="bunny-p4-modal";m.setAttribute("data-bunny-premium-ui","1");
    m.innerHTML='<div class="bunny-p4-sheet"><div style="font-size:46px;text-align:center">🌈⚙️</div><h2 class="bunny-p4-title2">Phase 4 Learning Settings</h2><p class="bunny-p4-sub2">Weekly growth & bedtime comfort</p><div class="bunny-p4-setting"><div><strong>🎯 Weekly Goal</strong><small>Active learning days per week</small></div><select class="bunny-p4-select" id="p4-goal"><option value="3">3 days</option><option value="5">5 days</option><option value="7">7 days</option></select></div><div class="bunny-p4-setting"><div><strong>🌙 Bedtime Mode</strong><small>Softer screen after selected hour</small></div><select class="bunny-p4-select" id="p4-night"><option value="off">Off</option><option value="on">On</option></select></div><div class="bunny-p4-setting"><div><strong>🕗 Starts at</strong><small>Bedtime mode start hour</small></div><select class="bunny-p4-select" id="p4-hour"><option value="19">7 PM</option><option value="20">8 PM</option><option value="21">9 PM</option><option value="22">10 PM</option></select></div><button class="bunny-p4-primary" id="p4-save">Save</button><button class="bunny-p4-secondary" id="p4-settings-close">Cancel</button></div>';
    document.body.appendChild(m);
    document.getElementById("p4-goal").value=String(d.weeklyGoal||5);
    document.getElementById("p4-night").value=d.nightEnabled?"on":"off";
    document.getElementById("p4-hour").value=String(d.nightStart||20);
    document.getElementById("p4-save").onclick=function(){var x=data();x.weeklyGoal=Number(document.getElementById("p4-goal").value);x.nightEnabled=document.getElementById("p4-night").value==="on";x.nightStart=Number(document.getElementById("p4-hour").value);save(x);m.remove();showToast("✅ Phase 4 settings saved")};
    document.getElementById("p4-settings-close").onclick=removeModal;
  }

  function augmentParent(){
    var modal=document.getElementById("bunny-parent-modal");if(!modal)return;
    var card=modal.querySelector(".bunny-premium-card");if(!card)return;
    var close=document.getElementById("bunny-parent-close");
    if(!document.getElementById("bunny-p4-report-open")){
      var report=document.createElement("button");report.id="bunny-p4-report-open";report.className="bunny-parent-action";report.textContent="📊 Weekly Learning Report";report.onclick=function(){modal.remove();showReport()};card.insertBefore(report,close||null);
    }
    if(!document.getElementById("bunny-p4-settings-open")){
      var settingsBtn=document.createElement("button");settingsBtn.id="bunny-p4-settings-open";settingsBtn.className="bunny-parent-action";settingsBtn.textContent="🌙 Weekly Goal & Bedtime Mode";settingsBtn.onclick=function(){modal.remove();showSettings()};card.insertBefore(settingsBtn,close||null);
    }
  }

  function decorateFamilyChooser(){
    var dmap=allData(),cards=[].slice.call(document.querySelectorAll(".bunny-family-card[data-kid]"));
    cards.forEach(function(c){var id=c.getAttribute("data-kid"),d=dmap[id],av=c.querySelector(".bunny-family-avatar");if(d&&d.avatar&&av)av.textContent=d.avatar});
  }

  function clickTracker(e){
    var b=e.target&&e.target.closest?e.target.closest("button"):null;if(!b)return;
    if(b.closest&&b.closest("#bunny-p4-modal,#bunny-p4-report"))return;
    var t=(b.innerText||b.textContent||"").trim(),m=detectModule(t);
    if(m&&isHome())markActivity("module",m.id);
    if(/^[A-Z]$/.test(t)||/^(?:[0-9]|10)$/.test(t))markActivity("tap");
    if(b.getAttribute&&b.getAttribute("data-game"))markActivity("game");
  }

  function celebrate(msg){
    showToast(msg);
    for(var i=0;i<24;i++){var c=document.createElement("span");c.className="bunny-p2-confetti";c.textContent=["🎉","⭐","🎈","✨","🌈"][i%5];c.style.left=((i*37)%100)+"vw";c.style.animationDelay=((i%8)*.03)+"s";document.body.appendChild(c);setTimeout(function(n){return function(){n.remove()}}(c),2800)}
  }
  function showToast(msg){
    var old=document.querySelector(".bunny-p4-toast");if(old)old.remove();
    var t=document.createElement("div");t.className="bunny-p4-toast";t.textContent=msg;document.body.appendChild(t);setTimeout(function(){t.remove()},1600);
  }

  function decorate(){renderHome();augmentParent();decorateFamilyChooser();applyNight()}

  function start(){
    if(!document.body)return;
    var d=data();if(!d.activity[today()])d.activity[today()]={taps:0,modules:0,games:0};save(d);
    document.addEventListener("click",clickTracker,true);
    var mo=new MutationObserver(function(){clearTimeout(observerTimer);observerTimer=setTimeout(decorate,100)});
    mo.observe(document.body,{childList:true,subtree:true});
    decorate();setInterval(applyNight,60000);
  }

  window.BunnyPhase4={
    avatar:showAvatarStudio,
    chest:showChest,
    report:showReport,
    recommend:showRecommendation,
    settings:showSettings,
    data:data
  };

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",function(){setTimeout(start,250)},{once:true});
  else setTimeout(start,250);
})();