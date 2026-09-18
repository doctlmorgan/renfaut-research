(function(){
'use strict';
const root=document.getElementById('profileRoot');
const params=new URLSearchParams(location.search);
const demo=(params.get('demo')||'').toLowerCase();
const valid=['architect','accelerator','advocate','catalyst','connector','cultivator','sensemaker','stabilizer'];
let result=null;try{result=JSON.parse(sessionStorage.getItem('teenRiseResult')||'null');}catch(e){}
const archetype=valid.includes(demo)?demo:(result&&valid.includes(result.archetype)?result.archetype:null);
if(archetype){
  root.innerHTML=`<p class="profile-eyebrow">Your leadership profile</p><h1>Explore your leadership</h1><p class="profile-intro">Your R.I.S.E. Index™ profile is a snapshot of patterns in how you currently see situations, imagine possibilities, and put leadership into practice.</p><div class="card-frame"><img src="assets/cards/teen-${archetype}-card-brand.svg" alt="${archetype[0].toUpperCase()+archetype.slice(1)} leadership archetype card"></div><div class="profile-actions"><button class="profile-button primary" id="printCard">Print / Save as PDF</button><a class="profile-button" href="index.html">Return to start</a></div><p class="extension-note">The student-card result experience is ready to use once youth scoring thresholds are approved. The <code>?demo=${archetype}</code> preview is for design testing.</p>`;
  document.getElementById('printCard').addEventListener('click',()=>window.print());
}else{
  root.innerHTML=`<p class="profile-eyebrow">R.I.S.E. Index™ Student Pilot</p><div class="pilot-complete"><h2>Thank you for completing the pilot.</h2><p>Your responses were completed successfully in this browser session.</p><p>This pilot is being used to test the student version of the R.I.S.E. Index™. Leadership archetype results are not turned on yet because the youth scoring thresholds still need to be established from youth pilot data.</p><a class="profile-button primary" href="index.html">Return to start</a></div><p class="extension-note">This no-score completion state follows the current brand-governance requirement not to imply validation or scoring beyond the approved R.I.S.E. Index™ specification.</p>`;
}
})();
