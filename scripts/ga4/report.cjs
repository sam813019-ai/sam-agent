// GA4 Data API（服務帳戶 gsc-reader，~/.config/gsc/heiwei-gsc.json）。執行：NODE_OPTIONS= NODE_PATH=hw-spa/node_modules node scripts/ga4/report.cjs　資源：314804885 何謂美官網／557954855 Heiwei spa高雄／314809645 何謂美IG
const {google}=require('googleapis');
(async()=>{
const auth=new google.auth.GoogleAuth({keyFile:process.env.HOME+'/.config/gsc/heiwei-gsc.json',scopes:['https://www.googleapis.com/auth/analytics.readonly']});
const d=google.analyticsdata({version:'v1beta',auth});
const P='properties/314804885';
const run=async(dims,mets,limit=10,order)=>{const r=await d.properties.runReport({property:P,requestBody:{dateRanges:[{startDate:'28daysAgo',endDate:'yesterday'}],dimensions:dims.map(n=>({name:n})),metrics:mets.map(n=>({name:n})),limit,orderBys:[{metric:{metricName:order||mets[0]},desc:true}]}});return (r.data.rows||[]).map(x=>[...(x.dimensionValues||[]).map(v=>v.value),...x.metricValues.map(v=>v.value)])};
console.log('TOTAL',JSON.stringify(await run([],['activeUsers','sessions','screenPageViews','ecommercePurchases','purchaseRevenue','engagementRate'])));
console.log('CHANNEL',JSON.stringify(await run(['sessionDefaultChannelGroup'],['sessions','ecommercePurchases','purchaseRevenue'],10)));
console.log('SOURCE',JSON.stringify(await run(['sessionSourceMedium'],['sessions','ecommercePurchases','purchaseRevenue'],10)));
console.log('DEVICE',JSON.stringify(await run(['deviceCategory'],['sessions','ecommercePurchases'],5)));
console.log('PAGES',JSON.stringify(await run(['pagePath'],['screenPageViews'],10)));
})().catch(e=>console.log('ERR',e.code,e.message.slice(0,300)));
