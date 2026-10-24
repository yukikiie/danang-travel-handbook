
  (()=>{'use strict';
    const $=id=>document.getElementById(id), base=JSON.parse($('trip-data').textContent), copy=x=>JSON.parse(JSON.stringify(x));
    const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)};
    const key='danang-paper-journey-v3:'+location.pathname,legacyKey='danang-travel-book-ja-v2:'+location.pathname+':9q7qpk';let trip=copy(base),checks={},activeDay=0,draft=null,editingDay=0,toastTimer;
    function storageRead(k){try{return localStorage.getItem(k)}catch{$('storage-warning').classList.remove('hidden');return null}}
    function storageWrite(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch{$('storage-warning').classList.remove('hidden');return false}}
    function dateAt(start,offset=0){const [y,m,d]=start.split('-').map(Number);return new Date(y,m-1,d+offset,12)}
    function dateOK(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=dateAt(s);return !isNaN(d)&&d.getFullYear()>=2000&&d.getFullYear()<=2100&&[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')===s}
    function validTrip(t){return t&&typeof t.title==='string'&&t.title.trim()&&typeof t.subtitle==='string'&&typeof t.eyebrow==='string'&&typeof t.note==='string'&&dateOK(t.start)&&Array.isArray(t.days)&&t.days.length>=1&&t.days.length<=21&&t.days.every(d=>d&&typeof d.title==='string'&&typeof d.note==='string'&&Array.isArray(d.stops)&&d.stops.every(s=>s&&['time','type','title','note','url'].every(k=>typeof s[k]==='string')))&&Array.isArray(t.flights)&&t.flights.length===2&&t.flights.every(f=>f&&['label','code','from','to','depart','arrive','note'].every(k=>typeof f[k]==='string'))&&Array.isArray(t.checklist)&&t.checklist.every(s=>typeof s==='string')&&Array.isArray(t.stays)&&t.stays.every(s=>s&&['role','name','address','phone','note','url'].every(k=>typeof s[k]==='string'))}
    try{const saved=JSON.parse(storageRead(key)),legacy=JSON.parse(storageRead(legacyKey));if(validTrip(saved))trip=saved;else if(validTrip(legacy)){trip=legacy;storageWrite(key,trip)}}catch{}
    // Update only the untouched former city day, preserving personal edits.
    if(trip.days[1]?.title==='ダナンで、のんびり'&&hash(JSON.stringify(trip.days[1]))==='1oetfet'){trip.days[1]=copy(base.days[1]);storageWrite(key,trip)}
    // Apply the confirmed hotel once, leaving customized or deleted stops untouched.
    const hotelRevision='sala-2026-10-24-v1',revisions=Array.isArray(trip.dataRevisions)?trip.dataRevisions:[];
    if(!revisions.includes(hotelRevision)){
      if(trip.start===base.start&&trip.days.length===4){
        const updateHotelStops=trip.stays.length===0||(trip.stays.length===1&&trip.stays[0].name===base.stays[0].name);
        if(trip.stays.length===0)trip.stays=copy(base.stays);
        if(updateHotelStops)[[0,'1lz8thn',2],[3,'xwmx4h',2]].forEach(([dayIndex,previousHash,newIndex])=>{
          const stops=trip.days[dayIndex].stops,index=stops.findIndex(stop=>hash(JSON.stringify(['time','type','title','note','url'].map(prop=>stop[prop])))===previousHash);
          if(index>=0)stops[index]=copy(base.days[dayIndex].stops[newIndex]);
        });
      }
      trip.dataRevisions=[...revisions,hotelRevision];storageWrite(key,trip);
    }
    const isEntryReminder=item=>/入国前申告|事前入国申告|pre[- ]?arrival/i.test(item);
    const entryRevision='entry-declaration-2026-10-24-v1',entryRevisions=Array.isArray(trip.dataRevisions)?trip.dataRevisions:[];
    if(!entryRevisions.includes(entryRevision)){
      const reminder=base.checklist.find(isEntryReminder);
      if(reminder&&!trip.checklist.some(isEntryReminder))trip.checklist.splice(Math.min(1,trip.checklist.length),0,reminder);
      trip.dataRevisions=[...entryRevisions,entryRevision];storageWrite(key,trip);
    }
    try{const saved=JSON.parse(storageRead(key+':checks')||storageRead(legacyKey+':checks'));if(saved&&typeof saved==='object'&&!Array.isArray(saved))checks=saved}catch{}
    const fmt=(d,options)=>new Intl.DateTimeFormat('ja-JP',options).format(d);
    const text=(tag,value,cls)=>{const n=document.createElement(tag);n.textContent=value;if(cls)n.className=cls;return n};
    function safeURL(value){try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}}
    function link(label,url){const valid=safeURL(url);if(!valid)return null;const external=label.endsWith(' ↗'),a=text('a',external?label.slice(0,-2):label);a.href=valid;a.target='_blank';a.rel='noopener noreferrer';if(external){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 16 16');svg.setAttribute('class','external-link-icon');svg.setAttribute('aria-hidden','true');const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d','M4 12L12 4M4 4H12V12');path.setAttribute('fill','none');path.setAttribute('stroke','currentColor');path.setAttribute('stroke-width','1.8');path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-linejoin','round');svg.append(path);a.append(svg)}return a}
    function toast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').classList.remove('hidden');toastTimer=setTimeout(()=>$('toast').classList.add('hidden'),4500)}
    function tripDateLabel(){const start=dateAt(trip.start),end=dateAt(trip.start,trip.days.length-1),compact=d=>String(d.getMonth()+1).padStart(2,'0')+'/'+String(d.getDate()).padStart(2,'0')+'（'+'日月火水木金土'[d.getDay()]+'）';return compact(start)+' – '+compact(end)}
    function countdown(){const now=new Date(),today=Date.UTC(now.getFullYear(),now.getMonth(),now.getDate()),start=dateAt(trip.start),target=Date.UTC(start.getFullYear(),start.getMonth(),start.getDate()),diff=Math.round((target-today)/86400000);if(diff>0){$('countdown-top').textContent='出発まで';$('countdown-number').textContent=diff;$('countdown-bottom').textContent='日'}else if(-diff<trip.days.length){$('countdown-top').textContent='旅行中';$('countdown-number').textContent=(1-diff)+'日目';$('countdown-bottom').textContent='ゆったり楽しもう'}else{$('countdown-top').textContent='旅の思い出';$('countdown-number').replaceChildren(doodle('heart'));$('countdown-bottom').textContent='大切に残そう'}}
    function render(){document.title=trip.title+'｜旅のしおり';$('trip-title').textContent=trip.title;$('trip-eyebrow').textContent=trip.eyebrow;$('trip-subtitle').textContent=trip.subtitle;$('trip-note').textContent=trip.note;$('sample-label').textContent=trip.sample?'サンプルのしおりです。自分の旅程に変更できます。':'ダナンの旅のしおり。';$('trip-length').textContent=Math.max(0,trip.days.length-1)+'泊'+trip.days.length+'日';$('trip-dates').textContent=tripDateLabel();countdown();renderFlights();renderTabs();renderDay();renderChecks();renderStays();$('accommodation').hidden=!trip.stays.length;window.dispatchEvent(new CustomEvent('tripchange',{detail:{trip:copy(trip)}}))}
    function doodle(kind){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 48 48');svg.setAttribute('class','doodle-icon');svg.setAttribute('aria-hidden','true');const use=document.createElementNS('http://www.w3.org/2000/svg','use');use.setAttribute('href','#doodle-'+kind);svg.append(use);return svg}
    function flightMinutes(flight){
      if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(flight.depart)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(flight.arrive))return null;
      const offsets={HKG:480,DAD:420},from=(flight.from.match(/\b(HKG|DAD)\b/)||[])[1],to=(flight.to.match(/\b(HKG|DAD)\b/)||[])[1];
      if(!from||!to)return null;
      const minutes=value=>{const [h,m]=value.split(':').map(Number);return h*60+m};
      const duration=(minutes(flight.arrive)-offsets[to]-minutes(flight.depart)+offsets[from]+1440)%1440;
      return duration||null;
    }
    function renderFlights(){
      $('flight-cards').replaceChildren();trip.flights.forEach((f,i)=>{
        const card=text('article','','flight'),head=text('div','','flight-head');
        head.append(text('span',f.label+' · '+fmt(dateAt(trip.start,i?trip.days.length-1:0),{day:'numeric',month:'short'})),text('span',f.code));
        const route=text('div','','flight-route'),left=text('div',''),right=text('div',''),path=text('div','','flight-path');
        left.append(text('div',f.depart,'flight-time'),text('div',f.from,'airport'));right.append(text('div',f.arrive,'flight-time'),text('div',f.to,'airport'));
        const planeMarker=text('span','');planeMarker.append(doodle('airplane'));path.append(planeMarker);
        const duration=flightMinutes(f);if(duration!==null)path.append(text('small',Math.floor(duration/60)+'h '+String(duration%60).padStart(2,'0')+'m','flight-duration'));
        path.setAttribute('aria-hidden','true');route.append(left,path,right);card.append(head,route,text('p',f.note,'flight-note'));$('flight-cards').append(card);
      });
    }
    let markerSlide=null,markerBounce=null,markerRoll=null;
    const reducedMotion=window.matchMedia('(prefers-reduced-motion:reduce)');
    function positionDateMarker(animate=false){
      const rail=$('day-tabs'),marker=$('date-marker'),tab=$('day-tab-'+activeDay);if(!marker||!tab)return;
      const railRect=rail.getBoundingClientRect(),tabRect=tab.getBoundingClientRect(),markerRect=marker.getBoundingClientRect();
      const target=tabRect.left-railRect.left+rail.scrollLeft+(tabRect.width-markerRect.width)/2;
      const from=markerRect.left-railRect.left+rail.scrollLeft;
      if(markerSlide)markerSlide.cancel();if(markerBounce)markerBounce.cancel();if(markerRoll)markerRoll.cancel();
      marker.style.transform='translateX('+target+'px)';marker.dataset.day=String(activeDay);
      if(!animate||reducedMotion.matches)return;
      if(Math.abs(target-from)>.5){markerSlide=marker.animate([{transform:'translateX('+from+'px)'},{transform:'translateX('+target+'px)'}],{duration:440,easing:'cubic-bezier(.22,.75,.25,1)'});}
      const ball=marker.querySelector('.marker-ball'),icon=ball.querySelector('svg');
      markerBounce=ball.animate([
        {transform:'translateY(0) scale(1,1)',offset:0},
        {transform:'translateY(2px) scale(1.12,.88)',offset:.12},
        {transform:'translateY(-23px) scale(.98,1.02)',offset:.42},
        {transform:'translateY(0) scale(1.09,.91)',offset:.73},
        {transform:'translateY(-5px) scale(.99,1.01)',offset:.87},
        {transform:'translateY(0) scale(1,1)',offset:1}
      ],{duration:600,easing:'ease-in-out'});
      markerRoll=icon.animate([{transform:'rotate(0deg)'},{transform:'rotate('+(target>=from?360:-360)+'deg)'}],{duration:560,easing:'ease-out'});
    }
    function selectDay(index){
      activeDay=index;const tabs=$('day-tabs').querySelectorAll('.day-tab');
      tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1});
      positionDateMarker(true);renderDay();tabs[index].focus({preventScroll:true});
    }
    function renderTabs(){
      activeDay=Math.min(activeDay,trip.days.length-1);const rail=$('day-tabs');rail.replaceChildren();
      trip.days.forEach((day,i)=>{
        const d=dateAt(trip.start,i),tab=text('button','','day-tab');tab.type='button';tab.id='day-tab-'+i;tab.role='tab';
        tab.setAttribute('aria-controls','day-panel');tab.setAttribute('aria-selected',String(i===activeDay));tab.tabIndex=i===activeDay?0:-1;
        tab.setAttribute('aria-label',(i+1)+'日目、'+fmt(d,{weekday:'long',day:'numeric',month:'long'}));
        const label=String(d.getMonth()+1).padStart(2,'0')+'/'+String(d.getDate()).padStart(2,'0');
        tab.append(text('strong',label),text('small',fmt(d,{weekday:'short'})));
        tab.onclick=()=>selectDay(i);
        tab.onkeydown=e=>{let next=activeDay;if(e.key==='ArrowRight')next=(activeDay+1)%trip.days.length;else if(e.key==='ArrowLeft')next=(activeDay-1+trip.days.length)%trip.days.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=trip.days.length-1;else return;e.preventDefault();selectDay(next)};
        rail.append(tab);
      });
      const marker=text('span','','date-marker');marker.id='date-marker';marker.setAttribute('aria-hidden','true');const ball=text('span','','marker-ball');ball.append(doodle('sun'));marker.append(ball);rail.append(marker);positionDateMarker(false);
    }
    function stopCategory(stop){if(['train','walk'].includes(stop.type))return 'transport';if(stop.type==='plan')return 'activity';return 'other'}
    const flightTimePattern=/^([01]\d|2[0-3]):[0-5]\d$/;
    function scheduledFlight(stop){
      if(stop.type!=='train'||!flightTimePattern.test(stop.time))return null;
      return trip.flights.find((flight,index)=>{
        if(activeDay!==(index?trip.days.length-1:0))return false;
        const code=flight.code.trim(),destination=flight.to.replace(/\s+[A-Z]{3}$/,'').trim();
        const departure=stop.time===flight.depart&&((code&&stop.title.includes(code))||/出発/.test(stop.title));
        const arrival=stop.time===flight.arrive&&/到着/.test(stop.title)&&destination&&stop.title.includes(destination);
        return departure||arrival;
      })||null;
    }
    function approximateFlightDuration(flight){
      const total=flightMinutes(flight);if(total===null)return '';
      const hours=Math.floor(total/60),mins=total%60;
      return '約 '+[hours?hours+'時間':'',mins?mins+'分':''].filter(Boolean).join(' ');
    }
    const summarySceneReplays=new WeakMap();let visibleSummaryDay=null,summarySceneObserver=null,summarySceneRevealed=false;
    function playSummaryScene(button){
      if(reducedMotion.matches||!button.isConnected)return;
      summarySceneRevealed=true;if(summarySceneObserver){summarySceneObserver.disconnect();summarySceneObserver=null}
      for(const animation of summarySceneReplays.get(button)||[])animation.cancel();
      const kind=button.dataset.scene,target=button.querySelector('.scene-motion'),animations=[];
      const poses=kind==='coast'?[
        {transform:'translate(-9px,2px)',offset:0},{transform:'translate(13px,-3px)',offset:.55},{transform:'translate(0,0)'}
      ]:kind==='lantern'?[
        {transform:'rotate(-5deg)',offset:0},{transform:'rotate(6deg)',offset:.35},{transform:'rotate(-3deg)',offset:.7},{transform:'rotate(0deg)'}
      ]:kind==='return'?[
        {transform:'translate(-28px,-24px) rotate(-5deg)',opacity:.2,offset:0},{transform:'translate(2px,-4px) rotate(2deg)',opacity:1,offset:.35},{transform:'translate(18px,9px) rotate(4deg)',opacity:1,offset:.65},{transform:'translate(0,0) rotate(0deg)',opacity:1}
      ]:[
        {transform:'translate(-26px,18px) rotate(-7deg)',opacity:.2,offset:0},{transform:'translate(0,0) rotate(0deg)',opacity:1,offset:.3},{transform:'translate(24px,-21px) rotate(-6deg)',opacity:1,offset:.6},{transform:'translate(5px,-4px) rotate(2deg)',opacity:1,offset:.84},{transform:'translate(0,0) rotate(0deg)',opacity:1}
      ];
      animations.push(target.animate(poses,{duration:1450,easing:'cubic-bezier(.22,.68,.25,1)'}));
      button.querySelectorAll('.scene-sparkle,.scene-star').forEach((sparkle,index)=>{
        animations.push(sparkle.animate([{opacity:.15,transform:'scale(.4) rotate(-15deg)'},{opacity:1,transform:'scale(1.5) rotate(15deg)',offset:.45},{opacity:1,transform:'scale(1) rotate(0deg)'}],{duration:700,delay:index*65,easing:'ease-out'}));
      });
      summarySceneReplays.set(button,animations);
    }
    function makeSummaryScene(kind){
      const button=text('button','','summary-scene-button '+kind+'-scene-button');button.type='button';button.dataset.scene=kind;
      const label={flight:'飛行機のアニメーションを再生',coast:'海辺のアニメーションを再生',bana:'バーナーヒルズのアニメーションを再生',lantern:'ホイアンの灯籠アニメーションを再生',return:'帰りのフライトのアニメーションを再生'}[kind];
      button.setAttribute('aria-label',label);button.title=label;
      button.append($(kind+'-scene-template').content.firstElementChild.cloneNode(true));
      button.onclick=()=>playSummaryScene(button);return button;
    }
    function revealSummaryScene(button){
      if(reducedMotion.matches)return;
      if(!('IntersectionObserver' in window)){playSummaryScene(button);return}
      const observer=new IntersectionObserver(entries=>{
        if(!entries.some(entry=>entry.isIntersecting&&entry.intersectionRatio>=.45))return;
        observer.disconnect();if(summarySceneObserver===observer)summarySceneObserver=null;
        playSummaryScene(button);
      },{threshold:.45});
      summarySceneObserver=observer;observer.observe(button);
    }
    function renderDay(){
      const enteringDay=visibleSummaryDay!==activeDay;visibleSummaryDay=activeDay;if(enteringDay)summarySceneRevealed=false;
      if(summarySceneObserver){summarySceneObserver.disconnect();summarySceneObserver=null}
      const day=trip.days[activeDay],panel=$('day-panel');panel.replaceChildren();panel.setAttribute('aria-labelledby','day-tab-'+activeDay);
      const summary=text('div','','day-summary');summary.style.background=['var(--coral)','var(--yellow)','var(--blue)','var(--green)'][activeDay%4];
      summary.classList.add('illustrated-summary');const kind=day.title.includes('バーナー')?'bana':activeDay===0?'flight':activeDay===trip.days.length-1?'return':activeDay%2?'coast':'lantern';
      const sceneButton=makeSummaryScene(kind);summary.append(sceneButton);
      const intro=text('div','','summary-copy');intro.append(text('small',(activeDay+1)+'日目'),text('h3',day.title));summary.append(intro);
      const timeline=text('ol','','timeline');
      const stops=day.stops;
      stops.forEach(stop=>{
        const li=text('li','','stop'),time=text('time',stop.time),body=text('div','','stop-body'),card=text('div','','stop-card');
        li.dataset.category=stopCategory(stop);
        if(/^\d{2}:\d{2}$/.test(stop.time))time.dateTime=stop.time;
        const types={walk:'散歩',food:'食事',train:'移動',plan:'観光',other:'その他'},type=types[stop.type]?stop.type:'other';
        const flight=scheduledFlight(stop);
        if(type!=='plan'){
          const badge=text('span',flight?'':types[type],'tag-label '+type+(flight?' flight-tag':''));
          if(flight){badge.setAttribute('role','img');badge.setAttribute('aria-label','フライトで移動');badge.append(doodle('airplane'));li.classList.add('flight-stop')}
          card.append(badge);
        }
        card.append(text('h4',stop.title));if(stop.note)card.append(text('p',stop.note));
        if(flight&&stop.time===flight.depart){const duration=approximateFlightDuration(flight);if(duration)card.append(text('p',duration,'stop-duration'))}
        const a=link('地図・詳細を見る ↗',stop.url);if(a)card.append(a);
        body.append(card);if(['train','walk'].includes(stop.type))li.classList.add('transport');li.append(time,body);timeline.append(li);
      });
      if(!stops.length){
        const empty=text('li','','filter-empty');
        empty.append(text('p','この日はまだ予定がありません。「内容を編集」から追加できます。'));
        timeline.append(empty);
      }
      panel.append(summary,timeline);
      scheduleSummaryMeasure();
      if(sceneButton&&!summarySceneRevealed)revealSummaryScene(sceneButton);
      if(!reducedMotion.matches){panel.getAnimations().forEach(animation=>animation.cancel());panel.animate([{opacity:0,transform:'translateY(7px) scale(.985)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:260,easing:'cubic-bezier(.2,.85,.3,1.15)'})}
    }
    function checkKey(item){return hash(item)}
    function renderChecks(){
      $('checklist').replaceChildren();
      trip.checklist.forEach(item=>{
        const li=document.createElement('li'),label=text('label','','check-label'),input=document.createElement('input');
        input.type='checkbox';input.checked=checks[checkKey(item)]===true;
        input.onchange=()=>{checks[checkKey(item)]=input.checked;storageWrite(key+':checks',checks);updateCheckProgress()};
        label.append(input,text('span',item));li.append(label);
        if(isEntryReminder(item)){
          const details=text('div','','entry-reminder-details');
          details.append(text('p','申告の目安：'+fmt(dateAt(trip.start,-3),{month:'long',day:'numeric'})+'〜'+fmt(dateAt(trip.start),{month:'long',day:'numeric'})+'（到着72時間前以降）。'),text('p','旅券、往路の便名・到着日時、ホテルの住所を準備。ビザの要否は使用する旅券ごとに別途確認してください。'));
          const links=text('div','','entry-reminder-links');
          links.append(link('公式の入国前申告フォーム ↗','https://prearrival.immigration.gov.vn/'),link('公式案内 ↗','https://hanoi.mfa.gov.sg/mission-updates/pre-arrival-declaration-for-foreign-travellers-entering-vietnam/'));
          details.append(links);li.append(details);
        }
        $('checklist').append(li);
      });
      if(!trip.checklist.length)$('checklist').append(text('li','持ち物はまだ登録されていません。「内容を編集」から追加できます。','check-progress'));
      updateCheckProgress();
    }
    function updateCheckProgress(){const n=trip.checklist.filter(item=>checks[checkKey(item)]===true).length;$('check-progress').textContent=n+' / '+trip.checklist.length+' 項目の準備が完了';$('reset-checks').disabled=n===0}
    function renderStays(){
      $('stay-cards').replaceChildren();
      trip.stays.forEach((stay,i)=>{
        const card=text('article','','hotel-card');
        const head=text('div','','hotel-head');head.append(text('span',stay.role),text('span','宿泊'));
        const body=text('div','','hotel-body');body.append(text('h3',stay.name),text('p',stay.address,'hotel-address'));
        if(stay.phone){const phone=text('a',stay.phone,'hotel-phone');phone.href='tel:'+stay.phone.replace(/[^+0-9]/g,'');body.append(phone)}
        body.append(text('p',stay.note,'hotel-route'));
        const a=link('宿泊先の地図を見る ↗',stay.url);if(a){a.className='button small quiet';body.append(a)}
        card.append(head,body);$('stay-cards').append(card);
      });
      if(!trip.stays.length){const card=text('article','','hotel-card'),head=text('div','','hotel-head'),body=text('div','','hotel-body');head.append(text('span','宿泊情報'),text('span','宿泊情報'));body.append(text('h3','宿泊先を入力'),text('p','「内容を編集」から予約済みの宿泊先、住所、移動のメモを入力できます。','hotel-address'));card.append(head,body);$('stay-cards').append(card)}
    }
    function editorError(message){$('editor-error').textContent=message;$('editor-error').classList.remove('hidden');$('editor-error').scrollIntoView({block:'nearest'})}
    function saveDraftDay(){if(!draft)return;draft.days[editingDay].title=$('edit-day-title').value.trim();draft.days[editingDay].note=$('edit-day-note').value.trim();draft.days[editingDay].stops=$('edit-stops').value.split('\n').map(line=>line.trim()).filter(Boolean).map(line=>{const [time='',type='plan',title='',note='',...urlParts]=line.split('|').map(s=>s.trim());return {time,type,title,note,url:urlParts.join('|')}})}
    function renderDayEditor(){const select=$('edit-day');select.replaceChildren();draft.days.forEach((d,i)=>{const o=text('option',(i+1)+'日目 · '+fmt(dateAt($('edit-start').value||draft.start,i),{day:'numeric',month:'short'}));o.value=i;select.append(o)});select.value=editingDay;const day=draft.days[editingDay];$('edit-day-title').value=day.title;$('edit-day-note').value=day.note;$('edit-stops').value=day.stops.map(s=>[s.time,s.type,s.title,s.note,s.url].join(' | ').replace(/( \| )+$/,'')).join('\n');$('remove-day').disabled=draft.days.length<=1;$('add-day').disabled=draft.days.length>=21}
    function renderFlightEditor(){$('flight-editor').replaceChildren();draft.flights.forEach((f,i)=>{const heading=text('p',i?'復路のフライト':'往路のフライト','field-label');$('flight-editor').append(heading);const fields=[['label','カードの見出し'],['code','便名'],['from','出発空港'],['to','到着空港'],['depart','出発時刻'],['arrive','到着時刻'],['note','フライトのメモ']];fields.forEach(([prop,label])=>{const field=text('div','','field'),l=text('label',label),input=document.createElement('input');l.htmlFor='flight-'+i+'-'+prop;input.id=l.htmlFor;input.value=f[prop];input.maxLength=prop==='note'?180:80;input.oninput=()=>{draft.flights[i][prop]=input.value};field.append(l,input);$('flight-editor').append(field)})})}
    const appearanceGroups=[
      {id:'hero',label:'メインタイトル',selector:'.hero h1',sample:'ダナン 3泊4日',size:36},
      {id:'eyebrow',label:'旅の短い見出し',selector:'.eyebrow',sample:'ベトナム · ゆったり旅・休憩多め',size:18},
      {id:'tripDate',label:'旅行日程',selector:'.date-label,.date-label span',sample:'11/06（金）– 11/09（月）',size:22},
      {id:'navigation',label:'上部メニュー',selector:'.nav-links a',sample:'フライト　宿泊　予定　持ち物',size:18},
      {id:'sections',label:'セクション見出し',selector:'.section-head h2',sample:'毎日の予定',size:32},
      {id:'hotel',label:'宿泊先名',selector:'.hotel-body h3',sample:'予約済みの宿泊先',size:26},
      {id:'checkTitle',label:'チェックリストの見出し',selector:'#prepare .paper-card>h3',sample:'出発前のチェックリスト',size:24},
      {id:'dayTitle',label:'各日の見出し',selector:'.day-summary h3',sample:'ダナンで、のんびり',size:26},
      {id:'dates',label:'日付タブ',selector:'.day-tab strong',sample:'11/06　11/07　11/08　11/09',size:20},
      {id:'stopTitle',label:'予定の見出し',selector:'.stop-card h4',sample:'ミーケービーチを散歩',size:24},
      {id:'notes',label:'本文とメモ',selector:'.stop-card p,.hotel-address,.hotel-route,.flight-note,.transport-note,.airport',sample:'天気と交通に合わせて調整できます。',size:20},
      {id:'flightTime',label:'フライトの発着時刻',selector:'.flight-time',sample:'14:55　15:50',size:40},
      {id:'timelineTime',label:'予定の時刻',selector:'.stop time',sample:'18:00',size:20},
      {id:'countdownNumber',label:'カウントダウンの数字',selector:'.countdown strong',sample:'21',size:46},
      {id:'countdownText',label:'カウントダウンの説明',selector:'.countdown span',sample:'出発まで　日',size:20},
      {id:'checkItems',label:'持ち物の項目',selector:'#checklist .check-label span',sample:'パスポート・有効な旅行書類',size:20},
      {id:'labels',label:'小さな文字とラベル',selector:'.flight-head,.flight-head span,.hotel-head,.hotel-head span,.tag-label,.day-summary small,.day-tab small,.check-progress,.check-bottom small,.flight-duration,.footer>span',sample:'2日目　フライトと宿泊情報',size:18},
      {id:'links',label:'リンクと電話番号',selector:'.stop-card a,.hotel-body a',sample:'宿泊先の地図を見る',size:20}
    ];
    const appearanceKey='danang-travel-book-appearance-readable-v3:'+location.pathname;
    function normalizeAppearance(value){
      const result={};if(!value||typeof value!=='object'||Array.isArray(value))return result;
      for(const group of appearanceGroups){
        const entry=value[group.id];if(!entry||typeof entry!=='object'||Array.isArray(entry))continue;
        const clean={};
        if(typeof entry.size==='number'&&Number.isFinite(entry.size))clean.size=Math.min(64,Math.max(18,Math.round(entry.size)));
        if(typeof entry.color==='string'&&/^#[0-9a-f]{6}$/i.test(entry.color))clean.color=entry.color.toUpperCase();
        if(typeof entry.bold==='boolean')clean.bold=entry.bold;
        if(Object.keys(clean).length)result[group.id]=clean;
      }
      return result;
    }
    let appearance=normalizeAppearance(JSON.parse($('appearance-data').textContent)),draftAppearance=null,summaryMeasureFrame=0;
    try{const saved=JSON.parse(storageRead(appearanceKey));if(saved&&typeof saved==='object'&&!Array.isArray(saved))appearance=normalizeAppearance(saved)}catch{}
    function appearanceCSS(value){
      const preferences=normalizeAppearance(value),variables=[],rules=[];
      for(const group of appearanceGroups){
        const entry=preferences[group.id];if(!entry)continue;const declarations=[];
        if(entry.size!==undefined){variables.push('--appearance-'+group.id+'-size:'+entry.size+'px');declarations.push('font-size:var(--appearance-'+group.id+'-size)!important','overflow-wrap:anywhere')}
        if(entry.color){variables.push('--appearance-'+group.id+'-color:'+entry.color);declarations.push('color:var(--appearance-'+group.id+'-color)!important')}
        if(entry.bold!==undefined){variables.push('--appearance-'+group.id+'-weight:'+(entry.bold?700:400));declarations.push('font-weight:var(--appearance-'+group.id+'-weight)!important','font-synthesis:weight!important')}
        rules.push(group.selector+'{'+declarations.join(';')+'}');
      }
      if(preferences.navigation?.size)rules.push('.nav-links{min-width:0;max-width:calc(100% - 46px);overflow-x:auto;padding-block:3px}.nav-links a{flex-shrink:0}');
      if(preferences.dates?.size)rules.push('.day-tab{min-width:'+Math.max(72,Math.ceil(preferences.dates.size*2.8+12))+'px}');
      if(preferences.notes?.size)rules.push('.flight-route>div{min-width:0}');
      if(preferences.flightTime?.size>36)rules.push('.flight-route{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.flight-route>div:first-child{grid-column:1;grid-row:1}.flight-route>div:last-child{grid-column:2;grid-row:1}.flight-path{grid-column:1 / -1;grid-row:2;width:80px;justify-self:center}');
      if(preferences.flightTime?.size>44)rules.push('.flight-route{grid-template-columns:minmax(0,1fr)}.flight-route>div:first-child{grid-column:1;grid-row:1}.flight-route>div:last-child{grid-column:1;grid-row:3}.flight-path{grid-column:1;grid-row:2}');
      if(preferences.countdownText?.size>28)rules.push('.countdown{min-width:0;padding-inline:14px}');
      if(preferences.timelineTime?.size>15){const width=Math.ceil(preferences.timelineTime.size*2.8+5);rules.push('.stop{grid-template-columns:'+width+'px minmax(0,1fr)}.stop:before{left:'+(width+10)+'px}@media(max-width:380px){.stop:before{left:'+(width+8)+'px}}')}
      return(variables.length?':root{'+variables.join(';')+'}':'')+rules.join('');
    }
    function scheduleSummaryMeasure(){cancelAnimationFrame(summaryMeasureFrame);summaryMeasureFrame=requestAnimationFrame(measureSummaryCards)}
    function measureSummaryCards(){
      const card=$('day-panel').querySelector('.day-summary');if(!card)return;
      const width=card.getBoundingClientRect().width,baseline=matchMedia('(max-width:360px)').matches?116:matchMedia('(max-width:420px)').matches?120:132;
      const stage=document.createElement('div');stage.setAttribute('aria-hidden','true');stage.inert=true;
      stage.style.cssText='position:absolute;left:-10000px;top:0;visibility:hidden;pointer-events:none;width:'+width+'px';
      for(let i=0;i<trip.days.length;i++){
        const clone=card.cloneNode(true);clone.style.setProperty('min-height',baseline+'px','important');clone.style.margin='0';clone.style.width='100%';
        clone.querySelector('.summary-scene-button')?.replaceChildren();clone.querySelector('h3').textContent=trip.days[i].title;clone.querySelector('.summary-copy small').textContent=(i+1)+'日目';stage.append(clone);
      }
      document.body.append(stage);const height=Math.ceil(Math.max(baseline,...[...stage.children].map(el=>el.getBoundingClientRect().height)));stage.remove();
      document.documentElement.style.setProperty('--summary-style-min-height',height+'px');
    }
    function applyAppearance(value){$('appearance-overrides').textContent=appearanceCSS(value);scheduleSummaryMeasure();requestAnimationFrame(()=>positionDateMarker(false))}
    function selectedAppearanceGroup(){return appearanceGroups.find(group=>group.id===$('style-target').value)||appearanceGroups[0]}
    function appearanceSample(group){return[...document.querySelectorAll(group.selector)].find(el=>el.getClientRects().length)||document.querySelector(group.selector)}
    function cssColorHex(value){const match=value.match(/^#([0-9a-f]{6})$/i);if(match)return value.toUpperCase();const channels=value.match(/[\d.]+/g);return channels&&channels.length>=3?'#'+channels.slice(0,3).map(n=>Math.max(0,Math.min(255,Math.round(Number(n)))).toString(16).padStart(2,'0')).join('').toUpperCase():'#3E3A39'}
    function refreshAppearanceControls(){
      const group=selectedAppearanceGroup(),element=appearanceSample(group),computed=element?getComputedStyle(element):null,current=(draftAppearance||appearance)[group.id]||{};
      const size=current.size??Math.round(parseFloat(computed?.fontSize)||group.size),color=current.color||cssColorHex(computed?.color||'#3E3A39'),bold=current.bold??(parseInt(computed?.fontWeight||'400',10)>=600);
      $('style-size').value=size;$('style-size-range').value=size;$('style-color').value=color;$('style-color-hex').value=color;$('style-bold').checked=bold;
      $('style-scope').textContent='適用先：'+group.label+'。変更した設定だけを反映します。';
      const preview=$('style-preview');preview.textContent=element?.textContent.trim().replace(/\s+/g,' ').slice(0,90)||group.sample;
      preview.style.fontSize=size+'px';preview.style.color=color;preview.style.fontWeight=bold?'700':'400';preview.style.fontSynthesis='weight';
      document.querySelectorAll('.style-swatch').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.color===color)));
    }
    function editAppearance(property,value){
      if(!draftAppearance)return;const group=selectedAppearanceGroup();draftAppearance[group.id]={...(draftAppearance[group.id]||{}),[property]:value};
      draftAppearance=normalizeAppearance(draftAppearance);applyAppearance(draftAppearance);refreshAppearanceControls();
    }
    function showEditorTab(tab){
      const appearanceTab=tab==='appearance';
      for(const type of ['content','appearance']){const active=(type==='appearance')===appearanceTab;const button=$('editor-'+type+'-tab');button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;$('editor-'+type+'-panel').classList.toggle('hidden',!active)}
      if(appearanceTab)refreshAppearanceControls();
    }
    function setupAppearanceEditor(){
      $('style-target').replaceChildren();$('style-palette').replaceChildren();
      for(const group of appearanceGroups){const option=text('option',group.label);option.value=group.id;$('style-target').append(option)}$('style-target').value='dayTitle';
      for(const [label,color]of [['チャコール','#3E3A39'],['ウォームグレー','#807B73'],['コーラルピンク','#F2A497'],['山吹色','#F6D27A'],['水色','#A8D3E6'],['若竹色','#B9DAA5']]){
        const button=text('button','','style-swatch');button.type='button';button.dataset.color=color;button.style.setProperty('--swatch',color);button.setAttribute('aria-label',label+' '+color);button.title=label+' '+color;button.onclick=()=>editAppearance('color',color);$('style-palette').append(button);
      }
      $('style-target').onchange=refreshAppearanceControls;
      for(const id of ['style-size','style-size-range'])$(id).oninput=()=>{const size=Number($(id).value);if($(id).value!==''&&Number.isFinite(size)&&size>=18&&size<=64)editAppearance('size',size)};
      $('style-color').oninput=()=>editAppearance('color',$('style-color').value);
      $('style-color-hex').oninput=()=>{if(/^#[0-9a-f]{6}$/i.test($('style-color-hex').value))editAppearance('color',$('style-color-hex').value)};
      $('style-bold').onchange=()=>editAppearance('bold',$('style-bold').checked);
      $('reset-style-target').onclick=()=>{if(!draftAppearance)return;delete draftAppearance[selectedAppearanceGroup().id];applyAppearance(draftAppearance);refreshAppearanceControls()};
      $('reset-all-styles').onclick=()=>{draftAppearance={};applyAppearance(draftAppearance);refreshAppearanceControls()};
      for(const type of ['content','appearance']){
        const button=$('editor-'+type+'-tab');button.onclick=()=>showEditorTab(type);
        button.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?'content':event.key==='End'?'appearance':type==='content'?'appearance':'content';showEditorTab(next);$('editor-'+next+'-tab').focus()};
      }
      $('trip-editor').addEventListener('close',()=>{draftAppearance=null;applyAppearance(appearance)});
      $('editor-form').addEventListener('invalid',event=>{showEditorTab(event.target.closest('#editor-appearance-panel')?'appearance':'content')},true);
      window.addEventListener('resize',scheduleSummaryMeasure);document.fonts.ready.then(scheduleSummaryMeasure);applyAppearance(appearance);
    }
    function openEditor(initialTab='content'){draft=copy(trip);draftAppearance=copy(appearance);editingDay=activeDay;$('editor-error').classList.add('hidden');$('edit-title').value=draft.title;$('edit-subtitle').value=draft.subtitle;$('edit-start').value=draft.start;$('edit-eyebrow').value=draft.eyebrow;$('edit-note').value=draft.note;$('edit-sample').checked=!!draft.sample;$('edit-checklist').value=draft.checklist.join('\n');$('edit-stays').value=draft.stays.map(s=>[s.role,s.name,s.address,s.phone,s.note,s.url].join(' | ').replace(/( \| )+$/,'')).join('\n');renderDayEditor();renderFlightEditor();showEditorTab(initialTab==='appearance'?'appearance':'content');$('trip-editor').showModal()}
    $('edit-trip').onclick=openEditor;['close-editor','cancel-editor'].forEach(id=>$(id).onclick=()=>$('trip-editor').close());$('trip-editor').addEventListener('click',e=>{if(e.target===$('trip-editor')){const r=$('trip-editor').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('trip-editor').close()}});
    $('edit-day').onchange=()=>{saveDraftDay();editingDay=Number($('edit-day').value);renderDayEditor()};$('edit-start').onchange=()=>{if(dateOK($('edit-start').value)){saveDraftDay();renderDayEditor()}};
    $('add-day').onclick=()=>{if(draft.days.length>=21)return;saveDraftDay();draft.days.push({title:'新しい一日の予定',note:'詳しい予定はこれから。',icon:'✳',stops:[]});editingDay=draft.days.length-1;renderDayEditor()};
    $('remove-day').onclick=()=>{if(draft.days.length<=1)return;saveDraftDay();draft.days.splice(editingDay,1);editingDay=Math.min(editingDay,draft.days.length-1);renderDayEditor()};
    $('editor-form').onsubmit=e=>{e.preventDefault();saveDraftDay();draft.title=$('edit-title').value.trim();draft.subtitle=$('edit-subtitle').value.trim();draft.start=$('edit-start').value;draft.eyebrow=$('edit-eyebrow').value.trim();draft.note=$('edit-note').value.trim();draft.sample=$('edit-sample').checked;draft.checklist=$('edit-checklist').value.split('\n').map(x=>x.trim()).filter(Boolean);draft.stays=$('edit-stays').value.split('\n').map(x=>x.trim()).filter(Boolean).map(line=>{const [role='',name='',address='',phone='',note='',...urlParts]=line.split('|').map(x=>x.trim());return {role,name,address,phone,note,url:urlParts.join('|')}});if(!validTrip(draft))return editorError('タイトル、有効な出発日、1〜21日分の予定を入力してください。');for(let i=0;i<draft.days.length;i++){if(!draft.days[i].title)return editorError((i+1)+'日目のテーマを入力してください。');for(const s of draft.days[i].stops){if(!s.title||!(s.time==='未定'||/^([01]\d|2[0-3]):[0-5]\d$/.test(s.time))||!['walk','food','train','plan','other'].includes(s.type))return editorError((i+1)+'日目を確認してください。時刻は09:00形式または「未定」、種類はwalk／food／train／plan／otherで、見出しも必要です。');if(s.url&&!safeURL(s.url))return editorError((i+1)+'日目のリンクはhttps://またはhttp://で始めてください。')}}if(draft.stays.some(s=>s.url&&!safeURL(s.url)))return editorError('宿泊先のリンクはhttps://またはhttp://で始めてください。');trip=copy(draft);appearance=normalizeAppearance(draftAppearance||appearance);const appearanceSaved=storageWrite(appearanceKey,appearance);applyAppearance(appearance);activeDay=Math.min(activeDay,trip.days.length-1);const saved=storageWrite(key,trip);render();$('trip-editor').close();toast(saved&&appearanceSaved?'この端末に保存しました。HTMLをダウンロードして共有版を更新できます。':'しおりを更新しました。HTMLをダウンロードして保存してください。');};
    $('reset-checks').onclick=()=>{checks={};storageWrite(key+':checks',checks);renderChecks();toast('チェックをクリアしました。')};
    $('download-html').onclick=()=>{const clone=document.documentElement.cloneNode(true);const appearanceNode=clone.querySelector('#appearance-data');appearanceNode.textContent='\n'+JSON.stringify(appearance,null,2).replace(/</g,'\\u003c')+'\n';clone.querySelector('#appearance-overrides').textContent=appearanceCSS(appearance);const dataNode=clone.querySelector('#trip-data');dataNode.textContent='\n'+JSON.stringify(trip,null,2).replace(/</g,'\\u003c')+'\n';clone.querySelector('#trip-editor').removeAttribute('open');clone.querySelector('#codex-browser-sidebar-comments-root')?.remove();clone.querySelector('#toast').classList.add('hidden');clone.querySelector('#storage-warning').classList.add('hidden');const blob=new Blob(['<!doctype html>\n'+clone.outerHTML],{type:'text/html;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='index.html';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);toast('しおりを保存しました。ダウンロードしたindex.htmlでサイトを更新すると、共有版にも反映されます。');};
    window.DaNangJourney={getTrip:()=>copy(trip)};setupAppearanceEditor();render();setInterval(countdown,60000);
    function openStyleEditorRoute(){if(location.hash==='#style-editor'&&!$('trip-editor').open)openEditor('appearance')}
    window.addEventListener('hashchange',openStyleEditorRoute);openStyleEditorRoute();
    document.fonts.ready.then(()=>positionDateMarker(false));
    if('ResizeObserver' in window){new ResizeObserver(()=>positionDateMarker(false)).observe($('day-tabs'))}else{window.addEventListener('resize',()=>positionDateMarker(false))}
    reducedMotion.addEventListener('change',()=>{
      positionDateMarker(false);
      if(reducedMotion.matches){
        if(summarySceneObserver){summarySceneObserver.disconnect();summarySceneObserver=null}
        document.querySelectorAll('.summary-scene-button').forEach(button=>{for(const animation of summarySceneReplays.get(button)||[])animation.cancel()});
      }
    });
    // Keep section links, scrolling, history and the selected button in sync.
    const sectionLinks=[...document.querySelectorAll('.nav-links a')];
    const navSections=sectionLinks.map(link=>$(link.hash.slice(1))).filter(Boolean);
    let navScrollTarget=null,navScrollTimer=0,navUpdateFrame=0;
    function navOffset(){return Math.ceil(document.querySelector('.topbar').getBoundingClientRect().height)+16}
    function syncNavSize(){document.documentElement.style.setProperty('--nav-offset',navOffset()+'px')}
    function markNavSection(id){sectionLinks.forEach(link=>{if(link.hash==='#'+id)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current')})}
    function updateNavSection(){
      navUpdateFrame=0;
      if(navScrollTarget&&Math.abs(window.scrollY-navScrollTarget.top)>2){markNavSection(navScrollTarget.id);return}
      navScrollTarget=null;
      let current=navSections[0];const line=navOffset()+3;
      for(const section of navSections){const heading=section.querySelector('h2')||section;if(heading.getBoundingClientRect().top<=line)current=section}
      const maxScroll=document.documentElement.scrollHeight-window.innerHeight;
      if(maxScroll>0&&window.scrollY>=maxScroll-2)current=navSections[navSections.length-1];
      if(current)markNavSection(current.id);
    }
    function queueNavUpdate(){if(!navUpdateFrame)navUpdateFrame=requestAnimationFrame(updateNavSection)}
    function releaseNavTarget(){navScrollTarget=null;clearTimeout(navScrollTimer);queueNavUpdate()}
    function goToSection(id,behavior='smooth',focus=false){
      const section=navSections.find(item=>item.id===id);if(!section)return;
      syncNavSize();const heading=section.querySelector('h2')||section;
      const maxScroll=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
      const top=Math.max(0,Math.min(maxScroll,window.scrollY+heading.getBoundingClientRect().top-navOffset()));
      navScrollTarget={id,top};markNavSection(id);clearTimeout(navScrollTimer);
      navScrollTimer=setTimeout(releaseNavTarget,1500);
      window.scrollTo({top,behavior:reducedMotion.matches?'instant':behavior});
      if(focus){heading.tabIndex=-1;heading.focus({preventScroll:true})}
      queueNavUpdate();
    }
    sectionLinks.forEach(link=>link.addEventListener('click',event=>{
      if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      event.preventDefault();if(location.hash!==link.hash)history.pushState(null,'',link.hash);
      goToSection(link.hash.slice(1),'smooth',true);
    }));
    function alignNavHash(){const id=location.hash.slice(1);if(navSections.some(section=>section.id===id))goToSection(id,'instant');else queueNavUpdate()}
    window.addEventListener('scroll',queueNavUpdate,{passive:true});
    window.addEventListener('wheel',releaseNavTarget,{passive:true});
    window.addEventListener('touchstart',releaseNavTarget,{passive:true});
    window.addEventListener('keydown',event=>{if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key))releaseNavTarget()});
    window.addEventListener('hashchange',alignNavHash);window.addEventListener('popstate',alignNavHash);
    window.addEventListener('resize',()=>{syncNavSize();queueNavUpdate()});
    if('ResizeObserver' in window)new ResizeObserver(()=>{syncNavSize();queueNavUpdate()}).observe(document.querySelector('.topbar'));
    window.addEventListener('load',()=>requestAnimationFrame(alignNavHash));
    document.fonts.ready.then(()=>requestAnimationFrame(()=>{syncNavSize();alignNavHash()}));
    syncNavSize();queueNavUpdate();
  })();
  
