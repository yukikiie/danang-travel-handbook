/* Japanese travel weather. Source and variable definitions: https://open-meteo.com/en/docs
 * Seasonal context: https://vietnam.travel/things-to-do/weather-and-climate-vietnam/
 * and https://vietnam.travel/places-to-go/south-central-coast-central-highlands/da-nang
 * Daily forecasts are never substituted with seasonal averages. No API key is used.
 */
(() => {
  'use strict';
  const PLACES = {
    danang: { name: 'ダナン', latitude: 16.0544, longitude: 108.2022 },
    hoian: { name: 'ホイアン', latitude: 15.8801, longitude: 108.3380 }
  };
  const DAILY = ['weather_code', 'temperature_2m_max', 'temperature_2m_min', 'precipitation_probability_max', 'precipitation_sum', 'wind_speed_10m_max'];
  const CACHE_PREFIX = 'danang-trip-weather-v3-';
  const TTL = 10 * 60 * 1000;
  const TZ = 'Asia/Ho_Chi_Minh';
  const state = { place: 'danang', trip: null, records: {}, loading: false, error: null };
  let activeController = null;
  let requestNumber = 0;
  let initialized = false;
  const el = id => document.getElementById(id);
  const text = (id, value) => { const node = el(id); if (node) node.textContent = value; };
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dateValid = date => /^\d{4}-\d{2}-\d{2}$/.test(date || '') && !Number.isNaN(new Date(`${date}T12:00:00Z`).getTime());
  function today() {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    return ['year', 'month', 'day'].map(key => parts.find(part => part.type === key).value).join('-');
  }
  function addDays(date, amount) {
    const d = new Date(`${date}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + amount);
    return d.toISOString().slice(0, 10);
  }
  function dateLabel(date) {
    return new Intl.DateTimeFormat('ja-JP', { timeZone: 'UTC', month: 'numeric', day: 'numeric', weekday: 'short' }).format(new Date(`${date}T12:00:00Z`));
  }
  function getTrip() {
    if (state.trip && dateValid(state.trip.start)) return state.trip;
    const currentTrip = window.DaNangJourney?.getTrip?.();
    if (currentTrip && dateValid(currentTrip.start)) return currentTrip;
    try { const trip = JSON.parse(el('trip-data')?.textContent || '{}'); if (dateValid(trip.start)) return trip; } catch (_) { /* Keep the confirmed default dates. */ }
    return { start: '2026-11-06', days: [{}, {}, {}, {}] };
  }
  function tripDates() {
    const trip = getTrip();
    const count = Array.isArray(trip.days) && trip.days.length ? Math.min(trip.days.length, 30) : 4;
    return Array.from({ length: count }, (_, index) => addDays(trip.start, index));
  }
  function forecastDates() {
    const first = today();
    const last = addDays(first, 15);
    return tripDates().filter(date => date >= first && date <= last);
  }
  function validData(data) {
    if (!data || data.error || !data.daily || !Array.isArray(data.daily.time) || !data.daily.time.length || data.daily.time.length > 16) return false;
    const dates = data.daily.time;
    if (!dates.every(dateValid) || new Set(dates).size !== dates.length) return false;
    return DAILY.every(key => Array.isArray(data.daily[key]) && data.daily[key].length === dates.length && data.daily[key].every(value => value === null || finite(value)));
  }
  function readCache(place) {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_PREFIX + place) || 'null');
      if (cached && finite(cached.fetchedAt) && cached.fetchedAt <= Date.now() && validData(cached.data)) return cached;
    } catch (_) { /* Private browsing and unavailable storage do not block weather. */ }
    return null;
  }
  function saveCache(place, record) {
    try { localStorage.setItem(CACHE_PREFIX + place, JSON.stringify({ fetchedAt: record.fetchedAt, data: record.data })); } catch (_) { /* The in-memory result remains usable. */ }
  }
  function dailyFor(date, place = state.place) {
    const record = state.records[place];
    const daily = record?.data?.daily;
    const index = daily?.time.indexOf(date) ?? -1;
    if (index < 0) return null;
    const entry = { date };
    for (const key of DAILY) entry[key] = daily[key][index];
    return entry;
  }
  function getTripForecast(place = state.place) {
    const key = PLACES[place] ? place : 'danang';
    return tripDates().map(date => {
      const day = dailyFor(date, key);
      return { date, place: key, available: Boolean(day && finite(day.temperature_2m_max) && finite(day.temperature_2m_min) && finite(day.weather_code)), ...(day || {}) };
    });
  }
  const CONDITIONS = {
    0: '快晴', 1: '晴れ', 2: '晴れ時々くもり', 3: 'くもり', 45: '霧', 48: '霧',
    51: '弱い霧雨', 53: '霧雨', 55: '強い霧雨', 56: '凍る霧雨', 57: '凍る霧雨',
    61: '弱い雨', 63: '雨', 65: '強い雨', 66: '凍る雨', 67: '凍る雨',
    71: '弱い雪', 73: '雪', 75: '強い雪', 77: '雪', 80: 'にわか雨', 81: 'にわか雨', 82: '激しいにわか雨',
    85: 'にわか雪', 86: '強いにわか雪', 95: '雷雨', 96: '雷雨・ひょう', 97: '強い雷雨', 99: '雷雨・ひょう'
  };
  function condition(code) { return CONDITIONS[code] || '天候データなし'; }
  function icon(code) {
    let art;
    if (!Object.prototype.hasOwnProperty.call(CONDITIONS, code)) code = null;
    const cloud = '<g class="weather-cloud"><path fill="#6A9292" d="M9 30c-9 0-9-13-1-15 1-12 20-14 24-3 15-2 21 18 6 18Z"/><path fill="#D5E6DF" d="M10 26c-6 0-6-8 0-10 4-10 17-9 20-1 11-3 17 11 5 11Z"/></g>';
    const sun = '<g class="weather-sun"><path fill="#D99535" d="m25 0 3 6 7-2-1 7 7 3-5 5 5 6-8 2 1 7-7-1-3 7-5-6-7 2v-8l-7-2 5-6-5-6 8-2V5l7 2Z"/><circle cx="23" cy="19" r="11" fill="#F6CC77"/></g>';
    if (code === null || code === undefined) art = '<g class="weather-calendar"><rect x="7" y="6" width="36" height="39" rx="5" fill="#8EA7A2"/><rect x="10" y="15" width="30" height="27" rx="2" fill="#F8F3DF"/><path fill="#3E5955" d="M15 3h4v9h-4zm16 0h4v9h-4Z"/><g class="weather-calendar-page" fill="#7F9991"><path d="M16 23h18v3H16zm0 8h11v3H16Z"/><circle cx="33" cy="34" r="3"/></g></g>';
    else if (code <= 1) art = sun;
    else if (code === 2) art = sun + cloud;
    else if (code === 3 || code === 45 || code === 48) art = cloud;
    else if (code >= 95) art = cloud + '<g class="weather-lightning"><path fill="#D99535" d="m27 25-10 13h8l-4 10 17-17h-9l6-6Z"/></g>';
    else if ([71,73,75,77,85,86].includes(code)) art = cloud + '<g fill="#3B7E8A"><circle class="weather-snowflake" cx="13" cy="35" r="3"/><circle class="weather-snowflake" cx="27" cy="39" r="3"/><circle class="weather-snowflake" cx="38" cy="34" r="3"/></g>';
    else art = cloud + '<g fill="#397B87"><path class="weather-rain-drop" d="m14 31 1 7a3 3 0 1 1-5-2Z"/><path class="weather-rain-drop" d="m29 33 1 7a3 3 0 1 1-5-2Z"/><path class="weather-rain-drop" d="m41 30 1 7a3 3 0 1 1-5-2Z"/></g>';
    return `<svg class="weather-icon" width="96" height="96" viewBox="-5 -5 60 60" aria-hidden="true" focusable="false">${art}</svg>`;
  }
  function number(value, digits = 0) { return finite(value) ? value.toFixed(digits) : '—'; }
  function card(day, index) {
    const available = day.available ?? (finite(day.weather_code) && finite(day.temperature_2m_max) && finite(day.temperature_2m_min));
    const inPast = day.date < today();
    const missingValues = Boolean(dailyFor(day.date));
    const status = state.loading && !state.records[state.place] ? '確認中' : state.error && !state.records[state.place] ? '取得できません' : inPast ? '予報の対象外' : missingValues ? 'データなし' : '予報公開前';
    return `<article class="weather-day${available ? '' : ' is-pending'}" data-weather-date="${escape(day.date)}"><span class="weather-day-label">${index + 1}日目</span><time datetime="${escape(day.date)}">${escape(dateLabel(day.date))}</time>${icon(available ? day.weather_code : null)}${available ? `<strong class="weather-condition">${condition(day.weather_code)}</strong><div class="weather-temperature"><b><span class="weather-temp-label">最高</span>${number(day.temperature_2m_max)}<small>°C</small></b><span><span class="weather-temp-label">最低</span>${number(day.temperature_2m_min)}<small>°C</small></span></div><div class="weather-details"><span>降水確率 <b>${number(day.precipitation_probability_max)}${finite(day.precipitation_probability_max) ? '%' : ''}</b></span><span>降水量 <b>${number(day.precipitation_sum, 1)}${finite(day.precipitation_sum) ? ' mm' : ''}</b></span><span>最大風速 <b>${number(day.wind_speed_10m_max)}${finite(day.wind_speed_10m_max) ? ' km/h' : ''}</b></span></div>` : `<strong class="weather-condition">${status}</strong><p class="weather-pending-note">${inPast ? '過去の日付です' : missingValues ? 'データの更新を<br>お待ちください' : '旅行が近づくと<br>ここに表示されます'}</p>`}</article>`;
  }
  function render() {
    const record = state.records[state.place];
    const place = PLACES[state.place];
    const days = getTripForecast();
    const available = days.filter(day => day.available).length;
    const allAvailable = available === days.length;
    const allPast = days.every(day => day.date < today());
    if (el('weather-cards')) el('weather-cards').innerHTML = days.map((day, index) => card(day, index)).join('');
    text('weather-mode', allAvailable ? '旅行日の予報' : available ? '旅行日の予報・一部公開' : '旅行日の天気');
    let summary = allAvailable ? `${place.name}の旅行日予報です。直前にも確認して、雨の日は屋内でゆっくり。` : available ? '旅行日の予報が順次公開されています。先の日付は、公開され次第ここに表示されます。' : allPast ? '旅行日は予報の対象期間を過ぎています。' : '旅行日の予報はまだ公開されていません。約2週間前から順次確認できます。';
    if (state.loading) summary += ' 天気を確認中です。';
    if (state.error) summary = record ? '天気の更新に失敗しました。保存されたデータを表示しています。取得日時をご確認ください。' : '天気を取得できませんでした。「更新」でもう一度お試しください。';
    text('weather-summary', summary);
    text('weather-updated', record ? `${state.error || Date.now() - record.fetchedAt > TTL ? '保存データの取得' : '取得'}：${new Intl.DateTimeFormat('ja-JP', { timeZone: TZ, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(record.fetchedAt))}（ベトナム時間）` : 'ベトナム現地時間 / 気温 °C');
    const button = el('weather-refresh');
    if (button) { button.disabled = state.loading; button.setAttribute('aria-busy', String(state.loading)); }
    if (el('weather-seasonal')) el('weather-seasonal').hidden = Number(getTrip().start.slice(5,7)) !== 11;
    window.dispatchEvent(new CustomEvent('weatherchange', { detail: { place: state.place, forecast: days, loading: state.loading, error: state.error } }));
  }
  async function refresh(options = {}) {
    const force = options === true || options.force === true;
    const selected = el('weather-place')?.value;
    if (PLACES[selected]) state.place = selected;
    const request = ++requestNumber;
    if (activeController) { activeController.abort(); activeController = null; }
    const placeKey = state.place;
    const record = state.records[placeKey] || readCache(placeKey);
    if (record) state.records[placeKey] = record;
    const dates = forecastDates();
    if (!dates.length) { state.loading = false; state.error = null; render(); return; }
    const cacheCoversRange = record && dates.every(date => record.data.daily.time.includes(date));
    if (!force && cacheCoversRange && Date.now() - record.fetchedAt < TTL) { state.loading = false; state.error = null; render(); return; }
    activeController = new AbortController();
    const controller = activeController;
    const timeout = setTimeout(() => controller.abort(), 10000);
    state.loading = true;
    state.error = null;
    render();
    const place = PLACES[placeKey];
    // Request only trip dates in the documented 16-day window, never recent/current weather.
    const params = new URLSearchParams({ latitude: String(place.latitude), longitude: String(place.longitude), timezone: TZ, start_date: dates[0], end_date: dates[dates.length - 1], daily: DAILY.join(','), temperature_unit: 'celsius', wind_speed_unit: 'kmh', precipitation_unit: 'mm' });
    try {
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal: controller.signal, referrerPolicy: 'no-referrer', credentials: 'omit' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!validData(data)) throw new Error('Invalid weather response');
      const fresh = { data, fetchedAt: Date.now() };
      state.records[placeKey] = fresh;
      saveCache(placeKey, fresh);
      if (request === requestNumber) state.error = null;
    } catch (error) {
      if (request === requestNumber) state.error = error.name === 'AbortError' ? 'timeout' : 'unavailable';
    } finally {
      clearTimeout(timeout);
      if (request === requestNumber) { activeController = null; state.loading = false; render(); }
    }
  }
  function init() {
    if (initialized) return;
    initialized = true;
    el('weather-place')?.addEventListener('change', () => refresh());
    el('weather-refresh')?.addEventListener('click', () => refresh({ force: true }));
    window.addEventListener('tripchange', event => {
      const trip = event.detail?.trip || event.detail;
      if (trip && dateValid(trip.start)) state.trip = trip;
      refresh();
    });
    render();
    refresh();
  }
  window.DaNangWeather = { refresh, render, getTripForecast, getState: () => JSON.parse(JSON.stringify(state)) };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
