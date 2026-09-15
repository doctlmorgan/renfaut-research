'use strict';

const STORAGE_KEYS = ['riseLatestResults', 'riseResults'];
const ARCHETYPE_FAMILIES = {
  architect:'ambassadors', accelerator:'ambassadors', advocate:'ambassadors',
  connector:'champions', cultivator:'champions', catalyst:'champions',
  sensemaker:'stewards', stabilizer:'stewards'
};

const PRINCIPLE_ORDER = ['RR', 'IB', 'DE', 'ES', 'RA'];
const PRINCIPLE_COLORS = { RR:'#B31217', IB:'#E76F00', DE:'#F7B500', ES:'#38BFD8', RA:'#6C3FBF' };

const PRINCIPLE_SUMMARIES = {
  RR:{engaging:'You are beginning to recognize how systems shape outcomes.',enacting:'You are applying systemic awareness to your leadership.',empowering:'You see systems, name truth, and understand impact.'},
  IB:{engaging:'You are building confidence in navigating uncertainty.',enacting:'You are embracing complexity with growing confidence.',empowering:'You embrace complexity as a source of possibility.'},
  DE:{engaging:'You are strengthening your confidence to act with courage.',enacting:'You are translating your values into courageous action.',empowering:'You courageously challenge systems that limit equity.'},
  ES:{engaging:'You are beginning to imagine new possibilities for change.',enacting:'You are designing meaningful pathways toward transformation.',empowering:'You help redesign systems that advance equity and liberation.'},
  RA:{engaging:'You are strengthening the foundations for sustainable leadership.',enacting:'You are embedding care and shared responsibility into leadership.',empowering:'You sustain transformation through regeneration and collective care.'}
};

const ARCHETYPE_COLORS = {
  architect:'#36B9D8', accelerator:'#E76F00', advocate:'#B31217',
  connector:'#648589', cultivator:'#7A4CC2', catalyst:'#F2B429',
  sensemaker:'#3F6E9C', stabilizer:'#2EAE6F'
};


const ARCHETYPE_COLORS_ON_DARK = {
  architect:'#61D5E6', accelerator:'#FF9A55', advocate:'#FF6B63',
  connector:'#8FC1C4', cultivator:'#B892FF', catalyst:'#FFD05A',
  sensemaker:'#8BB9E8', stabilizer:'#66D99A'
};


const $ = id => document.getElementById(id);

function firstValue(...values){
  return values.find(value => value !== undefined && value !== null && String(value).trim() !== '') || '';
}

function slug(value=''){
  return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}

function readStoredResults(){
  const params = new URLSearchParams(window.location.search);
  const keys = params.get('demo') === '1'
    ? ['riseDemoResults', ...STORAGE_KEYS]
    : STORAGE_KEYS;

  for(const storage of [sessionStorage, localStorage]){
    for(const key of keys){
      const raw = storage.getItem(key);
      if(!raw) continue;
      try { return JSON.parse(raw); }
      catch(error){ console.warn(`Could not parse ${key}.`, error); }
    }
  }
  return null;
}

function getBandKey(principle){
  return slug(principle?.band?.key || principle?.band?.label || principle?.band || '');
}

function getPrincipleSummary(code, principle){
  const band = getBandKey(principle);
  return firstValue(
    principle?.cardSummary,
    principle?.shortInterpretation,
    PRINCIPLE_SUMMARIES[code]?.[band],
    principle?.description
  );
}

function renderPrinciples(results){
  const container = $('principleCards');
  container.replaceChildren();

  for(const code of PRINCIPLE_ORDER){
    const principle = results.principleScores?.[code];
    if(!principle) continue;

    const color = PRINCIPLE_COLORS[code];
    const card = document.createElement('article');
    card.className = 'principle-card';
    card.style.setProperty('--principle-color', color);

    const icon = document.createElement('img');
    icon.className = 'principle-card__icon';
    icon.alt = `${principle.name || code} icon`;
    loadFallbackImage(icon, buildPrincipleIconCandidates(code, principle.icon), {
      diagnosticName:`${code} principle icon`
    });

    const name = document.createElement('h3');
    name.className = 'principle-card__name';
    name.textContent = String(principle.name || code).toUpperCase();

    const level = document.createElement('div');
    level.className = 'principle-card__level';
    level.textContent = String(principle.band?.label || principle.band || '').toUpperCase();

    const statement = document.createElement('p');
    statement.className = 'principle-card__statement';
    statement.textContent = getPrincipleSummary(code, principle);

    card.append(icon, name, level, statement);
    container.append(card);
  }
}

