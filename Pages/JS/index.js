const socket = io.connect("http://127.0.0.1:3000/");
let runFlag = 'X';
let mimPL = 0;

const runToggle = () => {
  if(runFlag){
    runFlag = '';
    document.getElementById('runDiv').innerHTML = '<button onclick="runToggle();" type="button" class="btn btn-danger" id="runFlag">Toggle</button>';
  }
  else{
    runFlag = 'X';
    document.getElementById('runDiv').innerHTML = '<button onclick="runToggle();" type="button" class="btn btn-success" id="runFlag">Toggle</button>';
  }
}

const minLimit = (ml) => {
  mimPL = parseFloat(ml);
}

socket.on('ARBITRAGE',(pl) => {
  if(runFlag){
    let markup = '';
    pl.filter(p => p.value >= mimPL).forEach((d,i) => {
      markup += "<tr class='table-success'><td>" + (i+1) + "</td><td>" + d.tpath + "</td><td>" + d.value + "</td></tr>";
    });
    document.getElementById('tartbitBody').innerHTML = markup;
  }
});
