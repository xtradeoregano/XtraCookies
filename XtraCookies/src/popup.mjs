import { formatMap, jsonToNetscapeMapper } from './modules/cookie_format.mjs';
import getAllCookies from './modules/get_all_cookies.mjs';

const formatSelect = document.querySelector('#format');
const nowrapCheckbox = document.querySelector('#nowrapOption');
const tableBody = document.querySelector('tbody');

const getUrlPromise = chrome.tabs.query({ active: true, currentWindow: true })
  .then(([{ url }]) => new URL(url));

const getCookieText = async (details) => {
  const cookies = await getAllCookies(details);
  const format = formatMap[document.querySelector('#format').value];
  if (!format) throw new Error('Formato inválido');
  const text = format.serializer(cookies);
  return { text, format, cookies };
};

const saveToFile = async (text, name, { ext, mimeType }) => {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const filename = name + ext;
  const id = await chrome.downloads.download({ url, filename, saveAs: false });

  const onChange = (delta) => {
    if (delta.id === id && delta.state?.current !== 'in_progress') {
      chrome.downloads.onChanged.removeListener(onChange);
      URL.revokeObjectURL(url);
    }
  };

  chrome.downloads.onChanged.addListener(onChange);
};

const animarTabla = () => {
  document.querySelectorAll('tbody tr').forEach(tr => {
    tr.classList.remove('animado');
    void tr.offsetWidth;
    tr.classList.add('animado');
  });
};

const marcarBoton = (boton, textoOK = '✅ ¡Listo!') => {
  const original = boton.innerText;
  boton.innerText = textoOK;
  setTimeout(() => (boton.innerText = original), 1500);
};

const renderTabla = (cookies) => {
  const netscape = jsonToNetscapeMapper(cookies);
  const rows = netscape.map(row => {
    const tr = document.createElement('tr');
    row.forEach((val) => {
      const td = document.createElement('td');
      td.textContent = val;
      tr.appendChild(td);
    });
    return tr;
  });
  tableBody.replaceChildren(...rows);
  animarTabla();
};

document.addEventListener('DOMContentLoaded', async () => {
  const url = await getUrlPromise;
  document.querySelector('h1').textContent = 'Cookies para: ' + url.hostname;

  const details = {
    url: url.href,
    partitionKey: { topLevelSite: url.origin }
  };

  const { cookies } = await getCookieText(details);
  renderTabla(cookies);

  document.querySelector('#export').addEventListener('click', async (e) => {
    const { text, format } = await getCookieText(details);
    await saveToFile(text, 'cookies_youtube_xtra', format);
    marcarBoton(e.target, '✅ ¡Exportado!');
  });

  document.querySelector('#exportAs').addEventListener('click', async (e) => {
    const { text, format } = await getCookieText(details);
    await saveToFile(text, 'cookies_youtube_xtra', format);
    marcarBoton(e.target, '✅ ¡Guardado!');
  });

  document.querySelector('#copy').addEventListener('click', async (e) => {
    const { text } = await getCookieText(details);
    await navigator.clipboard.writeText(text);
    marcarBoton(e.target, '✅ ¡Copiado!');
  });

  formatSelect.addEventListener('change', async () => {
    localStorage.setItem('selectedFormat', formatSelect.value);
    const { cookies } = await getCookieText(details);
    renderTabla(cookies);
  });

  if (localStorage.getItem('selectedFormat')) {
    formatSelect.value = localStorage.getItem('selectedFormat');
  }

  nowrapCheckbox.addEventListener('change', () => {
    document.querySelector('table').classList.toggle('nowrap', nowrapCheckbox.checked);
  });
});
