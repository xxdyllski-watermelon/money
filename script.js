(function(){
"use strict";
var KEY="catatanku_simple_v1";
var ACCENTS=["#7E6585","#C27B5F","#5F8F88","#B59A5E","#A5748A","#7C8AA8"];
var CAT_COLORS={Makanan:"#C27B5F",Transportasi:"#5F8F88",Kuliah:"#7E6585",Belanja:"#B59A5E",Hiburan:"#A5748A",Lainnya:"#7C8AA8"};
var DEFAULT_TEXT="#3b3340";
var DARK_TEXT="#ede6ef";
var HARI=["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
var HARI_S=["Min","Sen","Sel","Rab","Kam","Jum","Sab"];
var BULAN=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
var BULAN_S=["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

function $(id){return document.getElementById(id);}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8);}
function pad(n){return n<10?"0"+n:""+n;}
function esc(s){return(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
function fmtRp(n){var sign=n<0?"-":"";var s=String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g,".");return sign+"Rp "+s;}
function fmtDate(ts){var d=new Date(ts);return d.getDate()+" "+BULAN_S[d.getMonth()]+" "+d.getFullYear();}
function monthKey(y,m){return y+"-"+pad(m+1);}
function todayStr(){var d=new Date();return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());}

function defaultData(){
return{
notes:[{id:uid(),title:"HELLO FADIL!!!",content:"Ketik disini",tags:[],updatedAt:Date.now()}],
expenses:[],
budgets:{},
settings:{accent:"#7E6585",text:"#3B3340",theme:"light"},
pomodoro:{sessions:{}}
};
}
function normalize(d){
var def=defaultData();
d=(d&&typeof d==="object")?d:{};
var settings={};var k,src=d.settings||{};
for(k in def.settings){settings[k]=def.settings[k];}
for(k in src){if(Object.prototype.hasOwnProperty.call(src,k))settings[k]=src[k];}
var notes=Array.isArray(d.notes)?d.notes:def.notes;
notes.forEach(function(n){if(!Array.isArray(n.tags))n.tags=[];});
return{
notes:notes,
expenses:Array.isArray(d.expenses)?d.expenses:def.expenses,
budgets:(d.budgets&&typeof d.budgets==="object")?d.budgets:def.budgets,
settings:settings,
pomodoro:(d.pomodoro&&typeof d.pomodoro==="object")?d.pomodoro:def.pomodoro
};
}
function load(){try{var raw=localStorage.getItem(KEY);if(!raw)return defaultData();return normalize(JSON.parse(raw));}catch(e){console.error("Load error",e);return defaultData();}}
var DATA=load();
function save(){try{localStorage.setItem(KEY,JSON.stringify(DATA));}catch(e){console.error("Save error",e);}}

var state={tab:"notes",currentNoteId:DATA.notes[0]?DATA.notes[0].id:null,search:"",chartMode:"daily"};

// ========== CLOCK ==========
function tickClock(){
var d=new Date();
$("clockTime").textContent=pad(d.getHours())+":"+pad(d.getMinutes())+":"+pad(d.getSeconds());
$("clockDateFull").textContent=HARI[d.getDay()]+", "+d.getDate()+" "+BULAN[d.getMonth()]+" "+d.getFullYear();
$("clockDateShort").textContent=HARI_S[d.getDay()]+", "+d.getDate()+" "+BULAN_S[d.getMonth()];
}
function scheduleClock(){tickClock();setTimeout(scheduleClock,1000-(Date.now()%1000)+5);}

// ========== TABS ==========
var tabBtns=document.querySelectorAll(".tab-btn");
Array.prototype.forEach.call(tabBtns,function(btn){
btn.addEventListener("click",function(){
flushNote();
state.tab=btn.getAttribute("data-tab");
Array.prototype.forEach.call(tabBtns,function(b){b.classList.toggle("active",b===btn);});
document.querySelectorAll(".panel").forEach(function(p){p.classList.remove("active");});
$("panel-"+state.tab).classList.add("active");
if(state.tab==="finance")renderFinance();
if(state.tab==="pomodoro")updatePomoUI();
});
});

// ========== NOTES ==========
function findNote(id){for(var i=0;i<DATA.notes.length;i++){if(DATA.notes[i].id===id)return DATA.notes[i];}return null;}
function visibleNotes(){
var list=DATA.notes.slice();
if(state.search.trim()){
var q=state.search.trim().toLowerCase();
list=list.filter(function(n){
return(n.title||"").toLowerCase().indexOf(q)>-1||(n.content||"").toLowerCase().indexOf(q)>-1||(n.tags||[]).some(function(t){return t.toLowerCase().indexOf(q)>-1;});
});
}
return list.sort(function(a,b){return b.updatedAt-a.updatedAt;});
}
function renderNoteList(){
var wrap=$("noteList");var list=visibleNotes();wrap.innerHTML="";
if(!list.length){wrap.innerHTML='<div class="empty-hint">Belum ada catatan.</div>';return;}
list.forEach(function(n){
var item=document.createElement("button");item.type="button";
item.className="note-item"+(n.id===state.currentNoteId?" active":"");
var tagsHtml=(n.tags&&n.tags.length)?'<div class="note-tags-inline">'+n.tags.map(function(t){return"<span>"+esc(t)+"</span>";}).join("")+'</div>':'';
item.innerHTML='<span class="note-item__title">'+esc(n.title||"Tanpa judul")+'</span>'+
'<span class="note-item__snip">'+esc((n.content||"").slice(0,60))+'</span>'+tagsHtml;
item.addEventListener("click",function(){flushNote();state.currentNoteId=n.id;renderNoteList();renderNoteEditor();});
wrap.appendChild(item);
});
}
function renderTagBar(note){
var bar=$("tagBar");bar.innerHTML="";
if(!note)return;
(note.tags||[]).forEach(function(tag,i){
var chip=document.createElement("span");chip.className="tag-chip";
chip.innerHTML=esc(tag)+'<button class="remove-tag" data-i="'+i+'">×</button>';
chip.querySelector(".remove-tag").addEventListener("click",function(){
note.tags.splice(i,1);note.updatedAt=Date.now();save();renderTagBar(note);renderNoteList();
});
bar.appendChild(chip);
});
var inp=document.createElement("input");inp.className="tag-input";inp.placeholder="+ tag";inp.maxLength=20;
inp.addEventListener("keydown",function(e){
if(e.key==="Enter"&&inp.value.trim()){
e.preventDefault();
var t=inp.value.trim().toLowerCase();
if(!note.tags)note.tags=[];
if(note.tags.indexOf(t)===-1){note.tags.push(t);note.updatedAt=Date.now();save();renderTagBar(note);renderNoteList();}
inp.value="";
}
});
bar.appendChild(inp);
}
function renderNoteEditor(){
var note=findNote(state.currentNoteId);
var empty=$("noteEmpty");var form=$("noteForm");
if(!note){empty.style.display="block";form.style.display="none";return;}
empty.style.display="none";form.style.display="flex";
$("noteTitle").value=note.title;$("noteContent").value=note.content;
$("noteMeta").textContent="Diperbarui "+fmtDate(note.updatedAt);
renderTagBar(note);
}
var pendingId=null,pendingTimer=null;
function commitNote(){
if(pendingId===null)return;var note=findNote(pendingId);pendingId=null;if(!note)return;
note.title=$("noteTitle").value||"Tanpa judul";note.content=$("noteContent").value;note.updatedAt=Date.now();save();
$("noteMeta").textContent="Tersimpan · "+fmtDate(note.updatedAt);renderNoteList();
}
function flushNote(){if(pendingTimer){clearTimeout(pendingTimer);pendingTimer=null;}commitNote();}
function onNoteInput(){pendingId=state.currentNoteId;if(pendingTimer)clearTimeout(pendingTimer);pendingTimer=setTimeout(function(){pendingTimer=null;commitNote();},400);}
$("noteTitle").addEventListener("input",onNoteInput);
$("noteContent").addEventListener("input",onNoteInput);
$("btnNewNote").addEventListener("click",function(){
flushNote();var note={id:uid(),title:"Catatan baru",content:"",tags:[],updatedAt:Date.now()};
DATA.notes.unshift(note);state.currentNoteId=note.id;save();renderNoteList();renderNoteEditor();
$("noteTitle").focus();$("noteTitle").select();
});
$("btnDeleteNote").addEventListener("click",function(){
flushNote();var note=findNote(state.currentNoteId);if(!note)return;
if(!confirm('Hapus catatan "'+note.title+'" ?'))return;
DATA.notes=DATA.notes.filter(function(n){return n.id!==note.id;});
state.currentNoteId=null;save();renderNoteList();renderNoteEditor();
});
$("searchInput").addEventListener("input",function(e){state.search=e.target.value;renderNoteList();});

// ========== FINANCE ==========
function getMonthExpenses(y,m){
var prefix=y+"-"+pad(m+1);
return DATA.expenses.filter(function(e){var d=new Date(e.createdAt);return(d.getFullYear()+"-"+pad(d.getMonth()+1))===prefix;});
}
function renderFinance(){
var list=DATA.expenses.slice().sort(function(a,b){return b.createdAt-a.createdAt;});
var income=0,expense=0;
list.forEach(function(e){if(e.type==="income")income+=e.amount;else expense+=e.amount;});
$("statIncome").textContent=fmtRp(income);
$("statExpense").textContent=fmtRp(expense);
$("statBalance").textContent=fmtRp(income-expense);
renderBudget();renderChart();
var wrap=$("txList");wrap.innerHTML="";
if(!list.length){wrap.innerHTML='<div class="empty-hint">Belum ada transaksi.</div>';return;}
list.forEach(function(e){
var row=document.createElement("div");row.className="tx-row";
var color=CAT_COLORS[e.category]||"#8C8190";
row.innerHTML='<span class="tx-row__dot" style="background:'+color+'"></span>'+
'<div class="tx-row__info"><p class="tx-row__desc">'+esc(e.description||e.category)+'</p>'+
'<span class="tx-row__sub">'+esc(e.category)+' · '+fmtDate(e.createdAt)+'</span></div>'+
'<span class="tx-row__amt '+(e.type==="income"?"in":"out")+'">'+(e.type==="income"?"+ ":"- ")+fmtRp(e.amount)+'</span>'+
'<button type="button" class="tx-row__del" title="Hapus">✕</button>';
row.querySelector(".tx-row__del").addEventListener("click",function(){
DATA.expenses=DATA.expenses.filter(function(x){return x.id!==e.id;});save();renderFinance();
});
wrap.appendChild(row);
});
}
// Budget
function populateBudgetMonths(){
var sel=$("budgetMonth");sel.innerHTML="";
var now=new Date();
for(var i=-2;i<=1;i++){
var m=new Date(now.getFullYear(),now.getMonth()+i,1);
var val=m.getFullYear()+"-"+pad(m.getMonth()+1);
var opt=document.createElement("option");opt.value=val;opt.textContent=BULAN[m.getMonth()]+" "+m.getFullYear();
sel.appendChild(opt);
}
sel.value=monthKey(now.getFullYear(),now.getMonth());
}
function renderBudget(){
populateBudgetMonths();
var mk=$("budgetMonth").value;
var budget=DATA.budgets[mk]||0;
if(budget)$("budgetAmount").value=budget;else $("budgetAmount").value="";
var parts=mk.split("-");var y=parseInt(parts[0]),mo=parseInt(parts[1])-1;
var exp=getMonthExpenses(y,mo);
var totalOut=exp.reduce(function(s,e){return e.type==="expense"?s+e.amount:s;},0);
if(budget>0){
var pct=Math.min(totalOut/budget*100,100);
$("budgetBar").style.width=pct+"%";
$("budgetBar").className="budget-bar-fill"+(totalOut>budget?" over":"");
var remain=budget-totalOut;
$("budgetInfo").textContent=remain>=0?"Sisa: "+fmtRp(remain)+" dari "+fmtRp(budget):"Over: "+fmtRp(Math.abs(remain))+"! ("+fmtRp(totalOut)+"/"+fmtRp(budget)+")";
}else{
$("budgetBar").style.width="0%";
$("budgetInfo").textContent="Belum diatur — tentukan anggaran bulanan.";
}
}
$("budgetMonth").addEventListener("change",renderBudget);
$("btnSaveBudget").addEventListener("click",function(){
var mk=$("budgetMonth").value;var amt=parseFloat($("budgetAmount").value)||0;
if(amt>0)DATA.budgets[mk]=amt;else delete DATA.budgets[mk];
save();renderBudget();
});
// Chart
function renderChart(){
var canvas=$("finChart");var ctx=canvas.getContext("2d");
var dpr=window.devicePixelRatio||1;
var rect=canvas.getBoundingClientRect();
canvas.width=rect.width*dpr;canvas.height=rect.height*dpr;ctx.scale(dpr,dpr);
ctx.clearRect(0,0,rect.width,rect.height);
var W=rect.width,H=rect.height;
var now=new Date();var y=now.getFullYear(),mo=now.getMonth();
var exp=getMonthExpenses(y,mo);
if(state.chartMode==="daily"){
var daysInMonth=new Date(y,mo+1,0).getDate();
var dailyArr=new Array(daysInMonth).fill(0);
exp.forEach(function(e){if(e.type==="expense"){var dd=new Date(e.createdAt).getDate()-1;if(dd>=0&&dd<daysInMonth)dailyArr[dd]+=e.amount;}});
var maxVal=Math.max.apply(null,dailyArr)||1;
var barW=W/daysInMonth;
ctx.fillStyle=ACCENTS[0]+"88";
for(var i=0;i<daysInMonth;i++){
var bh=(dailyArr[i]/maxVal)*(H-30);
ctx.fillRect(i*barW+1,H-bh-20,barW-2,bh);
}
ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue("--muted").trim();
ctx.font="10px sans-serif";ctx.textAlign="center";
for(var j=0;j<daysInMonth;j+=5){ctx.fillText(j+1,j*barW+barW/2,H-4);}
}else{
var catTotals={};
exp.forEach(function(e){if(e.type==="expense"){catTotals[e.category]=(catTotals[e.category]||0)+e.amount;}});
var cats=Object.keys(catTotals);
if(!cats.length){ctx.fillStyle="#aaa";ctx.font="13px sans-serif";ctx.textAlign="center";ctx.fillText("Belum ada data bulan ini",W/2,H/2);return;}
var total=cats.reduce(function(s,c){return s+catTotals[c];},0);
var colors=[CAT_COLORS.Makanan,CAT_COLORS.Transportasi,CAT_COLORS.Kuliah,CAT_COLORS.Belanja,CAT_COLORS.Hiburan,CAT_COLORS.Lainnya];
var startAngle=-Math.PI/2;
cats.forEach(function(c,idx){
var slice=(catTotals[c]/total)*Math.PI*2;
ctx.beginPath();ctx.moveTo(W/2,H/2);ctx.arc(W/2,H/2,Math.min(W,H)/2-10,startAngle,startAngle+slice);ctx.closePath();
ctx.fillStyle=colors[idx%colors.length];ctx.fill();startAngle+=slice;
});
// Legend
ctx.font="11px sans-serif";ctx.textAlign="left";
var lx=10,ly=14;
cats.forEach(function(c,idx){
ctx.fillStyle=colors[idx%colors.length];ctx.fillRect(lx,ly-8,10,10);
ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue("--text").trim();
ctx.fillText(c+": "+fmtRp(catTotals[c]),lx+14,ly);ly+=16;
});
}
}
document.querySelectorAll(".chart-tab").forEach(function(btn){
btn.addEventListener("click",function(){
document.querySelectorAll(".chart-tab").forEach(function(b){b.classList.remove("active");});
btn.classList.add("active");state.chartMode=btn.getAttribute("data-chart");renderChart();
});
});
$("txForm").addEventListener("submit",function(e){
e.preventDefault();var f=e.target;var els=f.elements;
var amount=parseFloat(els["amount"].value);
if(!amount||amount<=0){alert("Isi jumlah yang valid.");return;}
DATA.expenses.push({id:uid(),type:els["type"].value,description:els["desc"].value.trim(),category:els["category"].value,amount:amount,createdAt:Date.now()});
save();f.reset();renderFinance();
});

// ========== POMODORO ==========
var pomo={running:false,interval:null,totalSeconds:25*60,remaining:25*60,type:"work"};
function updatePomoUI(){
var mins=Math.floor(pomo.remaining/60);var secs=pomo.remaining%60;
$("pomoDisplay").textContent=pad(mins)+":"+pad(secs);
var progress=1-(pomo.remaining/pomo.totalSeconds);
var circumference=2*Math.PI*88;// ≈553
$("pomoRing").setAttribute("stroke-dashoffset",circumference*(1-progress));
$("pomoStartPause").textContent=pomo.running?"⏸ Jeda":"▶ Mulai";
var today=todayStr();
$("pomoCount").textContent=(DATA.pomodoro.sessions[today]||0);
}
function pomoTick(){
if(pomo.remaining<=0){
clearInterval(pomo.interval);pomo.running=false;pomo.remaining=0;updatePomoUI();
if(pomo.type==="work"){
var today=todayStr();
if(!DATA.pomodoro.sessions)todaTA={};
DATA.pomodoro.sessions[today]=(DATA.pomodoro.sessions[today]||0)+1;save();
}
// Beep notification
try{var ac=new(window.AudioContext||window.webkitAudioContext)();var osc=ac.createOscillator();osc.frequency.value=880;osc.connect(ac.destination);osc.start();setTimeout(function(){osc.stop();ac.close();},300);}catch(e){}
if(Notification&&Notification.permission==="granted")new Notification("Pomodoro Selesai!",{body:pomo.type==="work"?"Saatnya istirahat ☕":"Kembali fokus! 🔥"});
updatePomoUI();return;
}
pomo.remaining--;updatePomoUI();
}
$("pomoStartPause").addEventListener("click",function(){
if(pomo.running){clearInterval(pomo.interval);pomo.running=false;}
else{if(pomo.remaining<=0)pomo.remaining=pomo.totalSeconds;pomo.running=true;pomo.interval=setInterval(pomoTick,1000);}
updatePomoUI();
});
$("pomoReset").addEventListener("click",function(){
clearInterval(pomo.interval);pomo.running=false;pomo.remaining=pomo.totalSeconds;updatePomoUI();
});
document.querySelectorAll(".pomo-mode-btn").forEach(function(btn){
btn.addEventListener("click",function(){
document.querySelectorAll(".pomo-mode-btn").forEach(function(b){b.classList.remove("active");});
btn.classList.add("active");
clearInterval(pomo.interval);pomo.running=false;
pomo.totalSeconds=parseInt(btn.getAttribute("data-minutes"))*60;
pomo.remaining=pomo.totalSeconds;pomo.type=btn.getAttribute("data-type");
updatePomoUI();
});
});
if(typeof Notification!=="undefined"&&Notification.permission==="default"){Notification.requestPermission();}

// ========== SETTINGS ==========
function effectiveText(){var s=DATA.settings;var t=String(s.text||DEFAULT_TEXT).toLowerCase();if(s.theme==="dark"&&t===DEFAULT_TEXT)return DARK_TEXT;return s.text;}
function applySettings(){
var s=DATA.settings;var root=document.documentElement;
root.style.setProperty("--accent",s.accent);root.style.setProperty("--text",effectiveText());
root.setAttribute("data-theme",s.theme);
var meta=document.querySelector('meta[name="theme-color"]');
if(meta)meta.setAttribute("content",s.theme==="dark"?"#26212A":"#FBF9FA");
}
function renderSettingsPop(){
var s=DATA.settings;var sw=$("accentSwatches");sw.innerHTML="";
ACCENTS.forEach(function(hex){
var el=document.createElement("button");el.type="button";el.className="swatch"+(hex.toLowerCase()===String(s.accent).toLowerCase()?" active":"");el.style.background=hex;
el.addEventListener("click",function(){s.accent=hex;save();applySettings();renderSettingsPop();});
sw.appendChild(el);
});
$("accentCustom").value=s.accent;$("textCustom").value=effectiveText();
document.querySelectorAll(".theme-switch button").forEach(function(b){b.classList.toggle("active",b.getAttribute("data-theme")===s.theme);});
}
$("btnSettings").addEventListener("click",function(){
var pop=$("settingsPop");var hd=document.querySelector("header");
pop.style.top=(hd.offsetTop+hd.offsetHeight+8)+"px";pop.classList.toggle("open");renderSettingsPop();
});
document.addEventListener("click",function(e){
var pop=$("settingsPop");var btn=$("btnSettings");
if(pop.classList.contains("open")&&!pop.contains(e.target)&&!btn.contains(e.target))pop.classList.remove("open");
});
document.addEventListener("keydown",function(e){if(e.key==="Escape")$("settingsPop").classList.remove("open");});
$("accentCustom").addEventListener("input",function(e){DATA.settings.accent=e.target.value;save();applySettings();renderSettingsPop();});
$("textCustom").addEventListener("input",function(e){DATA.settings.text=e.target.value;save();applySettings();});
document.querySelectorAll(".theme-switch button").forEach(function(btn){
btn.addEventListener("click",function(){DATA.settings.theme=btn.getAttribute("data-theme");save();applySettings();renderSettingsPop();});
});
$("btnExport").addEventListener("click",function(){
flushNote();var blob=new Blob([JSON.stringify(DATA,null,2)],{type:"application/json"});
var url=URL.createObjectURL(blob);var a=document.createElement("a");a.href=url;a.download="catatanku-cadangan.json";
document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(function(){URL.revokeObjectURL(url);},1000);
});
$("importFile").addEventListener("change",function(e){
var file=e.target.files[0];if(!file)return;var reader=new FileReader();
reader.onload=function(){try{DATA=normalize(JSON.parse(reader.result));save();state.currentNoteId=DATA.notes[0]?DATA.notes[0].id:null;applySettings();renderNoteList();renderNoteEditor();renderFinance();renderSettingsPop();alert("Data berhasil diimpor.");}catch(err){alert("Gagal mengimpor: file tidak valid.");}};
reader.readAsText(file);e.target.value="";
});
$("btnReset").addEventListener("click",function(){
if(!confirm("Semua data akan dihapus permanen. Lanjutkan?"))return;
if(pendingTimer){clearTimeout(pendingTimer);pendingTimer=null;}pendingId=null;
DATA=defaultData();save();state.currentNoteId=DATA.notes[0]?DATA.notes[0].id:null;
applySettings();renderNoteList();renderNoteEditor();renderFinance();renderSettingsPop();
});

// ========== LIFECYCLE ==========
document.addEventListener("visibilitychange",function(){if(document.hidden)flushNote();else tickClock();});
window.addEventListener("pagehide",flushNote);

// PWA Install
var deferredPrompt=null;
var isStandalone=(window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches)||window.navigator.standalone===true;
var isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platfo