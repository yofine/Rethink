---
title: "Test"
layout: code
path: ""
---

```
var context=canvas.getContext("2d"),boardX=canvas.width/2,angle,x,y;function clear(){angle=Math.PI/2;x=canvas.width/2;y=10}clear();canvas.addEventListener("mousemove",function(a){boardX=Math.min(Math.max(a.pageX-canvas.offsetLeft,30),canvas.width-30)},false);setInterval(function(){x=Math.min(Math.max(x+Math.cos(angle)*8,10),canvas.width-10);y=Math.min(Math.max(y+Math.sin(angle)*8,10),canvas.height+10);if(y+10>=canvas.height-10&&x>=boardX-30&&x<=boardX+30){y=canvas.height-20;angle=(x-boardX+30)/60*Math.PI/3*2+Math.PI/6*7}if(x===10||x===canvas.width-10){angle=Math.PI-angle}if(y===10){angle=2*Math.PI-angle}if(y===canvas.height+10){clear()}context.clearRect(0,0,canvas.width,canvas.height);context.strokeRect(0,0,canvas.width,canvas.height);context.beginPath();context.arc(x,y,10,0,2*Math.PI);context.fill();context.fillRect(boardX-30,canvas.height-10,60,10)},20);
```
