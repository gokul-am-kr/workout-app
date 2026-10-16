import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transcriptionForm} from '../transcription.js';
const audio=Buffer.from('mock recording').toString('base64');
for(const kind of ['food','workout']){
  for(const mime of ['audio/mp4','audio/webm;codecs=opus']){
    test(`${kind}: English hint, matching prompt and recording preserved (${mime})`,async()=>{
      const form=transcriptionForm({audio,mime,kind});
      assert.equal(form.get('language'),'en');
      assert.equal(form.get('model'),'whisper-1');
      assert.doesNotMatch(form.get('prompt'),/[^\x00-\x7f]/);
      assert.equal(await form.get('file').text(),'mock recording');
      assert.equal(form.get('file').name,(kind==='food'?'meal':'set')+(mime==='audio/mp4'?'.m4a':'.webm'));
    });
  }
}
test('legacy clients cannot override English with old language choices',()=>{
  for(const language of ['ml','en','hi','ta','unknown',null]){
    const form=transcriptionForm({audio,mime:'audio/mp4',language});
    assert.equal(form.get('language'),'en');
    assert.ok(form.get('prompt'));
    assert.doesNotMatch(form.get('prompt'),/[\u0d00-\u0d7f]/);
  }
});
test('omitted language defaults to English',()=>{
  assert.equal(transcriptionForm({audio,mime:'audio/webm'}).get('language'),'en');
});
test('bad input rejected before any external request',()=>{
  for(const input of [{audio,mime:'image/jpeg'},{audio:'',mime:'audio/mp4'},{audio:null,mime:'audio/mp4'},{audio:Buffer.alloc(7000001).toString('base64'),mime:'audio/mp4'}])assert.throws(()=>transcriptionForm(input),/Unsupported recording/);
});
test('both voice routes use shared form builder and never append language directly',async()=>{
  const source=await readFile(new URL('../server.js',import.meta.url),'utf8');
  assert.ok(source.includes("transcriptionForm({audio,mime,kind:'food'})"));
  assert.ok(source.includes("transcriptionForm({audio,mime,kind:'workout'})"));
  assert.doesNotMatch(source,/append\('language'/);
});
test('UI has no language selectors or stale selector references',async()=>{
  const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
  const js=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
  assert.doesNotMatch(html,/foodLanguage|workoutLanguage/);
  assert.doesNotMatch(js,/foodLanguage|workoutLanguage/);
  assert.match(html,/English voice input/);
});
