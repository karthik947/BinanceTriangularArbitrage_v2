//this module returns atrbitragable pairs
//Local Modules
const api = require('binance');
const socket = require('socket.io');
const express = require('express');
const cors = require('cors');
const sort = require('fast-sort');
const path = require('path');
let app,server,io;

//LOCAL ITEMS
let pairs = [],symValJ={};


//RETURNING ITEMS
let triangle = {
  //pairs:[],//{1:BTC,2:ETH,3:XRP,value:}
  getPairs: () => {
    return new Promise((res,rej) => {
        const bRest = new api.BinanceRest({
            key: 'api-key', // Get this from your account on binance.com
            secret: 'api-secret', // Same for this
            timeout: 15000, // Optional, defaults to 15000, is the request time out in milliseconds
            recvWindow: 10000, // Optional, defaults to 5000, increase if you're getting timestamp errors
            disableBeautification: false,
            handleDrift: true
        });

        bRest.exchangeInfo()
        .then((r1) => {
          let symbols=[],validPairs=[];
          r1.symbols.forEach(d => {
            if(symbols.indexOf(d.baseAsset) === -1){symbols.push(d.baseAsset);}
            if(symbols.indexOf(d.quoteAsset) === -1){symbols.push(d.quoteAsset);}
            if(d.status === "TRADING"){validPairs.push(d.symbol);symValJ[d.symbol]={bidPrice:0,askPrice:0}}
          });

          //find arbitragable coins
          let s1 = symbols,s2=symbols,s3=symbols;
          //let s1 = [],s2=[],s3=[];
          s1.forEach(d1 => {
            s2.forEach(d2 => {
              s3.forEach(d3 => {
                if(!(d1 == d2 || d2 == d3 || d3 == d1)){
                  let lv1=[],lv2=[],lv3=[],l1='',l2='',l3='';
                  if(validPairs.indexOf(d1+d2) != -1){
                    lv1.push(d1+d2);
                    l1='num';
                  }
                  if(validPairs.indexOf(d2+d1) != -1){
                    lv1.push(d2+d1);
                    l1='den';
                  }

                  if(validPairs.indexOf(d2+d3) != -1){
                    lv2.push(d2+d3);
                    l2 = 'num';
                  }
                  if(validPairs.indexOf(d3+d2) != -1){
                    lv2.push(d3+d2);
                    l2 = 'den';
                  }

                  if(validPairs.indexOf(d3+d1) != -1){
                    lv3.push(d3+d1);
                    l3='num';
                  }
                  if(validPairs.indexOf(d1+d3) != -1){
                    lv3.push(d1+d3);
                    l3='den';
                  }


                  if(lv1.length && lv2.length && lv3.length){
                    pairs.push({
                      l1:l1,
                      l2:l2,
                      l3:l3,
                      d1:d1,
                      d2:d2,
                      d3:d3,
                      lv1:lv1[0],
                      lv2:lv2[0],
                      lv3:lv3[0],
                      value:-100,
                      tpath:''
                    });
                  }

                }
              });
            });
          });
          //console.log(pairs.length + ',' + symbols.length + ',' + validPairs.length );
          res();

        }).catch(err => {
          console.log(err);
        });
    })
  },
  startServer : () => {
    return new Promise((res,rej) => {
      app = express();
      server = app.listen(3000,() => {console.log('Arbitrage Bot has just started on port 3000. Please wait.....');});
      app.use(cors());
      app.use('/JS',express.static(path.join(__dirname,'../Pages/JS')))
      let renderPage = (req,res) => {
        res.sendFile(path.join(__dirname,"../Pages/index.html"));
      };
      app.get('/',renderPage);
      io = socket(server);
      res();
    });
  },
  calculate: () => {
    console.log('Finished SetUp. Open "http://127.0.0.1:3000/" in your browser to access. Happy Trading!!');
    let binanceWS = new api.BinanceWS();
    binanceWS.onAllTickers((data) => {
      //Update JSON
      data.forEach(d => {
        symValJ[d.symbol].bidPrice = parseFloat(d.bestBid);
        symValJ[d.symbol].askPrice = parseFloat(d.bestAskPrice);
      });
      //Perform calculation and send alerts
      pairs.forEach(d => {
        //continue if price is not updated for any symbol
        if(symValJ[d.lv1]["bidPrice"] && symValJ[d.lv2]["bidPrice"] && symValJ[d.lv3]["bidPrice"]){
            //Level 1 calculation
            let lv_calc,lv_str;
            if(d.l1 === 'num'){
              lv_calc = symValJ[d.lv1]["bidPrice"];
              lv_str = d.d1 +  '->' + d.lv1 + "['bidP']['" + symValJ[d.lv1]["bidPrice"] + "']" + '->' + d.d2 + '<br/>';
            }
            else{
              lv_calc = 1/symValJ[d.lv1]["askPrice"];
              lv_str = d.d1 +  '->' + d.lv1 + "['askP']['" + symValJ[d.lv1]["askPrice"] + "']" + '->' + d.d2 + '<br/>';
            }

            //Level 2 calculation
            if(d.l2 === 'num'){
                lv_calc *= symValJ[d.lv2]["bidPrice"];
                lv_str  += d.d2 +  '->' + d.lv2 + "['bidP']['" + symValJ[d.lv2]["bidPrice"] + "']" +  '->' + d.d3+ '<br/>';
              }
            else{
                lv_calc *= 1/symValJ[d.lv2]["askPrice"];
                lv_str  += d.d2 +  '->' + d.lv2 + "['askP']['" + symValJ[d.lv2]["askPrice"] + "']" +  '->' + d.d3 + '<br/>';
            }

            //Level 3 calculation
            if(d.l3 === 'num'){
                lv_calc *= symValJ[d.lv3]["bidPrice"];
                lv_str  += d.d3 +  '->' + d.lv3 + "['bidP']['" + symValJ[d.lv3]["bidPrice"] + "']" + '->' +  d.d1 ;
              }
            else{
                lv_calc *= 1/symValJ[d.lv3]["askPrice"];
                lv_str += d.d3 +  '->' + d.lv3 + "['askP']['" + symValJ[d.lv3]["askPrice"] + "']" + '->' +  d.d1;
            }

            d.tpath = lv_str;
            d.value = parseFloat(parseFloat((lv_calc - 1)*100).toFixed(3));
        }
      });

      //Send Socket
      io.sockets.emit("ARBITRAGE",sort(pairs.filter(d => d.value > 0)).desc(u => u.value));
    });
  },
  log: () => {
    return pairs.length;
  }
}

//PROCEDURE
//GET ALL SYMBOLS AND IDENTIFY ARBITRAGABLE COINS
//OPEN SOCKET FOR 24 HOURS STATS
//CALCULATE AND SEND THE BEST ARB OPPORTUNITIES EVERY SEC

module.exports = triangle;
