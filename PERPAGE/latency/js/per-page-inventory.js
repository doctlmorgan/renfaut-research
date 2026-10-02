(function(){
'use strict';
const cfg=window.RISE_PER_PAGE_CONFIG||{};
const form=document.getElementById('riseForm');
const shell=document.getElementById('inventoryShell');
const startBtn=document.getElementById('startInventory');
const itemSteps=[...document.querySelectorAll('.item-step')];
const attentionSteps=[...document.querySelectorAll('.attention-check')];
const sequence=[...document.querySelectorAll('#questionSequence > article.item-step, #questionSequence > article.attention-check')];
const totalItems=itemSteps.length;
const ATTENTION_EXPECTED=['Very much like me','Somewhat like me','Not much like me'];
const LONGSTRING_THRESHOLD=10;
const AUTO_ADVANCE_MS=260;
let cursor=0;
let startedAt=null;
let submitting=false;
let terminated=false;
let terminationSubmitting=false;
let qualityWarningCount=0;
let firstWarningItem='';
let firstWarningType='';
let firstWarningRunLength='';
let secondWarningItem='';
let secondWarningType='';
let secondWarningRunLength='';
let runValue=null;
let runLength=0;
let reviewStartSequenceIndex=null;
let reviewEndSequenceIndex=null;
let reviewMode=false;
const changedAfterWarning=new Set();
const source=(new URLSearchParams(location.search).get('source')||sessionStorage.getItem('riseSource')||'surveyswap').toLowerCase();
sessionStorage.setItem('riseSource',source);

const progressCount=document.getElementById('progressCount');
const progressBar=document.getElementById('progressBar');
const progressLabel=document.getElementById('progressLabel');
const backButton=document.getElementById('backButton');
const nextButton=document.getElementById('nextButton');
const submitButton=document.getElementById('submitInventory');
const statusEl=document.getElementById('pageStatus');
const completeCard=document.getElementById('completeCard');
const reviewBanner=document.getElementById('reviewBanner');

function answeredCount(){return itemSteps.filter(x=>x.querySelector('input[type=radio]:checked')).length;}
function currentNode(){return sequence[cursor]||null;}
function sequenceIndexForScoredStep(step){return sequence.findIndex(n=>n.classList.contains('item-step')&&Number(n.dataset.step)===Number(step));}
function nodeAnswered(node){return !!node?.querySelector('input[type=radio]:checked');}
function updateProgress(node){
  const n=answeredCount();
  progressCount.textContent=`${n} of ${totalItems} completed`;
  progressBar.style.width=`${Math.round(n/totalItems*100)}%`;
  if(node?.classList.contains('item-step'))progressLabel.textContent=`Statement ${node.dataset.step} of ${totalItems}`;
  else if(node?.classList.contains('attention-check'))progressLabel.textContent='Reading check';
  else progressLabel.textContent='Inventory complete';
}
function markDisplay(node){
  if(!node)return;
  if(node.classList.contains('item-step'))window.RISE_LATENCY?.markScoredItemShown?.(Number(node.dataset.step));
  else window.RISE_LATENCY?.markAttentionShown?.(attentionSteps.indexOf(node)+1);
}
function render(){
  sequence.forEach(n=>n.classList.remove('current'));
  completeCard.classList.remove('show');
  const node=currentNode();
  reviewBanner.classList.toggle('show',reviewMode);
  if(node){
    node.classList.add('current');
    updateProgress(node);
    backButton.disabled=cursor===0;
    nextButton.hidden=!nodeAnswered(node);
    submitButton.hidden=true;
    statusEl.textContent=reviewMode?'Review this response. Use Next to continue or select a different answer.':'Choose one response. The next statement will appear automatically.';
  }else{
    updateProgress(null);
    completeCard.classList.add('show');
    backButton.disabled=false;
    nextButton.hidden=true;
    submitButton.hidden=false;
    statusEl.textContent='All 81 statements and reading checks are complete.';
  }
  window.scrollTo({top:0,behavior:'instant'});
}
function afterPaint(fn){requestAnimationFrame(()=>requestAnimationFrame(fn));}
function transitionTo(nextCursor,reason){
  const from=cursor;
  const to=Math.max(0,Math.min(nextCursor,sequence.length));
  const token=window.RISE_LATENCY?.beginEvent?.('page_transition',{fromSequence:from+1,toSequence:to+1,reason:reason||''},true);
  cursor=to;
  render();
  afterPaint(()=>{
    window.RISE_LATENCY?.endEvent?.(token,{fromSequence:from+1,toSequence:to+1});
    markDisplay(currentNode());
  });
}
function advance(reason){
  if(reviewMode&&reviewEndSequenceIndex!=null&&cursor>=reviewEndSequenceIndex){
    reviewMode=false;
    reviewStartSequenceIndex=null;
    reviewEndSequenceIndex=null;
  }
  if(cursor<sequence.length-1)transitionTo(cursor+1,reason||'advance');
  else transitionTo(sequence.length,reason||'complete');
}
function validateParticipantInfo(){
  const required=[
    document.getElementById('participantIdentifier'),document.getElementById('participantAge'),document.getElementById('participantCountry'),
    document.getElementById('englishReadingComfort'),document.getElementById('participantRole'),document.getElementById('participantSector'),document.getElementById('leadershipYears')
  ];
  for(const el of required){if(!el.checkValidity()){el.reportValidity();el.scrollIntoView({behavior:'smooth',block:'center'});return false;}}
  return true;
}
function selectedGender(){
  const vals=[...form.querySelectorAll('[name="entry.1083444680"]:checked')].map(x=>x.value);
  const other=document.querySelector('[name="entry.1083444680.other_option_response"]')?.value?.trim();
  return vals.filter(v=>v!=='__other_option__').concat(vals.includes('__other_option__')&&other?[other]:[]);
}
function selectedRace(){
  const vals=[...form.querySelectorAll('[name="entry.1285176183"]:checked')].map(x=>x.value);
  const other=document.querySelector('[name="entry.1285176183.other_option_response"]')?.value?.trim();
  return vals.filter(v=>v!=='__other_option__').concat(vals.includes('__other_option__')&&other?[other]:[]);
}
function resolvedSector(){
  const s=document.getElementById('participantSector');
  const o=document.getElementById('sectorSelfDescribeText')?.value?.trim();
  return s?.value==='__other_option__'?(o||'Self-described'):(s?.value||'');
}
function syncSelfDescribe(){
  const s=document.getElementById('participantSector'),so=document.getElementById('sectorSelfDescribeText');
  if(so)so.disabled=s?.value!=='__other_option__';
  const gc=document.getElementById('genderSelfDescribeCheck'),go=document.querySelector('[name="entry.1083444680.other_option_response"]');
  if(go)go.disabled=!gc?.checked;
  const rc=document.getElementById('raceOtherCheck'),ro=document.querySelector('[name="entry.1285176183.other_option_response"]');
  if(ro)ro.disabled=!rc?.checked;
}

startBtn.addEventListener('click',()=>{
  if(!validateParticipantInfo())return;
  syncSelfDescribe();
  startedAt=new Date();
  sessionStorage.setItem('riseStartedAt',startedAt.toISOString());
  window.RISE_LATENCY?.start?.(startedAt);
  document.querySelector('.preflight').hidden=true;
  document.querySelector('.hero').hidden=true;
  shell.hidden=false;
  cursor=0;
  const token=window.RISE_LATENCY?.beginEvent?.('page_transition',{fromSequence:0,toSequence:1,reason:'inventory_start'},true);
  render();
  afterPaint(()=>{
    window.RISE_LATENCY?.endEvent?.(token,{fromSequence:0,toSequence:1});
    markDisplay(currentNode());
  });
});
backButton.addEventListener('click',()=>{if(!terminated&&cursor>0)transitionTo(cursor-1,'back');});
nextButton.addEventListener('click',()=>{if(terminated)return;const node=currentNode();if(node&&nodeAnswered(node))advance('next_button');});

form.querySelectorAll('.item-step input[type=radio]').forEach(r=>r.addEventListener('change',()=>{
  if(terminated)return;
  const card=r.closest('.item-step');
  const step=Number(card.dataset.step);
  const previous=card.dataset.lastValue||'';
  if(qualityWarningCount>=1&&previous&&previous!==r.value)changedAfterWarning.add(step);
  card.dataset.lastValue=r.value;
  window.RISE_LATENCY?.recordScoredResponse?.(step,r.value);

  if(!card.dataset.firstAnswered){
    card.dataset.firstAnswered='true';
    if(r.value===runValue)runLength+=1;else{runValue=r.value;runLength=1;}
    if(runLength>=LONGSTRING_THRESHOLD){
      if(qualityWarningCount===0){
        qualityWarningCount=1;
        firstWarningItem=step;
        firstWarningType='long_string';
        firstWarningRunLength=runLength;
        const startStep=Math.max(1,step-runLength+1);
        reviewStartSequenceIndex=sequenceIndexForScoredStep(startStep);
        reviewEndSequenceIndex=sequenceIndexForScoredStep(step);
        runValue=null;runLength=0;
        document.getElementById('qualityWarningModal').classList.add('show');
        return;
      }
      if(qualityWarningCount===1){
        qualityWarningCount=2;
        secondWarningItem=step;
        secondWarningType='long_string';
        secondWarningRunLength=runLength;
        terminateInventory();
        return;
      }
    }
  }
  setTimeout(()=>advance('answer'),AUTO_ADVANCE_MS);
}));

attentionSteps.forEach((card,i)=>card.querySelectorAll('input[type=radio]').forEach(r=>r.addEventListener('change',()=>{
  if(terminated)return;
  window.RISE_LATENCY?.recordAttentionResponse?.(i+1,r.value);
  setTimeout(()=>advance('attention_answer'),AUTO_ADVANCE_MS);
})));

const reviewBtn=document.getElementById('reviewResponsesButton');
if(reviewBtn)reviewBtn.addEventListener('click',()=>{
  document.getElementById('qualityWarningModal').classList.remove('show');
  reviewMode=true;
  transitionTo(Math.max(0,reviewStartSequenceIndex||0),'quality_review');
});
function attentionResult(i){const v=attentionSteps[i]?.querySelector('input[type=radio]:checked')?.value||'';return v?(v===ATTENTION_EXPECTED[i]?'pass':'fail'):'';}
function participantData(){
  return{
    identifier:document.getElementById('participantIdentifier').value.trim(),
    email:document.getElementById('participantEmail').value.trim(),
    age:document.getElementById('participantAge').value,
    country:document.getElementById('participantCountry').value.trim(),
    englishReadingComfort:document.getElementById('englishReadingComfort').value,
    role:document.getElementById('participantRole').value.trim(),
    sector:resolvedSector(),
    leadershipYears:document.getElementById('leadershipYears').value,
    gender:selectedGender(),race:selectedRace()
  };
}
function saveResults(){
  const p=participantData();
  const results=window.RISE_SCORING_ENGINE.compute(itemSteps,{...p,organization:'',teamName:''});
  localStorage.setItem('riseLatestResults',JSON.stringify(results));
  localStorage.setItem('riseResults',JSON.stringify(results));
  sessionStorage.setItem('riseLatestResults',JSON.stringify(results));
  return results;
}
function buildPayload(statusOverride){
  syncSelfDescribe();
  const end=new Date();
  const start=startedAt||new Date(sessionStorage.getItem('riseStartedAt')||end);
  const responses={};
  itemSteps.forEach((x,i)=>responses['Q'+String(i+1).padStart(2,'0')]=x.querySelector('input[type=radio]:checked')?.value||'');
  attentionSteps.forEach((x,i)=>responses['ATTN'+String(i+1).padStart(2,'0')]=x.querySelector('input[type=radio]:checked')?.value||'');
  const p=participantData();
  const latency=window.RISE_LATENCY?.snapshot?.()||{};
  return{
    participantIdentifier:p.identifier,startTime:start.toISOString(),endTime:end.toISOString(),elapsedSeconds:Math.max(0,Math.round((end-start)/1000)),
    activeSeconds:latency.activeSeconds,inactiveSeconds:latency.inactiveSeconds,age:p.age,country:p.country,englishReadingComfort:p.englishReadingComfort,
    role:p.role,sector:p.sector,leadershipYears:p.leadershipYears,gender:p.gender,race:p.race,email:p.email,source,consent:true,
    attentionCheck1:attentionResult(0),attentionCheck2:attentionResult(1),attentionCheck3:attentionResult(2),
    qualityWarningCount,firstWarningItem,firstWarningType,firstWarningRunLength,reviewChanges:changedAfterWarning.size,
    secondWarningItem,secondWarningType,secondWarningRunLength,
    qualityStatus:statusOverride||(qualityWarningCount===0?'clean':'completed_after_warning'),
    terminationReason:statusOverride==='terminated'?'repeated_unusual_pattern':'',
    interfaceVersion:cfg.interfaceVersion||'one-item-per-page-v1',speedWarningCount:0,firstSpeedWarningItem:'',speedWarningRule:cfg.speedWarningRule||'calibration_only',
    responses,latency
  };
}
function endpoint(){return cfg.endpoint||'';}
function postPayloadDirectly(payload){
  const ep=endpoint();if(!ep)throw new Error('No Apps Script endpoint is configured.');
  const f=document.createElement('form');f.method='POST';f.action=ep;f.target='submission_iframe';f.style.display='none';
  const i=document.createElement('input');i.type='hidden';i.name='payload';i.value=JSON.stringify(payload);f.appendChild(i);document.body.appendChild(f);f.submit();setTimeout(()=>f.remove(),1000);
}
let submissionTimer=null;
form.addEventListener('submit',e=>{
  e.preventDefault();
  if(terminated||submitting)return;
  if(answeredCount()!==81||attentionSteps.some(x=>!x.querySelector('input[type=radio]:checked'))){alert('Please complete every statement and reading check before submitting.');return;}
  try{
    saveResults();submitting=true;submitButton.disabled=true;submitButton.textContent='Saving responses…';postPayloadDirectly(buildPayload());
    clearTimeout(submissionTimer);
    submissionTimer=setTimeout(()=>{if(!submitting)return;submitting=false;submitButton.disabled=false;submitButton.textContent='Submit Inventory';alert('Your responses have not been confirmed as saved. Please check your connection and submit again.');},30000);
  }catch(err){submitting=false;submitButton.disabled=false;submitButton.textContent='Submit Inventory';alert(err.message||'Your responses could not be prepared for submission.');console.error(err);}
});
function terminateInventory(){
  if(terminated)return;
  terminated=true;document.body.classList.add('inventory-terminated');
  const m=document.getElementById('qualityTerminationModal');if(m)m.classList.add('show');
  try{terminationSubmitting=true;postPayloadDirectly(buildPayload('terminated'));}catch(err){terminationSubmitting=false;console.error(err);}
}
function showSubmissionSuccess(){
  if(!submitting)return;
  clearTimeout(submissionTimer);submitting=false;sessionStorage.setItem('riseSubmissionStatus','saved');
  const id=document.getElementById('participantIdentifier').value.trim(),v=document.getElementById('confirmationIdentifierValue');if(v)v.textContent=id;
  const q=document.getElementById('completionQualityResult');if(q){if(qualityWarningCount===0){q.textContent='Response quality check: Passed';q.className='quality-result pass';}else{q.textContent='Response quality check: Passed after review';q.className='quality-result review';}}
  const link=document.getElementById('profileLink');if(link)link.href='profile.html?source='+encodeURIComponent(source);
  document.getElementById('confirmation').classList.add('show');submitButton.textContent='Saved';
}
window.addEventListener('message',event=>{
  let trusted=false;try{const h=new URL(event.origin).hostname;trusted=h==='script.googleusercontent.com'||h.endsWith('-script.googleusercontent.com');}catch(e){}
  if(!trusted||!event.data||typeof event.data!=='object')return;
  if(event.data.type==='rise-latency-write-success'&&event.data.success===true){
    const id=document.getElementById('participantIdentifier').value.trim();if(event.data.participantIdentifier&&event.data.participantIdentifier!==id)return;
    if(terminationSubmitting){terminationSubmitting=false;return;}showSubmissionSuccess();
  }else if(event.data.type==='rise-latency-write-error'){
    clearTimeout(submissionTimer);terminationSubmitting=false;submitting=false;submitButton.disabled=false;submitButton.textContent='Submit Inventory';alert('Your responses could not be saved. Please try again.');console.error(event.data.error||'Apps Script write failed');
  }
});
['participantSector','genderSelfDescribeCheck','raceOtherCheck'].forEach(id=>document.getElementById(id)?.addEventListener('change',syncSelfDescribe));
syncSelfDescribe();
})();
