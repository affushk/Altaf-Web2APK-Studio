/* Pehla Kalma Tayyab — Urdu Bunny voice + live word/line karaoke */
(function(){
  "use strict";

  var VOICE_LINES=[
    {urdu:"پہلا کلمہ طیب",roman:"پہلا کلمہ طیب"},
    {urdu:"طیب معنی پاک",roman:"طیب معنی پاک"},
    {urdu:"لا الٰہ الا اللہ",roman:"لا اِلٰہَ اِلَّا اللہ"},
    {urdu:"محمد رسول اللہ",roman:"مُحَمَّدٌ رَسُولُ اللہ"}
  ];
  var URDU_TEXT=VOICE_LINES.map(function(x){return x.urdu}).join("۔ ")+"۔";
  var HINDI_FALLBACK="पहला कलमा तय्यब। तय्यब माने पाक। ला इलाहा इल्लल्लाह। मुहम्मदुर रसूलुल्लाह।";
  var voiceMode="urdu";
  var rangeSeen=false;
  var safetyTimer=null;
  var fallbackTimers=[];

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
    if(!heading){if(old)old.remove();return}
    if(old)return;

    var buttons=[].slice.call(document.querySelectorAll("button"));
    var allBtn=buttons.find(function(b){return (b.innerText||"").trim()==="सब"});
    if(!allBtn)return;
    var filterRow=allBtn.parentElement;
    if(!filterRow||!filterRow.parentElement)return;

    var card=document.createElement("button");
    card.id="bunny-kalima-card";
    card.type="button";
    card.setAttribute("aria-label","Pehla Kalma Tayyab Urdu Bunny voice");
    card.innerHTML=
      '<span class="kalma-emoji">🌙🐰🕌</span>'+
      '<span class="kalma-title">Pehla Kalma Tayyab</span>'+
      '<span class="kalma-sub">Pyari Urdu Bunny Voice • Live Word Highlight</span>';
    card.onclick=showModal;
    filterRow.parentElement.insertBefore(card,filterRow.nextSibling);
  }

  function buildKaraoke(){
    var cursor=0,globalWord=0,html="";
    VOICE_LINES.forEach(function(line,lineIndex){
      var uw=line.urdu.split(" "),rw=line.roman.split(" ");
      var urduWords=[];
      uw.forEach(function(word,i){
        var start=cursor,end=start+word.length;
        urduWords.push(
          '<span class="bunny-kalima-word" data-start="'+start+'" data-end="'+end+'" data-line="'+lineIndex+'" data-word="'+globalWord+'">'+word+'</span>'
        );
        cursor=end;
        if(i<uw.length-1)cursor+=1;
        globalWord++;
      });
      var firstWord=globalWord-uw.length;
      var romanWords=rw.map(function(word,i){
        return '<span class="bunny-kalima-roman-word" data-rword="'+(firstWord+i)+'">'+word+'</span>';
      }).join(" ");
      html+=
        '<div class="bunny-kalima-karaoke-line" data-kline="'+lineIndex+'">'+
          '<div class="bunny-kalima-urdu-live" dir="rtl">'+urduWords.join(" ")+'</div>'+
          '<div class="bunny-kalima-roman-live">'+romanWords+'</div>'+
        '</div>';
      cursor+=lineIndex<VOICE_LINES.length-1?2:1;
    });
    return html;
  }

  function clearTimers(){
    if(safetyTimer){clearTimeout(safetyTimer);safetyTimer=null}
    fallbackTimers.forEach(function(t){clearTimeout(t)});
    fallbackTimers=[];
  }

  function resetKaraoke(){
    clearTimers();
    rangeSeen=false;
    [].slice.call(document.querySelectorAll(".bunny-kalima-word,.bunny-kalima-roman-word")).forEach(function(x){
      x.classList.remove("active","done");
    });
    [].slice.call(document.querySelectorAll(".bunny-kalima-karaoke-line")).forEach(function(x){
      x.classList.remove("active","done");
    });
  }

  function activateByWordIndex(index){
    var words=[].slice.call(document.querySelectorAll(".bunny-kalima-word"));
    if(index<0||index>=words.length)return;
    var word=words[index];
    var line=Number(word.getAttribute("data-line"));

    words.forEach(function(x){
      var xi=Number(x.getAttribute("data-word"));
      x.classList.toggle("active",xi===index);
      if(xi<index)x.classList.add("done");
    });
    [].slice.call(document.querySelectorAll(".bunny-kalima-roman-word")).forEach(function(x){
      var xi=Number(x.getAttribute("data-rword"));
      x.classList.toggle("active",xi===index);
      if(xi<index)x.classList.add("done");
    });
    [].slice.call(document.querySelectorAll(".bunny-kalima-karaoke-line")).forEach(function(x){
      var li=Number(x.getAttribute("data-kline"));
      x.classList.toggle("active",li===line);
      if(li<line)x.classList.add("done");
    });

    var status=document.getElementById("bunny-kalima-status");
    if(status)status.textContent="🐰 Bunny पढ़ रही है — चमकता word साथ-साथ बोलो";
  }

  function activateByRange(start,end){
    var words=[].slice.call(document.querySelectorAll(".bunny-kalima-word"));
    var target=words.find(function(w){
      var s=Number(w.getAttribute("data-start")),e=Number(w.getAttribute("data-end"));
      return start<e && end>s;
    });
    if(target)activateByWordIndex(Number(target.getAttribute("data-word")));
  }

  function startFallbackKaraoke(delay){
    clearTimers();
    var words=[].slice.call(document.querySelectorAll(".bunny-kalima-word"));
    var step=voiceMode==="fallback"?720:680;
    words.forEach(function(_,i){
      fallbackTimers.push(setTimeout(function(){activateByWordIndex(i)},(delay||0)+i*step));
    });
  }

  function setSpeakingUI(on){
    var status=document.getElementById("bunny-kalima-status");
    var moon=document.querySelector("#bunny-kalima-modal .bunny-kalima-moon");
    if(status)status.textContent=on?"🐰 Urdu Bunny पढ़ रही है... चमकते word को देखो":"✨ Ready — सुनो दबाओ";
    if(moon)moon.classList.toggle("kalma-speaking",!!on);
  }

  function onVoiceMode(mode){
    voiceMode=mode==="fallback"?"fallback":"urdu";
    var badge=document.getElementById("bunny-kalima-voice-badge");
    if(badge)badge.textContent=voiceMode==="urdu"?"🇵🇰 Urdu Bunny Voice":"🐰 Soft Bunny Voice";
  }

  function onStart(){
    resetKaraoke();
    setSpeakingUI(true);
    if(voiceMode==="fallback"){
      startFallbackKaraoke(250);
    }else{
      safetyTimer=setTimeout(function(){
        if(!rangeSeen)startFallbackKaraoke(0);
      },850);
    }
  }

  function onRange(start,end){
    rangeSeen=true;
    if(safetyTimer){clearTimeout(safetyTimer);safetyTimer=null}
    fallbackTimers.forEach(function(t){clearTimeout(t)});
    fallbackTimers=[];
    activateByRange(Number(start),Number(end));
  }

  function onDone(){
    clearTimers();
    setSpeakingUI(false);
    [].slice.call(document.querySelectorAll(".bunny-kalima-word,.bunny-kalima-roman-word,.bunny-kalima-karaoke-line")).forEach(function(x){
      x.classList.remove("active");x.classList.add("done");
    });
    var status=document.getElementById("bunny-kalima-status");
    if(status)status.textContent="🌟 माशाअल्लाह! पूरा कलमा सुन लिया";
  }

  function speakUrdu(){
    stopVoice();
    resetKaraoke();
    try{
      if(window.AndroidTTS&&typeof window.AndroidTTS.speakUrduKalma==="function"){
        window.AndroidTTS.speakUrduKalma(URDU_TEXT,HINDI_FALLBACK);
        return;
      }
    }catch(e){}

    voiceMode="fallback";
    onVoiceMode("fallback");
    onStart();
    try{
      var u=new SpeechSynthesisUtterance(URDU_TEXT);
      u.lang="ur-PK";u.rate=.66;u.pitch=1.07;
      u.onend=onDone;u.onerror=onDone;
      window.speechSynthesis.cancel();window.speechSynthesis.speak(u);
    }catch(e){
      startFallbackKaraoke(0);
      setTimeout(onDone,8200);
    }
  }

  function stopVoice(){
    clearTimers();
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
          '<div id="bunny-kalima-voice-badge" class="bunny-kalima-voice-badge">🇵🇰 Urdu Bunny Voice</div>'+
          '<div class="bunny-kalima-small">'+childName()+', Bunny ke saath suno aur repeat karo</div>'+
        '</div>'+
        '<div class="bunny-kalima-learning">'+
          '<div class="bunny-kalima-rhyme">✨ Pehla Kalma Tayyab — Tayyab maane paak ✨</div>'+
          '<div class="bunny-kalima-arabic">لَا إِلٰهَ إِلَّا اللهُ مُحَمَّدٌ رَسُولُ اللهِ</div>'+
          '<div class="bunny-kalima-meaning">सरल मतलब: अल्लाह के सिवा कोई इबादत के लायक़ नहीं, और हज़रत मुहम्मद ﷺ अल्लाह के रसूल हैं।</div>'+
        '</div>'+
        '<div class="bunny-kalima-live-title">✨ Live Urdu Reading — जो word बोले वही चमकेगा</div>'+
        '<div id="bunny-kalima-karaoke">'+buildKaraoke()+'</div>'+
        '<div id="bunny-kalima-status" class="bunny-kalima-status">✨ Ready — सुनो दबाओ</div>'+
        '<button class="bunny-kalima-listen" id="bunny-kalima-listen">▶ सुनो</button>'+
        '<div class="bunny-kalima-actions bunny-kalima-simple-actions">'+
          '<button id="bunny-kalima-repeat">🔁 फिर से सुनो</button>'+
          '<button id="bunny-kalima-stop">⏹ रोकें</button>'+
        '</div>'+
        '<div class="bunny-kalima-help">नीचे पूरी reading Urdu में है। Voice के साथ वही Urdu word highlight होगा ताकि बच्चे आसानी से follow कर सकें।</div>'+
        '<div class="bunny-kalima-stars">⭐ 🌙 ⭐ 🌙 ⭐</div>'+
        '<button id="bunny-kalima-close">वापस कविताओं में</button>'+
      '</div>';
    document.body.appendChild(modal);

    document.getElementById("bunny-kalima-listen").onclick=speakUrdu;
    document.getElementById("bunny-kalima-repeat").onclick=speakUrdu;
    document.getElementById("bunny-kalima-stop").onclick=stopVoice;
    document.getElementById("bunny-kalima-close").onclick=function(){stopVoice();modal.remove()};
    modal.addEventListener("click",function(e){
      if(e.target===modal){stopVoice();modal.remove()}
    });

    setTimeout(function(){
      if(document.getElementById("bunny-kalima-modal"))speakUrdu();
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

  window.BunnyKalmaNaat={
    open:showModal,
    speak:speakUrdu,
    stop:stopVoice,
    text:function(){return URDU_TEXT},
    fallbackText:function(){return HINDI_FALLBACK},
    onVoiceMode:onVoiceMode,
    onStart:onStart,
    onRange:onRange,
    onDone:onDone
  };
})();