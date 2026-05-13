const url = "https://qyynkpoxgtmjbxpyclxx.supabase.co/rest/v1/customers?select=*&limit=1";
const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5eW5rcG94Z3RtamJ4cHljbHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NTc1NjQsImV4cCI6MjA4NjAzMzU2NH0.Xel-jwlytQDq8mOTaPZrvyrk4JJw01dWDJDWotEJKqs";

fetch(url, {
    headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`
    }
})
.then(res => res.json())
.then(data => {
    if (data.error || data.message) console.error(data);
    else console.log(Object.keys(data[0] || {}));
})
.catch(err => console.error("Error:", err));