function alignProfileName(profile, configurationName){
  if(!profile) return '';
  const article = /^[aeiou]/i.test(configurationName) ? 'an' : 'a';
  return profile.replace(/^As an?\s+[^,]+,/i, `As ${article} ${configurationName},`);
}

function uniqueCandidates(paths){
  return paths.filter((value,index,array) => value && array.indexOf(value) === index);
}

function absoluteAsset(path){
  try { return new URL(path, document.baseURI).href; }
  catch { return path; }
}

function buildArchetypeIconCandidates(configurationName, configuredIcon){
  const key = slug(configurationName);
  const libraryKey = key;
  const names = [
    `${libraryKey}-icon-brand.svg`,
    `${libraryKey}-icon-preview.png`,
    `${libraryKey}-icon.svg`
  ];
  const folders = [
    'assets/icons/archetypes/',
    'assets/archetypes/',
    'assets/icons/',
    'assets/'
  ];
  return uniqueCandidates([
    ...folders.flatMap(folder => names.map(name => `${folder}${name}`)),
    configuredIcon
  ]).map(absoluteAsset);
}

function buildPrincipleIconCandidates(code, configuredIcon){
  const key = code.toLowerCase();
  const specialBrand = key === 'ra' ? ['ra-brand.svg','re-brand.svg'] : [`${key}-brand.svg`];
  const names = [
    `${key}-preview.png`,
    ...specialBrand,
    `${key}.svg`
  ];
  const folders = [
    'assets/icons/principles/',
    'assets/principles/',
    'assets/icons/',
    'assets/'
  ];
  return uniqueCandidates([
    configuredIcon,
    ...folders.flatMap(folder => names.map(name => `${folder}${name}`))
  ]).map(absoluteAsset);
}

function buildUiIconCandidates(name){
  const names = [`${name}-preview.png`,`${name}-brand.svg`,`${name}.svg`];
  const folders = ['assets/icons/ui/','assets/ui/','assets/icons/','assets/'];
  return uniqueCandidates(folders.flatMap(folder => names.map(file => `${folder}${file}`))).map(absoluteAsset);
}

function buildLogoCandidates(){
  const names = [
    'rise-index-logo.png',
    'rise-index-logo.svg',
    'rise-index-logo-preview.png',
    'rise-index-logo-horizontal.png',
    'rise-index-logo-horizontal.svg',
    'rise-index-logo-horizontal-preview.png',
    'rise-index-logo-black.svg'
  ];
  const folders = ['assets/logos/','assets/'];
  return uniqueCandidates(folders.flatMap(folder => names.map(name => `${folder}${name}`))).map(absoluteAsset);
}

function loadFallbackImage(image, candidates, options={}){
  const {hideWhenMissing=true, diagnosticName='image'} = options;
  let index = 0;
  image.hidden = false;
  image.style.display = 'block';

  const tryNext = () => {
    if(index < candidates.length){
      image.src = candidates[index++];
      return;
    }
    console.warn(`R.I.S.E. Snapshot: ${diagnosticName} could not be loaded. Tried:`, candidates);
    image.removeAttribute('src');
    if(hideWhenMissing){
      image.hidden = true;
      image.style.display = 'none';
    }
  };

  image.onerror = tryNext;
  image.onload = () => {
    image.hidden = false;
    image.style.display = 'block';
  };
  tryNext();
}

function renderSummary(results){
  const configuration = results.configuration || {};
  const expression = results.expression || {};
  const configurationName = configuration.name || 'Leadership Profile';
  const archetypeKey = slug(configurationName);

  const family = ARCHETYPE_FAMILIES[archetypeKey] || 'champions';
  const panel = $('archetypePanel');
  panel.classList.remove('family-ambassadors','family-champions','family-stewards');
  panel.classList.add(`family-${family}`);

  $('archetypeName').textContent = configurationName.toUpperCase();
  $('archetypeTagline').textContent = configuration.descriptiveLine || '';
  $('profileText').textContent = alignProfileName(configuration.profile || '', configurationName);
  $('howYouLeadText').textContent = configuration.howYouLead || '';
  const strengths = configuration.strengths || [];
  const strengthsList = $('strengthsList');
  strengthsList.replaceChildren(...strengths.slice(0,3).map(value => {
    const item = document.createElement('li'); item.textContent = value; return item;
  }));
  const practices = [configuration.helpOthers, configuration.increaseLeadershipEffectiveness].filter(Boolean);
  const practicesList = $('practicesList');
  practicesList.replaceChildren(...practices.map(value => {
    const item = document.createElement('li'); item.textContent = value; return item;
  }));
  $('enduringQuestionText').textContent = configuration.enduringQuestion || '';

  const icon = $('archetypeIcon');
  icon.alt = `${configurationName} archetype icon`;
  loadFallbackImage(icon, buildArchetypeIconCandidates(configurationName, configuration.icon), { diagnosticName:`${configurationName} archetype icon` });
}

