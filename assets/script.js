
// WordPirates frontend script - minimal dependency
async function fetchLeaks(){
  try{
    const res = await fetch('assets/leaks.json');
    if(!res.ok) throw new Error('impossible de charger leaks.json');
    const json = await res.json();
    return json;
  }catch(e){
    console.error(e);
    return [];
  }
}

function severityBadge(s){
  if(s==='critical') return '<span class="badge badge-crit">Critique</span>';
  if(s==='high') return '<span class="badge badge-high">Élevée</span>';
  if(s==='medium') return '<span class="badge badge-med">Moyenne</span>';
  return '<span class="badge badge-low">Faible</span>';
}

function renderTable(rows){
  const tbody = document.querySelector('#leaks-table tbody');
  tbody.innerHTML = '';
  rows.forEach(r=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.date}</td>
      <td><button class="link victim">${escapeHtml(r.victim)}</button></td>
      <td>${escapeHtml((r.details||[]).slice(0,3).join(', '))}${(r.details||[]).length>3?' ...':''}</td>
      <td>${r.volume||''}</td>
      <td>${severityBadge(r.severity)}</td>
      <td>${escapeHtml(r.source||'')}</td>
    `;
    tr.querySelector('.victim').addEventListener('click', ()=> openModal(r));
    tbody.appendChild(tr);
  });
  document.getElementById('count-line').textContent = rows.length + ' incidents affichés';
  document.getElementById('total-incidents')?.textContent = rows.length;
}

function escapeHtml(str){ return (str||'').toString().replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

function openModal(r){
  document.getElementById('modal-body').innerHTML = `
    <h3>${escapeHtml(r.victim)}</h3>
    <p class="muted">${r.date} — Source: ${escapeHtml(r.source||'')}</p>
    <div><strong>Données exposées</strong><ul>${(r.details||[]).map(d=>'<li>'+escapeHtml(d)+'</li>').join('')}</ul></div>
    <div class="muted small">Volume: ${escapeHtml(r.volume||'inconnu')} — Gravité: ${escapeHtml(r.severity||'n/a')}</div>
    <div class="muted small" style="margin-top:8px">Actions recommandées: recouper la source, isoler, rotater les identifiants, notifier les autorités si nécessaire.</div>
  `;
  document.querySelector('.modal').style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', async ()=>{
  const leaks = await fetchLeaks();
  window.__leaks = leaks;
  renderTable(leaks);

  document.getElementById('q')?.addEventListener('input', (e)=>{
    const q = e.target.value.toLowerCase();
    const filtered = leaks.filter(r=> (r.victim+' '+(r.details||[]).join(' ')+' '+(r.source||'')).toLowerCase().includes(q));
    renderTable(filtered);
  });

  document.getElementById('filter-year')?.addEventListener('change', (e)=>{
    const y = e.target.value;
    renderTable(y==='all'? leaks : leaks.filter(r=> r.date && r.date.startsWith(y)));
  });

  document.getElementById('filter-sev')?.addEventListener('change', (e)=>{
    const v = e.target.value;
    renderTable(v==='all'? leaks : leaks.filter(r=> r.severity===v));
  });

  document.getElementById('export')?.addEventListener('click', ()=>{
    const rows = leaks;
    const headers = ['date','victim','details','volume','severity','source'];
    const lines = [headers.join(',')];
    rows.forEach(r=> lines.push([r.date, JSON.stringify(r.victim), JSON.stringify((r.details||[]).join(' | ')), JSON.stringify(r.volume||''), JSON.stringify(r.severity||''), JSON.stringify(r.source||'')].join(',')));
    const blob = new Blob([lines.join('\n')], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='wordpirates-leaks.csv'; a.click(); URL.revokeObjectURL(url);
  });

  document.getElementById('import')?.addEventListener('click', ()=>{
    const txt = prompt('Colle un JSON (tableau) d\\'incidents à importer (champ: date, victim, details[], severity, volume, source)');
    if(!txt) return;
    try{ const arr = JSON.parse(txt); if(!Array.isArray(arr)) throw 'Doit être un tableau'; arr.forEach(i=> leaks.push(i)); renderTable(leaks); alert('Import OK: ' + arr.length + ' éléments'); }catch(e){ alert('JSON invalide: '+ e); }
  });

  document.getElementById('close')?.addEventListener('click', ()=> document.querySelector('.modal').style.display='none');
  document.querySelector('.modal')?.addEventListener('click', (e)=>{ if(e.target===document.querySelector('.modal')) document.querySelector('.modal').style.display='none'; });
});
