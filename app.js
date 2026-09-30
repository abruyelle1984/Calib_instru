(function(){
"use strict";
const $=s=>document.querySelector(s);
const CHECKS=[["sph","Circular level"],["elec","Electronic level"],["plumb","Laser plummet centered"],
  ["tribrach","Tribrach and tripod (play, screws)"],["reticle","Reticle sharp, no parallax"],["optics","Optics clean"]];
const FT={m:1,ft:0.3048,ftUS:1200/3937}, DU={m:"m",ft:"ft",ftUS:"US ft"};
let reports=[],idb=null;
let state=blank(),dirty=false,view="reg";

function today(){const d=new Date();return d.toISOString().slice(0,10)}
function plusMonths(iso,m){const d=new Date(iso+"T12:00:00");d.setMonth(d.getMonth()+m);return d.toISOString().slice(0,10)}
function blank(){const t=today();let L={};try{L=JSON.parse(localStorage.getItem("tsc-last")||"{}")}catch(e){}
  const o={id:null,meta:{brand:"",model:"",serial:"",inventory:"",firmware:"",sigma:"1",edmA:"1",edmB:"1.5",prism:"",
    company:"",project:"",place:"",operator:"",date:t,nextDate:plusMonths(t,6),temp:"",tempU:"F",pressure:"",pressU:"inHg",
    unit:"dms",dist:"ft",k:"3",adjusted:"",signBy:"",remarks:""},
    coll:[row4(),row4(),row4()],tilt:[row4(),row4()],atr:[],comp:{l:"",t:""},
    edm:[{name:"",ref:"",mes:""},{name:"",ref:"",mes:""},{name:"",ref:"",mes:""}],
    plumb:{h:"5",dev:"",tol:"1.0"},checks:{}};
  ["company","project","place","operator","unit","dist","tempU","pressU","k","signBy"].forEach(k=>{if(L[k])o.meta[k]=L[k]});return o}
function row4(){return{hz1:"",v1:"",hz2:"",v2:""}}
function num(s){if(s===undefined||s===null)return NaN;const t=String(s).trim().replace(",",".");return t===""?NaN:Number(t)}
function ok(x){return Number.isFinite(x)}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function wrap(g){return((g+200)%400+400)%400-200}
function fmt(x,d){return ok(x)?x.toFixed(d):"—"}
function stats(a){const v=a.filter(ok),n=v.length;if(!n)return{n:0,mean:NaN,sd:NaN};const m=v.reduce((x,y)=>x+y,0)/n;
  return{n,mean:m,sd:n>1?Math.sqrt(v.reduce((x,y)=>x+(y-m)**2,0)/(n-1)):NaN}}
/* angle input -> gon */
function toGon(str,unit){const t=String(str??"").trim().replace(",",".");if(t===""||isNaN(Number(t)))return NaN;
  if(unit==="gon")return Number(t);
  if(unit==="deg")return Number(t)*400/360;
  const neg=t.startsWith("-"),[ip,fp=""]=t.replace("-","").split("."),f=(fp+"0000").slice(0,Math.max(4,fp.length));
  const deg=Number(ip)+Number(f.slice(0,2))/60+Number(f.slice(2,4)+"."+(f.slice(4)||"0"))/3600;
  return (neg?-deg:deg)*400/360}
/* display of small angles (internal mgon) */
function isGon(){return state.meta.unit==="gon"}
function AU(){return isGon()?"mgon":"″"}
function aShort(mg){return ok(mg)?(isGon()?mg.toFixed(2):(mg*3.24).toFixed(1)):"—"}
function aLong(mg){return ok(mg)?(isGon()?`${mg.toFixed(2)} mgon (${(mg*3.24).toFixed(1)}″)`:`${(mg*3.24).toFixed(1)}″ (${mg.toFixed(2)} mgon)`):"—"}
function aIn(s){const v=num(s);return ok(v)?(isGon()?v:v/3.24):NaN}
function mmTxt(mm){const u=state.meta.dist;return u==="m"?`${mm.toFixed(1)} mm`:`${mm.toFixed(1)} mm (${(mm/1000/FT[u]).toFixed(4)} ${DU[u]})`}

function compute(s){
  const U=s.meta.unit,G=x=>toGon(x,U),F=FT[s.meta.dist]||1;
  const k=ok(num(s.meta.k))?num(s.meta.k):3,sig=ok(num(s.meta.sigma))?num(s.meta.sigma):1;
  const tolAng=k*sig/3.24,tolTilt=2*tolAng,R={tolAng,tolTilt,k};
  const faces=rows=>rows.map(r=>{const h1=G(r.hz1),v1=G(r.v1),h2=G(r.hz2),v2=G(r.v2);let c=NaN,i=NaN;
    if(ok(h1)&&ok(h2)){const z=ok(v1)?v1:100;c=wrap(h1-h2+200)/2*Math.sin(z*Math.PI/200)*1000}
    if(ok(v1)&&ok(v2))i=wrap(v1+v2-400)/2*1000;return{c,i}});
  R.coll=faces(s.coll);R.c=stats(R.coll.map(r=>r.c));R.i=stats(R.coll.map(r=>r.i));
  R.atr=faces(s.atr);R.ca=stats(R.atr.map(r=>r.c));R.ia=stats(R.atr.map(r=>r.i));
  const cG=ok(R.c.mean)?R.c.mean/1000:0,iG=ok(R.i.mean)?R.i.mean/1000:0;R.tiltWarn=[];
  R.tilt=s.tilt.map((r,idx)=>{const h1=G(r.hz1),v1=G(r.v1),h2=G(r.hz2);if(!(ok(h1)&&ok(h2)&&ok(v1)))return{a:NaN};
    const z=v1-iG;if(Math.abs(z-100)<27||Math.abs(z-300)<27){R.tiltWarn.push(idx+1);return{a:NaN}}
    const zr=z*Math.PI/200,d=wrap(h1-h2+200)/2;return{a:(d-cG/Math.sin(zr))*Math.tan(zr)*1000}});
  R.a=stats(R.tilt.map(r=>r.a));R.tiltNoC=!ok(R.c.mean)&&R.a.n>0;
  const eA=ok(num(s.meta.edmA))?num(s.meta.edmA):1,eB=ok(num(s.meta.edmB))?num(s.meta.edmB):1.5;
  R.edm=s.edm.map(r=>{const ref=num(r.ref)*F,mes=num(r.mes)*F;if(!(ok(ref)&&ok(mes)))return{d:NaN};
    const d=(mes-ref)*1000,tol=k*(eA+eB*ref/1000);return{d,tol,ref,good:Math.abs(d)<=tol}});
  const pts=R.edm.filter(r=>ok(r.d));R.edmN=pts.length;R.edmMean=stats(pts.map(p=>p.d)).mean;
  if(new Set(pts.map(p=>p.ref)).size>=2){const n=pts.length,mx=pts.reduce((a,p)=>a+p.ref,0)/n,my=pts.reduce((a,p)=>a+p.d,0)/n;
    const sxx=pts.reduce((a,p)=>a+(p.ref-mx)**2,0),sxy=pts.reduce((a,p)=>a+(p.ref-mx)*(p.d-my),0);R.edmPpm=sxy/sxx*1000;R.edmK0=my-sxy/sxx*mx}
  const items=[],tA=`± ${aShort(tolAng)}${isGon()?" mgon":"″"}`,tT=`± ${aShort(tolTilt)}${isGon()?" mgon":"″"}`;
  const addA=(key,label,st,tol,tt)=>items.push({key,label,val:st.mean,txt:aLong(st.mean),sd:st.sd,n:st.n,tol,tolTxt:tt,good:st.n?Math.abs(st.mean)<=tol:null});
  addA("c","Horizontal collimation c",R.c,tolAng,tA);
  addA("i","Vertical index i",R.i,tolAng,tA);
  addA("a","Tilting axis a",R.a,tolTilt,tT);
  [["l","Compensator, longitudinal l"],["t","Compensator, transverse t"]].forEach(([x,l])=>{const v=aIn(s.comp[x]);
    items.push({key:"comp"+x,label:l,val:v,txt:aLong(v),n:ok(v)?1:0,tol:tolAng,tolTxt:tA,good:ok(v)?Math.abs(v)<=tolAng:null})});
  if(s.atr.length){addA("ca","ATR, Hz collimation",R.ca,tolAng,tA);addA("ia","ATR, V collimation",R.ia,tolAng,tA)}
  if(R.edmN){const w=pts.reduce((a,p)=>Math.abs(p.d)/p.tol>Math.abs(a.d)/a.tol?p:a);
    items.push({key:"edm",label:"EDM (worst-case difference)",txt:mmTxt(w.d),raw:w.d,tol:w.tol,tolTxt:`± ${w.tol.toFixed(1)} mm`,n:R.edmN,good:pts.every(p=>p.good),edm:true})}
  const pd=num(s.plumb.dev),pt=ok(num(s.plumb.tol))?num(s.plumb.tol):1;
  if(ok(pd))items.push({key:"plumb",label:"Laser plummet",val:pd,txt:`${pd.toFixed(1)} mm`,tol:pt,tolTxt:`≤ ${pt.toFixed(1)} mm`,n:1,good:pd<=pt,oneSided:true});
  R.items=items;R.checksNok=CHECKS.filter(([c])=>s.checks[c]==="nok").map(([,l])=>l);
  const ev=items.filter(x=>x.good!==null);
  R.verdict=!ev.length&&!Object.keys(s.checks).length?null:(ev.every(x=>x.good)&&!R.checksNok.length);R.evaluated=ev.length;
  return R}

/* ---------- Form ---------- */
function uLbl(){return{dms:"DMS",deg:"°",gon:"gon"}[state.meta.unit]||""}
function angleTable(key,out){const u=uLbl(),rows=state[key],au=AU();
  const head=`<tr><th>Set</th><th class="num">Hz FL (${u})</th><th class="num">V FL (${u})</th><th class="num">Hz FR (${u})</th><th class="num">V FR (${u})</th>${out.map(o=>`<th class="num">${o[1]} (${au})</th>`).join("")}<th></th></tr>`;
  const LB={hz1:`Hz FL (${u})`,v1:`V FL (${u})`,hz2:`Hz FR (${u})`,v2:`V FR (${u})`};
  const body=rows.map((r,i)=>`<tr><td class="sethead">Set ${i+1}</td>${["hz1","v1","hz2","v2"].map(f=>`<td data-label="${LB[f]}"><input class="cell" inputmode="decimal" enterkeyhint="next" data-arr="${key}" data-i="${i}" data-f="${f}" value="${esc(r[f])}" aria-label="Set ${i+1} ${f}"></td>`).join("")}${out.map(o=>`<td class="out" data-label="${o[1]} (${au})" id="${key}-${o[0]}-${i}">—</td>`).join("")}<td class="act"><button class="rm" data-rm="${key}" data-i="${i}" aria-label="Delete set ${i+1}">×</button></td></tr>`).join("");
  const foot=rows.length?`<tr class="tfoot"><td class="sethead" colspan="5">Mean · std. dev.</td>${out.map(o=>`<td class="num" data-label="${o[1]} (${au})" id="${key}-${o[0]}-m">—</td>`).join("")}<td class="act"></td></tr>`:"";
  $("#t-"+key).innerHTML=rows.length?`<table class="series stack"><thead>${head}</thead><tbody>${body}${foot}</tbody></table>`:`<div class="empty" style="padding:18px">No sets yet.</div>`}
function edmTable(){const rows=state.edm,du=DU[state.meta.dist];
  $("#t-edm").innerHTML=rows.length?`<table class="series stack"><thead><tr><th>Baseline / pillar</th><th class="num">Reference (${du})</th><th class="num">Measured (${du})</th><th class="num">Difference (mm)</th><th class="num">Tolerance (mm)</th><th></th></tr></thead><tbody>${
    rows.map((r,i)=>`<tr><td class="full" data-label="Baseline / pillar"><input class="cell" style="text-align:left" data-arr="edm" data-i="${i}" data-f="name" value="${esc(r.name)}" aria-label="Baseline name"></td><td data-label="Reference (${du})"><input class="cell" inputmode="decimal" enterkeyhint="next" data-arr="edm" data-i="${i}" data-f="ref" value="${esc(r.ref)}" aria-label="Reference"></td><td data-label="Measured (${du})"><input class="cell" inputmode="decimal" enterkeyhint="next" data-arr="edm" data-i="${i}" data-f="mes" value="${esc(r.mes)}" aria-label="Measured"></td><td class="out" data-label="Difference (mm)" id="edm-d-${i}">—</td><td class="out" data-label="Tolerance (mm)" id="edm-t-${i}" style="font-weight:400">—</td><td class="act"><button class="rm" data-rm="edm" data-i="${i}" aria-label="Delete">×</button></td></tr>`).join("")
  }<tr class="tfoot"><td colspan="6" id="edm-sum">—</td></tr></tbody></table>`:`<div class="empty" style="padding:18px">No distances yet.</div>`}
function renderChecks(){$("#checks").innerHTML=CHECKS.map(([k,l])=>`<div class="check"><span>${l}</span><select data-check="${k}" aria-label="${l}"><option value="">—</option><option value="ok">Pass</option><option value="nok">Fail</option><option value="na">N/A</option></select></div>`).join("");
  document.querySelectorAll("[data-check]").forEach(s=>s.value=state.checks[s.dataset.check]||"")}
function renderForm(){document.querySelectorAll("[data-bind]").forEach(el=>{el.value=get(el.dataset.bind)??""});
  document.querySelectorAll(".au").forEach(e=>e.textContent=AU());document.querySelectorAll(".du").forEach(e=>e.textContent=DU[state.meta.dist]);
  angleTable("coll",[["c","c"],["i","i"]]);angleTable("tilt",[["a","a"]]);angleTable("atr",[["c","c ATR"],["i","i ATR"]]);
  edmTable();renderChecks();refresh()}
function get(p){return p.split(".").reduce((o,k)=>o?.[k],state)}
function set(p,v){const ks=p.split(".");let o=state;ks.slice(0,-1).forEach(k=>o=o[k]);o[ks.at(-1)]=v}
function cell(id,v,tol,show){const el=document.getElementById(id);if(!el)return;el.textContent=show(v);
  el.classList.toggle("bad",ok(v)&&Math.abs(v)>tol);el.classList.toggle("ok",ok(v)&&Math.abs(v)<=tol)}
function refresh(){const R=compute(state);
  R.coll.forEach((r,i)=>{cell(`coll-c-${i}`,r.c,R.tolAng,aShort);cell(`coll-i-${i}`,r.i,R.tolAng,aShort)});
  R.atr.forEach((r,i)=>{cell(`atr-c-${i}`,r.c,R.tolAng,aShort);cell(`atr-i-${i}`,r.i,R.tolAng,aShort)});
  R.tilt.forEach((r,i)=>cell(`tilt-a-${i}`,r.a,R.tolTilt,aShort));
  const ms=(id,st)=>{const el=document.getElementById(id);if(el)el.textContent=st.n?`${aShort(st.mean)} · ${aShort(st.sd)}`:"—"};
  ms("coll-c-m",R.c);ms("coll-i-m",R.i);ms("tilt-a-m",R.a);ms("atr-c-m",R.ca);ms("atr-i-m",R.ia);
  R.edm.forEach((r,i)=>{cell(`edm-d-${i}`,r.d,r.tol,x=>fmt(x,1));const t=document.getElementById(`edm-t-${i}`);if(t)t.textContent=ok(r.tol)?"± "+r.tol.toFixed(1):"—"});
  const es=document.getElementById("edm-sum");
  if(es)es.textContent=R.edmN?`Mean difference ${fmt(R.edmMean,1)} mm`+(ok(R.edmK0)?` · estimated constant ${fmt(R.edmK0,1)} mm · scale ${fmt(R.edmPpm,1)} ppm`:""):"Enter distances to get the mean difference.";
  const w=[];if(R.tiltWarn.length)w.push(`Set ${R.tiltWarn.join(", ")}: sight too close to horizontal for the tilting axis check.`);
  if(R.tiltNoC)w.push("Collimation not measured: tilting axis is computed with c = 0.");
  $("#tiltwarn").textContent=w.join(" ");
  const v=$("#verdict");v.className="verdict "+(R.verdict===null?"na":R.verdict?"ok":"bad");
  v.textContent=R.verdict===null?"Awaiting readings":R.verdict?"Within tolerance":"Out of tolerance";
  const bad=R.items.filter(x=>x.good===false).length+R.checksNok.length;
  const mn=$("#mini");mn.className="mini "+(R.verdict===null?"na":R.verdict?"ok":"bad");mn.hidden=view!=="form";
  mn.innerHTML=`<span>${R.verdict===null?"Awaiting readings":R.verdict?"Within tolerance":"Out of tolerance"}</span><span style="font-weight:500;font-size:14px">${bad?bad+" issue(s) · ":""}See results</span>`;
  $("#verdictsub").textContent=R.verdict===null?"Results update as you enter readings.":`${R.evaluated} check(s) evaluated`+(bad?` · ${bad} out of tolerance`:"");
  $(".sumcard").className="sumcard "+(R.verdict===null?"":R.verdict?"ok":"bad");
  const RET=["c","i","ca","ia"],reti=R.items.filter(it=>it.key==="c"||it.key==="i");
  const retSvg=(()=>{const W=200,C=100,S=40/R.tolAng,cl=v=>Math.max(-92,Math.min(92,v*S));
    const pt=(x,y,col,lbl)=>ok(x)&&ok(y)?`<circle class="pt" cx="${C+cl(x)}" cy="${C-cl(y)}" r="6" fill="${col}"><title>${lbl}</title></circle>`:"";
    const bad=(x,y)=>Math.abs(x)>R.tolAng||Math.abs(y)>R.tolAng;
    const cx=R.c.mean,iy=R.i.mean,ax=R.ca.mean,ay=R.ia.mean;
    return `<svg class="reticle" viewBox="0 0 ${W} ${W}" role="img" aria-label="Reticle plot of collimation c (horizontal) and vertical index i (vertical) against tolerance">
      <rect class="tol" x="${C-40}" y="${C-40}" width="80" height="80"/><rect class="tol2" x="${C-80}" y="${C-80}" width="160" height="160"/>
      <line class="ln" x1="4" y1="${C}" x2="${W-4}" y2="${C}"/><line class="ln" x1="${C}" y1="4" x2="${C}" y2="${W-4}"/>
      ${[-80,-60,-40,-20,20,40,60,80].map(t=>`<line class="ln" x1="${C+t}" y1="${C-3}" x2="${C+t}" y2="${C+3}"/><line class="ln" x1="${C-3}" y1="${C+t}" x2="${C+3}" y2="${C+t}"/>`).join("")}
      <text x="${W-6}" y="${C-6}" text-anchor="end">c</text><text x="${C+6}" y="12">i</text>
      <text x="${C+42}" y="${C+40}" >${aShort(R.tolAng)}${isGon()?"":"″"}</text>
      ${ok(ax)||ok(ay)?pt(ok(ax)?ax:0,ok(ay)?ay:0,"var(--ink-2)","ATR"):""}
      ${ok(cx)||ok(iy)?pt(ok(cx)?cx:0,ok(iy)?iy:0,(bad(cx||0,iy||0)?"var(--bad)":"var(--flag)"),"Telescope c / i"):""}
    </svg><div class="retlegend"><span><i style="background:var(--flag)"></i>c / i</span>${R.atr.length?'<span><i style="background:var(--ink-2)"></i>ATR</span>':""}<span>Green square = tolerance</span></div>`})();
  $("#meters").innerHTML=retSvg+R.items.map(it=>{const has=it.good!==null,ratio=has?(it.edm?it.raw/it.tol:it.oneSided?(it.val/it.tol*2-1):it.val/it.tol):0,pos=Math.max(2,Math.min(98,50+ratio*25));
    return `<div class="meter"><div class="lbl"><b>${esc(it.label)}</b><span class="val ${has&&!it.good?"bad":""}">${has?esc(it.txt):"—"}</span></div>
      <div class="scale ${has?"":"na"}" role="img" aria-label="${esc(it.label)} ${has?(it.good?"within tolerance":"out of tolerance"):"not measured"}"><span class="flag" style="left:${pos}%"></span></div>
      <div class="tol">Tolerance ${esc(it.tolTxt)}${it.n>1?` · ${it.n} sets`:""}</div></div>`}).join("")
    +(R.checksNok.length?`<p class="warn">Failed: ${esc(R.checksNok.join(", "))}</p>`:"");
  if(view==="rep")renderReport();return R}

/* ---------- Report ---------- */
function reportHTML(){const s=state,m=s.meta,R=compute(s),u=uLbl(),au=AU(),du=DU[m.dist];
  const kv=(l,v)=>`<div><small>${l}</small>${esc(v)||"&nbsp;"}</div>`;
  const st=g=>g===null?"<span>Not measured</span>":g?'<span class="ok">Pass</span>':'<span class="bad">Out of tolerance</span>';
  const series=(key,out,title)=>{if(!s[key].some(r=>r.hz1||r.v1||r.hz2||r.v2))return"";const res=R[key];
    return `<h2>${title}</h2><table><tr><th>Set</th><th>Hz FL (${u})</th><th>V FL (${u})</th><th>Hz FR (${u})</th><th>V FR (${u})</th>${out.map(o=>`<th>${o[1]} (${au})</th>`).join("")}</tr>${
      s[key].map((r,i)=>(r.hz1||r.v1||r.hz2||r.v2)?`<tr><td>${i+1}</td><td>${esc(r.hz1)}</td><td>${esc(r.v1)}</td><td>${esc(r.hz2)}</td><td>${esc(r.v2)}</td>${out.map(o=>`<td>${aShort(res[i][o[0]])}</td>`).join("")}</tr>`:"").join("")}</table>`};
  const edmRows=s.edm.map((r,i)=>({r,x:R.edm[i]})).filter(o=>ok(o.x.d));
  const dt=x=>x?new Date(x+"T12:00:00").toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"}):"";
  const repNo=`TSC-${(m.date||"").replace(/-/g,"")}-${(m.serial||"XXXX").replace(/\s/g,"")}`;
  const adj={non:"No adjustment",oui:"Instrument adjusted",sav:"Sent for service"}[m.adjusted]||"—";
  const unitName={dms:"DMS (DDD.MMSS)",deg:"decimal degrees",gon:"gon"}[m.unit];
  return `<div class="rhead"><div><h1>Total station<br>field check report</h1><div style="margin-top:4px">${esc(m.company)}${m.project?" · "+esc(m.project):""}</div></div>
    <div class="rmeta">Report no. ${esc(repNo)}<br>Check date: ${esc(dt(m.date))}<br>Next check due: ${esc(dt(m.nextDate))||"—"}</div></div>
  <h2>Instrument</h2><div class="kv">${kv("Make",m.brand)}${kv("Model",m.model)}${kv("Serial no.",m.serial)}${kv("Asset no.",m.inventory)}${kv("Firmware",m.firmware)}${kv("Angular accuracy",m.sigma?m.sigma+"″":"")}${kv("EDM spec.",(m.edmA||"")+" mm + "+(m.edmB||"")+" ppm")}${kv("Prism",m.prism)}</div>
  <h2>Conditions</h2><div class="kv">${kv("Location",m.place)}${kv("Operator",m.operator)}${kv("Temperature",m.temp?m.temp+" °"+m.tempU:"")}${kv("Pressure",m.pressure?m.pressure+" "+m.pressU:"")}</div>
  <h2>Results summary</h2><table><tr><th>Check</th><th>Result</th><th>Std. dev.</th><th>Tolerance</th><th>Status</th></tr>${
    R.items.map(it=>`<tr><td>${esc(it.label)}</td><td>${it.good===null?"—":esc(it.txt)}</td><td>${ok(it.sd)?aShort(it.sd)+(isGon()?" mgon":"″"):"—"}</td><td>${esc(it.tolTxt)}</td><td>${st(it.good)}</td></tr>`).join("")}</table>
  ${series("coll",[["c","c"],["i","i"]],"Horizontal collimation and vertical index (two-face observations)")}
  ${series("tilt",[["a","a"]],"Tilting axis")}
  ${series("atr",[["c","c ATR"],["i","i ATR"]],"Automatic target recognition (ATR)")}
  ${edmRows.length?`<h2>EDM</h2><table><tr><th>Baseline</th><th>Reference (${du})</th><th>Measured (${du})</th><th>Difference</th><th>Tolerance (mm)</th><th>Status</th></tr>${
    edmRows.map(o=>`<tr><td>${esc(o.r.name)}</td><td>${esc(o.r.ref)}</td><td>${esc(o.r.mes)}</td><td>${esc(mmTxt(o.x.d))}</td><td>± ${o.x.tol.toFixed(1)}</td><td>${st(o.x.good)}</td></tr>`).join("")}</table>
    <div style="font-size:9pt;margin-top:4px">Mean difference ${fmt(R.edmMean,1)} mm${ok(R.edmK0)?` · estimated additive constant ${fmt(R.edmK0,1)} mm · scale factor ${fmt(R.edmPpm,1)} ppm`:""}</div>`:""}
  <h2>Visual and accessory checks</h2><table><tr>${CHECKS.map(([,l])=>`<th>${l}</th>`).join("")}</tr><tr>${CHECKS.map(([k])=>{const v=s.checks[k];return `<td>${v==="ok"?'<span class="ok">Pass</span>':v==="nok"?'<span class="bad">Fail</span>':v==="na"?"N/A":"—"}</td>`}).join("")}</tr></table>
  ${ok(num(s.plumb.dev))?`<div style="font-size:9pt;margin-top:4px">Laser plummet: max. deviation ${esc(s.plumb.dev)} mm over 360° at ${esc(s.plumb.h)} ${du} instrument height.</div>`:""}
  <h2>Remarks</h2><div style="min-height:14mm;white-space:pre-wrap">${esc(m.remarks)||"—"}</div>
  <div class="final"><span>Conclusion: ${R.verdict===null?"check incomplete":R.verdict?"instrument within tolerance":"instrument out of tolerance"}</span><span style="font-size:11pt">${esc(adj)}</span></div>
  <div class="signs"><div>Operator: ${esc(m.operator)}<br>Date and signature</div><div>Approved by: ${esc(m.signBy)}<br>Date and signature</div></div>
  <div class="foot">Method: two-face observations (face left / face right), averaged over ${R.c.n||0} set(s). Tolerances = k × manufacturer specification with k = ${R.k}; tilting axis: 2 × angular tolerance. 1 mgon = 3.24″. Angle input: ${unitName}; distances in ${du==="US ft"?"US survey feet":du==="ft"?"international feet":"meters"}. This field check does not replace a calibration certificate issued by an accredited laboratory.</div>`}
function renderReport(){$("#report").innerHTML=reportHTML()}

/* ---------- Views, input ---------- */
function show(v){view=v;const mn=document.getElementById("mini");if(mn)mn.hidden=v!=="form";["reg","form","rep"].forEach(k=>$("#v-"+k).hidden=k!==v);
  document.querySelectorAll(".tab").forEach(t=>t.setAttribute("aria-current",t.dataset.view===v));
  if(v==="rep")renderReport();if(v==="reg")renderRegistry();window.scrollTo(0,0)}
function markDirty(){dirty=true;updateSave();saveDraft()}
function updateSave(){$("#savestate").textContent=dirty?"Unsaved changes":state.id?"Saved on this device":"New check";$("#btn-save").disabled=!dirty}
let draftT;function saveDraft(){clearTimeout(draftT);draftT=setTimeout(()=>{try{localStorage.setItem("tsc-draft",JSON.stringify(state))}catch(e){}},400)}
function toast(t){const el=$("#toast");el.textContent=t;el.classList.add("on");clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove("on"),2600)}
document.addEventListener("input",e=>{const el=e.target;
  if(el.dataset.bind){set(el.dataset.bind,el.value);if(["meta.unit","meta.dist"].includes(el.dataset.bind))renderForm();else refresh();markDirty()}
  else if(el.dataset.arr){state[el.dataset.arr][+el.dataset.i][el.dataset.f]=el.value;refresh();markDirty()}
  else if(el.dataset.check){if(el.value)state.checks[el.dataset.check]=el.value;else delete state.checks[el.dataset.check];refresh();markDirty()}});
document.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;
  if(b.dataset.view)show(b.dataset.view);if(b.dataset.go)show(b.dataset.go);
  if(b.dataset.add){const k=b.dataset.add;state[k].push(k==="edm"?{name:"",ref:"",mes:""}:row4());renderForm();markDirty()}
  if(b.dataset.rm){state[b.dataset.rm].splice(+b.dataset.i,1);renderForm();markDirty()}
  if(b.dataset.open)openReport(b.dataset.open,false);if(b.dataset.dup)openReport(b.dataset.dup,true);if(b.dataset.del)delReport(b.dataset.del)});
