// Run: node check-admin.cjs. Isolated logic checks; no network or real account.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(__dirname + '/admin.js', 'utf8');
const handlers = {};
function element(id) {
    return {value:'',checked:true,files:[],textContent:'',hidden:false,disabled:false,
        addEventListener(type, fn) { handlers[id+':'+type]=fn; }, focus(){},
        querySelector(){return element('button');}, replaceChildren(){}, reset(){}, removeAttribute(){}, reportValidity(){return true;}};
}
const els = new Map();
const get = id => { if(!els.has(id)) els.set(id,element(id));return els.get(id); };
const names = ['title','category','size','short_description','full_description','usage','highlights','active','sort_order','photo'];
const inputs=Object.fromEntries(names.map(k=>[k,element(k)]));
get('product-form').elements={namedItem:k=>inputs[k]};
const context = vm.createContext({document:{getElementById:get}, window:{}, URL, crypto:require('node:crypto').webcrypto, console:{error(){},warn(){}}, confirm:()=>false});
vm.runInContext(source.slice(0,source.lastIndexOf('(async () => {')),context);
const run=code=>vm.runInContext(code,context);
let saveFail=false,uploadFail=false,uploads=0,saves=[],removed=[];
const storage={
    async upload(){uploads++;return {error:uploadFail ? new Error('upload'):null};},
    getPublicUrl:path=>({data:{publicUrl:'https://test.supabase.co/storage/v1/object/public/product-images/'+path}}),
    async remove(paths){removed.push(...paths);return {error:null};}
};
const client={storage:{from:()=>storage},from:()=>({
    upsert(values){saves.push(values);return {select:()=>({single:async()=>({error:saveFail?new Error('save'):null})})};},
    update(values){saves.push(values);return {eq:()=>({select:()=>({single:async()=>({error:saveFail?new Error('save'):null})})})};}
})};
context.mockClient=client;
run('client=mockClient; loadList=async()=>{}; showList=message=>{adminStatus.textContent=message;}; draftId="stable-draft"; editing=null;');
inputs.title.value='Test product';inputs.category.value='mask';inputs.short_description.value='Short';inputs.full_description.value='Full';inputs.sort_order.value='0';
const submit=()=>handlers['product-form:submit']({preventDefault(){}});
(async()=>{
    inputs.photo.files=[{type:'image/heic',size:100}]; await submit(); assert.equal(saves.length,0);assert.match(get('form-status').textContent,/JPG/);
    inputs.photo.files=[{type:'image/png',size:100}]; uploadFail=true;await submit();assert.equal(saves.length,0);assert.equal(inputs.title.value,'Test product');assert.equal(get('product-fields').disabled,false);
    uploadFail=false;saveFail=true;await submit();assert.equal(saves.length,1);assert.equal(inputs.full_description.value,'Full');
    const uploaded=uploads;saveFail=false;await submit();assert.equal(uploads,uploaded);assert.equal(saves[0].id,saves[1].id);assert.match(get('admin-status').textContent,/成功/);
    run('busy=true'); await submit();assert.equal(saves.length,2);run('busy=false');
    await run('removePhoto("https://elsewhere.example/photo.png")');assert.equal(removed.length,0);
    await run('removePhoto("https://test.supabase.co/storage/v1/object/public/product-images/old.png")');assert.deepEqual(removed,['old.png']);
    run('editing={id:"existing",image_url:"https://test.supabase.co/storage/v1/object/public/product-images/old.png"}');
    await submit();assert.equal(saves.at(-1).id,undefined);assert.equal(removed.length,2);
    assert.equal(get('product-fields').disabled,false);
    let confirmation='', deletions=0;
    context.confirm=message=>{confirmation=message;return false;};
    run('editing.title="Named product"');
    await handlers['delete-product:click']();
    assert.match(confirmation,/Named product/);assert.equal(deletions,0);
    context.confirm=()=>true;
    client.from=()=>({delete:()=>({eq:()=>({select:()=>({single:async()=>{deletions++;return {error:null};}})})})});
    await handlers['delete-product:click']();assert.equal(deletions,1);
    await run('authorize(null)');assert.equal(get('manager').hidden,true);assert.equal(get('login-form').hidden,false);
    let signedOut=false;
    client.auth={signOut:async()=>{signedOut=true;return {error:null};}};
    client.from=()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null})})})});
    await assert.rejects(()=>run('authorize({user:{id:"not-owner"}})'));assert.equal(signedOut,true);
    assert.equal(get('manager').hidden,true);
    client.from=()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{user_id:"owner"},error:null})})})});
    await run('authorize({user:{id:"owner"}})');assert.equal(get('manager').hidden,false);
    console.log('PASS: photo validation, upload/save failure retention, stable retry ID, uploaded photo reuse, duplicate-submit guard, edit, photo cleanup, named delete confirmation/cancel/delete, anonymous/non-owner UI denied, owner UI allowed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
