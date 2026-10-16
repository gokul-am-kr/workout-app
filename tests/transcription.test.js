import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transcriptionForm} from '../transcription.js';
const audio=Buffer.from('mock recording').toString('base64');
for(const kind of ['food','workout']){
  for(const mime of ['audio/mp4','audio/webm;codecs=opus']){
    test(`${kind}: Malayalam omits rejected hint, preserves prompt and recording (${mime})`,async()=>{
      const form=transcriptionForm({audio,mime,language:'ml',kind});
      assert.equal(form.has('language'),false);
      assert.equal(form.get('model'),'whisper-1');
      assert.match(form.get('prompt'),/[\u0d00-\u0d7f]/);
      assert.equal(await form.get('file').text(),'mock recording');
      assert.equal(form.get('file').name,(kind==='food'?'meal':'set')+(mime==='audio/mp4'?'.m4a':'.webm'));
    });
  }
}
test('other supported choices keep their explicit hint and matching prompt',()=>{
  for(const language of ['en','hi','ta']){
    const form=transcriptionForm({audio,mime:'audio/mp4',language});
    assert.equal(form.get('language'),language);
    assert.ok(form.get('prompt'));
    assert.doesNotMatch(form.get('prompt'),/[\u0d00-\u0d7f]/);
  }
});
test('missing or unknown language defaults to Malayalam auto-detection',()=>{
  for(const language of [undefined,'unknown',null])assert.equal(transcriptionForm({audio,mime:'audio/webm',language}).has('language'),false);
});
test('bad input rejected before any external request',()=>{
  for(const input of [{audio,mime:'image/jpeg'},{audio:'',mime:'audio/mp4'},{audio:null,mime:'audio/mp4'},{audio:Buffer.alloc(7000001).toString('base64'),mime:'audio/mp4'}])assert.throws(()=>transcriptionForm(input),/Unsupported recording/);
});
test('both voice routes use shared form builder and never append language directly',async()=>{
  const source=await readFile(new URL('../server.js',import.meta.url),'utf8');
  assert.ok(source.includes("transcriptionForm({audio,mime,language,kind:'food'})"));
  assert.ok(source.includes("transcriptionForm({audio,mime,language,kind:'workout'})"));
  assert.doesNotMatch(source,/append\('language'/);
});
