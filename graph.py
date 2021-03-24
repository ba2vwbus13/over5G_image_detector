import json
import ast
import matplotlib.pyplot as plt
import numpy as np

data = json.load(open('output5g.json'))
#data = json.load(open('/home/nakahira/Downloads/output(13).json'))
fiveG_delay = np.array([])
for d in data:
    fiveG_delay = np.append(fiveG_delay, [d['rtime'] - d['stime']])

data = json.load(open('output.json'))
local_delay = np.array([])
detect_delay = np.array([])
for d in data:
    local_delay = np.append(local_delay, [d['rtime'] - d['stime']])
    detect_delay = np.append(detect_delay, [d['calc_time']])
    
fiveG_delay = fiveG_delay[100:]
fiveG_delay = detect_delay+fiveG_delay[:len(detect_delay)]

fig = plt.figure()
plt.plot(fiveG_delay, label='Total delay with 5G NW')
plt.plot(local_delay, label='Total delay with local NW')
plt.plot(detect_delay, label='Detection delay')
plt.xlabel('Frame number')
plt.ylabel('Delay time [ms]')
plt.legend()
fig.savefig('delay.png')
plt.show()
