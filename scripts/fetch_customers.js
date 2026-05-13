const url = "https://qyynkpoxgtmjbxpyclxx.supabase.co/rest/v1/customers?select=phone&phone=not.is.null&phone=neq.";
const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5eW5rcG94Z3RtamJ4cHljbHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NTc1NjQsImV4cCI6MjA4NjAzMzU2NH0.Xel-jwlytQDq8mOTaPZrvyrk4JJw01dWDJDWotEJKqs";

fetch(url, {
    method: 'HEAD',
    headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Prefer': 'count=exact'
    }
})
.then(res => {
    console.log("Total Count (phone):", res.headers.get('content-range'));
})
.catch(err => console.error("Error:", err));

const url2 = "https://qyynkpoxgtmjbxpyclxx.supabase.co/rest/v1/customers?select=phone1&phone1=not.is.null&phone1=neq.";
fetch(url2, {
    method: 'HEAD',
    headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Prefer': 'count=exact'
    }
})
.then(res => {
    console.log("Total Count (phone1):", res.headers.get('content-range'));
})
.catch(err => console.error("Error:", err));

const url3 = "https://qyynkpoxgtmjbxpyclxx.supabase.co/rest/v1/customers?select=tel&tel=not.is.null&tel=neq.";
fetch(url3, {
    method: 'HEAD',
    headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Prefer': 'count=exact'
    }
})
.then(res => {
    console.log("Total Count (tel):", res.headers.get('content-range'));
})
.catch(err => console.error("Error:", err));
