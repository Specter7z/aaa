// WordPirates frontend script - sécurisé
async function fetchLeaks() {
  try {
    const res = await fetch('assets/leaks.json');
    if (!res.ok) throw new Error('Impossible de charger leaks.json');
    const json = await res.json();
    if (!Array.isArray(json)) throw new Error('Format JSON invalide');
    return json;
  } catch (e) {
    console.error(e);
    return [];
  }
}

function severityBadge(s) {
  switch (s) {
    case 'critical': return '<span class="badge badge-crit">Critique</span>';
    case 'high': return '<span class="badge badge-high">Élevée</span>';
    case 'medium': return '<span class="badge badge-med">Moyenne</span>';
    default: return '<span class="badge badge-low">Faible</span>';
  }
}

function escapeHtml(str) {
  return (str || '').toString().replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

// Validation d'un incident
function validateLeak(leak) {
  return {
    date: typeof leak.date === 'string' ? leak.date : '',
    victim: typeof leak.victim === 'string' ? leak.victim : 'inconnu',
    details: Array.isArray(leak.details) ? leak.details.map(d => typeof d === 'string' ? d : '') : [],
    severity: ['critical','high','medium','low'].includes(leak.severity) ? leak.severity : 'low',
    volume: typeof leak.volume === 'string' ? leak.volume : '',
    source: typeof leak.source === 'string' ? leak.source : ''
  };
}

function renderTable(rows) {
  const tbody = document.querySelector('#leaks-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  rows.forEach(r => {
    const leak = validateLeak(r);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(leak.date)}</td>
      <td><button class="link victim">${escapeHtml(leak.victim)}</button></td>
      <td>${escapeHtml(leak.details.slice(0,3).join(', '))}${leak.details.length > 3 ? ' ...' : ''}</td>
      <td>${escapeHtml(leak.volume)}</td>
      <td>${severityBadge(leak.severity)}</td>
      <td>${escapeHtml(leak.source)}</td>
    `;
    const btn = tr.querySelector('.victim');
    if (btn) btn.addEventListener('click', () => openModal(leak));
    tbody.appendChild(tr);
  });

  const countLine = document.getElementById('count-line');
  if (countLine) countLine.textContent = rows.length + ' incidents affichés';
  const total = document.getElementById('total-incidents');
  if (total) total.textContent = rows.length;
}

function openModal(r) {
  const modal = document.querySelector('.modal');
  const body = document.getElementById('modal-body');
  if (!modal || !body) return;

  const leak = validateLeak(r);

  body.innerHTML = `
    <h3>${escapeHtml(leak.victim)}</h3>
    <p class="muted">${escapeHtml(leak.date)} — Source: ${escapeHtml(leak.source)}</p>
    <div><strong>Données exposées</strong><ul>${leak.details.map(d => '<li>'+escapeHtml(d)+'</li>').join('')}</ul></div>
    <div class="muted small">Volume: ${escapeHtml(leak.volume || 'inconnu')} — Gravité: ${escapeHtml(leak.severity)}</div>
    <div class="muted small" style="margin-top:8px">Actions recommandées: recouper la source, isoler, rotater les identifiants, notifier les autorités si nécessaire.</div>
  `;
  modal.style.display = 'flex';
}

function closeModal() {
  const modal = document.querySelector('.modal');
  if (modal) modal.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', async () => {
  const leaks = await fetchLeaks();
  window.__leaks = leaks.map(validateLeak);
  renderTable(window.__leaks);

  // Recherche
  const qInput = document.getElementById('q');
  if (qInput) {
    qInput.addEventListener('input', e => {
      const q = e.target.value.toLowerCase();
      const filtered = window.__leaks.filter(r =>
        (r.victim + ' ' + r.details.join(' ') + ' ' + r.source).toLowerCase().includes(q)
      );
      renderTable(filtered);
    });
  }

  // Filtre année
  const filterYear = document.getElementById('filter-year');
  if (filterYear) {
    filterYear.addEventListener('change', e => {
      const y = e.target.value;
      renderTable(y === 'all' ? window.__leaks : window.__leaks.filter(r => r.date.startsWith(y)));
    });
  }

  // Filtre gravité
  const filterSev = document.getElementById('filter-sev');
  if (filterSev) {
    filterSev.addEventListener('change', e => {
      const v = e.target.value;
      renderTable(v === 'all' ? window.__leaks : window.__leaks.filter(r => r.severity === v));
    });
  }

  // Export CSV
  const exportBtn = document.getElementById('export');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const rows = window.__leaks;
      const headers = ['date','victim','details','volume','severity','source'];
      const lines = [headers.join(',')];
      rows.forEach(r => {
        lines.push([
          r.date,
          JSON.stringify(r.victim),
          JSON.stringify(r.details.join(' | ')),
          JSON.stringify(r.volume),
          JSON.stringify(r.severity),
          JSON.stringify(r.source)
        ].join(','));
      });
      const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'wordpirates-leaks.csv'; a.click();
      URL.revokeObjectURL(url);
    });
  }

  // Import JSON sécurisé
  const importBtn = document.getElementById('import');
  if (importBtn) {
    importBtn.addEventListener('click', () => {
      const txt = prompt('Colle un JSON (tableau) d\'incidents à importer (max 200 éléments)');
      if (!txt) return;
      try {
        const arr = JSON.parse(txt);
        if (!Array.isArray(arr)) throw 'Doit être un tableau';
        if (arr.length > 200) throw 'Trop d\'éléments, max 200';
        const validArr = arr.map(validateLeak);
        window.__leaks.push(...validArr);
        renderTable(window.__leaks);
        alert('Import OK: ' + validArr.length + ' éléments');
      } catch (e) {
        alert('JSON invalide: ' + e);
      }
    });
  }

  // Modal close
  const closeBtn = document.getElementById('close');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  const modal = document.querySelector('.modal');
  if (modal) modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
});
