// GA4 Data API（服務帳戶 gsc-reader，~/.config/gsc/heiwei-gsc.json）。執行：NODE_OPTIONS= NODE_PATH=hw-spa/node_modules node scripts/ga4/report.cjs　資源：314804885 何謂美官網／557954855 Heiwei spa高雄／314809645 何謂美IG
const {google}=require('googleapis');
(async()=>{const auth=new google.auth.GoogleAuth({keyFile:process.env.HOME+'/.config/gsc/heiwei-gsc.json',scopes:['https://www.googleapis.com/auth/analytics.readonly']});
const d=google.analyticsdata({version:'v1beta',auth});
const r=await d.properties.runRealtimeReport({property:'properties/557954855',requestBody:{dimensions:[{name:'eventName'}],metrics:[{name:'eventCount'}]}});
console.log(JSON.stringify((r.data.rows||[]).map(x=>[x.dimensionValues[0].value,x.metricValues[0].value])));
const r2=await d.properties.runRealtimeReport({property:'properties/557954855',requestBody:{dimensions:[{name:'unifiedScreenName'}],metrics:[{name:'screenPageViews'}]}});
console.log(JSON.stringify((r2.data.rows||[]).map(x=>[x.dimensionValues[0].value,x.metricValues[0].value])));
})().catch(e=>console.log('ERR',e.message.slice(0,300)));
