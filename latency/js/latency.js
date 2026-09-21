(function(){
  'use strict';

  const state = {
    started: false,
    startWallMs: 0,
    lastSegmentWallMs: 0,
    segmentVisible: true,
    activeMs: 0,
    inactiveMs: 0,
    lastFirstAnswerActiveMs: 0,
    firstAnswered: new Set(),
    answers: {},
    itemLatencyMs: {},
    timingEvents: [],
    answerOrder: [],
    visibilityEvents: [],
    changedResponseCount: 0,
    orderCounter: 0
  };

  function now(){ return Date.now(); }

  function commitSegment(){
    if(!state.started) return;
    const t = now();
    const delta = Math.max(0, t - state.lastSegmentWallMs);
    if(state.segmentVisible) state.activeMs += delta;
    else state.inactiveMs += delta;
    state.lastSegmentWallMs = t;
  }

  function currentActiveMs(){
    if(!state.started) return 0;
    commitSegment();
    return state.activeMs;
  }

  function start(startDate){
    const startMs = startDate instanceof Date ? startDate.getTime() : Number(startDate || now());
    state.started = true;
    state.startWallMs = startMs;
    state.lastSegmentWallMs = now();
    state.segmentVisible = !document.hidden;
    state.activeMs = 0;
    state.inactiveMs = 0;
    state.lastFirstAnswerActiveMs = 0;
    state.firstAnswered = new Set();
    state.answers = {};
    state.itemLatencyMs = {};
    state.timingEvents = [];
    state.answerOrder = [];
    state.visibilityEvents = [{state: state.segmentVisible ? 'visible' : 'hidden', offsetMs: 0}];
    state.changedResponseCount = 0;
    state.orderCounter = 0;
  }

  function recordScoredResponse(step, response){
    if(!state.started) return;
    const key = 'Q' + String(step).padStart(2,'0');
    const activeAtClick = currentActiveMs();
    const previous = Object.prototype.hasOwnProperty.call(state.answers, key) ? state.answers[key] : null;
    const changed = previous !== null && previous !== response;

    state.orderCounter += 1;

    if(!state.firstAnswered.has(key)){
      const latency = Math.max(0, activeAtClick - state.lastFirstAnswerActiveMs);
      state.firstAnswered.add(key);
      state.itemLatencyMs[key] = Math.round(latency);
      state.lastFirstAnswerActiveMs = activeAtClick;
      state.answerOrder.push(key);
    } else if(changed){
      state.changedResponseCount += 1;
    }

    state.answers[key] = response;
    state.timingEvents.push({
      item: key,
      response: response,
      changed: changed,
      firstAnswer: state.itemLatencyMs[key] !== undefined && !changed && state.timingEvents.filter(e=>e.item===key).length===0,
      activeOffsetMs: Math.round(activeAtClick),
      wallOffsetMs: Math.max(0, now() - state.startWallMs),
      order: state.orderCounter
    });
  }

  function visibilityChanged(){
    if(!state.started) return;
    commitSegment();
    state.segmentVisible = !document.hidden;
    state.visibilityEvents.push({
      state: state.segmentVisible ? 'visible' : 'hidden',
      offsetMs: Math.max(0, now() - state.startWallMs)
    });
  }

  document.addEventListener('visibilitychange', visibilityChanged);

  function mean(values){
    if(!values.length) return 0;
    return values.reduce((a,b)=>a+b,0)/values.length;
  }

  function median(values){
    if(!values.length) return 0;
    const x = values.slice().sort((a,b)=>a-b);
    const m = Math.floor(x.length/2);
    return x.length % 2 ? x[m] : (x[m-1]+x[m])/2;
  }

  function sampleSd(values){
    if(values.length < 2) return 0;
    const avg = mean(values);
    return Math.sqrt(values.reduce((s,v)=>s+Math.pow(v-avg,2),0)/(values.length-1));
  }

  function longestFastSequence(values, threshold){
    let longest = 0, current = 0;
    values.forEach(v=>{
      if(v < threshold){ current += 1; longest = Math.max(longest,current); }
      else current = 0;
    });
    return longest;
  }

  function snapshot(){
    if(state.started) commitSegment();
    const ordered = [];
    for(let i=1;i<=81;i++){
      const key = 'Q' + String(i).padStart(2,'0');
      if(Number.isFinite(state.itemLatencyMs[key])) ordered.push(state.itemLatencyMs[key]);
    }
    const avg = mean(ordered);
    const sd = sampleSd(ordered);
    return {
      activeSeconds: Math.round(state.activeMs/1000),
      inactiveSeconds: Math.round(state.inactiveMs/1000),
      medianResponseLatencyMs: Math.round(median(ordered)),
      meanResponseLatencyMs: Math.round(avg),
      responseLatencySdMs: Math.round(sd),
      responseLatencyCv: avg ? Number((sd/avg).toFixed(4)) : 0,
      firstHalfMedianLatencyMs: Math.round(median(ordered.slice(0,40))),
      secondHalfMedianLatencyMs: Math.round(median(ordered.slice(40))),
      fastResponsesUnder1Sec: ordered.filter(v=>v<1000).length,
      fastResponsesUnder2Sec: ordered.filter(v=>v<2000).length,
      fastResponsesUnder3Sec: ordered.filter(v=>v<3000).length,
      longestFastResponseSequenceUnder2Sec: longestFastSequence(ordered,2000),
      changedResponseCount: state.changedResponseCount,
      itemLatencyMs: Object.assign({}, state.itemLatencyMs),
      timingEvents: state.timingEvents.slice(),
      answerOrder: state.answerOrder.slice(),
      visibilityEvents: state.visibilityEvents.slice()
    };
  }

  window.RISE_LATENCY = { start, recordScoredResponse, snapshot };
})();
