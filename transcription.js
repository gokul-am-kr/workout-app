// Voice logging accepts English input only, including requests from older PWAs.
export function transcriptionForm({audio,mime,kind='food'}) {
  const format=/mp4|m4a/.test(mime)?'m4a':/webm/.test(mime)?'webm':null;
  if(!format||typeof audio!=='string'||!audio||Buffer.byteLength(audio,'base64')>7e6)throw Error('Unsupported recording');
  const prompts={
    food:'Food: rice, chicken curry, eggs, appam, dosa, puttu, chickpeas, banana, tea.',
    workout:'Workout: bench press, squat, deadlift, sets, reps, kilograms.'
  };
  const form=new FormData();
  form.append('model','whisper-1');
  form.append('language','en');
  form.append('prompt',prompts[kind==='workout'?'workout':'food']);
  form.append('file',new Blob([Buffer.from(audio,'base64')],{type:format==='m4a'?'audio/mp4':'audio/webm'}),(kind==='workout'?'set':'meal')+'.'+format);
  return form;
}
