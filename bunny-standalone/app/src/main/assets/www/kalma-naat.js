/* Pehla Kalma Tayyab — simple direct in-app voice for kids */
(function(){
  "use strict";

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
      '<span class="kalma-sub">Direct Offline Bunny Voice • Kids Friendly</span>';
    card.onclick=showModal;
    filterRow.parentElement.insertBefore(card,filterRow.nextSibling);
  }

  function voiceText(){
    return childName()+" मेरे साथ पढ़ो। पहला कलमा तय्यब। तय्यब माने पाक। ला इलाहा इल्लल्लाह। मुहम्मदुर रसूलुल्लाह।";
  }

  function setSpeakingUI(on){
    var status=document.getElementById("bunny-kalima-status");
    var moon=document.querySelector("#bunny-kalima-modal .bunny-kalima-moon");
    if(status)status.textContent=on?"🐰 Bunny पढ़ रही है... मेरे साथ दोहराओ":"✨ Ready — नीचे सुनो दबाओ";
    if(moon)moon.classList.toggle("kalma-speaking",!!on);
  }

  function speakCute(){
    stopVoice();
    setSpeakingUI(true);
    var text=voiceText();
    try{
      if(window.AndroidTTS&&typeof window.AndroidTTS.speakCute==="function"){
        window.AndroidTTS.speakCute(text);
        setTimeout(function(){setSpeakingUI(false)},8500);
        return;
      }
    }catch(e){}
    try{
      var u=new SpeechSynthesisUtterance(text);
      u.lang="hi-IN";u.rate=.72;u.pitch=1.18;
      u.onend=function(){setSpeakingUI(false)};
      u.onerror=function(){setSpeakingUI(false)};
      window.speechSynthesis.cancel();window.speechSynthesis.speak(u);
    }catch(e){setSpeakingUI(false)}
  }

  function stopVoice(){
    try{
      if(window.AndroidTTS&&typeof window.AndroidTTS.stop==="function")window.AndroidTTS.stop();
      else if(window.speechSynthesis)window.speechSynthesis.cancel();
    }catch(e){}
    setSpeakingUI(false);
  }

  function showModal(){
    var old=document.getElementById("bunny-kalima-modal");if(old)old.remove();
    var modal=document.createElement("div");
    modal.id="bunny-kalima-modal";
    modal.setAttribute("data-bunny-premium-ui","1");
    modal.innerHTML=
      '<div class="bunny-kalima-sheet">'+
        '<div class="bunny-kalima-top">'+
          '<div class="bunny-kalima-moon">🌙🐰🕌</div>'+
          '<div class="bunny-kalima-h1">Pehla Kalma Tayyab</div>'+
          '<div class="bunny-kalima-small">Bunny ke saath suno aur repeat karo</div>'+
        '</div>'+
        '<div class="bunny-kalima-learning">'+
          '<div class="bunny-kalima-rhyme">✨ Pehla Kalma Tayyab — Tayyab maane paak ✨</div>'+
          '<div class="bunny-kalima-arabic">لَا إِلٰهَ إِلَّا اللهُ مُحَمَّدٌ رَسُولُ اللهِ</div>'+
          '<div class="bunny-kalima-trans">La ilaha illallah<br>Muhammadur Rasulullah</div>'+
          '<div class="bunny-kalima-meaning">सरल मतलब: अल्लाह के सिवा कोई इबादत के लायक़ नहीं, और हज़रत मुहम्मद ﷺ अल्लाह के रसूल हैं।</div>'+
        '</div>'+
        '<div id="bunny-kalima-status" class="bunny-kalima-status">✨ Ready — नीचे सुनो दबाओ</div>'+
        '<button class="bunny-kalima-listen" id="bunny-kalima-listen">▶ सुनो</button>'+
        '<div class="bunny-kalima-actions bunny-kalima-simple-actions">'+
          '<button id="bunny-kalima-repeat">🔁 फिर से सुनो</button>'+
          '<button id="bunny-kalima-stop">⏹ रोकें</button>'+
        '</div>'+
        '<div class="bunny-kalima-help">बच्चे को बस <b>सुनो</b> दबाना है — voice app के अंदर ही चलेगी।</div>'+
        '<div class="bunny-kalima-stars">⭐ 🌙 ⭐ 🌙 ⭐</div>'+
        '<button id="bunny-kalima-close">वापस कविताओं में</button>'+
      '</div>';
    document.body.appendChild(modal);

    document.getElementById("bunny-kalima-listen").onclick=speakCute;
    document.getElementById("bunny-kalima-repeat").onclick=speakCute;
    document.getElementById("bunny-kalima-stop").onclick=stopVoice;
    document.getElementById("bunny-kalima-close").onclick=function(){
      stopVoice();modal.remove();
    };
    modal.addEventListener("click",function(e){
      if(e.target===modal){stopVoice();modal.remove()}
    });

    setTimeout(function(){
      if(document.getElementById("bunny-kalima-modal"))speakCute();
    },650);
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

  window.BunnyKalmaNaat={open:showModal,speak:speakCute,stop:stopVoice,text:voiceText};
})();