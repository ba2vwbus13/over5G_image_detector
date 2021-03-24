#!/usr/bin/env python
# -*- coding: utf-8 -*-
  
from geventwebsocket.handler import WebSocketHandler
from gevent.pywsgi import WSGIServer
from flask import Flask, request, render_template
from werkzeug.exceptions import abort
import cv2
import numpy as np
import sys
import base64
import json
import time
import os

pseudo = False
if not pseudo:
    sys.path.append(os.path.join(os.path.dirname(__file__), 'yolov5'))
    from ObjectDetector import ObjectDetector
    from conversion_utils import closest_detection, detection_center
    detection_model = ObjectDetector('./yolov5/weights/yolov5m.pt') 

app = Flask(__name__)
# 独自学習させた判別器

  
class NpEncoder(json.JSONEncoder):
    """ Numpyオブジェクトを含むオブジェクトのJsonエンコーダ """
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        else:
            return super(NpEncoder, self).default(obj)
  
class Timer(object):
    """処理時間計測ユーティリティクラス"""
    def __init__(self, verbose=False):
        self.verbose = verbose
  
    def __enter__(self):
        self.start = time.time()
        return self
  
    def __exit__(self, *args):
        self.end = time.time()
        self.secs = self.end - self.start
        self.msecs = self.secs * 1000 # micro secs
        print('elapsed time: %f msecs' % self.msecs)
  
@app.route('/echo')
def sock():
    # WebSocket オブジェクトの取得
    ws = request.environ['wsgi.websocket']
    if not ws:
        print("abort")
        abort(400)
    while True:
        try:
            # WebSocketデータの受信
            message = ws.receive()
            messagedata = json.loads(message)
            # Base64デコード＆cvimageに変換
            image_data = from_base64(messagedata["data"])
            # クラス判別と時間計測
            with Timer() as t:
                if pseudo:
                    result = {'bbox': [152, 12, 638, 471], 'rbbox': (0.2375, 0.025, 0.996875, 0.98125), 'label': 0, 'label_name': 'person', 'prob': 0.93164, 'color': [100, 126, 77]}
                else:
                    detections = detection_model(image_data)[0]
                    matching_detections = [d for d in detections if d['label'] == 0]
                    result = closest_detection(matching_detections)
                    print(result)
            result.update( {"uuid" : messagedata["uuid"], "stime" : messagedata["stime"], "calc_time" : t.msecs})
            print(result)

        except Exception as e:
            print(e)
            #print('error:' + e.message)
        ws.send(json.dumps(result, cls=NpEncoder))
        cv2.imshow('get frame', image_data)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
  
def from_base64(b64msg):
    """Base64文字列をcv2イメージにデコード"""
    img = base64.b64decode(b64msg.replace("data:image/png;base64,",""))
    npimg = np.fromstring(img, dtype=np.uint8)
    image_data = cv2.imdecode(npimg, 1)
    return image_data
  
if __name__ == '__main__':
    http_server = WSGIServer(("", 8080), app, handler_class=WebSocketHandler)
    print(http_server)
    http_server.serve_forever()