/* Pehla Kalma Tayyab — added to Poems without copying YouTube audio */
(function(){
  "use strict";

  var YT_ID="jSoEVLNeHw0";
  var YT_WATCH="https://www.youtube.com/watch?v="+YT_ID;
  var YT_EMBED="https://www.youtube.com/embed/"+YT_ID+"?playsinline=1&rel=0&modestbranding=1";

  function childName(){
    try{
      if(window.BunnyPhase2&&typeof window.BunnyPhase2.active==="function"){
        var p=window.BunnyPhase2.active(); if(p&&p.name)return p.name;
      }
      if(window.BunnyProfile&&typeof window.BunnyProfile.get==="function"){
        var q=window.BunnyProfile.get(); if(q&&q.name)return q.name;
      }
    }catch(e){}
    return "बच्चा";
  }

  function isPoemHome(){
    var heading=[].slice.call(document.querySelectorAll("h2")).find(function(h){
      return (h.innerText||"").indexOf("कविताओं का संसार")>=0;
    });
    if(!heading)return null;
    var buttons=[].slice.call(document.querySelectorAll("button"));
    var hasAll=buttons.some(function(b){return (b.innerText||"").trim()==="सब"});
    var hasHindi=buttons.some(function(b){return (b.innerText||"").trim()==="हिंदी"});
    return hasAll&&hasHindi?heading:null;
  }

  function addCard(){
    var heading=isPoemHome();
    var old=document.getElementById("bunny-kalima-card");
    if(!heading){ if(old)old.remove(); return; }
    if(old)return;

    var buttons=[].slice.call(document.querySelectorAll("button"));
    var allBtn=buttons.find(function(b){return (b.innerText||"").trim()==="सब"});
    if(!allBtn)return;
    var filterRow=allBtn.parentElement;
    if(!filterRow||!filterRow.parentElement)return;

    var card=document.createElement("button");
    card.id="bunny-kalima-card";
    card.type="button";
    card.setAttribute("aria-label","Pehla Kalma Tayyab kids naat");
    card.innerHTML=
      '<span class="kalma-emoji">🌙🕌</span>'+
      '<span class="kalma-title">Pehla Kalma Tayyab</span>'+
      '<span class="kalma-sub">Islamic Kids Naat • Cute voice • YouTube + Offline</span>';
    card.onclick=showModal;
    filterRow.parentElement.insertBefore(card,filterRow.nextSibling);
  }

  function offlineText(){
    var name=childName();
    return name+", mere saath padhो. Pehla Kalma Tayyab. Tayyab maane paak. La ilaha illallah. Muhammadur Rasulullah.";
  }

  function speakCute(){
    var text=offlineText();
    try{
      if(window.AndroidTTS&&typeof window.AndroidTTS.speakCute==="function"){
        window.AndroidTTS.speakCute(text);
        return;
      }
    }catch(e){}
    try{
      var u=new SpeechSynthesisUtterance(text);
      u.lang="hi-IN";u.rate=.78;u.pitch=1.22;
      window.speechSynthesis.cancel();window.speechSynthesis.speak(u);
    }catch(e){}
  }

  function stopVoice(){
    try{
      if(window.AndroidTTS&&typeof window.AndroidTTS.stop==="function")window.AndroidTTS.stop();
      else if(window.speechSynthesis)window.speechSynthesis.cancel();
    }catch(e){}
  }

  function openYoutube(){
    try{
      if(window.AndroidTTS&&typeof window.AndroidTTS.openUrl==="function"){
        window.AndroidTTS.openUrl(YT_WATCH);return;
      }
    }catch(e){}
    try{window.open(YT_WATCH,"_blank")}catch(e){}
  }

  function showModal(){
    var old=document.getElementById("bunny-kalima-modal");if(old)old.remove();
    var modal=document.createElement("div");
    modal.id="bunny-kalima-modal";
    modal.setAttribute("data-bunny-premium-ui","1");
    modal.innerHTML=
      '<div class="bunny-kalima-sheet">'+
        '<div class="bunny-kalima-top">'+
          '<div class="bunny-kalima-moon">🌙🕌</div>'+
          '<div class="bunny-kalima-h1">Pehla Kalma Tayyab</div>'+
          '<div class="bunny-kalima-small">Kids Learning • Repeat with Bunny</div>'+
        '</div>'+
        '<div class="bunny-kalima-learning">'+
          '<div class="bunny-kalima-rhyme">✨ Pehla Kalma Tayyab — Tayyab maane paak ✨</div>'+
          '<div class="bunny-kalima-arabic">لَا إِلٰهَ إِلَّا اللهُ مُحَمَّدٌ رَسُولُ اللهِ</div>'+
          '<div class="bunny-kalima-trans">La ilaha illallah<br>Muhammadur Rasulullah</div>'+
          '<div class="bunny-kalima-meaning">सरल मतलब: अल्लाह के सिवा कोई इबादत के लायक़ नहीं, और हज़रत मुहम्मद ﷺ अल्लाह के रसूल हैं।</div>'+
        '</div>'+
        '<div class="bunny-kalima-actions">'+
          '<button id="bunny-kalima-offline">🐰 Offline Cute Voice</button>'+
          '<button id="bunny-kalima-video-toggle">▶️ YouTube Kids Voice</button>'+
        '</div>'+
        '<div class="bunny-kalima-video" id="bunny-kalima-video">'+
          '<iframe id="bunny-kalima-frame" title="Pehla Kalma Tayyab Kids Video" allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>'+
          '<div class="bunny-kalima-video-note">Official YouTube player • Internet required • Audio is not copied into the APK</div>'+
          '<button id="bunny-kalima-youtube-open">Open in YouTube ▶</button>'+
        '</div>'+
        '<div class="bunny-kalima-stars">⭐ 🌙 ⭐ 🌙 ⭐</div>'+
        '<button id="bunny-kalima-close">वापस कविताओं में</button>'+
      '</div>';
    document.body.appendChild(modal);

    document.getElementById("bunny-kalima-offline").onclick=speakCute;
    document.getElementById("bunny-kalima-video-toggle").onclick=function(){
      stopVoice();
      var box=document.getElementById("bunny-kalima-video");
      var frame=document.getElementById("bunny-kalima-frame");
      var opening=!box.classList.contains("open");
      box.classList.toggle("open",opening);
      if(opening&&!frame.getAttribute("src"))frame.setAttribute("src",YT_EMBED);
      if(!opening)frame.setAttribute("src","");
    };
    document.getElementById("bunny-kalima-youtube-open").onclick=openYoutube;
    document.getElementById("bunny-kalima-close").onclick=function(){
      stopVoice();
      var frame=document.getElementById("bunny-kalima-frame");if(frame)frame.setAttribute("src","");
      modal.remove();
    };
    modal.addEventListener("click",function(e){
      if(e.target===modal){
        stopVoice();
        var frame=document.getElementById("bunny-kalima-frame");if(frame)frame.setAttribute("src","");
        modal.remove();
      }
    });
  }

  var timer=null;
  function start(){
    addCard();
    var mo=new MutationObserver(function(){
      clearTimeout(timer);timer=setTimeout(addCard,100);
    });
    mo.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();

  window.BunnyKalmaNaat={open:showModal,speak:speakCute,youtube:openYoutube};
})();