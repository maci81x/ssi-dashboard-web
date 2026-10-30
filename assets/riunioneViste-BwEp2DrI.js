const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./index-DNL24Km_.js","./index-BfHmaQMq.js","./index-lf1a9A3q.css"])))=>i.map(i=>d[i]);
import{bL as u,cH as v}from"./index-BfHmaQMq.js";const m="riunione-paged";function b(e,a,t,r){const o=[`<div class="rv-st-corrente">${l(t)}</div>`,`<h1 class="rv-st-titolo">${l(t)}</h1><p class="rv-st-sotto">${l(r)}</p>`];if(e.sintesi){const n=a.querySelector("[data-stampa-sintesi]");n&&o.push(`<section class="rv-st-sezione rv-st-sintesi" data-stampa-sezione="sintesi">${p(n.cloneNode(!0),e).innerHTML}</section>`)}for(const n of v){if(!e.sezioni.includes(n)||n==="clienti"&&e.clienti==="niente")continue;const s=a.querySelector(`section[data-sezione="${n}"]`);if(!s)continue;const i=p(s.cloneNode(!0),e),c=n==="clienti"&&e.clienti==="elenco";o.push(`<section class="rv-st-sezione${c?" stampa-larga":""}" data-stampa-sezione="${n}">${i.innerHTML}</section>`)}return o.join(`
`)}function p(e,a){for(const t of e.querySelectorAll("[data-stampa-variante]")){const r=t.parentElement;r==null||r.querySelectorAll(":scope > [data-stampa-schermo]").forEach(o=>o.remove()),t.removeAttribute("hidden")}return a.clienti==="sintesi"&&e.querySelectorAll("[data-stampa-elenco]").forEach(t=>t.remove()),a.riservato||e.querySelectorAll("[data-stampa-riservata]").forEach(t=>t.remove()),e.querySelectorAll(".noprint, .solo-schermo, script, style, [data-pannello], .st-drawer").forEach(t=>t.remove()),e.querySelectorAll("[hidden]").forEach(t=>t.removeAttribute("hidden")),e.querySelectorAll("select").forEach(t=>{var o,n;const r=document.createElement("span");r.textContent=((n=(o=t.selectedOptions)==null?void 0:o[0])==null?void 0:n.textContent)??"",t.replaceWith(r)}),e.querySelectorAll("button").forEach(t=>{const r=document.createElement("span");r.className=t.className.replace(/\bbtn\b/g,""),r.innerHTML=t.innerHTML,t.replaceWith(r)}),e.querySelectorAll("input, textarea").forEach(t=>t.remove()),e.querySelectorAll("a").forEach(t=>t.removeAttribute("href")),e}const l=e=>e.replace(/[&<>"]/g,a=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[a]);let d=!1;async function g(){if(d)return;const{Handler:e,registerHandlers:a}=await u(async()=>{const{Handler:r,registerHandlers:o}=await import("./index-DNL24Km_.js");return{Handler:r,registerHandlers:o}},__vite__mapDeps([0,1,2]),import.meta.url);class t extends e{renderNode(o,n){var c;if(!(o instanceof HTMLElement)||o.nodeName!=="TR"||!(n instanceof HTMLElement))return;const s=o.closest("table");if(!s||!s.hasAttribute("data-split-from")||s.querySelector(":scope > thead"))return;const i=(c=n.closest("table"))==null?void 0:c.querySelector(":scope > thead");i&&s.insertBefore(i.cloneNode(!0),s.firstChild)}}a(t),d=!0}function f(){var e;(e=document.getElementById(m))==null||e.remove(),document.querySelectorAll("style[data-pagedjs-inserted-styles]").forEach(a=>a.remove()),document.body.classList.remove("rv-in-stampa")}async function z(e,a){f(),await g();const{Previewer:t}=await u(async()=>{const{Previewer:n}=await import("./index-DNL24Km_.js");return{Previewer:n}},__vite__mapDeps([0,1,2]),import.meta.url),r=document.createElement("div");r.id=m,r.setAttribute("aria-hidden","true"),document.body.appendChild(r);const o=URL.createObjectURL(new Blob([h(a)],{type:"text/css"}));try{const n=await new t().preview(e,[o],r);return(n==null?void 0:n.total)??r.querySelectorAll(".pagedjs_page").length}finally{URL.revokeObjectURL(o)}}function E(){document.body.classList.add("rv-in-stampa");const e=()=>{window.removeEventListener("afterprint",e),f()};window.addEventListener("afterprint",e),window.print()}function h(e){return`
@page {
  size: A4 portrait;
  margin: 15mm 12mm 14mm;
  @top-left { content: "${e.replace(/["\\]/g,"")}"; font: 400 8.5pt "IBM Plex Sans", system-ui, sans-serif; color: #445; }
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
