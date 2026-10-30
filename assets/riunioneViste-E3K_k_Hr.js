const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./index-B-wZ6yNa.js","./index-CB82TLJm.js","./index-lf1a9A3q.css"])))=>i.map(i=>d[i]);
import{bY as u,cT as v}from"./index-CB82TLJm.js";const m="riunione-paged";function b(e,o,t,a){const r=[`<div class="rv-st-corrente">${c(t)}</div>`,`<h1 class="rv-st-titolo">${c(t)}</h1><p class="rv-st-sotto">${c(a)}</p>`];if(e.sintesi){const n=o.querySelector("[data-stampa-sintesi]");n&&r.push(`<section class="rv-st-sezione rv-st-sintesi" data-stampa-sezione="sintesi">${p(n.cloneNode(!0),e).innerHTML}</section>`)}for(const n of v){if(!e.sezioni.includes(n)||n==="clienti"&&e.clienti==="niente")continue;const s=o.querySelector(`section[data-sezione="${n}"]`);if(!s)continue;const i=p(s.cloneNode(!0),e),l=n==="clienti"&&e.clienti==="elenco";r.push(`<section class="rv-st-sezione${l?" stampa-larga":""}" data-stampa-sezione="${n}">${i.innerHTML}</section>`)}return r.join(`
`)}function p(e,o){for(const t of e.querySelectorAll("[data-stampa-variante]")){const a=t.parentElement;a==null||a.querySelectorAll(":scope > [data-stampa-schermo]").forEach(r=>r.remove()),t.removeAttribute("hidden")}return o.clienti==="sintesi"&&e.querySelectorAll("[data-stampa-elenco]").forEach(t=>t.remove()),o.riservato||e.querySelectorAll("[data-stampa-riservata]").forEach(t=>t.remove()),e.querySelectorAll(".noprint, .solo-schermo, script, style, [data-pannello], .st-drawer").forEach(t=>t.remove()),e.querySelectorAll("[hidden]").forEach(t=>t.removeAttribute("hidden")),e.querySelectorAll("select").forEach(t=>{var r,n;const a=document.createElement("span");a.textContent=((n=(r=t.selectedOptions)==null?void 0:r[0])==null?void 0:n.textContent)??"",t.replaceWith(a)}),e.querySelectorAll("button").forEach(t=>{const a=document.createElement("span");a.className=t.className.replace(/\bbtn\b/g,""),a.innerHTML=t.innerHTML,t.replaceWith(a)}),e.querySelectorAll("input, textarea").forEach(t=>t.remove()),e.querySelectorAll("a").forEach(t=>t.removeAttribute("href")),e}const c=e=>e.replace(/[&<>"]/g,o=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[o]);let d=!1;async function g(){if(d)return;const{Handler:e,registerHandlers:o}=await u(async()=>{const{Handler:a,registerHandlers:r}=await import("./index-B-wZ6yNa.js");return{Handler:a,registerHandlers:r}},__vite__mapDeps([0,1,2]),import.meta.url);class t extends e{renderNode(r,n){var l;if(!(r instanceof HTMLElement)||r.nodeName!=="TR"||!(n instanceof HTMLElement))return;const s=r.closest("table");if(!s||!s.hasAttribute("data-split-from")||s.querySelector(":scope > thead"))return;const i=(l=n.closest("table"))==null?void 0:l.querySelector(":scope > thead");i&&s.insertBefore(i.cloneNode(!0),s.firstChild)}}o(t),d=!0}function f(){var e;(e=document.getElementById(m))==null||e.remove(),document.querySelectorAll("style[data-pagedjs-inserted-styles]").forEach(o=>o.remove()),document.body.classList.remove("rv-in-stampa")}async function z(e,o,t=!1){f(),await g();const{Previewer:a}=await u(async()=>{const{Previewer:s}=await import("./index-B-wZ6yNa.js");return{Previewer:s}},__vite__mapDeps([0,1,2]),import.meta.url),r=document.createElement("div");r.id=m,r.setAttribute("aria-hidden","true"),document.body.appendChild(r);const n=URL.createObjectURL(new Blob([h(o,t)],{type:"text/css"}));try{const s=await new a().preview(e,[n],r);return(s==null?void 0:s.total)??r.querySelectorAll(".pagedjs_page").length}finally{URL.revokeObjectURL(n)}}function E(){document.body.classList.add("rv-in-stampa");const e=()=>{window.removeEventListener("afterprint",e),f()};window.addEventListener("afterprint",e),window.print()}function h(e,o=!1){const t=e.replace(/["\\]/g,"");return`
@page {
  size: A4 ${o?"landscape":"portrait"};
  margin: 15mm 12mm 14mm;
  @top-left { content: "${t}"; font: 400 8.5pt "IBM Plex Sans", system-ui, sans-serif; color: #445; }
  @top-right { content: "pagina " counter(page) " di " counter(pages); font: 400 8.5pt "IBM Plex Sans", system-ui, sans-serif; color: #445; }
}
@page orizzontale { size: A4 landscape; }
.stampa-larga { page: orizzontale; }
.rv-st-corrente { display: none; }
body, .pagedjs_page { font-size: 9.5pt; }
h1.rv-st-titolo { font-size: 15pt; margin: 0 0 2px; }
.rv-st-sotto { margin: 0 0 8px; color: #555; font-size: 8.5pt; }
.rv-st-sezione { margin-bottom: 10px; }
.rv-st-sezione + .rv-st-sezione { break-before: auto; }
.riunione-titolo { font-size: 12.5pt; margin: 8px 0 4px; break-after: avoid; }
h3, .riunione-sotto { break-after: avoid; }
table { width: 100%; border-collapse: collapse; }
thead { display: table-header-group; }
tr, .riquadro, .st-carta, .rv-blocco, li { break-inside: avoid; }
th, td { padding: 2px 4px; font-size: 8.5pt; }
td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.card { border: 0; padding: 2px 0; box-shadow: none; }
`}export{b as a,z as i,f as p,E as s};
