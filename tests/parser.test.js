// Run: node tests/parser.test.js
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=fs.readFileSync('app.js','utf8');
const start=source.indexOf('function parse(s){');
const end=source.indexOf("\n$('#mobileAdd')",start);
assert(start>=0&&end>start,'Could not locate parse()');
const pad=n=>String(n).padStart(2,'0');
const iso=(y,m,d)=>y+'-'+pad(m+1)+'-'+pad(d);
const view=new Date(2026,9,1);
// Freeze the reference date so relative-date cases behave the same in CI and locally.
class FixedDate extends Date {
  constructor(...args){super(...(args.length?args:[2026,9,31,12,0,0]))}
}
const parse=vm.runInNewContext('('+source.slice(start,end)+')',{Date:FixedDate,pad,iso,view});
const cases=[
  ["모레 오후 4시 아이 치과",{"date":"2026-11-02","time":"16:00","title":"아이 치과","cat":"kid"}],
  ["글피 오전 9시 모임",{"date":"2026-11-03","time":"09:00","title":"모임"}],
  ["이번 주 금요일 오후 6시 장보기",{"date":"2026-10-30","time":"18:00","title":"장보기"}],
  ["다음주 월요일 오후 3시 회의",{"date":"2026-11-02","time":"15:00","title":"회의"}],
  ["다음 주 일요일 가족 모임",{"date":"2026-11-08","title":"가족 모임"}],
  ["다음 달 5일 19시 가족 모임",{"date":"2026-11-05","time":"19:00","title":"가족 모임"}],
  ["이번달 3일 장보기",{"date":"2026-10-03","title":"장보기"}],
  ["다음주 회의",{"error":true}],
  ["다음 달 가족 모임",{"error":true}],
  ["이번주 회의",{"error":true}],
  [
    "2026년 11월 4일 19:30 모임",
    { "time": "19:30", "title": "모임" }
  ],
  [
    "2026년 11월 4일 오후 7:30 가족 모임",
    { "time": "19:30", "title": "가족 모임" }
  ],
  [
    "2026년 11월 4일 00:05 출발",
    { "time": "00:05", "title": "출발" }
  ],
  [
    "2026년 11월 4일 25:00 모임",
    { "error": true }
  ],
  [
    "2026년 11월 4일 19:75 모임",
    { "error": true }
  ],
  [
    "2026년 11월 4일 123:00 모임",
    { "error": true }
  ],
  [
    "2026년 11월 4일 오후 7시 30 모임",
    { "time": "19:30", "title": "모임" }
  ],
  [
    "2026년 11월 4일 7시 123 모임",
    { "error": true }
  ],
  [
    "2026년 11월 4일 7시 2차 회의",
    { "time": "07:00", "title": "2차 회의" }
  ],
  [
    "2026년 11월 4일 오후 7시 반 가족 모임",
    {
      "date": "2026-11-04",
      "time": "19:30",
      "title": "가족 모임",
      "cat": "spouse"
    }
  ],
  [
    "2026년 11월 4일 밤 8시 모임",
    {
      "time": "20:00",
      "title": "모임"
    }
  ],
  [
    "2026년 11월 4일 저녁 8시 모임",
    {
      "time": "20:00",
      "title": "모임"
    }
  ],
  [
    "2026년 11월 4일 오후 8시 모임",
    {
      "time": "20:00"
    }
  ],
  [
    "2026년 11월 4일 오전 12시 병원",
    {
      "time": "00:00",
      "cat": "me"
    }
  ],
  [
    "2026년 11월 4일 오후 12시 모임",
    {
      "time": "12:00"
    }
  ],
  [
    "2026년 11월 4일 23시 59분 모임",
    {
      "time": "23:59"
    }
  ],
  [
    "2026년 11월 4일 7시 30분 모임",
    {
      "time": "07:30"
    }
  ],
  [
    "2026년 11월 4일 7시 0분 모임",
    {
      "time": "07:00"
    }
  ],
  [
    "2026년 11월 4일 7시 반 모임",
    {
      "time": "07:30"
    }
  ],
  [
    "2026년 11월 4일 7시 75분 모임",
    {
      "error": true
    }
  ],
  [
    "2026년 11월 4일 7시 123분 모임",
    {
      "error": true
    }
  ],
  [
    "2026년 11월 4일 123시 모임",
    {
      "error": true
    }
  ],
  [
    "2026년 11월 4일 25시 모임",
    {
      "error": true
    }
  ],
  [
    "2026년 11월 4일 오후 13시 모임",
    {
      "error": true
    }
  ],
  [
    "2026년 11월 31일 모임",
    {
      "error": true
    }
  ],
  [
    "2026년 2월 30일 모임",
    {
      "error": true
    }
  ],
  [
    "2026년 2월 29일 모임",
    {
      "error": true
    }
  ],
  [
    "2028년 2월 29일 모임",
    {
      "date": "2028-02-29"
    }
  ],
  [
    "2026년 11월 123일 모임",
    {
      "error": true
    }
  ],
  [
    "2026년 13월 4일 모임",
    {
      "error": true
    }
  ],
  [
    "2026년 11월 4일 오후 7시 반",
    {
      "error": true
    }
  ],
  [
    "2026년 11월 4일 어린이집 행사",
    {
      "cat": "work",
      "title": "어린이집 행사"
    }
  ],
  [
    "2026년 11월 4일 아이 학원",
    {
      "cat": "kid",
      "title": "아이 학원"
    }
  ],
  [
    "2026년 11월 4일 모임",
    {
      "time": "",
      "title": "모임"
    }
  ],
  [
    "4일 가족 모임",
    {
      "date": "2026-10-04",
      "title": "가족 모임"
    }
  ],
  [
    "2026년 11월 4일에 오후 7시에 가족 모임",
    { "date": "2026-11-04", "time": "19:00", "title": "가족 모임" }
  ],
  [
    "2026년 11월 4일 오후 7시 30분에 모임",
    { "time": "19:30", "title": "모임" }
  ],
  [
    "2026년 11월 4일 오후 7시에",
    { "error": true }
  ]
];
for(const [input,expected] of cases){
  const actual=parse(input);
  for(const [key,value] of Object.entries(expected)){
    if(key==='error')assert.equal(Boolean(actual.error),value,input);
    else assert.equal(actual[key],value,input+' '+key);
  }
}
console.log('Natural-language parser: '+cases.length+' regression tests passed');
