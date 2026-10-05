(function(){
'use strict';
const cfg=window.RISE_PER_PAGE_CONFIG||{};
const form=document.getElementById('riseForm');
const shell=document.getElementById('inventoryShell');
const startBtn=document.getElementById('startInventory');
const itemSteps=[...document.querySelectorAll('.item-step')];
const attentionSteps=[...document.querySelectorAll('.attention-check')];
const totalItems=itemSteps.length;
const ATTENTION_EXPECTED=['Very much like me','Somewhat like me','Not much like me'];
const ATTENTION_AFTER_SCORED_COUNTS=[15,31,45];
const LONGSTRING_THRESHOLD=10;
const PATTERN_MIN_ITEMS=12;
const PATTERN_MIN_LENGTH=2;
const PATTERN_MAX_LENGTH=6;
const AUTO_ADVANCE_MS=260;
const ORDER_STORAGE_KEY='riseRandomizedPresentationOrderV1';
let sequence=[];
let presentationOrder=[];
let displayPositionByStep=new Map();
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
let patternWarningCount=0;
let patternRepetitionDetected=false;
let patternLength='';
let patternRepetitions='';
let patternStartPosition='';
let patternEndPosition='';
let maximumPatternRepetitions=0;
let lastWarnedPatternEpisode=null;
let periodicWarningToken=null;
let runValue=null;
let runLength=0;
let reviewStartSequenceIndex=null;
let reviewEndSequenceIndex=null;
let reviewMode=false;
const changedAfterWarning=new Set();
const firstAnswerHistory=[];
const firstResponseSequence=[];
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

function qKey(step){return 'Q'+String(step).padStart(2,'0');}
function secureShuffle(values){
  const a=values.slice();
  for(let i=a.length-1;i>0;i--){
    let j;
    if(window.crypto?.getRandomValues){const x=new Uint32Array(1);window.crypto.getRandomValues(x);j=x[0]%(i+1);}else{j=Math.floor(Math.random()*(i+1));}
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}
function arraysEqual(a,b){
  return a.length===b.length&&a.every((value,index)=>value===b[index]);
}
function canonicalPatternSignature(pattern){
  const rotations=[];
  for(let i=0;i<pattern.length;i++)rotations.push(pattern.slice(i).concat(pattern.slice(0,i)).join('\u241f'));
  rotations.sort();
  return pattern.length+':'+rotations[0];
}
function detectPeriodicSuffix(history){
  if(history.length<PATTERN_MIN_ITEMS)return null;
  const values=history.map(x=>x.value);
  for(let period=PATTERN_MIN_LENGTH;period<=PATTERN_MAX_LENGTH;period++){
    if(values.length<period*2)continue;
    const motif=values.slice(values.length-period);
    if(new Set(motif).size<2)continue; // Straightlining is handled separately.
    let repetitions=1;
    let blockEnd=values.length-period;
    while(blockEnd-period>=0){
      const block=values.slice(blockEnd-period,blockEnd);
      if(!arraysEqual(block,motif))break;
      repetitions++;
      blockEnd-=period;
    }
    const repeatedItems=repetitions*period;
    if(repeatedItems>=PATTERN_MIN_ITEMS){
      const startHistoryIndex=values.length-repeatedItems;
      const startRecord=history[startHistoryIndex];
      const endRecord=history[history.length-1];
      return{
        period,repetitions,repeatedItems,startHistoryIndex,
        startPosition:startRecord?.displayPosition||startHistoryIndex+1,
        endPosition:endRecord?.displayPosition||history.length,
        signature:canonicalPatternSignature(motif)
      };
    }
  }
  return null;
}
function maybeWarnForPeriodicPattern(){
  const candidate=detectPeriodicSuffix(firstResponseSequence);
  if(!candidate)return false;
  patternRepetitionDetected=true;
  maximumPatternRepetitions=Math.max(maximumPatternRepetitions,candidate.repetitions);
  const continuation=lastWarnedPatternEpisode&&
    lastWarnedPatternEpisode.signature===candidate.signature&&
    candidate.startPosition<=lastWarnedPatternEpisode.endPosition+1;
  if(continuation){
    lastWarnedPatternEpisode.endPosition=Math.max(lastWarnedPatternEpisode.endPosition,candidate.endPosition);
    lastWarnedPatternEpisode.repetitions=Math.max(lastWarnedPatternEpisode.repetitions,candidate.repetitions);
    return false;
  }
  patternWarningCount++;
  if(patternLength===''){
    patternLength=candidate.period;
    patternRepetitions=candidate.repetitions;
    patternStartPosition=candidate.startPosition;
    patternEndPosition=candidate.endPosition;
  }
  lastWarnedPatternEpisode={
    signature:candidate.signature,
    startPosition:candidate.startPosition,
    endPosition:candidate.endPosition,
    repetitions:candidate.repetitions
  };
  const startStep=firstResponseSequence[candidate.startHistoryIndex]?.step;
  const endStep=firstResponseSequence[firstResponseSequence.length-1]?.step;
  reviewStartSequenceIndex=sequenceIndexForScoredStep(startStep);
  reviewEndSequenceIndex=sequenceIndexForScoredStep(endStep);
  periodicWarningToken=window.RISE_LATENCY?.beginEvent?.('periodic_pattern_warning',{
    patternLength:candidate.period,
    repetitions:candidate.repetitions,
    startPosition:candidate.startPosition,
    endPosition:candidate.endPosition
  },true);
  document.getElementById('periodicWarningModal')?.classList.add('show');
  return true;
}
function validStoredOrder(order){
  if(!Array.isArray(order)||order.length!==totalItems)return false;
  const expected=new Set(itemSteps.map(n=>qKey(Number(n.dataset.step))));
  return order.every(k=>expected.has(k))&&new Set(order).size===totalItems;
}
function initializeRandomizedSequence(){
  let stored=null;
  try{stored=JSON.parse(sessionStorage.getItem(ORDER_STORAGE_KEY)||'null');}catch(e){}
  presentationOrder=validStoredOrder(stored)?stored:secureShuffle(itemSteps.map(n=>qKey(Number(n.dataset.step))));
  sessionStorage.setItem(ORDER_STORAGE_KEY,JSON.stringify(presentationOrder));
  const byKey=new Map(itemSteps.map(n=>[qKey(Number(n.dataset.step)),n]));
  const randomizedItems=presentationOrder.map(k=>byKey.get(k));
  displayPositionByStep=new Map(randomizedItems.map((node,i)=>[Number(node.dataset.step),i+1]));
  sequence=[];
  randomizedItems.forEach((node,i)=>{
    sequence.push(node);
    const completed=i+1;
    const checkIndex=ATTENTION_AFTER_SCORED_COUNTS.indexOf(completed);
    if(checkIndex>=0&&attentionSteps[checkIndex])sequence.push(attentionSteps[checkIndex]);
  });
  // Defensive fallback if the attention configuration changes.
  attentionSteps.forEach(node=>{if(!sequence.includes(node))sequence.push(node);});
}
initializeRandomizedSequence();

function answeredCount(){return itemSteps.filter(x=>x.querySelector('input[type=radio]:checked')).length;}
function currentNode(){return sequence[cursor]||null;}
function sequenceIndexForScoredStep(step){return sequence.findIndex(n=>n.classList.contains('item-step')&&Number(n.dataset.step)===Number(step));}
function nodeAnswered(node){return !!node?.querySelector('input[type=radio]:checked');}
function displayPositionForNode(node){return node?.classList.contains('item-step')?(displayPositionByStep.get(Number(node.dataset.step))||null):null;}
function updateProgress(node){
  const n=answeredCount();
  progressCount.textContent=`${n} of ${totalItems} completed`;
  progressBar.style.width=`${Math.round(n/totalItems*100)}%`;
  if(node?.classList.contains('item-step'))progressLabel.textContent=`Statement ${displayPositionForNode(node)} of ${totalItems}`;
  else if(node?.classList.contains('attention-check'))progressLabel.textContent='Reading check';
  else progressLabel.textContent='Inventory complete';
}
function markDisplay(node){
  if(!node)return;
  if(node.classList.contains('item-step'))window.RISE_LATENCY?.markScoredItemShown?.(Number(node.dataset.step),displayPositionForNode(node));
  else window.RISE_LATENCY?.markAttentionShown?.(attentionSteps.indexOf(node)+1,cursor+1);
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
  window.RISE_LATENCY?.setPresentationOrder?.(presentationOrder);
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
  const displayPosition=displayPositionByStep.get(step)||null;
  const previous=card.dataset.lastValue||'';
  if((qualityWarningCount>=1||patternWarningCount>=1)&&previous&&previous!==r.value)changedAfterWarning.add(step);
  card.dataset.lastValue=r.value;
  window.RISE_LATENCY?.recordScoredResponse?.(step,r.value,displayPosition);

  if(!card.dataset.firstAnswered){
    card.dataset.firstAnswered='true';
    firstAnswerHistory.push(step);
    firstResponseSequence.push({step,value:r.value,displayPosition});
    if(r.value===runValue)runLength+=1;else{runValue=r.value;runLength=1;}
    if(runLength>=LONGSTRING_THRESHOLD){
      if(qualityWarningCount===0){
        qualityWarningCount=1;
        firstWarningItem=step;
        firstWarningType='long_string';
        firstWarningRunLength=runLength;
        const startStep=firstAnswerHistory[firstAnswerHistory.length-runLength];
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
    if(maybeWarnForPeriodicPattern())return;
  }
  setTimeout(()=>advance('answer'),AUTO_ADVANCE_MS);
}));

attentionSteps.forEach((card,i)=>card.querySelectorAll('input[type=radio]').forEach(r=>r.addEventListener('change',()=>{
  if(terminated)return;
  window.RISE_LATENCY?.recordAttentionResponse?.(i+1,r.value,cursor+1);
  setTimeout(()=>advance('attention_answer'),AUTO_ADVANCE_MS);
})));

const reviewBtn=document.getElementById('reviewResponsesButton');
if(reviewBtn)reviewBtn.addEventListener('click',()=>{
  document.getElementById('qualityWarningModal').classList.remove('show');
  reviewMode=true;
  transitionTo(Math.max(0,reviewStartSequenceIndex||0),'quality_review');
});
const periodicReviewBtn=document.getElementById('periodicReviewResponsesButton');
if(periodicReviewBtn)periodicReviewBtn.addEventListener('click',()=>{
  document.getElementById('periodicWarningModal')?.classList.remove('show');
  if(periodicWarningToken){
    window.RISE_LATENCY?.endEvent?.(periodicWarningToken,{action:'review'});
    periodicWarningToken=null;
  }
  reviewMode=true;
  transitionTo(Math.max(0,reviewStartSequenceIndex||0),'periodic_pattern_review');
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
  itemSteps.forEach(x=>{const step=Number(x.dataset.step);responses[qKey(step)]=x.querySelector('input[type=radio]:checked')?.value||'';});
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
    patternRepetitionDetected,patternLength,patternRepetitions,patternStartPosition,patternEndPosition,maximumPatternRepetitions,patternWarningCount,
    qualityStatus:statusOverride||(qualityWarningCount>0?'completed_after_warning':(patternWarningCount>0?'completed_after_pattern_warning':'clean')),
    terminationReason:statusOverride==='terminated'?'repeated_unusual_pattern':'',
    interfaceVersion:cfg.interfaceVersion||'one-item-per-page-randomized-v2',speedWarningCount:0,firstSpeedWarningItem:'',speedWarningRule:cfg.speedWarningRule||'calibration_only',
    presentationOrder:presentationOrder.slice(),responses,latency
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
  const q=document.getElementById('completionQualityResult');if(q){if(qualityWarningCount===0&&patternWarningCount===0){q.textContent='Response quality check: Passed';q.className='quality-result pass';}else{q.textContent='Response quality check: Passed after review';q.className='quality-result review';}}
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