function newCheck(){if(dirty&&!confirm("Discard unsaved changes?"))return;state=blank();dirty=false;renderForm();updateSave();show("form")}
$("#btn-new").onclick=newCheck;
$("#btn-save").onclick=save;
$("#mini").onclick=()=>document.querySelector(".summary").scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
$("#btn-print").onclick=()=>{try{renderReport();window.print()}catch(e){toast("Printing is unavailable here: download the report, then print it.")}};
function reportDoc(){const css=[...document.querySelectorAll("style")].map(s=>s.textContent).join("\n").replace(/@font-face\{[^}]*\}\n?/g,"");
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Report ${esc(state.meta.serial)}</title><style>${css}\nbody{background:#e9ecef;padding:20px 0}@media print{body{padding:0;background:#fff}}</style></head><body><div class="paper">${reportHTML()}</div></body></html>`}
function reportName(){return `Calibration_Check_${(state.meta.model||"TS").replace(/\W+/g,"")}_${(state.meta.serial||"").replace(/\W+/g,"")}_${state.meta.date||today()}.html`}
function dlBlob(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500)}
$("#btn-dl").onclick=()=>{dlBlob(new Blob([reportDoc()],{type:"text/html"}),reportName());toast("Report downloaded")};
const canShareFiles=()=>{try{return !!(navigator.canShare&&navigator.canShare({files:[new File(["x"],"t.html",{type:"text/html"})]}))}catch(e){return false}};
$("#btn-share").hidden=!canShareFiles();
$("#btn-share").onclick=async()=>{try{const file=new File([reportDoc()],reportName(),{type:"text/html"});
  await navigator.share({files:[file],title:"Total station check "+(state.meta.serial||"")})}catch(err){if(err&&err.name!=="AbortError")toast("Sharing failed: "+err.message)}};

