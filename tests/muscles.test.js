import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync(new URL('../public/muscles.js',import.meta.url),'utf8'),ctx);const m=ctx.WorkoutMuscles;
const arr=value=>Array.from(value);
const entry=(date,exercise,sets=3)=>({date,exercise,sets,reps:10,weight:20});
test('specific movement mapping precedes generic names',()=>{
 assert.deepEqual(arr(m.infer('Inclined chest press')),['chest','shoulders','triceps']);
 assert.deepEqual(arr(m.infer('Seated leg curl')),['hamstrings']);
 assert.deepEqual(arr(m.infer('Triceps kickback')),['triceps']);
 assert.deepEqual(arr(m.infer('Cable lateral raise')),['shoulders']);
 assert.deepEqual(arr(m.infer('Upright row')),['shoulders']);
 assert.deepEqual(arr(m.infer('Cable row')),['back','biceps']);
 assert.deepEqual(arr(m.infer('Romanian deadlift')),['hamstrings','glutes','back']);
 assert.deepEqual(arr(m.infer('Mystery exercise')),[]);
});
test('seven-day inclusive range excludes older and future entries across month boundary',()=>{
 const data=m.summarize([entry('2024-02-23','Bench press'),entry('2024-02-24','Bench press',2),entry('2024-02-29','Squat'),entry('2024-03-01','Squat',4)],'2024-03-01');
 assert.equal(data.start,'2024-02-24');assert.equal(data.totalSets,9);assert.equal(data.days,3);assert.equal(data.counts.chest,2);assert.equal(data.counts.quads,7);
 const next=m.summarize([entry('2024-03-02','Bench press')],'2024-03-01');assert.equal(next.totalSets,0);
});
test('set details take precedence, each compound set counts once per involved group',()=>{
 const data=m.summarize([{date:'2024-03-01',exercise:'Bench press',sets:99,weightMode:'per_side',setDetails:[{weight:20,reps:15},{weight:25,reps:10}]}],'2024-03-01');
 assert.equal(data.totalSets,2);assert.equal(data.counts.chest,2);assert.equal(data.counts.triceps,2);assert.equal(data.covered,3);
});
test('unmapped exercises stay visible and overrides are validated and deduplicated',()=>{
 const entries=[entry('2024-03-01','My custom lift',4)];let data=m.summarize(entries,'2024-03-01');assert.equal(data.unknown.length,1);assert.equal(data.totalSets,4);assert.equal(data.covered,0);
 data=m.summarize(entries,'2024-03-01',{'my custom lift':['chest','chest','not-a-muscle']});assert.equal(data.counts.chest,4);assert.equal(data.unknown.length,0);
});
test('empty week has no highlighted muscles',()=>{const data=m.summarize([],'2024-03-01');assert.equal(data.covered,0);assert.equal(data.totalSets,0);assert.ok(Object.values(data.counts).every(n=>n===0))});
