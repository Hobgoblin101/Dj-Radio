var lame = require('lame');
var fs =  require('fs');
var Throttle = require('throttle');

var Stream = require('./stream.js');
var player = require('./player.js');




var listeners = new Stream();
listeners.num = 0;
listeners.gain = function(){
  listeners.num += 1
  listeners.write(listeners.num);
};
listeners.lose = function(){
  listeners.num -= 1;
  listeners.write(listeners.num);
};





function BottleNeck(){
  live.bottleNeck = new Throttle(16000); // 128000/8
  live.bottleNeck.on('data', function(chunk){
    live.stream.write(chunk);
  });

  return live.BottleNeck;
}

var live = {
  buffer: [],
  stream: new Stream(),
  shrinkBuffer: function(){
    if (live.buffer.length > live.bufferLength){
      live.buffer.splice(0, live.buffer.length-(live.bufferLength-1));
    }
  },
  bufferLength: 30,
  bottleNeck: null
};
new BottleNeck();

live.stream.on('data', function(chunk){
  live.buffer.push(chunk);
  live.shrinkBuffer();
});

module.exports = {
  pass: function(req, res){
    res.writeHead(200, {
      'Content-Type': 'audio/mpeg3',
      'Transfer-Encoding': 'chuncked'
    });

    for (let chunk of live.buffer){
      res.write(chunk);
    }

    var stream = live.stream.on('data', function(chunk){
      res.write(chunk);
    });

    listeners.gain();

    req.connection.on('close', function(){
      listeners.lose();
      live.stream.remove('data', stream);
    });
  },
  player: player,
  listeners: listeners
};



var encoder = new lame.Encoder({
  //input
  channels: 2,
  bitDepth: 16,
  sampleRate: 44100,

  //output
  bitRate: 128,
  outputSampleRate: 22050,
  mode: lame.STEREO
});
encoder.on('data', function(chunk){
  if (!live.bottleNeck){
    //If the BottleNeck is missing create one
    new BottleNeck();
  }
  live.bottleNeck.write(chunk);
});


player.stream.on('data', function(chunk){
  encoder.write(chunk);
});
