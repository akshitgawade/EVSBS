'use strict';
const msg=document.querySelector('#message'),form=document.querySelector('#book');for(const[k,v]of new URLSearchParams(location.search))if(['slotId','start'].includes(k))form.elements[k].value=v;
async function api(path,body){const r=await fetch('/api/bookings'+path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});const j=await r.json();if(!r.ok)throw Error(j.error.message);return j.data;}
const text=(tag,value,parent)=>{const e=document.createElement(tag);e.textContent=value;parent.append(e);return e;};
form.onsubmit=async e=>{e.preventDefault();const button=form.querySelector('button');button.disabled=true;try{const b=await api('/',Object.fromEntries(new FormData(form)));msg.textContent=`Confirmed. Mock payment ₹${(b.payment.amountPaise/100).toFixed(2)}. Reference ${b.payment.transactionReference}`;}catch(err){msg.textContent=err.message;}finally{button.disabled=false;}};
