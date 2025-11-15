// static/app.js
const input = document.getElementById('symptomInput');
const predictBtn = document.getElementById('predictBtn');
const resultArea = document.getElementById('resultArea');
const tabButtons = document.querySelectorAll('.tab-btn');
let latest = null;

// simple autocomplete: suggestions box
const suggestionBox = document.createElement('div');
suggestionBox.className = 'autocomplete-suggestions';
document.body.appendChild(suggestionBox);
suggestionBox.style.display='none';

input.addEventListener('input', (e)=>{
  const val = input.value.toLowerCase();
  if(!val){ suggestionBox.style.display='none'; return; }
  const q = val.split(',').pop().trim();
  if(!q){ suggestionBox.style.display='none'; return; }
  const matches = SYMPTOMS.filter(s => s.toLowerCase().includes(q)).slice(0,30);
  if(matches.length===0){ suggestionBox.style.display='none'; return; }
  suggestionBox.innerHTML = matches.map(m=><div class="autocomplete-item">${m}</div>).join('');
  // position near input
  const rect = input.getBoundingClientRect();
  suggestionBox.style.left = (rect.left + window.scrollX) + 'px';
  suggestionBox.style.top = (rect.bottom + window.scrollY + 8) + 'px';
  suggestionBox.style.width = Math.min(600, rect.width) + 'px';
  suggestionBox.style.display='block';
});

// click suggestion
suggestionBox.addEventListener('click', (e)=>{
  if(e.target.classList.contains('autocomplete-item')){
    const chosen = e.target.innerText;
    // append to comma-separated list
    let arr = input.value.split(',').map(x=>x.trim()).filter(x=>x);
    // replace last partial
    arr = arr.slice(0, arr.length-1);
    arr.push(chosen);
    input.value = arr.join(', ');
    suggestionBox.style.display='none';
  }
});

// hide suggestion on click outside
document.addEventListener('click', (e)=>{
  if(!suggestionBox.contains(e.target) && e.target !== input) suggestionBox.style.display='none';
});

// Predict click
predictBtn.addEventListener('click', async ()=>{
  const text = input.value.trim();
  if(!text){ alert('Please enter symptoms'); return; }
  const arr = text.split(',').map(s=>s.trim()).filter(s=>s);
  // send to backend
  const res = await fetch('/predict', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({symptoms:arr})
  });
  if(!res.ok){ alert('Server error'); return; }
  const data = await res.json();
  latest = data;
  renderTab('disease');
});

// tab buttons
tabButtons.forEach(btn=>{
  btn.addEventListener('click',(e)=>{ renderTab(btn.getAttribute('data-tab')); });
});

function renderTab(tab){
  if(!latest){ resultArea.innerHTML = '<p class="text-muted">No results yet. Click Predict.</p>'; return; }
  const recs = latest.recommendations || {};
  if(tab === 'disease'){
    resultArea.innerHTML = <h3 class="fw-bold">${latest.disease}</h3>;
  } else if(tab === 'description'){
    resultArea.innerHTML = <p>${recs.Description || 'No description found.'}</p>;
  } else {
    const key = tab.charAt(0).toUpperCase() + tab.slice(1);
    const content = recs[key] || recs[tab] || ['No data found'];
    if(Array.isArray(content)){
      resultArea.innerHTML = '<ul>' + content.map(i=><li>${i}</li>).join('') + '</ul>';
    } else {
      resultArea.innerHTML = <p>${content}</p>;
    }
  }
}

// basic speech recognition
document.getElementById('speechBtn').addEventListener('click', ()=>{
  const S = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!S){ alert('Speech not supported in this browser'); return; }
  const r = new S(); r.lang='en-IN';
  r.onresult = (e)=> {
    const text = e.results[0][0].transcript;
    input.value = input.value ? input.value + ', ' + text : text;
  };
  r.start();
});
// --- Contact form: human-verification (simple sum) ---
(function(){
  // create a random sum question
  function newCaptcha() {
    const a = Math.floor(Math.random()*9)+1;
    const b = Math.floor(Math.random()*9)+1;
    const q = ${a} + ${b} = ?;
    const ans = a + b;
    return {q, ans};
  }

  let captcha = newCaptcha();
  const capEl = document.getElementById('captchaQuestion');
  const ansInput = document.getElementById('cf_captcha');
  const alertEl = document.getElementById('cf_alert');

  if(capEl){
    capEl.innerText = captcha.q;
  }

  const submitBtn = document.getElementById('cf_submit');
  if(submitBtn){
    submitBtn.addEventListener('click', function(e){
      e.preventDefault();
      alertEl.classList.add('d-none');

      const name = document.getElementById('cf_name').value.trim();
      const email = document.getElementById('cf_email').value.trim();
      const phone = document.getElementById('cf_phone').value.trim();
      const message = document.getElementById('cf_message').value.trim();
      const userAns = (document.getElementById('cf_captcha').value || '').trim();

      // simple validations
      if(!name || !email || !phone || !message){
        alertEl.classList.remove('d-none');
        alertEl.classList.remove('alert-success');
        alertEl.classList.add('alert-warning');
        alertEl.innerText = 'Please fill all fields before submitting.';
        return;
      }

      // verify captcha
      if(String(captcha.ans) !== userAns){
        alertEl.classList.remove('d-none');
        alertEl.classList.remove('alert-success');
        alertEl.classList.add('alert-danger');
        alertEl.innerText = 'Human verification failed. Please try again.';
        // regenerate captcha
        captcha = newCaptcha();
        capEl.innerText = captcha.q;
        ansInput.value = '';
        return;
      }

      // If you have backend endpoint, you can POST here. For now show success message:
      alertEl.classList.remove('d-none');
      alertEl.classList.remove('alert-danger','alert-warning');
      alertEl.classList.add('alert-success');
      alertEl.innerText = 'Thank you! Your message has been submitted. We will contact you soon.';

      // clear fields & regenerate captcha
      document.getElementById('cf_name').value = '';
      document.getElementById('cf_email').value = '';
      document.getElementById('cf_phone').value = '';
      document.getElementById('cf_message').value = '';
      captcha = newCaptcha();
      capEl.innerText = captcha.q;
      ansInput.value = '';
    });
  }
})();