function renderIdentity(results){
  setReportDocumentTitle(results);
  const participant = results.participant || results.demographics || {};
  const fullName = firstValue(results.name, participant.name, [participant.firstName, participant.lastName].filter(Boolean).join(' '), 'Your Name');
  $('participantName').textContent = String(fullName).toUpperCase();
  const identifier = firstValue(results.participant?.identifier, results.demographics?.identifier, localStorage.getItem('riseParticipantIdentifier'), sessionStorage.getItem('riseParticipantIdentifier'));
  const identifierEl = $('participantIdentifierDisplay');
  if(identifierEl) identifierEl.textContent = identifier ? `Participant Identifier: ${identifier}` : '';
  $('reportDate').textContent = firstValue(results.date, participant.date, new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric'}).format(new Date()));
  loadFallbackImage($('riseLogo'), buildLogoCandidates(), { diagnosticName:'R.I.S.E. Index logo' });
}

function buildShareText(results){
  const scores = PRINCIPLE_ORDER.map(code => `${code} ${results.principleScores?.[code]?.score ?? '—'}`).join(', ');
  return `${results.name || 'Participant'}'s R.I.S.E. Index™ Leadership Profile: ${results.configuration?.name || 'Leadership Profile'}. Principle scores — ${scores}.`;
}

function reportFileBaseName(results){
  const participant = results.participant || results.demographics || {};
  const person = String(firstValue(results.name, participant.name, [participant.firstName, participant.lastName].filter(Boolean).join(' '), 'Participant'))
    .trim()
    .replace(/[\/:*?"<>|]+/g, '')
    .replace(/\s+/g, ' ');
  return `${person} - R.I.S.E. Index Leadership Snapshot`;
}

function setReportDocumentTitle(results){
  document.title = reportFileBaseName(results);
}

async function waitForReportAssets(report){
  if(document.fonts?.ready) await document.fonts.ready;
  const images = Array.from(report.querySelectorAll('img'));
  await Promise.all(images.map(image => {
    if(image.complete) return Promise.resolve();
    return new Promise(resolve => {
      image.addEventListener('load', resolve, {once:true});
      image.addEventListener('error', resolve, {once:true});
    });
  }));
}

function blobToDataUrl(blob){
  return new Promise((resolve,reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function inlineReportImages(report){
  const images = Array.from(report.querySelectorAll('img[src]'));
  const originals = images.map(image => image.getAttribute('src'));

  await Promise.all(images.map(async image => {
    try{
      const response = await fetch(image.currentSrc || image.src, {cache:'no-store'});
      if(!response.ok) throw new Error(`Image request failed: ${response.status}`);
      image.src = await blobToDataUrl(await response.blob());
      await image.decode?.().catch(() => {});
    }catch(error){
      console.warn('R.I.S.E. Snapshot: image omitted from shared PDF.', image.src, error);
      image.dataset.pdfHidden = 'true';
      image.style.visibility = 'hidden';
    }
  }));

  return () => {
    images.forEach((image,index) => {
      image.src = originals[index] || '';
      if(image.dataset.pdfHidden){
        image.style.visibility = '';
        delete image.dataset.pdfHidden;
      }
    });
  };
}

async function createReportPdfFile(results){
  if(!window.html2canvas || !window.jspdf?.jsPDF){
    throw new Error('PDF tools did not load. Check your internet connection and refresh the page.');
  }

  const report = $('snapshotReport');
  document.body.classList.add('pdf-exporting');
  await waitForReportAssets(report);
  const restoreImages = await inlineReportImages(report);

  try{
    const canvas = await window.html2canvas(report, {
      scale: 2,
      useCORS: false,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: -window.scrollY,
      windowWidth: Math.max(document.documentElement.clientWidth, report.scrollWidth),
      imageTimeout: 15000
    });

    const {jsPDF} = window.jspdf;
    const pdf = new jsPDF({orientation:'portrait', unit:'pt', format:'letter', compress:true});
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const maxWidth = pageWidth - margin * 2;
    const maxHeight = pageHeight - margin * 2;
    const ratio = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
    const width = canvas.width * ratio;
    const height = canvas.height * ratio;
    const x = (pageWidth - width) / 2;
    const y = (pageHeight - height) / 2;

    pdf.addImage(canvas.toDataURL('image/jpeg', 0.96), 'JPEG', x, y, width, height, undefined, 'FAST');
    const blob = pdf.output('blob');
    const filename = `${reportFileBaseName(results)}.pdf`;
    return new File([blob], filename, {type:'application/pdf'});
  } finally {
    restoreImages();
    document.body.classList.remove('pdf-exporting');
  }
}

function downloadFile(file){
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function setupActions(results){
  $('printReport').addEventListener('click', () => { setReportDocumentTitle(results); window.print(); });
  $('shareReport').addEventListener('click', async event => {
    const button = event.currentTarget;
    const originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = 'Preparing PDF…';

    try{
      const file = await createReportPdfFile(results);
      const shareData = {
        title: `${firstValue(results.name, results.participant?.name, results.demographics?.name, 'Participant')} — R.I.S.E. Index™ Leadership Profile`,
        text: 'R.I.S.E. Index™ Leadership Profile',
        files: [file]
      };

      if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){
        await navigator.share(shareData);
      }else{
        downloadFile(file);
        alert('This browser cannot share PDF files directly, so the PDF was downloaded. You can attach it to an email or message.');
      }
    }catch(error){
      if(error.name !== 'AbortError'){
        console.error(error);
        alert(error.message || 'The PDF could not be prepared for sharing.');
      }
    }finally{
      button.disabled = false;
      button.textContent = originalLabel;
    }
  });
  window.addEventListener('beforeprint', () => setReportDocumentTitle(results));
}

function setupInquiryForm(results){
  const modal = $('inquiryModal');
  const openButton = $('openInquiry');
  const form = $('journeyForm');
  const frame = $('journey-submit-frame');
  const status = $('inquiryStatus');
  const participant = results.participant || results.demographics || {};

  $('inquiryName').value = firstValue(results.name, participant.name, [participant.firstName,participant.lastName].filter(Boolean).join(' '));
  $('inquiryEmail').value = firstValue(results.email, participant.email);
  $('inquiryOrganization').value = firstValue(results.organization, participant.organization);
  $('inquiryRole').value = firstValue(results.role, results.jobTitle, participant.role, participant.jobTitle);

  const context = [
    results.configuration?.name && `Configuration: ${results.configuration.name}`,
    results.configuration?.zone && `Zone: ${results.configuration.zone}`,
    results.expression?.name && `Expression: ${results.expression.name}`
  ].filter(Boolean).join(' | ');
  $('inquiryMessage').value = `I would like to learn more about my R.I.S.E. Index™ results.${context ? ` ${context}` : ''}`;

  const closeModal = () => {
    modal.hidden = true;
    document.body.classList.remove('modal-open');
    openButton.focus();
  };
  const openModal = () => {
    modal.hidden = false;
    document.body.classList.add('modal-open');
    status.hidden = true;
    setTimeout(() => $('inquiryName').focus(), 0);
  };

  openButton.addEventListener('click', openModal);
  modal.querySelectorAll('[data-close-modal]').forEach(element => element.addEventListener('click', closeModal));
  document.addEventListener('keydown', event => { if(event.key === 'Escape' && !modal.hidden) closeModal(); });

  let submitted = false;
  form.addEventListener('submit', () => {
    submitted = true;
    status.hidden = true;
    $('submitInquiry').disabled = true;
    $('submitInquiry').textContent = 'Submitting…';
  });
  frame.addEventListener('load', () => {
    if(!submitted) return;
    status.hidden = false;
    $('submitInquiry').disabled = false;
    $('submitInquiry').textContent = 'Submit Inquiry';
    submitted = false;
    setTimeout(closeModal, 2200);
  });
}

function renderEmptyState(){
  document.body.innerHTML = `<main class="snapshot-empty"><h1>No R.I.S.E. results were found</h1><p>Please complete the inventory before opening this page.</p><p><a href="rise.html">Return to the inventory</a></p></main>`;
}

function init(){
  const results = readStoredResults();
  if(!results){ renderEmptyState(); return; }
  renderIdentity(results);
  renderPrinciples(results);
  renderSummary(results);
  setupActions(results);
  
}

document.addEventListener('DOMContentLoaded', init);