/* ---------- Local log (IndexedDB) ---------- */
function openDB(){return new Promise((res,rej)=>{const r=indexedDB.open("tsc",1);r.onupgradeneeded=()=>r.result.createObjectStore("reports",{keyPath:"id"});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function tx(mode,fn){return new Promise((res,rej)=>{const t=idb.transaction("reports",mode),st=t.objectStore("reports");const out=fn(st);t.oncomplete=()=>res(out&&out.result);t.onerror=()=>rej(t.error)})}
async function loadAll(){const all=await tx("readonly",st=>st.getAll());reports=(all||[]).sort((x,y)=>y.updatedAt-x.updatedAt);if(view==="reg")renderRegistry()}
function uid(){return (crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2))}
function summaryOf(s){const R=compute(s);return{verdict:R.verdict,serial:s.meta.serial,model:[s.meta.brand,s.meta.model].filter(Boolean).join(" "),date:s.meta.date,nextDate:s.meta.nextDate,operator:s.meta.operator}}
async function save(){$("#btn-save").disabled=true;
  try{if(!idb)throw new Error("storage unavailable");const id=state.id||uid();const body=JSON.parse(JSON.stringify(state));body.id=id;
    await tx("readwrite",st=>st.put({id,...summaryOf(state),data:body,updatedAt:Date.now()}));
    state.id=id;dirty=false;updateSave();toast("Check saved on this device");
    try{clearTimeout(draftT);localStorage.removeItem("tsc-draft");const m=state.meta;localStorage.setItem("tsc-last",JSON.stringify({company:m.company,project:m.project,place:m.place,operator:m.operator,unit:m.unit,dist:m.dist,tempU:m.tempU,pressU:m.pressU,k:m.k,signBy:m.signBy}))}catch(e){}
    loadAll()
  }catch(err){toast("Save failed: "+(err?.message||err));updateSave()}}
function merge(d){const b=blank();return{...b,...d,meta:{...b.meta,...d.meta},comp:{...b.comp,...d.comp},plumb:{...b.plumb,...d.plumb},checks:{...(d.checks||{})}}}
function openReport(id,dup){if(dirty&&!confirm("Discard unsaved changes?"))return;const r=reports.find(x=>x.id===id);if(!r)return;
  state=merge(JSON.parse(JSON.stringify(r.data)));
  if(dup){const t=today();Object.assign(state,{id:null,coll:[row4(),row4(),row4()],tilt:[row4(),row4()],atr:[],comp:{l:"",t:""},checks:{}});
    state.edm=state.edm.map(e=>({name:e.name,ref:e.ref,mes:""}));state.plumb.dev="";
    Object.assign(state.meta,{date:t,nextDate:plusMonths(t,6),remarks:"",adjusted:""});dirty=true}else dirty=false;
  renderForm();updateSave();show("form")}
async function delReport(id){const r=reports.find(x=>x.id===id);
  if(!confirm(`Delete the check of ${r?.serial||"this instrument"} dated ${r?.date||""}? This cannot be undone.`))return;
  try{await tx("readwrite",st=>st.delete(id));if(state.id===id){state.id=null;dirty=true;updateSave()}toast("Check deleted");loadAll()}
  catch(err){toast("Delete failed: "+(err?.message||err))}}
function renderRegistry(){const q=$("#search").value.trim().toLowerCase(),el=$("#reglist");
  if(!reports.length){el.innerHTML=`<div class="empty"><p>No checks saved on this device yet. Start a field check: results and the report build as you enter readings.</p><button class="btn primary" id="btn-new2">New check</button></div>`;$("#btn-new2").onclick=newCheck;return}
  const list=reports.filter(r=>!q||[r.serial,r.model,r.operator].join(" ").toLowerCase().includes(q));
  if(!list.length){el.innerHTML=`<div class="empty"><p>No checks match "${esc(q)}".</p></div>`;return}
  const now=today(),d=x=>x?new Date(x+"T12:00:00").toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"}):"—";
  el.innerHTML=`<table class="stack"><thead><tr><th>Date</th><th>Instrument</th><th>Serial no.</th><th>Operator</th><th>Result</th><th>Next check due</th><th></th></tr></thead><tbody>${
    list.map(r=>`<tr><td data-label="Date">${d(r.date)}</td><td class="sethead">${esc(r.model)||"—"}</td><td data-label="Serial no.">${esc(r.serial)||"—"}</td><td data-label="Operator">${esc(r.operator)||"—"}</td>
      <td data-label="Result"><span class="pill ${r.verdict===null?"na":r.verdict?"ok":"bad"}">${r.verdict===null?"Incomplete":r.verdict?"Pass":"Out of tolerance"}</span></td>
      <td data-label="Next check due">${d(r.nextDate)}${r.nextDate&&r.nextDate<now?' <span class="pill bad">Overdue</span>':""}</td>
      <td class="full"><div class="rowactions"><button class="btn small" data-open="${esc(r.id)}">Open</button><button class="btn small ghost" data-dup="${esc(r.id)}" title="New check of the same instrument">Recheck</button><button class="btn small ghost" data-del="${esc(r.id)}">Delete</button></div></td></tr>`).join("")}</tbody></table>`}
$("#search").addEventListener("input",renderRegistry);
document.addEventListener("keydown",e=>{if(e.key!=="Enter"||!e.target.matches("input.cell,label.f input"))return;e.preventDefault();
  const all=[...document.querySelectorAll("#v-form input.cell,#v-form label.f input")];const n=all[all.indexOf(e.target)+1];if(n)n.focus();else e.target.blur()});


/* ---------- Export / backup ---------- */
const STR=v=>typeof v==="string"?v.slice(0,2000):(typeof v==="number"&&isFinite(v)?String(v):"");
function sanitizeRecord(r){if(!r||typeof r!=="object"||typeof r.id!=="string"||!/^[A-Za-z0-9_-]{1,64}$/.test(r.id)||!r.data||typeof r.data!=="object")return null;
  const d=r.data,b=blank(),meta={};Object.keys(b.meta).forEach(k=>meta[k]=STR(d.meta?.[k]??b.meta[k]));
  const rows=(a,f)=>Array.isArray(a)?a.slice(0,50).map(x=>{const o={};f.forEach(k=>o[k]=STR(x?.[k]));return o}):[];
  const checks={};CHECKS.forEach(([k])=>{if(["ok","nok","na"].includes(d.checks?.[k]))checks[k]=d.checks[k]});
  const data={id:r.id,meta,coll:rows(d.coll,["hz1","v1","hz2","v2"]),tilt:rows(d.tilt,["hz1","v1","hz2","v2"]),atr:rows(d.atr,["hz1","v1","hz2","v2"]),
    comp:{l:STR(d.comp?.l),t:STR(d.comp?.t)},edm:rows(d.edm,["name","ref","mes"]),plumb:{h:STR(d.plumb?.h),dev:STR(d.plumb?.dev),tol:STR(d.plumb?.tol)},checks};
  const ts=Number(r.updatedAt);return{id:r.id,...summaryOf(merge(data)),data,updatedAt:isFinite(ts)?ts:0}}
function csvCell(v){v=String(v??"");if(/^[=+\-@\t\r]/.test(v)&&isNaN(Number(v)))v="'"+v;return /[",\n]/.test(v)?`"${v.replace(/"/g,'""')}"`:v}
$("#btn-csv").onclick=()=>{if(!reports.length){toast("Nothing to export yet");return}
  const hdr=["Date","Make/Model","Serial no.","Asset no.","Operator","Result","c (arcsec)","i (arcsec)","a (arcsec)","EDM worst diff (mm)","Next check due","Adjustment","Remarks"];
  const rows=reports.map(r=>{const st=merge(r.data),R=compute(st),e=R.items.find(x=>x.key==="edm");const sec=v=>ok(v)?(v*3.24).toFixed(1):"";
    return [r.date,r.model,r.serial,st.meta.inventory,r.operator,r.verdict===null?"Incomplete":r.verdict?"Pass":"Out of tolerance",sec(R.c.mean),sec(R.i.mean),sec(R.a.mean),e?e.raw.toFixed(1):"",r.nextDate,st.meta.adjusted,st.meta.remarks].map(csvCell).join(",")});
  dlBlob(new Blob(["\ufeff"+hdr.join(",")+"\n"+rows.join("\n")],{type:"text/csv"}),`TS_Check_Log_${today()}.csv`);toast("Log exported")};
$("#btn-backup").onclick=()=>{dlBlob(new Blob([JSON.stringify({app:"ts-check",version:1,exported:new Date().toISOString(),reports},null,1)],{type:"application/json"}),`TS_Check_Backup_${today()}.json`);toast("Backup downloaded")};
$("#restore").onchange=async e=>{const f=e.target.files[0];e.target.value="";if(!f)return;
  try{const j=JSON.parse(await f.text());const list=Array.isArray(j)?j:j.reports;if(!Array.isArray(list))throw new Error("not a TS Check backup");
    const valid=list.map(sanitizeRecord).filter(Boolean);if(!valid.length)throw new Error("no valid checks in this file");let added=0,updated=0;
    await tx("readwrite",st=>{valid.forEach(r=>{const cur=reports.find(x=>x.id===r.id);if(!cur){added++;st.put(r)}else if((r.updatedAt||0)>(cur.updatedAt||0)){updated++;st.put(r)}})});
    toast(`Restore done: ${added} added, ${updated} updated`);loadAll()}catch(err){toast("Restore failed: "+(err.message||err))}};

(function init(){
  try{const d=localStorage.getItem("tsc-draft");if(d){state=merge(JSON.parse(d));dirty=true}}catch(e){}
  renderForm();updateSave();show("reg");
  openDB().then(d=>{idb=d;loadAll()}).catch(()=>{const n=$("#dbnotice");n.hidden=false;n.textContent="Local storage is blocked (private browsing?). Checks can't be saved on this device, but reports can still be downloaded."});
  if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{});
  if("serviceWorker" in navigator&&location.protocol!=="file:"){navigator.serviceWorker.register("sw.js").catch(()=>{});
    let reloaded=false;navigator.serviceWorker.addEventListener("controllerchange",()=>{if(reloaded||dirty)return;reloaded=true;location.reload()})}
  const standalone=matchMedia("(display-mode: standalone)").matches||navigator.standalone;
  if(!standalone){const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);$("#installhint").textContent=ios?"Install: Share button, then \u201cAdd to Home Screen\u201d.":"Install: browser menu, then \u201cInstall app\u201d or \u201cAdd to Home screen\u201d."}
})();
})();
