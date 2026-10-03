(function(){
  'use strict';

  const state = {
    started: false,
    startWallMs: 0,
    lastSegmentWallMs: 0,
    segmentVisible: true,
    activeMs: 0,
    inactiveMs: 0,

    // Active time intentionally excluded from scored-item latency.
    excludedActiveMs: 0,
    exclusionDepth: 0,
    exclusionStartActiveMs: 0,
    openEvents: new Map(),
    eventCounter: 0,

    lastFirstAnswerAdjustedMs: 0,
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

  function currentAdjustedActiveMs(){
    if(!state.started) return 0;
    const active = currentActiveMs();
    const openExcluded = state.exclusionDepth > 0
      ? Math.max(0, active - state.exclusionStartActiveMs)
      : 0;
    return Math.max(0, active - state.excludedActiveMs - openExcluded);
  }

  function logEvent(event, details){
    if(!state.started) return;
    const activeOffsetMs = Math.round(currentActiveMs());
    const adjustedActiveOffsetMs = Math.round(currentAdjustedActiveMs());
    state.timingEvents.push(Object.assign({
      event,
      activeOffsetMs,
      adjustedActiveOffsetMs,
      wallOffsetMs: Math.max(0, now() - state.startWallMs)
    }, details || {}));
  }

  function start(startDate){
    const startMs = startDate instanceof Date ? startDate.getTime() : Number(startDate || now());
    state.started = true;
    state.startWallMs = startMs;
    state.lastSegmentWallMs = now();
    state.segmentVisible = !document.hidden;
    state.activeMs = 0;
    state.inactiveMs = 0;
    state.excludedActiveMs = 0;
    state.exclusionDepth = 0;
    state.exclusionStartActiveMs = 0;
    state.openEvents = new Map();
    state.eventCounter = 0;
    state.lastFirstAnswerAdjustedMs = 0;
    state.firstAnswered = new Set();
    state.answers = {};
    state.itemLatencyMs = {};
    state.timingEvents = [];
    state.answerOrder = [];
    state.visibilityEvents = [{state: state.segmentVisible ? 'visible' : 'hidden', offsetMs: 0}];
    state.changedResponseCount = 0;
    state.orderCounter = 0;
  }

  /*
   * Starts a named interface event. When excludeFromLatency is true, active
   * time spent in the event is removed from scored-item response latency.
   */
  function beginEvent(name, meta, excludeFromLatency = true){
    if(!state.started) return null;

    const token = name + ':' + (++state.eventCounter);
    const activeAtStart = currentActiveMs();

    if(excludeFromLatency){
      if(state.exclusionDepth === 0){
        state.exclusionStartActiveMs = activeAtStart;
      }
      state.exclusionDepth += 1;
    }

    state.openEvents.set(token, {
      name,
      meta: meta || {},
      excludeFromLatency,
      wallStartMs: now(),
      activeStartMs: activeAtStart
    });

    logEvent(name + '_start', Object.assign({token}, meta || {}));
    return token;
  }

  function endEvent(token, meta){
    if(!state.started || !token) return;
    const evt = state.openEvents.get(token);
    if(!evt) return;

    const activeAtEnd = currentActiveMs();

    if(evt.excludeFromLatency){
      state.exclusionDepth = Math.max(0, state.exclusionDepth - 1);
      if(state.exclusionDepth === 0){
        state.excludedActiveMs += Math.max(0, activeAtEnd - state.exclusionStartActiveMs);
        state.exclusionStartActiveMs = 0;
      }
    }

    const endMeta = Object.assign({}, evt.meta, meta || {}, {
      token,
      durationMs: Math.max(0, now() - evt.wallStartMs),
      activeDurationMs: Math.max(0, activeAtEnd - evt.activeStartMs)
    });

    state.openEvents.delete(token);
    logEvent(evt.name + '_end', endMeta);
  }

  function resetScoredBaseline(reason){
    if(!state.started) return;
    state.lastFirstAnswerAdjustedMs = currentAdjustedActiveMs();
    logEvent('scored_latency_baseline_reset', {reason: reason || ''});
  }

  function recordScoredResponse(step, response){
    if(!state.started) return;
    const key = 'Q' + String(step).padStart(2,'0');
    const adjustedAtClick = currentAdjustedActiveMs();
    const activeAtClick = currentActiveMs();
    const previous = Object.prototype.hasOwnProperty.call(state.answers, key) ? state.answers[key] : null;
    const changed = previous !== null && previous !== response;
    const isFirstAnswer = !state.firstAnswered.has(key);

    state.orderCounter += 1;

    if(isFirstAnswer){
      const latency = Math.max(0, adjustedAtClick - state.lastFirstAnswerAdjustedMs);
      state.firstAnswered.add(key);
      state.itemLatencyMs[key] = Math.round(latency);
      state.lastFirstAnswerAdjustedMs = adjustedAtClick;
      state.answerOrder.push(key);
    } else if(changed){
      state.changedResponseCount += 1;
    }

    state.answers[key] = response;
    state.timingEvents.push({
      event: 'scored_response',
      item: key,
      response,
      changed,
      firstAnswer: isFirstAnswer,
      latencyMs: isFirstAnswer ? state.itemLatencyMs[key] : null,
      activeOffsetMs: Math.round(activeAtClick),
      adjustedActiveOffsetMs: Math.round(adjustedAtClick),
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
      excludedActiveSeconds: Math.round(state.excludedActiveMs/1000),
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

  window.RISE_LATENCY = {
    start,
    recordScoredResponse,
    beginEvent,
    endEvent,
    resetScoredBaseline,
    snapshot
  };
})();
