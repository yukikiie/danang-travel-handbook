(() => {
  const cover=document.getElementById('hero-art'),toggle=document.getElementById('motion-toggle');
  if(!cover||!toggle)return;
  const preference=window.matchMedia('(prefers-reduced-motion:reduce)');
  toggle.checked=preference.matches;
  function sync(){document.body.classList.toggle('motion-paused',toggle.checked);cover.setAttribute('aria-label',toggle.checked?'切り絵の海岸アニメーションを再生':'切り絵の海岸アニメーションを停止');cover.title=toggle.checked?'クリックして雲と波を動かす':'クリックして雲と波を止める'}
  function change(){toggle.checked=!toggle.checked;sync()}
  toggle.addEventListener('change',sync);cover.addEventListener('click',change);cover.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();change()}});
  preference.addEventListener('change',()=>{toggle.checked=preference.matches;sync()});sync();
})();
