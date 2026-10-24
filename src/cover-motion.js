(() => {
  const cover = document.getElementById('hero-art');
  const toggle = document.getElementById('motion-toggle');
  if (!cover || !toggle) return;

  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  // One control also freezes weather, section icons and newly rendered scenes.
  if (!document.getElementById('global-motion-pause-style')) {
    const style = document.createElement('style');
    style.id = 'global-motion-pause-style';
    style.textContent = 'body.motion-paused *,body.motion-paused *::before,body.motion-paused *::after{animation-play-state:paused!important}';
    document.head.appendChild(style);
  }

  toggle.checked = preference.matches;
  function sync() {
    const paused = toggle.checked || preference.matches;
    toggle.checked = paused;
    toggle.disabled = preference.matches;
    document.body.classList.toggle('motion-paused', paused);
    // Stop finite JavaScript effects as well as the continuous CSS layers.
    if (paused) document.getAnimations().forEach(animation => {
      if (!('animationName' in animation) && !('transitionProperty' in animation)) animation.cancel();
    });
    cover.setAttribute('aria-pressed', String(!paused));
    cover.setAttribute('aria-disabled', String(preference.matches));
    cover.setAttribute('aria-label', preference.matches
      ? '端末の設定に合わせてページの動きを停止中'
      : paused ? 'ページのアニメーションを再生' : 'ページのアニメーションを停止');
    cover.title = preference.matches
      ? '端末の設定に合わせて動きを止めています'
      : paused ? 'クリックして舟・鳥・天気の動きを再生' : 'クリックしてページの動きを止める';
  }
  function change() {
    if (preference.matches) return;
    toggle.checked = !toggle.checked;
    sync();
  }

  toggle.addEventListener('change', sync);
  cover.addEventListener('click', change);
  cover.addEventListener('keydown', event => {
    if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) {
      event.preventDefault();
      change();
    }
  });
  function preferenceChanged() {
    toggle.checked = preference.matches;
    sync();
  }
  if (preference.addEventListener) preference.addEventListener('change', preferenceChanged);
  else preference.addListener(preferenceChanged);
  sync();
})();
