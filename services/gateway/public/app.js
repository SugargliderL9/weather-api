const form = document.getElementById('search');
const cityInput = document.getElementById('city');
const result = document.getElementById('result');
const weatherBg = document.getElementById('weather-bg');
const weatherBgRain = document.getElementById('weather-bg-rain');
const weatherBgSnow = document.getElementById('weather-bg-snow');

// Color palettes per condition (top, mid, bottom). Temp can warm/cool the tint.
const WEATHER_THEMES = {
  clear: {
    top: '#1a2a4a',
    mid: '#2d4a6f',
    bottom: '#0f1729',
    warm: { top: '#2d3a1a', mid: '#4a5a2d', bottom: '#1a220f' },
  },
  partly_cloudy: {
    top: '#1e2d42',
    mid: '#2a3d55',
    bottom: '#121a28',
    warm: { top: '#2a3220', mid: '#3d4a2d', bottom: '#1a2012' },
  },
  cloudy: {
    top: '#2a2d35',
    mid: '#3d414a',
    bottom: '#1a1c22',
  },
  rainy: {
    top: '#1a1e28',
    mid: '#252a35',
    bottom: '#0f1218',
  },
  snowy: {
    top: '#1e2838',
    mid: '#2a3548',
    bottom: '#18202d',
  },
  stormy: {
    top: '#151820',
    mid: '#1a1f2e',
    bottom: '#0a0c12',
  },
  foggy: {
    top: '#252830',
    mid: '#32363f',
    bottom: '#1a1d24',
  },
  unknown: {
    top: '#0f0f1a',
    mid: '#1a1a2e',
    bottom: '#0d0d14',
  },
};

function getWeatherBackgroundColors(condition, temp) {
  const theme = WEATHER_THEMES[condition] || WEATHER_THEMES.unknown;
  const base = theme.warm && (temp != null) && temp > 22 ? theme.warm : theme;
  return { top: base.top, mid: base.mid, bottom: base.bottom };
}

let lastBgColors = { top: WEATHER_THEMES.unknown.top, mid: WEATHER_THEMES.unknown.mid, bottom: WEATHER_THEMES.unknown.bottom };

function applyWeatherBackground(condition, temp) {
  const colors = getWeatherBackgroundColors(condition, temp);
  const el = weatherBg;
  if (!el) return;

  anime({
    targets: lastBgColors,
    top: colors.top,
    mid: colors.mid,
    bottom: colors.bottom,
    duration: 1600,
    easing: 'easeInOutQuad',
    update: () => {
      el.style.setProperty('--weather-top', lastBgColors.top);
      el.style.setProperty('--weather-mid', lastBgColors.mid);
      el.style.setProperty('--weather-bottom', lastBgColors.bottom);
    },
  });

  if (weatherBgRain) weatherBgRain.classList.toggle('visible', condition === 'rainy' || condition === 'stormy');
  if (weatherBgSnow) weatherBgSnow.classList.toggle('visible', condition === 'snowy');
}

// Page load: stagger animate title, form, result container
function runPageLoadAnimation() {
  anime({
    targets: '.animate-in',
    opacity: [0, 1],
    translateY: [20, 0],
    duration: 800,
    delay: anime.stagger(120, { start: 200 }),
    easing: 'easeOutElastic(1, 0.6)',
  });
}

// Animated loading dots
function showLoadingAnimation() {
  result.innerHTML = '<p class="loading"><span class="loading-dot" data-dot="0"></span><span class="loading-dot" data-dot="1"></span><span class="loading-dot" data-dot="2"></span> Loading…</p>';
  anime({
    targets: '#result .loading-dot',
    scale: [1, 1.4, 1],
    opacity: [0.5, 1, 0.5],
    duration: 600,
    delay: anime.stagger(200),
    loop: true,
    easing: 'easeInOutQuad',
  });
}

// Animate weather card in with staggered children
function runCardAnimation() {
  const card = result.querySelector('.card');
  if (!card) return;
  const children = card.querySelectorAll('.animate-el');
  anime({
    targets: card,
    opacity: [0, 1],
    scale: [0.92, 1],
    translateY: [24, 0],
    duration: 700,
    easing: 'easeOutElastic(1, 0.5)',
  });
  anime({
    targets: children,
    opacity: [0, 1],
    translateY: [12, 0],
    duration: 500,
    delay: anime.stagger(80, { start: 250 }),
    easing: 'easeOutQuad',
  });
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (!city) return;

  showLoadingAnimation();

  try {
    const res = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
    const data = await res.json();

    if (!res.ok) {
      result.innerHTML = `<p class="error">${data.error || data.message || 'Error'}</p>`;
      anime({ targets: '#result .error', opacity: [0, 1], translateY: [10, 0], duration: 400, easing: 'easeOutQuad' });
      return;
    }

    result.innerHTML = `
      <div class="card">
        <h2 class="animate-el">${data.city}, ${data.country || ''}</h2>
        <p class="meta animate-el">${data.description || '—'}</p>
        <div class="temp-row animate-el">
          <span class="temp">${Math.round(data.temp)}</span>
          <span class="temp-unit">°C / ${data.temp_fahrenheit}°F</span>
        </div>
        <div class="details animate-el">
          <span>Humidity: ${data.humidity ?? '—'}%</span>
          <span>Wind: ${(data.wind_speed ?? 0).toFixed(1)} m/s</span>
          <span>Pressure: ${data.pressure ?? '—'} hPa</span>
        </div>
        ${data.advice?.length ? `
          <div class="advice animate-el">Advice: <ul>${data.advice.map(a => `<li>${a}</li>`).join('')}</ul></div>
        ` : ''}
      </div>
    `;
    applyWeatherBackground(data.condition_category || 'unknown', data.temp);
    runCardAnimation();
  } catch (err) {
    result.innerHTML = `<p class="error">Failed to fetch weather: ${err.message}</p>`;
    anime({ targets: '#result .error', opacity: [0, 1], translateY: [10, 0], duration: 400, easing: 'easeOutQuad' });
  }
});

// Run intro animation, then load default city so the card animates in
runPageLoadAnimation();
form.requestSubmit();