// The hosted Whisper endpoint rejects the Malayalam language hint. For Malayalam
// use automatic detection with a same-language vocabulary prompt instead.
export function transcriptionForm({audio,mime,language='ml',kind='food'}) {
  const format=/mp4|m4a/.test(mime)?'m4a':/webm/.test(mime)?'webm':null;
  if(!format||typeof audio!=='string'||!audio||Buffer.byteLength(audio,'base64')>7e6)throw Error('Unsupported recording');
  const selected=['ml','en','hi','ta'].includes(language)?language:'ml';
  const prompts={
    ml:{food:'മലയാളം ഭക്ഷണം: ചോറ്, മട്ട അരി, ചിക്കൻ കറി, മുട്ട, അപ്പം, ദോശ, പുട്ട്, കടല, പഴം, ചായ.',workout:'വർക്ക്ഔട്ട്: ബെഞ്ച് പ്രസ്, സ്ക്വാട്ട്, ഡെഡ്ലിഫ്റ്റ്, സെറ്റുകൾ, റെപ്പുകൾ, കിലോ.'},
    en:{food:'Food: rice, chicken curry, eggs, appam, dosa, puttu, chickpeas, banana, tea.',workout:'Workout: bench press, squat, deadlift, sets, reps, kilograms.'},
    hi:{food:'खाना: चावल, चिकन करी, अंडे, डोसा, चना, केला, चाय।',workout:'व्यायाम: बेंच प्रेस, स्क्वाट, डेडलिफ्ट, सेट, रेप, किलो।'},
    ta:{food:'உணவு: சாதம், சிக்கன் குழம்பு, முட்டை, தோசை, புட்டு, வாழைப்பழம், தேநீர்.',workout:'உடற்பயிற்சி: பெஞ்ச் பிரஸ், ஸ்குவாட், டெட்லிஃப்ட், செட், ரெப், கிலோ.'}
  };
  const form=new FormData();
  form.append('model','whisper-1');
  if(selected!=='ml')form.append('language',selected);
  form.append('prompt',prompts[selected][kind==='workout'?'workout':'food']);
  form.append('file',new Blob([Buffer.from(audio,'base64')],{type:format==='m4a'?'audio/mp4':'audio/webm'}),(kind==='workout'?'set':'meal')+'.'+format);
  return form;
}
