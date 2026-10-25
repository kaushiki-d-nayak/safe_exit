public/app.js
(() => {
  const $ = id => document.getElementById(id);
  const all = sel => [...document.querySelectorAll(sel)];
  let toastTimer;
  function toast(message) {
    $('toast').textContent = message;
    $('toast').classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('toast').classList.add('hidden'), 3000);
  }
  function go(page) {
    all('.page').forEach(el => el.classList.toggle('active', el.id === 'page-' + page));
    all('[data-page]').forEach(el => el.classList.toggle('active', el.dataset.page === page));
    window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  }
  all('[data-page]').forEach(b => b.addEventListener('click', () => go(b.dataset.page)));
  all('[data-go]').forEach(b => b.addEventListener('click', () => go(b.dataset.go)));
  $('clearMessage').addEventListener('click', () => {
    $('msgText').value = ''; $('verifyResult').classList.add('hidden'); $('verifyEmpty').classList.remove('hidden');
  });
  $('analyzeBtn').addEventListener('click', () => {
    const message = $('msgText').value.trim();
    if (!message) { toast('Enter a message first.'); return; }
    const text = message.toLowerCase();
    const checks = [
      [/urgent|within \d+ minutes|avoid cancellation|act now|immediately/, 'Urgency or cancellation pressure may push you to act before checking.'],
      [/pay.{0,15}again|re.?payment|payment link|confirm.{0,15}payment|pay.{0,8}[₹$£]/, 'A payment request needs independent confirmation through your original booking platform.'],
      [/do not contact|don.t contact|do not call/, 'The message discourages independent contact, a serious warning sign.'],
      [/\botp\b|\bpassword\b|card.{0,10}(number|details)|\bcvv\b/, 'A request involving credentials, OTPs, or card details requires particular caution.']
    ];
    let flags=checks.filter(([rule])=>rule.test(text)).map(([,reason])=>reason);
    let level,title,summary,next;
    if(flags.length) {
      level='CAUTION · GUIDANCE';title='Pause. Verify independently.';
      summary='These observations come from the message text. Warning signs are not proof of fraud.';
      next='Do not pay through this message or share sensitive information. Open the original booking platform independently and confirm the request using contact details you already trust.';
    } else {
      level='UNCONFIRMED · GUIDANCE';title='No listed warning patterns detected.';
      summary='Simple text rules cannot authenticate a sender, link, or booking. Absence of these warning patterns does not establish safety.';
      flags=['No listed urgency, repeat-payment, contact-blocking, or credential-request pattern matched.','The sender identity, links, and booking status remain unverified.'];
      next='Open your original booking app independently to check the reservation. Use independently verified contact details, even when a message sounds routine.';
    }
    $('verifyEmpty').classList.add('hidden'); $('verifyResult').classList.remove('hidden');
    $('resultPill').textContent=level;
    $('resultPill').className='pill '+(level.startsWith('CAUTION')?'amber':level.startsWith('LOWER')?'green':'neutral');
    $('resultTitle').textContent=title; $('resultSummary').textContent=summary;
    $('resultFlags').replaceChildren();
    flags.forEach((f,i)=>{const row=document.createElement('div');row.className='flag';const icon=document.createElement('span');icon.className='flag-symbol';icon.textContent=['!','↗','✓'][i];const p=document.createElement('p');p.textContent=f;row.append(icon,p);$('resultFlags').append(row);});
    $('resultNext').textContent=next;
  });
  $('buildPlan').addEventListener('click', () => {
    const kind=$('disruption').value, fallback=$('fallback').value.trim()||'A staffed, well-lit public venue you can independently verify';
    const deadline=$('deadline').value, contact=$('contactName').value.trim();
    const plans={
      transport:['Pause somewhere safe and check official transport options.','Move to your preselected fallback only if you can verify it is accessible.','If your delay reaches '+deadline.toLowerCase()+', reassess and contact your trusted person.'],
      closed:['Do not follow an unfamiliar person offering an unverified alternative.','Check official opening information or choose a known public alternative.','If the situation feels unsafe, move towards staffed public assistance.'],
      late:['Review your arrival time and contact the accommodation using verified details.','Choose a well-lit, staffed place to wait if needed.','If you miss your check-in deadline, use your agreed contact plan.'],
      lost:['Stop moving if you can do so safely and orient yourself.','Use a map or local official source to identify a staffed public place.','Contact a trusted person; call local emergency services if in immediate danger.']
    };
    const labels={transport:'Transport unavailable',closed:'Destination closed',late:'Running late',lost:'Unsure of location'};
    $('planEmpty').classList.add('hidden');$('planResult').classList.remove('hidden');
    $('planFallback').textContent=fallback;$('planDeadline').textContent='Reassess: '+deadline+' · Scenario: '+labels[kind];
    $('planSteps').replaceChildren();
    plans[kind].forEach((s,i)=>{const row=document.createElement('div');row.className='step';const n=document.createElement('div');n.className='step-num';n.textContent=i+1;const p=document.createElement('p');p.textContent=s;row.append(n,p);$('planSteps').append(row);});
    $('planContact').textContent=contact?'If your plan changes, contact: '+contact+'. This plan does not send an alert.':'Choose a trusted person and agree how and when you will check in. This plan does not send an alert.';
    $('copyArea').classList.add('hidden');$('copyPlan').textContent='Show plan text to copy';$('copyNote').textContent='Your plan stays on this page; no message is sent.';
    toast('Your Plan B is ready.');
  });
  $('copyPlan').addEventListener('click', () => {
    const area=$('copyArea');
    if(!area.classList.contains('hidden')){area.classList.add('hidden');$('copyPlan').textContent='Show plan text to copy';return;}
    const text='SAFEEXIT PLAN B\nFallback: '+$('planFallback').textContent+'\n'+$('planDeadline').textContent+'\n'+[...$('planSteps').querySelectorAll('p')].map((p,i)=>(i+1)+'. '+p.textContent).join('\n')+'\n'+$('planContact').textContent;
    area.value=text;area.classList.remove('hidden');area.focus();area.select();$('copyPlan').textContent='Hide plan text';$('copyNote').textContent='Text selected. Use Ctrl+C / Copy on your device.';
  });
  const help={
    staff:{emoji:'▣',title:'Find a staffed public place',phrase:'“Excuse me, I need some help. May I wait here while I contact someone?”',steps:['Move towards a staffed, public place if it is safe to do so.','Tell a staff member what kind of help you need.','Use your own judgement about whether the location feels safe.']},
    contact:{emoji:'♡',title:'Contact someone I trust',phrase:'“I don’t feel comfortable right now. Can you call me? I’ll tell you where I am and what I need.”',steps:['Share your location directly through a trusted method if you choose.','Agree on a clear next check-in.','If you are in immediate danger, seek local emergency help.']},
    language:{emoji:'文',title:'Ask for help in simple words',phrase:'“I need help, please. Can you take me to the reception / a public place?”',steps:['Show this phrase to a staff member or trusted helper.','Use a translation tool if needed and available.','Avoid getting into a vehicle with someone you have not verified.']},
    emergency:{emoji:'!',title:'Urgent assistance',phrase:'“I am in danger and need help. My location is: [tell the operator your location].”',steps:['In India, call 112 for emergency assistance if you can.','Tell the operator your location and what is happening.','Move towards a safer public place if possible. This help card cannot call emergency services.']}
  };
  function chooseHelp(key){
    const d=help[key];$('helpEmpty').classList.add('hidden');$('helpResult').classList.remove('hidden');
    $('helpEmoji').textContent=d.emoji;$('helpTitle').textContent=d.title;$('helpPhrase').textContent=d.phrase;$('helpSteps').replaceChildren();
    d.steps.forEach((s,i)=>{const row=document.createElement('div');row.className='step';const n=document.createElement('div');n.className='step-num';n.textContent=i+1;const p=document.createElement('p');p.textContent=s;row.append(n,p);$('helpSteps').append(row);});
    const location=$('helpAddress').value.trim();$('helpLocation').classList.toggle('hidden',!location);$('helpLocationText').textContent=location;toast('Help card prepared locally.');
  }
  all('[data-help]').forEach(b=>b.addEventListener('click',()=>chooseHelp(b.dataset.help)));
  $('editHelp').addEventListener('click',()=>{$('helpResult').classList.add('hidden');$('helpEmpty').classList.remove('hidden')});
})();