"use strict";
(() => {
  // src/core/date.ts
  function aData(s) {
    if (!s) return null;
    if (s instanceof Date) {
      if (Number.isNaN(s.getTime())) return null;
      return new Date(s.getFullYear(), s.getMonth(), s.getDate());
    }
    const g = String(s).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(g)) return null;
    return /* @__PURE__ */ new Date(g + "T00:00:00");
  }
  function isoDi(s) {
    const d = aData(s);
    return d ? ymd(d) : "";
  }
  var ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  // src/core/adempimenti.ts
  var SOGLIA_SCADENZA_MESI = 6;

  // src/core/corsiCategoria.ts
  var CATEGORIA_IGNOTA = "da classificare";
  var CATEGORIE_CANONICHE = [
    "Formazione lavoratori",
    "Antincendio",
    "Primo soccorso",
    "RLS",
    "Preposto",
    "DL-RSPP",
    "HACCP",
    "Mezzi"
  ];

  // src/core/formazioneGriglia.ts
  var STATI = ["non_fatto", "scaduto", "da_verificare", "in_scadenza", "valido"];
  function statoCorso(f, oggi, mesiSoglia = SOGLIA_SCADENZA_MESI) {
    if (f.stato_verita === "da_verificare") return "da_verificare";
    const scad = aData(f.data_scadenza);
    if (f.stato_verita === "valido") {
      const soglia = new Date(oggi);
      soglia.setMonth(soglia.getMonth() + mesiSoglia);
      return scad && scad <= soglia ? "in_scadenza" : "valido";
    }
    const parole = (f.stato ?? "").toLowerCase();
    const nonValido = !(f.stato_semplice ?? "").toLowerCase().startsWith("valid");
    if (scad && scad < oggi) return "scaduto";
    if (nonValido) return /scadut/.test(parole) ? "scaduto" : "non_fatto";
    if (scad) {
      const soglia = new Date(oggi);
      soglia.setMonth(soglia.getMonth() + mesiSoglia);
      if (scad <= soglia) return "in_scadenza";
    }
    return "valido";
  }
  function ordinaVoci(voci) {
    const peso = (s) => STATI.indexOf(s);
    return [...voci].sort((a, b) => peso(a.stato) - peso(b.stato) || (aData(a.scadenza)?.getTime() ?? Infinity) - (aData(b.scadenza)?.getTime() ?? Infinity) || (a.corso ?? "").localeCompare(b.corso ?? ""));
  }
  function colonne(righe) {
    const presenti = new Set(righe.map((f) => f.categoria ?? CATEGORIA_IGNOTA));
    const extra = [...presenti].filter((c) => !CATEGORIE_CANONICHE.includes(c) && c !== CATEGORIA_IGNOTA).sort((a, b) => a.localeCompare(b));
    return [...CATEGORIE_CANONICHE, ...extra, ...presenti.has(CATEGORIA_IGNOTA) ? [CATEGORIA_IGNOTA] : []];
  }
  function abilitazioni(righe) {
    const out = [];
    for (const cat of colonne(righe)) {
      if (cat !== "Mezzi") {
        out.push({ chiave: cat, lab: cat, categoria: cat, tipo_mezzo: null });
        continue;
      }
      const mezzi = [...new Set(righe.filter((f) => (f.categoria ?? CATEGORIA_IGNOTA) === "Mezzi").map((f) => f.tipo_mezzo ?? null))];
      const noti = mezzi.filter((m) => !!m).sort((a, b) => a.localeCompare(b));
      for (const m of noti) {
        out.push({ chiave: `Mezzi\xB7${m}`, lab: m, categoria: "Mezzi", tipo_mezzo: m });
      }
      if (mezzi.includes(null)) {
        out.push({ chiave: "Mezzi\xB7?", lab: "Mezzi (quale non si sa)", categoria: "Mezzi", tipo_mezzo: null });
      }
    }
    return out;
  }
  function cellaAbilitazione(righe, a, oggi, mesiSoglia = SOGLIA_SCADENZA_MESI) {
    const sue = righe.filter((f) => {
      if ((f.categoria ?? CATEGORIA_IGNOTA) !== a.categoria) return false;
      if (a.categoria !== "Mezzi") return true;
      return (f.tipo_mezzo ?? null) === a.tipo_mezzo;
    });
    const voci = ordinaVoci(sue.map((f) => ({
      corso: f.corso ?? null,
      tipo_mezzo: f.tipo_mezzo ?? null,
      stato: statoCorso(f, oggi, mesiSoglia),
      scadenza: f.data_scadenza ?? null,
      svolgimento: f.data_svolgimento ?? null,
      ...f.nota_verita ? { nota: f.nota_verita } : {}
    })));
    return { voci, peggiore: voci.length ? voci[0].stato : null };
  }

  // src/core/corsiDaVerificare.ts
  var TIPI = [
    ["haccp", /haccp|alimentarist/],
    ["antincendio", /antincendio|incendio/],
    ["primo soccorso", /primo soccorso|soccors/],
    ["preposti", /prepost/],
    ["dirigenti", /dirigent/],
    ["rspp", /rspp|datore di lavoro|datori di lavoro|\bddl\b/],
    ["rls", /\brls\b|rappresentant/],
    ["carrelli", /carrell|muletto/],
    ["ple", /\bple\b|piattaform/],
    ["trattori", /trattor/],
    ["gru", /\bgru\b/],
    ["movimento terra", /escavator|movimento terra|terna/],
    ["fitosanitari", /fitosanit|patentino.*fito/],
    ["spazi confinati", /spazi confinati|confinat/],
    ["quota", /quota|anticaduta|\bdpi\b.*(iii|3)|funi/],
    ["ponteggi", /ponteggi/],
    ["motosega", /motoseg|decespugliat/],
    ["lavoratori", /lavorator|sicurezza generale|formazione generale|formazione specifica/]
  ];
  function tipoCorso(...nomi) {
    const t = nomi.filter(Boolean).join(" ").toLowerCase();
    return TIPI.find(([, rx]) => rx.test(t))?.[0] ?? null;
  }

  // src/core/veritaFormazione.ts
  var VALIDITA_PREDEFINITA = {
    lavoratori: 60,
    preposti: 24,
    dirigenti: 60,
    rspp: 60,
    rls: 12,
    antincendio: 60,
    "primo soccorso": 36,
    haccp: 60,
    carrelli: 60,
    ple: 60,
    trattori: 60,
    gru: 60,
    "movimento terra": 60,
    fitosanitari: 60,
    "spazi confinati": 60,
    quota: 60,
    ponteggi: 48,
    motosega: 60,
    "bls-d": 24
  };
  var tipoV = (...n) => /bls|\bdae\b|defibrill/i.test(n.filter(Boolean).join(" ")) ? "bls-d" : tipoCorso(...n);
  var iso = (d) => d == null ? null : typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10);
  var gma = (d) => d.split("-").reverse().join("/");
  var piuMesi = (d, m) => {
    const x = /* @__PURE__ */ new Date(`${d}T00:00:00Z`);
    x.setUTCMonth(x.getUTCMonth() + m);
    return x.toISOString().slice(0, 10);
  };
  var nonValida = (r, oggi) => {
    const sc = iso(r.data_scadenza);
    return sc != null && sc < oggi || !(r.stato_semplice ?? "").toLowerCase().startsWith("valid");
  };
  var stessaPersona = (a, b) => !!a.id_lavoratore && a.id_lavoratore === b.id_lavoratore || !!a.cf && !!b.cf && a.cf.trim().toUpperCase() === b.cf.trim().toUpperCase();
  function veritaFormazione(righe, corsi, servizi, equivalenze, validita, oggi) {
    const o = iso(oggi);
    const mesi = (t) => t ? validita[t] ?? VALIDITA_PREDEFINITA[t] ?? null : null;
    const scadenzaDi = (c, tipo) => {
      const sc = iso(c.data_scadenza);
      if (sc) return { sc, calcolata: false };
      const sv = iso(c.data_svolgimento), m = mesi(tipo);
      return sv && m ? { sc: piuMesi(sv, m), calcolata: true } : null;
    };
    const registrati = corsi.map((c) => ({ t: tipoV(c.corso), d: iso(c.data_svolgimento) })).filter((x) => x.t && x.d);
    const residuo = /* @__PURE__ */ new Map();
    for (const s of servizi) {
      const t = tipoV(s.nome);
      const d = iso(s.data_esecuzione);
      if (!t || !d || registrati.some((x) => x.t === t && Math.abs(Date.parse(x.d) - Date.parse(d)) <= 15 * 864e5)) continue;
      residuo.set(t, [...residuo.get(t) ?? [], { data: d, n: Math.max(1, Number(s.quantita) || 1) }].sort((a, b) => b.data.localeCompare(a.data)));
    }
    const ordine = [...righe.keys()].sort((a, b) => (iso(righe[a].data_scadenza) ?? "").localeCompare(iso(righe[b].data_scadenza) ?? ""));
    const out = righe.map((r) => ({ ...r }));
    for (const i of ordine) {
      const r = righe[i];
      if (!nonValida(r, o)) continue;
      const tipo = tipoV(r.corso, r.categoria, r.tipo_mezzo);
      const propria = iso(r.data_svolgimento) && !iso(r.data_scadenza) ? scadenzaDi(r, tipo) : null;
      if (propria && propria.sc >= o) {
        out[i] = {
          ...out[i],
          stato_verita: "valido",
          data_scadenza: propria.sc,
          nota_verita: `fatto il ${gma(iso(r.data_svolgimento))}, valido al ${gma(propria.sc)} (scadenza calcolata dall'app)`
        };
        continue;
      }
      const tipi = new Set([tipo, ...equivalenze.filter((e) => e.tipo === tipo).map((e) => e.chiuso_da)].filter(Boolean));
      const candidati = [...corsi, ...righe.filter((x) => !nonValida(x, o) && iso(x.data_svolgimento))].filter((c) => stessaPersona(c, r) && !/^non valid/i.test(String(c.stato_semplice ?? ""))).map((c) => ({ c, t: tipoV(c.corso) })).filter((x) => x.t && tipi.has(x.t) && iso(x.c.data_svolgimento)).map((x) => ({ ...x, s: scadenzaDi(x.c, x.t) })).filter((x) => x.s && x.s.sc >= o).sort((a, b) => b.s.sc.localeCompare(a.s.sc));
      if (candidati.length && tipo) {
        const { c, t, s } = candidati[0];
        out[i] = {
          ...out[i],
          stato_verita: "valido",
          data_scadenza: s.sc,
          nota_verita: `chiusa dal corso \xAB${c.corso}\xBB del ${gma(iso(c.data_svolgimento))}${t !== tipo ? ` (equivalente: ${t} vale per ${tipo})` : ""}, valido al ${gma(s.sc)}${s.calcolata ? " (scadenza calcolata dall'app)" : ""}`
        };
        continue;
      }
      const dopo = iso(r.data_svolgimento) ?? "0000";
      const da = iso(r.data_scadenza) ? piuMesi(iso(r.data_scadenza), -12) : piuMesi(o, -24);
      const es = tipo ? (residuo.get(tipo) ?? []).find((x) => x.n > 0 && x.data > dopo && x.data >= da) : void 0;
      if (es) {
        es.n--;
        out[i] = {
          ...out[i],
          stato_verita: "da_verificare",
          da_registrare: true,
          nota_verita: `eseguito il ${gma(es.data)}, attestato da registrare in Securmars`
        };
        continue;
      }
      if (tipo === "fitosanitari") {
        out[i] = { ...out[i], stato_verita: "da_verificare", nota_verita: "verificare la scadenza dell'abilitazione su ARTEA (vale quella, non la data del corso)" };
      }
    }
    return out;
  }
  var CATEGORIA_DI = {
    lavoratori: "Formazione lavoratori",
    antincendio: "Antincendio",
    "primo soccorso": "Primo soccorso",
    rls: "RLS",
    preposti: "Preposto",
    rspp: "DL-RSPP",
    dirigenti: "Dirigenti",
    haccp: "HACCP",
    fitosanitari: "Fitosanitari"
  };
  var NOTA_FUORI = {
    ex: "non \xE8 nell'anagrafica lavoratori di questo cliente in Securmars: da aggiungere (o \xE8 un ex dipendente)",
    altrove: "risulta assunto presso un altro cliente: non \xE8 nell'anagrafica lavoratori di questo cliente in Securmars",
    senzaNome: "nel registro corsi c'\xE8 solo il codice fiscale, senza nome in nessuna fonte: da aggiungere all'anagrafica in Securmars",
    nonCaricato: "la lettura dei nomi non \xE8 riuscita: ricarica la scheda"
  };
  function personeSoloRegistro(corsi, cfNoti, nomi = /* @__PURE__ */ new Map(), idNoti = []) {
    const noti = new Set(cfNoti.filter(Boolean).map((x) => String(x).trim().toUpperCase()));
    const ids = new Set(idNoti.filter(Boolean).map(String));
    return corsi.filter((c) => c.cf && !noti.has(c.cf.trim().toUpperCase()) && !(c.id_lavoratore && ids.has(String(c.id_lavoratore)))).map((c) => {
      const cf = c.cf.trim().toUpperCase();
      const n = nomi?.get(cf);
      return {
        id_lavoratore: `cf:${cf}`,
        cognome: n?.cognome ?? (nomi ? "Nome non registrato" : "Nome non caricato"),
        nome: n?.nome ?? null,
        corso: c.corso ?? null,
        categoria: /bls|\bdae\b|defibrill/i.test(c.corso ?? "") ? "BLS-D (defibrillatore)" : CATEGORIA_DI[tipoCorso(c.corso) ?? ""] ?? null,
        tipo_mezzo: null,
        data_svolgimento: iso(c.data_svolgimento),
        data_scadenza: iso(c.data_scadenza),
        stato: "Valido",
        stato_semplice: "Valido",
        nota_persona: !nomi ? NOTA_FUORI.nonCaricato : !n ? NOTA_FUORI.senzaNome : n.assunto_altrove ? NOTA_FUORI.altrove : NOTA_FUORI.ex,
        fonte_nome: n?.fonte ?? null
      };
    });
  }
  var ANTINCENDIO_5_ANNI_DAL = "2024-01-01";
  function scadenzaDiLegge(tipo, svolgimento, scadenza) {
    if (tipo === "antincendio" && svolgimento) {
      const legge = piuMesi(svolgimento, svolgimento >= ANTINCENDIO_5_ANNI_DAL ? 60 : 36);
      if (scadenza !== legge) return { sc: legge, corretta: !!scadenza };
    }
    return { sc: scadenza, corretta: false };
  }
  var CATEGORIA_BLSD = "BLS-D (defibrillatore)";
  var MEZZI = /* @__PURE__ */ new Set(["carrelli", "ple", "trattori", "gru", "movimento terra"]);
  function corsiDalRegistro(corsi, formazione, anagrafica, oggi) {
    const o = iso(oggi);
    const tutti = [...anagrafica, ...formazione.filter((f) => f.id_lavoratore && !anagrafica.some((l) => l.id_lavoratore === f.id_lavoratore)).map((f) => ({ id_lavoratore: f.id_lavoratore, codice_fiscale: f.cf ?? null, cognome: f.cognome ?? null, nome: f.nome ?? null }))];
    const perCf = new Map(tutti.filter((l) => l.codice_fiscale).map((l) => [l.codice_fiscale.trim().toUpperCase(), l]));
    const perId = /* @__PURE__ */ new Map();
    for (const l of tutti) if (!perId.has(l.id_lavoratore) || !perId.get(l.id_lavoratore).cognome && l.cognome) perId.set(l.id_lavoratore, l);
    const conRighe = new Set(formazione.filter((f) => f.id_lavoratore && f.categoria).flatMap((f) => [
      `${f.id_lavoratore}|${/bls|\bdae\b|defibrill/i.test(f.corso ?? "") ? CATEGORIA_BLSD : f.categoria}`,
      ...f.categoria === "Mezzi" ? [`${f.id_lavoratore}|Mezzi|${tipoCorso(f.corso, f.tipo_mezzo) ?? ""}`] : []
    ]));
    const out = [];
    const visti = /* @__PURE__ */ new Set();
    const ordinati = [...corsi].sort((a, b) => (iso(b.data_svolgimento) ?? "").localeCompare(iso(a.data_svolgimento) ?? ""));
    for (const c of ordinati) {
      const l = c.id_lavoratore && perId.get(c.id_lavoratore) || (c.cf ? perCf.get(c.cf.trim().toUpperCase()) : void 0);
      const tipo = tipoCorso(c.corso);
      const mezzo = tipo && MEZZI.has(tipo) ? tipo : null;
      const categoria = /bls|\bdae\b|defibrill/i.test(c.corso ?? "") ? CATEGORIA_BLSD : mezzo ? "Mezzi" : tipo ? CATEGORIA_DI[tipo] : void 0;
      if (!l || !categoria) continue;
      const k = `${l.id_lavoratore}|${categoria}|${tipo}`;
      if (visti.has(k)) continue;
      visti.add(k);
      const sv = iso(c.data_svolgimento);
      const leg = scadenzaDiLegge(tipo, sv, iso(c.data_scadenza));
      const nonValidaPrima = /^non valid/i.test(String(c.stato_semplice ?? ""));
      const valido = !!leg.sc && leg.sc >= o && !nonValidaPrima;
      if (tipo === "dirigenti" && valido && !visti.has(`${l.id_lavoratore}|Formazione lavoratori|equivalente`)) {
        visti.add(`${l.id_lavoratore}|Formazione lavoratori|equivalente`);
        out.push({
          id_lavoratore: l.id_lavoratore,
          cf: c.cf ?? null,
          cognome: l.cognome ?? null,
          nome: l.nome ?? null,
          corso: c.corso ?? null,
          categoria: "Formazione lavoratori",
          tipo_mezzo: null,
          data_svolgimento: sv,
          data_scadenza: leg.sc,
          stato: "Valido",
          stato_semplice: "Valido",
          stato_verita: "valido",
          nota_verita: "dal registro corsi: il corso Dirigenti vale come formazione lavoratori (equivalenza)"
        });
      }
      out.push({
        id_lavoratore: l.id_lavoratore,
        cf: c.cf ?? null,
        cognome: l.cognome ?? null,
        nome: l.nome ?? null,
        corso: c.corso ?? null,
        categoria,
        tipo_mezzo: mezzo,
        data_svolgimento: sv,
        data_scadenza: leg.sc,
        stato: valido ? "Valido" : "Scaduto",
        stato_semplice: valido ? "Valido" : "Scaduto",
        ...valido ? { stato_verita: "valido" } : {},
        nota_verita: `dal registro corsi${nonValidaPrima ? `; ${c.nota_verita ?? "non valido"}` : ""}${leg.corretta ? `; scadenza ${sv && sv >= ANTINCENDIO_5_ANNI_DAL ? "a 5 anni (corso dal 2024)" : "a 3 anni (corso fino al 2023)"}, in Securmars c'\xE8 ${gma(iso(c.data_scadenza))}: da correggere` : ""}`
      });
    }
    return out;
  }
  function conScadenzaDiLegge(righe, validita, nAssunti) {
    return righe.map((r) => {
      if (nAssunti != null && /\brls\b|rappresentant/i.test(r.corso ?? "") && /agg/i.test(r.corso ?? "")) {
        const ore = Number(/(\d+(?:[.,]\d+)?)\s*or[ei]?\b/i.exec(r.corso ?? "")?.[1]?.replace(",", ".") ?? NaN);
        const minimo = nAssunti > 50 ? 8 : 4;
        if (Number.isFinite(ore) && ore < 32 && ore < minimo) {
          return {
            ...r,
            stato: "Non valido (ore insufficienti)",
            stato_semplice: "Non valido",
            stato_verita: void 0,
            nota_verita: `aggiornamento RLS di ${ore} ore: con ${nAssunti} lavoratori ne servono ${minimo} l'anno (art. 37 c.11)`
          };
        }
      }
      const sv = iso(r.data_svolgimento);
      if (!sv) return r;
      const tipo = /bls|\bdae\b|defibrill/i.test(r.corso ?? "") ? "bls-d" : tipoCorso(r.corso, r.categoria, r.tipo_mezzo);
      const sc = iso(r.data_scadenza);
      const leg = scadenzaDiLegge(tipo, sv, sc);
      if (leg.sc && leg.sc !== sc) {
        return {
          ...r,
          data_scadenza: leg.sc,
          nota_verita: [r.nota_verita, sc ? `scadenza riportata alla regola (${sv >= ANTINCENDIO_5_ANNI_DAL ? "5" : "3"} anni): in Securmars c'\xE8 ${gma(sc)}, da correggere` : `scadenza calcolata: ${sv >= ANTINCENDIO_5_ANNI_DAL ? "5" : "3"} anni dal corso`].filter(Boolean).join("; ")
        };
      }
      const m = tipo ? validita[tipo] ?? VALIDITA_PREDEFINITA[tipo] ?? null : null;
      if (!sc && m) {
        const calc = piuMesi(sv, m);
        return { ...r, data_scadenza: calc, nota_verita: [r.nota_verita, `scadenza calcolata: ${m} mesi dal corso`].filter(Boolean).join("; ") };
      }
      return r;
    });
  }

  // src/core/agendaAbbina.ts
  function normNome(t) {
    return (t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z]+/g, " ").trim();
  }
  function famigliaAgenda(t) {
    const s = (t ?? "").toLowerCase();
    if (!s.trim()) return null;
    if (/haccp|alimentarist/.test(s)) return "haccp";
    if (/primo soccorso|\bb\s*[/-]\s*c\b|\bgruppo [abc]\b/.test(s)) return "primo_soccorso";
    if (/antincendio|\bliv(ello)?\.?\s?[123]\b/.test(s)) return "antincendio";
    if (/prepost/.test(s)) return "preposti";
    if (/\brls\b|rappresentante dei lavoratori/.test(s)) return "rls";
    if (/rspp|datore di lavoro|\bddl\b|\bdl\b/.test(s)) return "rspp_dl";
    if (/\bdpi\b|3[°ª]?\s*cat/.test(s)) return "dpi";
    if (/carrell|muletto/.test(s)) return "carrelli";
    if (/\bple\b|piattaform/.test(s)) return "ple";
    if (/trattor/.test(s)) return "trattori";
    if (/lavorator|sicurezza|rischio (basso|medio|alto)|\blav\b|\bbasso\b|\bmedio\b|\balto\b/.test(s)) return "lavoratori";
    return null;
  }

  // src/core/griglia.ts
  function mmaa(iso4) {
    const m = /^(\d{4})-(\d{2})/.exec(iso4 ?? "");
    return m ? `${m[2]}/${m[1].slice(2)}` : "\u2014";
  }
  var gma2 = (iso4) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso4 ?? "");
    return m ? `${m[3]}/${m[2]}/${m[1]}` : "\u2014";
  };

  // src/core/grigliaFormazione.ts
  var MESI_IN_SCADENZA = 3;
  var STATO = { valido: "ok", in_scadenza: "scade", da_verificare: "scade", scaduto: "ko", non_fatto: "ko" };
  var iso2 = (d) => d == null ? null : typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10);
  var nomeDi = (c, n) => normNome(`${c ?? ""} ${n ?? ""}`);
  function piuRecente(voci) {
    return [...voci].sort((a, b) => (iso2(b.svolgimento) ?? iso2(b.scadenza) ?? "").localeCompare(iso2(a.svolgimento) ?? iso2(a.scadenza) ?? ""))[0] ?? null;
  }
  function obbligo(corso) {
    const t = (corso ?? "").toLowerCase();
    if (/bls|\bdae\b|defibrill/.test(t)) return "bls-d";
    const tipo = tipoCorso(corso);
    if (tipo === "dirigenti") return "lavoratori";
    return tipo ?? t.replace(/\s+/g, " ").trim();
  }
  function voceDellaCella(voci) {
    const gruppi = /* @__PURE__ */ new Map();
    for (const v of voci) gruppi.set(obbligo(v.corso), [...gruppi.get(obbligo(v.corso)) ?? [], v]);
    const vale = (v) => v.stato === "valido" || v.stato === "in_scadenza" || v.stato === "da_verificare";
    const teste = [...gruppi.values()].map((g) => {
      const valide = g.filter(vale).sort((a, b) => (iso2(b.scadenza) ?? "9999").localeCompare(iso2(a.scadenza) ?? "9999"));
      return valide[0] ?? piuRecente(g);
    }).filter((v) => !!v);
    return ordinaVoci(teste)[0] ?? null;
  }
  function rigaDettaglio(v) {
    const fatto = iso2(v.svolgimento), scad = iso2(v.scadenza);
    return [
      v.corso ?? "corso",
      v.tipo_mezzo ? `(${v.tipo_mezzo})` : "",
      // 21/10 — «non fatto · scade il» non si capiva: senza data del corso e con la scadenza davanti, è l'aggiornamento da
      // fare entro quella data, mentre vale ancora il corso precedente
      fatto ? `\xB7 fatto il ${gma2(fatto)}` : scad && (v.stato === "valido" || v.stato === "in_scadenza") ? "" : v.nota ? "" : "\xB7 non fatto",
      scad ? !fatto && (v.stato === "valido" || v.stato === "in_scadenza") ? `\xB7 da fare entro il ${gma2(scad)} (fino ad allora vale il corso precedente)` : `\xB7 scade il ${gma2(scad)}` : "",
      v.nota ? `\u2014 ${v.nota}` : ""
    ].filter(Boolean).join(" ");
  }
  function cellaFormazione(voci, agenda, a) {
    const v = voceDellaCella(voci);
    if (!v) return { stato: "nd", breve: "", dettaglio: ["non dovuto: nessun corso di questo tipo registrato per questa persona"] };
    const stato = STATO[v.stato];
    const dettaglio = [...new Set([...voci].sort((x, y) => (iso2(y.svolgimento) ?? "").localeCompare(iso2(x.svolgimento) ?? "")).map(rigaDettaglio))];
    if (stato === "ko") {
      const fam = famigliaAgenda(a.lab) ?? famigliaAgenda(a.categoria);
      const aula = agenda.find((x) => fam && famigliaAgenda(x.corso) === fam);
      if (aula) {
        return {
          stato: "fissato",
          breve: aula.data_inizio ? mmaa(aula.data_inizio) : "aula",
          dettaglio: [`${aula.categoria === "fissato" ? "fissato" : "in calendario, da confermare"}${aula.data_inizio ? ` il ${gma2(aula.data_inizio)}` : ""} in agenda: ${aula.corso ?? ""}`, ...dettaglio]
        };
      }
    }
    if ((v.stato === "valido" || v.stato === "in_scadenza") && !iso2(v.scadenza) && !iso2(v.svolgimento)) {
      return { stato: "scade", breve: "verificare", dettaglio: ["valido in Securmars ma senza data del corso n\xE9 scadenza: verificare l'attestato", ...dettaglio] };
    }
    const breve = v.stato === "da_verificare" ? "verificare" : stato === "ko" && !iso2(v.scadenza) ? "da fare" : mmaa(iso2(v.scadenza) ?? iso2(v.svolgimento));
    return { stato, breve, dettaglio };
  }
  function grigliaFormazione(lavoratori, corsi, agenda, oggi) {
    const inAnagrafica = new Set(lavoratori.map((l) => l.id_lavoratore));
    const perNome = /* @__PURE__ */ new Map();
    const canonico = /* @__PURE__ */ new Map();
    const attivi = [];
    for (const l of lavoratori.filter((x) => !x.data_dimissione)) {
      const k = nomeDi(l.cognome, l.nome);
      const primo = k ? perNome.get(k) : void 0;
      if (primo) {
        canonico.set(l.id_lavoratore, primo);
        continue;
      }
      if (k) perNome.set(k, l.id_lavoratore);
      attivi.push(l);
    }
    const idDi = (c) => {
      const id = c.id_lavoratore ?? "";
      if (canonico.has(id)) return canonico.get(id);
      if (!id || inAnagrafica.has(id)) return id;
      return perNome.get(nomeDi(c.cognome, c.nome)) ?? id;
    };
    const corsiId = corsi.map((c) => ({
      ...c,
      id_lavoratore: idDi(c),
      .../bls|\bdae\b|defibrill/i.test(c.corso ?? "") ? { categoria: CATEGORIA_BLSD } : {}
    }));
    const fuori = [...new Map(corsiId.filter((c) => c.id_lavoratore && !inAnagrafica.has(c.id_lavoratore)).map((c) => [c.id_lavoratore, {
      id_lavoratore: c.id_lavoratore,
      cognome: c.cognome ?? null,
      nome: c.nome ?? null,
      inquadramento: null,
      nota_persona: c.nota_persona ?? null,
      fonte_nome: c.fonte_nome ?? null
    }])).values()];
    const notaDi = new Map(fuori.map((f) => [f.id_lavoratore, f]));
    const persone = [...attivi, ...fuori];
    const abil = abilitazioni(corsiId);
    const colonne2 = abil.map((a) => ({ chiave: a.chiave, lab: a.lab }));
    const agendaPer = /* @__PURE__ */ new Map();
    for (const x of agenda) {
      const k = nomeDi(x.cognome, x.nome);
      agendaPer.set(k, [...agendaPer.get(k) ?? [], x]);
    }
    const righe = persone.map((l) => {
      const sue = corsiId.filter((c) => c.id_lavoratore === l.id_lavoratore);
      const aule = agendaPer.get(nomeDi(l.cognome, l.nome)) ?? [];
      const celle = {};
      for (const a of abil) celle[a.chiave] = cellaFormazione(cellaAbilitazione(sue, a, oggi, MESI_IN_SCADENZA).voci, aule, a);
      return {
        chiave: l.id_lavoratore,
        nome: `${l.cognome ?? ""} ${l.nome ?? ""}`.trim() || l.id_lavoratore,
        // la mansione solo quando dice qualcosa: «Dipendente» lo sono quasi tutti (revisione 08/10)
        sotto: inAnagrafica.has(l.id_lavoratore) ? /^dipendente$/i.test(l.inquadramento ?? "") ? null : l.inquadramento ?? null : notaDi.get(l.id_lavoratore)?.nota_persona ?? "manca in Securmars (anagrafica)",
        titolo: notaDi.get(l.id_lavoratore)?.fonte_nome ? `nome da: ${notaDi.get(l.id_lavoratore).fonte_nome}` : null,
        celle
      };
    }).sort((x, y) => x.nome.localeCompare(y.nome, "it"));
    return { colonne: colonne2, righe };
  }

  // src/core/scadenze.ts
  function bucketDi(s, rif) {
    const g = s.giorni_alla_scadenza;
    const sc = aData(s.data_scadenza);
    if (s.stato_norm === "scaduto" || g != null && g < 0 || sc && sc < rif) return "scaduti";
    if (s.stato_norm === "da_fare" && !s.data_scadenza) return "dafare";
    const d = g != null ? g : sc ? Math.round((sc.getTime() - rif.getTime()) / 864e5) : null;
    if (d == null) return "dafare";
    if (d <= 30) return "e30";
    if (d <= 90) return "e90";
    return "futuri";
  }

  // src/core/veritaScadenzario.ts
  function statoOggi(dataScadenza, oggi) {
    if (!dataScadenza) return null;
    const d = typeof dataScadenza === "string" ? /* @__PURE__ */ new Date(`${dataScadenza.slice(0, 10)}T00:00:00`) : dataScadenza;
    const o = new Date(oggi);
    o.setHours(0, 0, 0, 0);
    const g = Math.round((d.getTime() - o.getTime()) / 864e5);
    return g < 0 ? "scaduta" : g <= 30 ? "entro 30 giorni" : g <= 90 ? "entro 90 giorni" : "futura";
  }
  var FAMIGLIE = [
    ["rumore", /rumore/],
    ["vibrazioni", /vibrazion/],
    ["chimico", /chimic/],
    ["stress", /stress/],
    ["incendio", /incendio|antincendio/],
    ["mmc", /movimentazione manuale|\bmmc\b/],
    ["legionella", /legionell/],
    ["haccp", /haccp|autocontrollo/],
    ["radon", /radon/],
    ["microclima", /microclima/],
    ["videoterminali", /videoterminal/],
    ["roa", /radiazioni ottiche|\broa\b/],
    ["campi", /campi elettromagnetici|\bcem\b/],
    ["dvr", /documento di valutazione (dei )?rischi|^dvr (aggiornamento|classificazione)|\bdvr generale\b/]
  ];
  var famigliaDocumento = (nome) => {
    const t = (nome ?? "").toLowerCase();
    return FAMIGLIE.find(([, rx]) => rx.test(t))?.[0] ?? null;
  };
  var RE_UNA_TANTUM = /sopralluogo|\burgenza\b|istituzione|check\s*[-–]?\s*up/i;
  var RE_CORSO = /^\s*corso|formazione|addestrament|aggiornamento .*(lavorator|prepost|addett)/i;
  var iso3 = (d) => d == null ? null : typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10);
  var norm = (s) => (s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  var gma3 = (d) => d.split("-").reverse().join("/");
  var piuMesi2 = (d, m) => {
    const x = /* @__PURE__ */ new Date(`${d}T00:00:00Z`);
    x.setUTCMonth(x.getUTCMonth() + m);
    return x.toISOString().slice(0, 10);
  };
  function veritaScadenzario(righe, servizi, validitaListino, oggi) {
    const perNome = /* @__PURE__ */ new Map();
    for (const s of servizi) if (s.tipologia_servizio) perNome.set(norm(s.tipologia_servizio), s);
    const eseguiti = servizi.filter((s) => s.eseguito && iso3(s.data_esecuzione) && !RE_CORSO.test(s.tipologia_servizio ?? "")).map((s) => ({ s, fam: famigliaDocumento(s.tipologia_servizio), il: iso3(s.data_esecuzione) }));
    const tenute = [];
    let usciteUnaTantum = 0;
    for (const r of righe) {
      const servizio = !r.lavoratore && /servizio/i.test(r.tipo_scadenza ?? "");
      if (servizio) {
        const s = perNome.get(norm(r.descrizione));
        const v = s ? validitaListino(s.codice_tipologia) : void 0;
        if (RE_UNA_TANTUM.test(r.descrizione ?? "") || s && !(Number(v) > 0)) {
          usciteUnaTantum++;
          continue;
        }
        const fam = famigliaDocumento(r.descrizione);
        const fatto = iso3(r.data_effettuazione) ?? "0000";
        const dopo = fam ? eseguiti.filter((x) => x.fam === fam && x.il > fatto).sort((a, b) => b.il.localeCompare(a.il))[0] : void 0;
        if (dopo) {
          const m = validitaListino(dopo.s.codice_tipologia);
          const scade = piuMesi2(dopo.il, m && m > 0 ? m : 48);
          tenute.push({
            riga: r,
            stato: statoOggi(scade, oggi),
            rifatto: { il: dopo.il, scade },
            nota: `rifatto il ${gma3(dopo.il)} (\xAB${dopo.s.tipologia_servizio}\xBB): nuova scadenza ${gma3(scade)}${m && m > 0 ? "" : " (48 mesi: il listino non dice la validit\xE0)"}`
          });
          continue;
        }
      }
      tenute.push({ riga: r, stato: statoOggi(r.data_scadenza, oggi) });
    }
    return { tenute, usciteUnaTantum };
  }
  var nomeNorm = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]+/g, " ").trim();
  function veritaPersona(riga, formazione, tipo) {
    if (!riga.lavoratore) return null;
    const tipoBase = tipo;
    tipo = (...n) => /bls|\bdae\b|defibrill/i.test(n.filter(Boolean).join(" ")) ? "bls-d" : tipoBase(...n);
    const chi = nomeNorm(riga.lavoratore);
    const t = tipo(riga.descrizione);
    if (!t) return null;
    const oggi = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const sua = (x) => tipo(x.corso, x.categoria, x.tipo_mezzo) === t && [`${x.cognome ?? ""} ${x.nome ?? ""}`, `${x.nome ?? ""} ${x.cognome ?? ""}`].map(nomeNorm).includes(chi);
    const f = formazione.find((x) => x.stato_verita && sua(x));
    if (f) return { stato: f.stato_verita, nota: f.nota_verita ?? "", scade: iso3(f.data_scadenza) };
    const v = formazione.filter((x) => sua(x) && (x.stato_semplice ?? "").toLowerCase().startsWith("valid") && iso3(x.data_svolgimento) && (iso3(x.data_scadenza) ?? "9999") >= oggi && (iso3(x.data_scadenza) ?? "") > (iso3(riga.data_scadenza) ?? "")).sort((a, b) => (iso3(b.data_svolgimento) ?? "").localeCompare(iso3(a.data_svolgimento) ?? ""))[0];
    if (v) return {
      stato: "valido",
      scade: iso3(v.data_scadenza),
      nota: `chiusa dal corso \xAB${v.corso}\xBB del ${gma3(iso3(v.data_svolgimento))}${iso3(v.data_scadenza) ? `, valido al ${gma3(iso3(v.data_scadenza))}` : ""}`
    };
    const p = formazione.filter((x) => sua(x) && !iso3(x.data_svolgimento) && (x.stato_semplice ?? x.stato ?? "").toLowerCase().startsWith("valid") && (iso3(x.data_scadenza) ?? "") >= oggi && (iso3(x.data_scadenza) ?? "") > (iso3(riga.data_scadenza) ?? "")).sort((a, b) => (iso3(b.data_scadenza) ?? "").localeCompare(iso3(a.data_scadenza) ?? ""))[0];
    return p ? {
      stato: "valido",
      scade: iso3(p.data_scadenza),
      nota: `in Securmars \xAB${p.corso}\xBB risulta valido fino al ${gma3(iso3(p.data_scadenza))}`
    } : null;
  }

  // src/core/macroaree.ts
  var MACROAREE = [
    { k: "scad", lab: "Scadenzario cliente", hint: "tutto ci\xF2 che scade o \xE8 scaduto a gestionale" },
    { k: "corsi", lab: "Corsi / Formazione", areas: ["Corsi / Formazione"] },
    { k: "sorv", lab: "Sorveglianza sanitaria", areas: ["Sorveglianza sanitaria"] },
    {
      k: "doc",
      lab: "Documenti sicurezza (DVR, piani, DUVRI)",
      areas: ["Documenti sicurezza (DVR e piani)", "Pratiche antincendio", "Incarichi / RSPP"]
    },
    { k: "haccp", lab: "HACCP e analisi", areas: ["HACCP", "Analisi (tamponi/acque/alimenti)"] },
    {
      k: "estin",
      lab: "Estintori / presidi antincendio",
      areas: ["Estintori / presidi antincendio"],
      gest: true
    },
    { k: "cass", lab: "Cassetta medica / reintegro", areas: ["Cassetta medica"], gest: true },
    { k: "dpi", lab: "DPI e scheda consegna", areas: ["DPI"], gest: true },
    { k: "terra", lab: "Messa a terra / CIVA", areas: ["Messa a terra / CIVA"], gest: true },
    { k: "radon", lab: "Radon", areas: ["Radon"], gest: true },
    { k: "priv", lab: "Privacy / GDPR", areas: ["Privacy"] },
    { k: "amb", lab: "Ambiente", areas: ["Ambiente"] },
    { k: "mat", lab: "Materiale / segnaletica", areas: ["Materiale / segnaletica", "Altro"], gest: true },
    { k: "fatt", lab: "Fatture aperte", hint: "documenti emessi non ancora incassati" }
  ];
  var CHIAVI_MACRO = MACROAREE.map((m) => m.k);
  var MACRO_VENDIBILI = MACROAREE.filter((m) => m.k !== "scad" && m.k !== "fatt");
  var perArea = /* @__PURE__ */ new Map();
  for (const m of MACROAREE) for (const a of m.areas ?? []) perArea.set(a, m.k);

  // src/core/vendere.ts
  function eVenduto(s) {
    if (s.venduto_eff != null) return !!s.venduto_eff;
    if (s.stato_offerta !== "Formalizzata" || s.archiviato) return false;
    return s.stato_accettazione != null ? s.stato_accettazione === "Accettato" : s.data_accettazione != null;
  }

  // src/scheda/scadenzeVereCalcolo.ts
  var tipoObbligo = (...n) => /bls|\bdae\b|defibrill/i.test(n.filter(Boolean).join(" ")) ? "bls-d" : tipoCorso(...n);
  var BUCKET_OGGI = { "scaduta": "scaduti", "entro 30 giorni": "e30", "entro 90 giorni": "e90", "futura": "futuri" };
  function scadenzeVere({ scadenze, servizi = [], validitaListino = () => null, formazione = [], lavoratori = [], oggi, dati }) {
    if (dati?.corsi) {
      const nAssunti = lavoratori.filter((l) => l.stato_assunzione === "Assunto").length;
      formazione = conScadenzaDiLegge(formazione, dati.validita ?? {}, nAssunti);
      dati = { ...dati, corsi: conScadenzaDiLegge(dati.corsi, dati.validita ?? {}, nAssunti) };
    }
    const formVera = dati?.corsi ? [
      ...veritaFormazione(
        formazione,
        dati.corsi,
        servizi.filter((s) => eVenduto(s) && Boolean(s.data_esecuzione) && /corso|addestrament/i.test(s.tipologia_servizio ?? "")).map((s) => ({ nome: s.tipologia_servizio ?? null, data_esecuzione: isoDi(s.data_esecuzione) || null, quantita: Number(s.quantita) || 1 })),
        dati.equivalenze ?? [],
        dati.validita ?? {},
        oggi
      ),
      // i corsi del registro dove Securmars non ha percorso, con la scadenza di legge (antincendio 3/5 anni)
      ...corsiDalRegistro(dati.corsi, formazione, lavoratori.map((l) => ({
        id_lavoratore: l.id_lavoratore,
        codice_fiscale: l.codice_fiscale ?? null,
        cognome: l.cognome ?? null,
        nome: l.nome ?? null
      })), oggi)
    ] : [];
    const vera = veritaScadenzario(
      scadenze,
      servizi.map((s) => ({
        tipologia_servizio: s.tipologia_servizio,
        codice_tipologia: s.codice_tipologia,
        data_esecuzione: s.data_esecuzione,
        eseguito: eVenduto(s) && Boolean(s.data_esecuzione)
      })),
      // f2-deroga: la verità incrocia l'esecuzione segnata in Securmars (richiesta del DV)
      (c) => validitaListino(c),
      oggi
    );
    const persona = new Map(vera.tenute.map((x) => [x, x.rifatto ? null : veritaPersona(x.riga, formVera, tipoCorso)]));
    const bucket = (x) => {
      const p = persona.get(x);
      if (p) return p.stato === "da_verificare" ? "dafare" : BUCKET_OGGI[statoOggi(p.scade, oggi) ?? "futura"];
      return x.stato ? BUCKET_OGGI[x.stato] : bucketDi(x.riga, oggi);
    };
    const perRiga = new Map(vera.tenute.map((x) => [x.riga, bucket(x)]));
    const o = isoDi(oggi);
    const validi = new Set(formVera.filter((f) => (isoDi(f.data_scadenza) || "") >= o && (f.stato_verita === "valido" || (f.stato_semplice ?? "").toLowerCase().startsWith("valid"))).map((f) => tipoObbligo(f.corso, f.categoria)).filter(Boolean));
    const ancoraScaduti = new Set(vera.tenute.filter((x) => perRiga.get(x.riga) === "scaduti").map((x) => tipoObbligo(x.riga.descrizione)).filter(Boolean));
    const coperti = new Set([...validi].filter((t) => !ancoraScaduti.has(t)));
    return {
      pronto: !!dati,
      vera,
      persona,
      bucket,
      /** le righe che dopo la verità sono ancora scadute / entro 30 giorni (le altre sono chiuse, rifatte o una tantum) */
      scadute: scadenze.filter((s) => perRiga.get(s) === "scaduti"),
      entro30: scadenze.filter((s) => perRiga.get(s) === "e30"),
      coperti
    };
  }

  // tools/verifica/app.ts
  var COLONNA_OBBLIGO = {
    "Formazione lavoratori": "lavoratori",
    "Antincendio": "antincendio",
    "Primo soccorso": "primo soccorso",
    [CATEGORIA_BLSD]: "bls-d",
    "RLS": "rls",
    "Preposto": "preposti"
  };
  var eVenduto2 = (s) => {
    if (s.venduto_eff != null) return !!s.venduto_eff;
    if (s.stato_offerta !== "Formalizzata" || s.archiviato) return false;
    return s.stato_accettazione != null ? s.stato_accettazione === "Accettato" : s.data_accettazione != null;
  };
  var s10 = (x) => x == null ? null : String(x).slice(0, 10);
  function tabellaApp(d, oggi) {
    const nAss = d.lavoratori.filter((l) => l.stato_assunzione === "Assunto").length;
    d = { ...d, formazione: conScadenzaDiLegge(d.formazione, d.validita, nAss), corsi: conScadenzaDiLegge(d.corsi, d.validita, nAss) };
    const lavoratori = d.lavoratori;
    const eseguiti = d.servizi.filter((s) => eVenduto2(s) && Boolean(s.data_esecuzione) && /corso|addestrament/i.test(String(s.tipologia_servizio ?? ""))).map((s) => ({ nome: s.tipologia_servizio ?? null, data_esecuzione: s10(s.data_esecuzione), quantita: Number(s.quantita) || 1 }));
    const extra = personeSoloRegistro(
      d.corsi,
      [...lavoratori.map((l) => l.codice_fiscale), ...d.formazione.map((f) => f.cf)],
      /* @__PURE__ */ new Map(),
      [...lavoratori.map((l) => l.id_lavoratore), ...d.formazione.map((f) => f.id_lavoratore)]
    );
    const verita = veritaFormazione([...d.formazione, ...extra], d.corsi, eseguiti, d.equivalenze, d.validita, oggi);
    const dalRegistro = corsiDalRegistro(
      d.corsi,
      d.formazione,
      lavoratori.map((l) => ({ id_lavoratore: l.id_lavoratore, codice_fiscale: l.codice_fiscale ?? null, cognome: l.cognome ?? null, nome: l.nome ?? null })),
      oggi
    );
    const g = grigliaFormazione(lavoratori, [...verita, ...dalRegistro], [], oggi);
    const out = [];
    for (const r of g.righe) for (const c of g.colonne) {
      const ob = COLONNA_OBBLIGO[c.lab];
      if (!ob) continue;
      const cella = r.celle[c.chiave];
      if (!cella) continue;
      out.push({ persona: r.chiave, nome: r.nome, obbligo: ob, stato: cella.stato, breve: cella.breve, dettaglio: (cella.dettaglio ?? []).join(" | ").slice(0, 400) });
    }
    return out;
  }

  // tools/verifica/atteso.ts
  var OBBLIGHI = ["lavoratori", "antincendio", "primo soccorso", "bls-d", "rls", "preposti"];
  var MESI_LEGGE = {
    "lavoratori": 60,
    "antincendio": 60,
    "primo soccorso": 36,
    "bls-d": 24,
    "rls": 12,
    "preposti": 24
  };
  function data(s) {
    if (s == null) return null;
    const t = String(s).trim();
    if (t === "") return null;
    const d = t.slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
  }
  function aggiungiMesi2(d, mesi) {
    const [y, m, g] = d.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1 + mesi, g)).toISOString().slice(0, 10);
  }
  function aggiungiGiorni(d, giorni) {
    const [y, m, g] = d.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, g + giorni)).toISOString().slice(0, 10);
  }
  var minD = (a, b) => a <= b ? a : b;
  var ESCLUSI = [
    "haccp",
    "alimentarist",
    "dirigent",
    "rspp",
    "datore di lavoro",
    "carrell",
    "ple",
    "piattaform",
    "trattor",
    "gru",
    "escavator",
    "movimento terra",
    "fitosanit",
    "confinat",
    "quota",
    "ponteggi",
    "motoseg",
    "decespugliat"
  ];
  function classificaTesto(testo) {
    const t = (testo ?? "").toLowerCase();
    if (t.trim() === "") return null;
    if (t.includes("bls") || t.includes("dae") || t.includes("defibrill")) return "bls-d";
    if (t.includes("antincendio") || t.includes("incendio")) return "antincendio";
    if (t.includes("primo soccorso") || t.includes("soccors")) return "primo soccorso";
    if (t.includes("haccp") || t.includes("alimentarist")) return "escluso";
    if (t.includes("prepost")) return "preposti";
    if (/(^|[^a-z0-9])rls([^a-z0-9]|$)/.test(t) || t.includes("rappresentant")) return "rls";
    if (ESCLUSI.some((k) => t.includes(k))) return "escluso";
    if (t.includes("lavorator") || t.includes("sicurezza generale") || t.includes("formazione generale") || t.includes("formazione specifica")) return "lavoratori";
    return null;
  }
  function obbligoDi(corso, categoria, tipo_mezzo) {
    for (const testo of [corso, categoria, tipo_mezzo]) {
      const c = classificaTesto(testo);
      if (c === "escluso") return null;
      if (c) return c;
    }
    return null;
  }
  function oreDalNome(nome) {
    const m = (nome ?? "").toLowerCase().match(/(\d+(?:[.,]\d+)?)\s*ore\b/);
    return m ? Number(m[1].replace(",", ".")) : null;
  }
  function rlsValeComeProva(nome, nLavoratoriAssunti) {
    const t = (nome ?? "").toLowerCase();
    const ore = oreDalNome(t);
    if (ore === null) return true;
    if (ore >= 32 || !t.includes("agg")) return true;
    const minimo = nLavoratoriAssunti > 50 ? 8 : 4;
    return ore >= minimo;
  }
  var normCf = (cf) => {
    const c = (cf ?? "").replace(/\s+/g, "").toUpperCase();
    return c === "" ? null : c;
  };
  var normId = (id) => {
    const s = id == null ? "" : String(id).trim();
    return s === "" ? null : s;
  };
  function atteso(lavoratori, percorso, registro, p, nLavoratoriAssunti) {
    const ordinePersone = [];
    const idToKey = /* @__PURE__ */ new Map();
    const cfToKey = /* @__PURE__ */ new Map();
    const nomeN = (c, n) => `${c ?? ""} ${n ?? ""}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]+/g, " ").trim();
    const nomeToKey = /* @__PURE__ */ new Map();
    for (const l of lavoratori) {
      const id = normId(l.id_lavoratore);
      if (!id) continue;
      const nn = nomeN(l.cognome, l.nome);
      const gia = nn ? nomeToKey.get(nn) : void 0;
      if (!idToKey.has(id)) {
        idToKey.set(id, gia ?? id);
        if (!gia) ordinePersone.push(id);
      }
      if (nn && !gia) nomeToKey.set(nn, id);
      const cf = normCf(l.codice_fiscale);
      if (cf && !cfToKey.has(cf)) cfToKey.set(cf, id);
    }
    const risolvi = (idRaw, cfRaw, cognome, nome) => {
      const id = normId(idRaw);
      const cf = normCf(cfRaw);
      const nn = nomeN(cognome, nome);
      let key = id && idToKey.get(id) || cf && cfToKey.get(cf) || nn && nomeToKey.get(nn) || null;
      if (!key) {
        if (id) key = id;
        else if (cf) key = "cf:" + cf;
        else return null;
        ordinePersone.push(key);
      }
      if (id && !idToKey.has(id)) idToKey.set(id, key);
      if (cf && !cfToKey.has(cf)) cfToKey.set(cf, key);
      return key;
    };
    const tutte = [
      ...registro.map((r) => ({ fonte: "registro", r })),
      ...percorso.map((r) => ({ fonte: "percorso", r }))
    ];
    const conId = tutte.filter((x) => normId(x.r.id_lavoratore));
    const senzaId = tutte.filter((x) => !normId(x.r.id_lavoratore));
    const chiavi2 = /* @__PURE__ */ new Map();
    for (const x of [...conId, ...senzaId]) chiavi2.set(x, risolvi(
      x.r.id_lavoratore,
      x.r.cf,
      x.r.cognome,
      x.r.nome
    ));
    const celle = /* @__PURE__ */ new Map();
    const cella = (persona, o) => {
      let m = celle.get(persona);
      if (!m) celle.set(persona, m = /* @__PURE__ */ new Map());
      let c = m.get(o);
      if (!c) m.set(o, c = { prove: [], scadenzeRighe: [] });
      return c;
    };
    for (const x of tutte) {
      const persona = chiavi2.get(x);
      if (!persona) continue;
      const r = x.r;
      let o = x.fonte === "percorso" ? obbligoDi(r.corso, r.categoria, r.tipo_mezzo) : obbligoDi(r.corso);
      const dirigenti = !o && /dirigent/i.test(r.corso ?? "");
      if (dirigenti) o = "lavoratori";
      if (!o) continue;
      const c = cella(persona, o);
      const S = data(r.data_svolgimento);
      const scad = data(r.data_scadenza);
      if (!dirigenti) c.scadenzeRighe.push(scad);
      const corso = (r.corso ?? "").trim();
      if (o === "rls" && !rlsValeComeProva(corso, nLavoratoriAssunti)) continue;
      if (x.fonte === "registro") {
        if (!S) continue;
        let D = scad ?? aggiungiMesi2(S, MESI_LEGGE[o]);
        if (o === "antincendio") {
          if (S >= p.antincendio5anniDal) D = aggiungiMesi2(S, 60);
          else D = minD(D, aggiungiMesi2(S, 36));
        }
        if (dirigenti && D < p.oggi) continue;
        c.prove.push({ d: D, motivo: `registro ${corso} del ${S}` });
      } else {
        const pr = r;
        const valido = (pr.stato_semplice ?? "").trim().toLowerCase().startsWith("valid");
        if (!valido) continue;
        if (scad && S && o === "antincendio") {
          const D = aggiungiMesi2(S, S >= p.antincendio5anniDal ? 60 : 36);
          c.prove.push({ d: D, motivo: `percorso Securmars ${corso} del ${S}, regola antincendio` });
        } else if (scad) {
          if (!(dirigenti && scad < p.oggi)) c.prove.push({ d: scad, motivo: `percorso Securmars valido fino al ${scad}` });
        } else if (S) {
          const D = aggiungiMesi2(S, MESI_LEGGE[o]);
          c.prove.push({ d: D, motivo: `percorso Securmars ${corso} del ${S} + ${MESI_LEGGE[o]} mesi di legge` });
        }
      }
    }
    const limite = aggiungiGiorni(p.oggi, p.giorniInScadenza);
    const out = [];
    for (const persona of ordinePersone) {
      const m = celle.get(persona);
      if (!m || m.size === 0) continue;
      for (const o of OBBLIGHI) {
        const c = m.get(o);
        if (!c || c.prove.length === 0 && c.scadenzeRighe.length === 0) {
          out.push({ persona, obbligo: o, stato: "nd", scadenza: null, motivo: "nessuna riga per questo obbligo" });
          continue;
        }
        if (c.prove.length > 0) {
          let best = c.prove[0];
          for (const pv of c.prove) if (pv.d > best.d) best = pv;
          const stato = best.d < p.oggi ? "ko" : best.d <= limite ? "scade" : "ok";
          out.push({ persona, obbligo: o, stato, scadenza: best.d, motivo: best.motivo });
        } else {
          const date = c.scadenzeRighe.filter((d) => !!d).sort();
          out.push({
            persona,
            obbligo: o,
            stato: "ko",
            scadenza: date.length ? date[date.length - 1] : null,
            motivo: "nessuna prova: righe non valide"
          });
        }
      }
    }
    return out;
  }

  // tools/verifica/browser.ts
  var URL_SB = "https://ydoglnodmcuifefnsakt.supabase.co";
  async function chiavi() {
    const tok = JSON.parse(localStorage.getItem("sb-ydoglnodmcuifefnsakt-auth-token") ?? "null");
    if (!tok?.access_token) throw new Error("sessione non trovata: entra nel sito");
    const src = [...document.scripts].map((s) => s.src).find((s) => /assets\/index-/.test(s));
    const js = await fetch(src).then((r) => r.text());
    const apikey = (js.match(/sb_publishable_[A-Za-z0-9_-]+/) ?? js.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/))?.[0];
    if (!apikey) throw new Error("chiave pubblica non trovata nel bundle");
    return { apikey, auth: `Bearer ${tok.access_token}` };
  }
  async function tutto(k, tab, query) {
    const out = [];
    for (let da = 0; ; da += 1e3) {
      const r = await fetch(`${URL_SB}/rest/v1/${tab}?${query}`, { headers: { apikey: k.apikey, Authorization: k.auth, Range: `${da}-${da + 999}`, "Range-Unit": "items" } });
      if (!r.ok) throw new Error(`${tab}: ${r.status} ${await r.text()}`);
      const d = await r.json();
      out.push(...d);
      if (d.length < 1e3) return out;
    }
  }
  var per = (righe) => {
    const m = /* @__PURE__ */ new Map();
    for (const r of righe) {
      const c = String(r.codice_cliente ?? "");
      if (c) (m.get(c) ?? m.set(c, []).get(c)).push(r);
    }
    return m;
  };
  var s102 = (x) => x == null || x === "" ? null : String(x).slice(0, 10);
  var mmaa2 = (iso4) => iso4 ? `${iso4.slice(5, 7)}/${iso4.slice(2, 4)}` : null;
  async function verifica(p = {}) {
    const w = window;
    w.__verifica = { stato: "carico" };
    const k = await chiavi();
    const oggi = p.oggi ?? (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const tre = /* @__PURE__ */ new Date(`${oggi}T00:00:00Z`);
    tre.setUTCMonth(tre.getUTCMonth() + 3);
    const par = {
      oggi,
      antincendio5anniDal: p.antincendio5anniDal ?? "2024-01-01",
      giorniInScadenza: p.giorniInScadenza ?? Math.round((tre.getTime() - Date.parse(`${oggi}T00:00:00Z`)) / 864e5)
    };
    const [lav, form, corsi, serv, eq, val, scad, servTutti, listino] = await Promise.all([
      tutto(k, "lavoratori", "select=*"),
      tutto(k, "formazione", "select=*&cancellato_crm=eq.false"),
      tutto(k, "corsi_frequentati", "select=codice_cliente,id_lavoratore,cf,corso,data_svolgimento,data_scadenza"),
      tutto(k, "servizi", "select=codice_cliente,tipologia_servizio,data_esecuzione,quantita,stato_offerta,archiviato,stato_accettazione,data_accettazione&or=(tipologia_servizio.ilike.*corso*,tipologia_servizio.ilike.*addestrament*)"),
      tutto(k, "equivalenza_adempimento", "select=tipo,chiuso_da"),
      tutto(k, "validita_adempimento", "select=tipo,mesi"),
      tutto(k, "scadenze", "select=*"),
      tutto(k, "servizi", "select=codice_cliente,tipologia_servizio,codice_tipologia,data_esecuzione,quantita,stato_offerta,archiviato,stato_accettazione,data_accettazione"),
      tutto(k, "listino", "select=codice_servizio,validita_mesi")
    ]);
    const SC = per(scad), ST = per(servTutti);
    const valListino = new Map(listino.map((l) => [String(l.codice_servizio), l.validita_mesi == null ? null : Number(l.validita_mesi)]));
    const nomeN = (x) => String(x ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]+/g, " ").trim().split(" ").sort().join(" ");
    const contraddizioni = [];
    let scaduteControllate = 0;
    w.__verifica = { stato: "calcolo", righe: { lav: lav.length, form: form.length, corsi: corsi.length, serv: serv.length } };
    const L = per(lav), F = per(form), C = per(corsi), S = per(serv);
    const validita = Object.fromEntries(val.map((v) => [String(v.tipo), Number(v.mesi)]));
    const clienti = [.../* @__PURE__ */ new Set([...L.keys(), ...F.keys(), ...C.keys()])];
    const oggiD = /* @__PURE__ */ new Date(`${oggi}T00:00:00`);
    const diverse = [];
    const perCliente = {};
    const errori = [];
    let celle = 0, uguali = 0, daRegistrare = 0;
    for (const cod of clienti) {
      try {
        const d = { lavoratori: L.get(cod) ?? [], formazione: F.get(cod) ?? [], corsi: C.get(cod) ?? [], servizi: S.get(cod) ?? [], equivalenze: eq, validita };
        const app = tabellaApp(d, oggiD);
        const nAss = d.lavoratori.filter((l) => l.stato_assunzione === "Assunto").length;
        const att = atteso(
          d.lavoratori,
          d.formazione.map((f) => ({ ...f, data_svolgimento: s102(f.data_svolgimento), data_scadenza: s102(f.data_scadenza) })),
          d.corsi.map((c) => ({ ...c, data_svolgimento: s102(c.data_svolgimento), data_scadenza: s102(c.data_scadenza) })),
          par,
          nAss
        );
        const idDiCf = new Map(d.corsi.filter((c) => c.cf && c.id_lavoratore).map((c) => [String(c.cf).replace(/\s+/g, "").toUpperCase(), String(c.id_lavoratore)]));
        const chiaveApp = (p2) => p2.startsWith("cf:") ? idDiCf.get(p2.slice(3).replace(/\s+/g, "").toUpperCase()) ?? p2 : p2;
        const A = new Map(app.map((c) => [`${chiaveApp(c.persona)}|${c.obbligo}`, c]));
        const dimessi = new Set(d.lavoratori.filter((l) => l.data_dimissione).map((l) => String(l.id_lavoratore)));
        const T = new Map(att.filter((c) => !dimessi.has(c.persona)).map((c) => [`${c.persona}|${c.obbligo}`, c]));
        let n = 0, u = 0;
        for (const key of /* @__PURE__ */ new Set([...A.keys(), ...T.keys()])) {
          const a = A.get(key), t = T.get(key);
          const aS = a?.stato ?? "nd", tS = t?.stato ?? "nd";
          if (aS === "nd" && tS === "nd") continue;
          const tB = t?.scadenza ? mmaa2(t.scadenza) : null;
          const verificare = a?.breve === "verificare";
          const ok = verificare || aS === tS && (aS === "ko" || a.breve === tB);
          n++;
          if (ok) u++;
          if (verificare) daRegistrare++;
          if (!ok) diverse.push({ cod, key, app: `${aS} ${a?.breve ?? ""}`, att: `${tS} ${t?.scadenza ?? ""}`, motivo: t?.motivo ?? "", dett: a?.dettaglio ?? "" });
        }
        celle += n;
        uguali += u;
        perCliente[cod] = [n, u];
        const sv = scadenzeVere({
          scadenze: SC.get(cod) ?? [],
          servizi: ST.get(cod) ?? [],
          validitaListino: (c) => c ? valListino.get(c) ?? null : null,
          formazione: d.formazione,
          lavoratori: d.lavoratori,
          oggi: oggiD,
          dati: { corsi: d.corsi, equivalenze: eq, validita }
        });
        const perNome = /* @__PURE__ */ new Map();
        for (const c of app) {
          const kN = nomeN(c.nome);
          perNome.set(kN, [...perNome.get(kN) ?? [], c]);
        }
        for (const r of sv.scadute) {
          if (!r.lavoratore) continue;
          const ob = tipoObbligo(r.descrizione);
          if (!ob || !["lavoratori", "antincendio", "primo soccorso", "bls-d", "rls", "preposti"].includes(ob)) continue;
          scaduteControllate++;
          const cella = (perNome.get(nomeN(r.lavoratore)) ?? []).find((c) => c.obbligo === ob);
          if (cella && (cella.stato === "ok" || cella.stato === "scade"))
            contraddizioni.push({ cod, ob, scadenza: s102(r.data_scadenza), cella: `${cella.stato} ${cella.breve}`, descr: String(r.descrizione ?? "").slice(0, 80) });
        }
      } catch (e) {
        errori.push({ cod, e: String(e.message ?? e) });
      }
    }
    const conCelle = Object.values(perCliente).filter(([n]) => n > 0);
    const clienti99 = conCelle.filter(([n, u]) => u / n >= 0.99).length;
    w.__verifica = { stato: "fatto", par, daRegistrare, scaduteControllate, contraddizioni, clienti: clienti.length, clientiConCelle: conCelle.length, clienti99, celle, uguali, errori, diverse, perCliente };
    return w.__verifica;
  }
  window.verificaFormazione = verifica;
})();
// giro7
