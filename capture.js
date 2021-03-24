(function() {
  // The width and height of the captured photo. We will set the
  // width to the value defined here, but the height will be
  // calculated based on the aspect ratio of the input stream.

  var width = 320;    // We will scale the photo width to this
  var height = 0;     // This will be computed based on the input stream

  // |streaming| indicates whether or not we're currently streaming
  // video from the camera. Obviously, we start at false.

  var streaming = false;

  // The various HTML elements we need to configure or control. These
  // will be set by the startup() function.

  var video = null;
  var canvas = null;
  var photo = null;
  var startbutton = null;
  //var ws = new WebSocket("ws://127.0.0.1:8080/echo");
  var ws = new WebSocket("ws://18.183.253.50:8080/echo");
  view = document.getElementById('view');
  var receiveData = [];

  //ws.onmessage = function(e) {view.value +=  e.data + "\n"};
  ws.onopen = function(event) {view.value += "通信接続イベント" + "\n"};
  ws.onerror = function(event) {view.value += "エラー発生イベント受信" + "\n"};

  function startup() {
    video = document.getElementById('video');
    canvas = document.getElementById('canvas');
    photo = document.getElementById('photo');
    startbutton = document.getElementById('startbutton');
    view = document.getElementById('view');
    sendbutton = document.getElementById('sendbutton');

    navigator.mediaDevices.getUserMedia({video: true, audio: false})
    .then(function(stream) {
      video.srcObject = stream;
      video.play();
    })
    .catch(function(err) {
      console.log("An error occurred: " + err);
    });


    // 送信用データを書き出すためのCanvasを生成
    // このCanvas自体はdisplay:noneでユーザからは不可視
    var sendCanvas = document.getElementById('sendimage');
    sendCanvas.setAttribute('width', 320*2);
    sendCanvas.setAttribute('height', 240*2);
    var sendCanvasContext = sendCanvas.getContext('2d');
    // 500msごとにデータ送信
    setInterval(
        function () {
            // 送信ごとにレスポンス時間を計測するため、UUIDを生成
            var uuid = getUniqueStr();
            // 480x480のキャプチャ画像を認識器が入力とする40x40まで縮小
            sendCanvasContext.drawImage(video, 0, 0);
            // 画像データをBase64エンコード
            var data = sendCanvas.toDataURL();
            // データをjson形式で送信
            var stime = performance.now();
            var sendObj = { uuid: uuid, data: data, stime: stime};
            ws.send(JSON.stringify(sendObj));
            // レスポンス時に比較するため、送信時刻を記録
        }, 300);
 
    ws.onmessage = function(e) {
      //eceiveData.push(e.data);
      var message_data = JSON.parse(e.data);
      message_data.rtime = performance.now();
      receiveData.push(message_data)
      console.log(message_data.rbbox)
      takepicture(message_data.rbbox);
      view.value +=  e.data + "\n"
    };


    video.addEventListener('canplay', function(ev){
      if (!streaming) {
        height = video.videoHeight / (video.videoWidth/width);
      
        // Firefox currently has a bug where the height can't be read from
        // the video, so we will make assumptions if this happens.
      
        if (isNaN(height)) {
          height = width / (4/3);
        }
      
        video.setAttribute('width', width);
        video.setAttribute('height', height);
        canvas.setAttribute('width', width);
        canvas.setAttribute('height', height);
        streaming = true;
      }
    }, false);
    
    sendbutton.addEventListener('click', function(ev){
      data = JSON.stringify(receiveData, null, ' ');
      console.log(data);
      let blob = new Blob([data], {type:"appication/json"});
      let link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = "output.json";
      link.click();
    }, false);

    clearphoto();
  }

  function getUniqueStr(myStrong){
    var strong = 1000;
    if (myStrong) strong = myStrong;
    return new Date().getTime().toString(16)  + Math.floor(strong*Math.random()).toString(16)
   }

  // Fill the photo with an indication that none has been
  // captured.

  function clearphoto() {
    var context = canvas.getContext('2d');
    context.fillStyle = "#AAA";
    context.fillRect(0, 0, canvas.width, canvas.height);
    var data = canvas.toDataURL('image/png');
    photo.setAttribute('src', data);
  }
  
  // Capture a photo by fetching the current contents of the video
  // and drawing it into a canvas, then converting that to a PNG
  // format data URL. By drawing it on an offscreen canvas and then
  // drawing that to the screen, we can change its size and/or apply
  // other changes before drawing it.

  function takepicture(detect) {
    var context = canvas.getContext('2d');
    if (width && height) {
      canvas.width = width;
      canvas.height = height;
      context.drawImage(video, 0, 0, width, height);
      context.strokeStyle="white";
      context.lineWidth=8
      context.strokeRect(Math.floor(detect[0]*width), Math.floor(detect[1]*height), Math.floor((detect[2]-detect[0])*width), Math.floor((detect[3]-detect[1])*height));
      context.textAlign="center";
      context.fillStyle = "white";
      context.font = "24px 'ＭＳ ゴシック'";
      context.fillText("Follow target", Math.floor(width/1.5), Math.floor(canvas.height*0.9));
      var data = canvas.toDataURL('image/png');
      photo.setAttribute('src', data);
    } else {
      clearphoto();
    }
  }

  // Set up our event listener to run the startup process
  // once loading is complete.
  window.addEventListener('load', startup, false);
})();
