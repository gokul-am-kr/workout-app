(function(root){
  const groups={chest:'Chest',shoulders:'Shoulders',biceps:'Biceps',triceps:'Triceps',forearms:'Forearms',back:'Back',core:'Core',glutes:'Glutes',quads:'Quads',hamstrings:'Hamstrings',calves:'Calves'};
  const key=name=>String(name||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  // Approximate movement-based coverage, including common assisting muscles.
  // Specific movements precede generic names (leg curls must not become biceps).
  const rules=[
    [/\b(?:leg|hamstring) curls?\b/,['hamstrings']],
    [/\b(?:leg extensions?|quad extensions?)\b/,['quads']],
    [/\bcalf\b|\bcalves\b/,['calves']],
    [/\b(?:hip thrust|glute bridge|glute kickback|hip abduction)\b/,['glutes']],
    [/\b(?:romanian|stiff leg|rdl)\b/,['hamstrings','glutes','back']],
    [/\bdeadlift\b/,['back','glutes','hamstrings']],
    [/\b(?:squat|lunge|leg press|split squat|step up)\b/,['quads','glutes']],
    [/\b(?:bench|chest|incline|inclined|decline) press\b|\bpush ups?\b|\bpushups?\b/,['chest','shoulders','triceps']],
    [/\b(?:chest fly|chest flyes|pec deck|cable fly|dumbbell fly)\b/,['chest']],
    [/\b(?:shoulder press|overhead press|military press|arnold press|ohp)\b/,['shoulders','triceps']],
    [/\b(?:lateral raise|front raise|rear delt|reverse fly|face pull|upright row)\b/,['shoulders']],
    [/\b(?:pull ups?|pullups?|chin ups?|chinups?|lat pulldown|pull down|pulldown|row|rows)\b/,['back','biceps']],
    [/\b(?:shrug|back extension|hyperextension)\b/,['back']],
    [/\b(?:tricep|triceps|pushdown|push down|skull crusher|close grip press)\b/,['triceps']],
    [/\b(?:bicep|biceps|hammer curl|preacher curl|concentration curl|barbell curl|dumbbell curl|cable curl|ez bar curl)\b/,['biceps']],
    [/\b(?:wrist curl|reverse wrist|farmer carry|farmers carry)\b/,['forearms']],
    [/\b(?:plank|crunch|sit up|situp|leg raise|ab wheel|russian twist|woodchop)\b/,['core']]
  ];
  function infer(name,overrides={}){const k=key(name);if(Object.prototype.hasOwnProperty.call(overrides,k)&&Array.isArray(overrides[k]))return [...new Set(overrides[k].filter(g=>groups[g]))];return rules.find(([pattern])=>pattern.test(k))?.[1].slice()||[]}
  function countSets(entry){
    if(Array.isArray(entry.setDetails))return entry.setDetails.filter(s=>s&&Number.isFinite(+s.reps)&&+s.reps>0&&Number.isFinite(+s.weight)&&+s.weight>=0).length;
    return +entry.reps>0&&Number.isFinite(+entry.sets)?Math.max(0,Math.floor(+entry.sets)):0;
  }
  function summarize(entries,end,overrides={}){
    const d=new Date(end+'T12:00:00');d.setDate(d.getDate()-6);
    const start=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    const counts=Object.fromEntries(Object.keys(groups).map(g=>[g,0])),sources=Object.fromEntries(Object.keys(groups).map(g=>[g,[]]));
    const unknown=[];let totalSets=0;const days=new Set();
    for(const entry of entries){if(entry.date<start||entry.date>end)continue;const sets=countSets(entry);if(!sets)continue;totalSets+=sets;days.add(entry.date);const mapped=infer(entry.exercise,overrides);
      if(!mapped.length)unknown.push({exercise:entry.exercise,date:entry.date,sets});
      for(const group of mapped){counts[group]+=sets;sources[group].push({exercise:entry.exercise,date:entry.date,sets})}
    }
    return {start,end,counts,sources,unknown,totalSets,days:days.size,covered:Object.values(counts).filter(n=>n>0).length};
  }
  root.WorkoutMuscles={groups,key,infer,countSets,summarize};
})(typeof window==='undefined'?globalThis:window);
